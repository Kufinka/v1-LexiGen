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

    const deck = await prisma.deck.findUnique({ where: { id: params.deckId } });
    if (!deck || deck.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.cardReview.deleteMany({
        where: { card: { deckId: params.deckId } },
      }),
      prisma.card.updateMany({
        where: { deckId: params.deckId },
        data: {
          easeFactor: 2.5,
          interval: 0,
          repetitions: 0,
          nextReview: new Date(),
        },
      }),
    ]);

    return NextResponse.json({ message: "Deck progress reset" });
  } catch (error) {
    console.error("Error resetting deck:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
