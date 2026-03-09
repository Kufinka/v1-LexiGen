import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { commentSchema } from "@/lib/validations";

export async function GET(req: Request, { params }: { params: { deckId: string } }) {
  try {
    const comments = await prisma.deckComment.findMany({
      where: { deckId: params.deckId },
      include: { user: { select: { id: true, username: true, image: true } } },
      orderBy: { createdAt: "desc" },
    });

    // Attach user's rating to each comment
    const ratings = await prisma.deckRating.findMany({
      where: { deckId: params.deckId },
    });
    const ratingMap = new Map(ratings.map((r) => [r.userId, r.score]));

    const commentsWithRating = comments.map((c) => ({
      ...c,
      userRating: ratingMap.get(c.userId) || null,
    }));

    return NextResponse.json(commentsWithRating);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { deckId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = commentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const deck = await prisma.deck.findUnique({ where: { id: params.deckId } });
    if (!deck || !deck.isPublic) {
      return NextResponse.json({ error: "Deck not found or not public" }, { status: 404 });
    }

    if (deck.userId === session.user.id) {
      return NextResponse.json({ error: "You cannot comment on your own deck" }, { status: 403 });
    }

    // One comment per user per deck (upsert)
    const comment = await prisma.deckComment.upsert({
      where: { userId_deckId: { userId: session.user.id, deckId: params.deckId } },
      update: { content: result.data.content },
      create: {
        content: result.data.content,
        userId: session.user.id,
        deckId: params.deckId,
      },
      include: { user: { select: { id: true, username: true, image: true } } },
    });

    // Attach user rating
    const userRating = await prisma.deckRating.findUnique({
      where: { userId_deckId: { userId: session.user.id, deckId: params.deckId } },
    });

    return NextResponse.json({ ...comment, userRating: userRating?.score || null }, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
