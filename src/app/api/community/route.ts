import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const tag = searchParams.get("tag") || "";

    const where: Record<string, unknown> = { isPublic: true };

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    if (tag) {
      where.tags = { has: tag };
    }

    const decks = await prisma.deck.findMany({
      where,
      include: {
        user: { select: { username: true, image: true } },
        _count: { select: { cards: true, ratings: true, comments: true } },
        ratings: { select: { score: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const decksWithAvgRating = decks.map((deck: typeof decks[number]) => {
      const avgRating =
        deck.ratings.length > 0
          ? deck.ratings.reduce((sum: number, r: { score: number }) => sum + r.score, 0) / deck.ratings.length
          : 0;
      return { ...deck, avgRating: Math.round(avgRating * 10) / 10 };
    });

    return NextResponse.json(decksWithAvgRating);
  } catch (error) {
    console.error("Error fetching community decks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
