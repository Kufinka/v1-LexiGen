import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deckSchema } from "@/lib/validations";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const tag = searchParams.get("tag") || "";
    const sort = searchParams.get("sort") || "updatedAt";

    const where: Record<string, unknown> = { userId: session.user.id };
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }
    if (tag) {
      where.tags = { has: tag };
    }

    const orderBy: Record<string, string> =
      sort === "createdAt" ? { createdAt: "desc" }
      : sort === "lastAccessedAt" ? { lastAccessedAt: "desc" }
      : { updatedAt: "desc" };

    const decks = await prisma.deck.findMany({
      where,
      include: {
        _count: { select: { cards: true } },
        cards: { select: { nextReview: true } },
      },
      orderBy,
    });

    const now = new Date();
    const decksWithDue = decks.map((d) => {
      const dueCount = d.cards.filter((c: { nextReview: Date }) => c.nextReview <= now).length;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { cards: _cards, ...rest } = d;
      return { ...rest, dueCount };
    });

    // Resolve clonedFromUser for cloned decks
    const clonedFromIds = decksWithDue
      .filter((d) => d.isClone && d.clonedFromId)
      .map((d) => d.clonedFromId as string);

    let clonedFromMap: Record<string, { id: string; username: string }> = {};
    if (clonedFromIds.length > 0) {
      const originalDecks = await prisma.deck.findMany({
        where: { id: { in: clonedFromIds } },
        select: { id: true, user: { select: { id: true, username: true } } },
      });
      clonedFromMap = Object.fromEntries(
        originalDecks.map((d) => [d.id, d.user])
      );
    }

    const result = decksWithDue.map((d) => ({
      ...d,
      clonedFromUser: d.clonedFromId ? clonedFromMap[d.clonedFromId] || null : null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching decks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = deckSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const deck = await prisma.deck.create({
      data: {
        ...result.data,
        userId: session.user.id,
      },
    });

    return NextResponse.json(deck, { status: 201 });
  } catch (error) {
    console.error("Error creating deck:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
