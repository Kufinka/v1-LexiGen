import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total reviews today
    const todayReviews = await prisma.cardReview.count({
      where: {
        session: { userId: session.user.id },
        createdAt: { gte: startOfToday },
      },
    });

    // Total reviews this month
    const monthReviews = await prisma.cardReview.count({
      where: {
        session: { userId: session.user.id },
        createdAt: { gte: startOfMonth },
      },
    });

    // Sessions today for time tracking
    const todaySessions = await prisma.studySession.findMany({
      where: {
        userId: session.user.id,
        startedAt: { gte: startOfToday },
      },
    });

    const hoursStudiedToday = todaySessions.reduce((total: number, s: { startedAt: Date; endedAt: Date | null }) => {
      const end = s.endedAt || now;
      return total + (end.getTime() - s.startedAt.getTime()) / (1000 * 60 * 60);
    }, 0);

    // Calculate streak
    let streak = 0;
    const checkDate = new Date(startOfToday);

    // Check if user studied today
    if (todayReviews > 0) {
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Check previous days
    for (let i = 0; i < 365; i++) {
      const dayStart = new Date(checkDate);
      const dayEnd = new Date(checkDate);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const count = await prisma.cardReview.count({
        where: {
          session: { userId: session.user.id },
          createdAt: { gte: dayStart, lt: dayEnd },
        },
      });

      if (count > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Daily data for the month chart
    const dailyData = [];
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), day);
      const dayEnd = new Date(now.getFullYear(), now.getMonth(), day + 1);

      const reviews = await prisma.cardReview.count({
        where: {
          session: { userId: session.user.id },
          createdAt: { gte: dayStart, lt: dayEnd },
        },
      });

      const sessions = await prisma.studySession.findMany({
        where: {
          userId: session.user.id,
          startedAt: { gte: dayStart, lt: dayEnd },
        },
      });

      const minutes = sessions.reduce((total: number, s: { startedAt: Date; endedAt: Date | null }) => {
        const end = s.endedAt || (dayEnd < now ? dayEnd : now);
        return total + (end.getTime() - s.startedAt.getTime()) / (1000 * 60);
      }, 0);

      dailyData.push({
        day,
        date: dayStart.toISOString().split("T")[0],
        reviews,
        minutes: Math.round(minutes),
      });
    }

    return NextResponse.json({
      todayReviews,
      monthReviews,
      hoursStudiedToday: Math.round(hoursStudiedToday * 100) / 100,
      streak,
      dailyData,
    });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
