import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const tag = searchParams.get("tag") || "";
    const language = searchParams.get("language") || "";
    const sort = searchParams.get("sort") || "newest";

    const where: Record<string, unknown> = { isPublic: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (tag) {
      where.tags = { has: tag };
    }

    if (language) {
      where.OR = [
        ...(where.OR ? (where.OR as Record<string, unknown>[]) : []),
        { languageA: { contains: language, mode: "insensitive" } },
        { languageB: { contains: language, mode: "insensitive" } },
      ];
    }

    const decks = await prisma.deck.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, image: true } },
        _count: { select: { cards: true, ratings: true, comments: true } },
        ratings: { select: { score: true } },
      },
      orderBy: sort === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" },
    });

    const decksWithAvgRating = decks.map((deck: typeof decks[number]) => {
      const avgRating =
        deck.ratings.length > 0
          ? deck.ratings.reduce((sum: number, r: { score: number }) => sum + r.score, 0) / deck.ratings.length
          : 0;
      return { ...deck, avgRating: Math.round(avgRating * 10) / 10 };
    });

    // Sort by rating or number of ratings if requested
    if (sort === "rating") {
      decksWithAvgRating.sort((a, b) => {
        if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
        return b._count.ratings - a._count.ratings;
      });
    } else if (sort === "most_rated") {
      decksWithAvgRating.sort((a, b) => b._count.ratings - a._count.ratings);
    }

    return NextResponse.json(decksWithAvgRating);
  } catch (error) {
    console.error("Error fetching community decks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
