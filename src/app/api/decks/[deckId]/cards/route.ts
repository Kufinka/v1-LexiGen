import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cardSchema } from "@/lib/validations";

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

    // Support bulk card creation
    if (Array.isArray(body)) {
      const cards = [];
      for (const item of body) {
        const result = cardSchema.safeParse(item);
        if (!result.success) {
          return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
        }
        cards.push({ ...result.data, deckId: params.deckId });
      }
      const created = await prisma.card.createMany({ data: cards });
      await prisma.deck.update({ where: { id: params.deckId }, data: { updatedAt: new Date() } });
      return NextResponse.json({ count: created.count }, { status: 201 });
    }

    const result = cardSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const card = await prisma.card.create({
      data: { ...result.data, deckId: params.deckId },
    });
    await prisma.deck.update({ where: { id: params.deckId }, data: { updatedAt: new Date() } });

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error("Error creating card:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
