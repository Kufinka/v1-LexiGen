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

    let activeSeconds: number | undefined;
    try {
      const body = await req.json();
      if (typeof body.activeSeconds === "number" && body.activeSeconds >= 0) {
        activeSeconds = Math.round(body.activeSeconds);
      }
    } catch {
      // No body — that's fine
    }

    await prisma.studySession.update({
      where: { id: params.sessionId },
      data: {
        endedAt: new Date(),
        ...(activeSeconds !== undefined ? { activeSeconds } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error ending session via beacon:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
