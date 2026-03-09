import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { deckId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { score } = body;

    if (!score || score < 1 || score > 5) {
      return NextResponse.json({ error: "Score must be between 1 and 5" }, { status: 400 });
    }

    const deck = await prisma.deck.findUnique({ where: { id: params.deckId } });
    if (!deck || !deck.isPublic) {
      return NextResponse.json({ error: "Deck not found or not public" }, { status: 404 });
    }

    const rating = await prisma.deckRating.upsert({
      where: { userId_deckId: { userId: session.user.id, deckId: params.deckId } },
      update: { score },
      create: { score, userId: session.user.id, deckId: params.deckId },
    });

    return NextResponse.json(rating);
  } catch (error) {
    console.error("Error rating deck:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
