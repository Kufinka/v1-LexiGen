import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST endpoint for sendBeacon — beacons always use POST
export async function POST(req: Request, { params }: { params: { sessionId: string } }) {
  try {
    const studySession = await prisma.studySession.findUnique({
      where: { id: params.sessionId },
    });

    if (!studySession || studySession.endedAt) {
      return NextResponse.json({ ok: true });
    }

    await prisma.studySession.update({
      where: { id: params.sessionId },
      data: { endedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error ending session via beacon:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
