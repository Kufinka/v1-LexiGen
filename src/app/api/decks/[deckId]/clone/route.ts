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

    const deck = await prisma.deck.findUnique({
      where: { id: params.deckId },
      include: { cards: true },
    });

    if (!deck || !deck.isPublic) {
      return NextResponse.json({ error: "Deck not found or not public" }, { status: 404 });
    }

    if (deck.userId === session.user.id) {
      return NextResponse.json({ error: "Cannot clone your own deck" }, { status: 400 });
    }

    const clonedDeck = await prisma.deck.create({
      data: {
        name: `${deck.name} (Clone)`,
        languageA: deck.languageA,
        languageB: deck.languageB,
        tags: deck.tags,
        isClone: true,
        isPublic: false,
        clonedFromId: deck.id,
        userId: session.user.id,
        cards: {
          create: deck.cards.map((card: { sideA: string; sideB: string; type: "WORD" | "SENTENCE" }) => ({
            sideA: card.sideA,
            sideB: card.sideB,
            type: card.type,
          })),
        },
      },
    });

    return NextResponse.json(clonedDeck, { status: 201 });
  } catch (error) {
    console.error("Error cloning deck:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
