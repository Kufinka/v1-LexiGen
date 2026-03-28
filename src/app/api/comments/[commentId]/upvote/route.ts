import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { commentId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const comment = await prisma.deckComment.findUnique({
      where: { id: params.commentId },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Cannot upvote your own comment
    if (comment.userId === session.user.id) {
      return NextResponse.json({ error: "You cannot upvote your own review" }, { status: 403 });
    }

    // Toggle upvote: if already upvoted, remove it; otherwise add it
    const existing = await prisma.commentUpvote.findUnique({
      where: { userId_commentId: { userId: session.user.id, commentId: params.commentId } },
    });

    if (existing) {
      await prisma.commentUpvote.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({ upvoted: false });
    } else {
      await prisma.commentUpvote.create({
        data: { userId: session.user.id, commentId: params.commentId },
      });
      return NextResponse.json({ upvoted: true });
    }
  } catch (error) {
    console.error("Error toggling upvote:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
