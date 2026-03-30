import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateSRS } from "@/lib/srs";

export async function GET(req: Request, { params }: { params: { deckId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deck = await prisma.deck.findUnique({ where: { id: params.deckId } });
    if (!deck || deck.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "mixed";

    const where: Record<string, unknown> = {
      deckId: params.deckId,
    };

    if (filter === "words") where.type = "WORD";
    else if (filter === "sentences") where.type = "SENTENCE";

    // Fetch ALL cards so the client can classify into New/Learning/Due queues
    const cards = await prisma.card.findMany({
      where,
      orderBy: { nextReview: "asc" },
    });

    return NextResponse.json(cards);
  } catch (error) {
    console.error("Error fetching study cards:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    const body = await req.json();
    const { cardId, rating, sessionId } = body;

    if (!cardId || !rating || rating < 1 || rating > 4) {
      return NextResponse.json({ error: "Invalid card ID or rating (1-4)" }, { status: 400 });
    }

    const card = await prisma.card.findUnique({ where: { id: cardId, deckId: params.deckId } });
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const srsResult = calculateSRS(
      { easeFactor: card.easeFactor, interval: card.interval, repetitions: card.repetitions },
      rating
    );

    const [updatedCard, review] = await prisma.$transaction([
      prisma.card.update({
        where: { id: cardId },
        data: {
          easeFactor: srsResult.easeFactor,
          interval: srsResult.interval,
          repetitions: srsResult.repetitions,
          nextReview: srsResult.nextReview,
        },
      }),
      prisma.cardReview.create({
        data: {
          cardId,
          rating,
          sessionId: sessionId || null,
        },
      }),
      // Update lastAccessedAt to track when the deck was last studied
      prisma.deck.update({
        where: { id: params.deckId },
        data: { lastAccessedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ card: updatedCard, review });
  } catch (error) {
    console.error("Error reviewing card:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
