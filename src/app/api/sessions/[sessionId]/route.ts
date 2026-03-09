import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { sessionId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const studySession = await prisma.studySession.findUnique({
      where: { id: params.sessionId },
    });

    if (!studySession || studySession.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.studySession.update({
      where: { id: params.sessionId },
      data: { endedAt: new Date() },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error ending session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
