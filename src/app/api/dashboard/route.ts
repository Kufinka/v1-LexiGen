import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Allow fetching data for a specific month/year
    const qYear = searchParams.get("year");
    const qMonth = searchParams.get("month"); // 0-indexed
    const chartYear = qYear ? parseInt(qYear, 10) : now.getFullYear();
    const chartMonth = qMonth ? parseInt(qMonth, 10) : now.getMonth();

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total reviews today — query via card→deck→userId so reviews with null sessionId are included
    const todayReviews = await prisma.cardReview.count({
      where: {
        card: { deck: { userId: session.user.id } },
        createdAt: { gte: startOfToday },
      },
    });

    // Total reviews this month
    const monthReviews = await prisma.cardReview.count({
      where: {
        card: { deck: { userId: session.user.id } },
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

    const MAX_SESSION_MS = 2 * 60 * 60 * 1000; // cap any single session at 2 hours
    const hoursStudiedToday = todaySessions.reduce((total: number, s: { startedAt: Date; endedAt: Date | null }) => {
      const end = s.endedAt || now;
      const duration = Math.min(end.getTime() - s.startedAt.getTime(), MAX_SESSION_MS);
      return total + duration / (1000 * 60 * 60);
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
          card: { deck: { userId: session.user.id } },
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

    // Daily data for the selected month chart
    const dailyData = [];
    const daysInMonth = new Date(chartYear, chartMonth + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStart = new Date(chartYear, chartMonth, day);
      const dayEnd = new Date(chartYear, chartMonth, day + 1);

      const reviews = await prisma.cardReview.count({
        where: {
          card: { deck: { userId: session.user.id } },
          createdAt: { gte: dayStart, lt: dayEnd },
        },
      });

      const sessions = await prisma.studySession.findMany({
        where: {
          userId: session.user.id,
          startedAt: { gte: dayStart, lt: dayEnd },
        },
      });

      const MAX_SESS_MS = 2 * 60 * 60 * 1000;
      const minutes = sessions.reduce((total: number, s: { startedAt: Date; endedAt: Date | null }) => {
        const end = s.endedAt || (dayEnd < now ? dayEnd : now);
        const duration = Math.min(end.getTime() - s.startedAt.getTime(), MAX_SESS_MS);
        return total + duration / (1000 * 60);
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
      chartYear,
      chartMonth,
    });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
