import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { userId: string } }) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        username: true,
        image: true,
        bio: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const publicDecks = await prisma.deck.findMany({
      where: { userId: params.userId, isPublic: true },
      include: {
        _count: { select: { cards: true, ratings: true, comments: true } },
        ratings: { select: { score: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const decksWithRating = publicDecks.map((deck) => {
      const avgRating =
        deck.ratings.length > 0
          ? deck.ratings.reduce((sum, r) => sum + r.score, 0) / deck.ratings.length
          : 0;
      return { ...deck, avgRating: Math.round(avgRating * 10) / 10 };
    });

    return NextResponse.json({ ...user, decks: decksWithRating });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
