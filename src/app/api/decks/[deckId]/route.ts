import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deckSchema } from "@/lib/validations";

export async function GET(req: Request, { params }: { params: { deckId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deck = await prisma.deck.findUnique({
      where: { id: params.deckId },
      include: {
        cards: { orderBy: { createdAt: "desc" } },
        user: { select: { username: true, image: true } },
        _count: { select: { cards: true, ratings: true, comments: true } },
      },
    });

    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    if (!deck.isPublic && deck.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(deck);
  } catch (error) {
    console.error("Error fetching deck:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { deckId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deck = await prisma.deck.findUnique({ where: { id: params.deckId } });
    if (!deck || deck.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });
    }

    const body = await req.json();

    // Handle isPublic toggle separately
    if (typeof body.isPublic === "boolean") {
      if (deck.isClone && body.isPublic) {
        return NextResponse.json({ error: "Cloned decks cannot be made public" }, { status: 400 });
      }
      const updated = await prisma.deck.update({
        where: { id: params.deckId },
        data: { isPublic: body.isPublic },
      });
      return NextResponse.json(updated);
    }

    const result = deckSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const updated = await prisma.deck.update({
      where: { id: params.deckId },
      data: result.data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating deck:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { deckId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deck = await prisma.deck.findUnique({ where: { id: params.deckId } });
    if (!deck || deck.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });
    }

    await prisma.deck.delete({ where: { id: params.deckId } });

    return NextResponse.json({ message: "Deck deleted" });
  } catch (error) {
    console.error("Error deleting deck:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
