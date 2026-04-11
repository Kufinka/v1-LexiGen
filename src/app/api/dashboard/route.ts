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

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Allow fetching data for a specific month/year
    const qYear = searchParams.get("year");
    const qMonth = searchParams.get("month"); // 0-indexed
    const chartYear = qYear ? parseInt(qYear, 10) : now.getFullYear();
    const chartMonth = qMonth ? parseInt(qMonth, 10) : now.getMonth();

    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // --- Batch: today reviews, month reviews, today sessions ---
    const [todayReviews, monthReviews, todaySessions] = await Promise.all([
      prisma.cardReview.count({
        where: {
          card: { deck: { userId } },
          createdAt: { gte: startOfToday },
        },
      }),
      prisma.cardReview.count({
        where: {
          card: { deck: { userId } },
          createdAt: { gte: startOfCurrentMonth },
        },
      }),
      prisma.studySession.findMany({
        where: { userId, startedAt: { gte: startOfToday } },
      }),
    ]);

    const hoursStudiedToday = todaySessions.reduce((total, s) => {
      if (s.activeSeconds > 0) {
        return total + s.activeSeconds / 3600;
      }
      const end = s.endedAt || now;
      const MAX_SESSION_MS = 2 * 60 * 60 * 1000;
      const duration = Math.min(end.getTime() - s.startedAt.getTime(), MAX_SESSION_MS);
      return total + duration / (1000 * 60 * 60);
    }, 0);

    // --- Streak: batch-fetch all review dates in last 365 days, then count consecutive days ---
    const streakLookback = new Date(startOfToday);
    streakLookback.setDate(streakLookback.getDate() - 365);

    const reviewDatesRaw = await prisma.cardReview.findMany({
      where: {
        card: { deck: { userId } },
        createdAt: { gte: streakLookback },
      },
      select: { createdAt: true },
    });

    // Build a set of date strings (YYYY-MM-DD) that have at least one review
    const reviewDaySet = new Set<string>();
    for (const r of reviewDatesRaw) {
      const d = r.createdAt;
      reviewDaySet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }

    let streak = 0;
    const checkDate = new Date(startOfToday);
    const toKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    // Check today first
    if (reviewDaySet.has(toKey(checkDate))) {
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Count consecutive previous days
    for (let i = 0; i < 365; i++) {
      if (reviewDaySet.has(toKey(checkDate))) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // --- Chart data: batch-fetch all reviews & sessions for the selected month ---
    const daysInMonth = new Date(chartYear, chartMonth + 1, 0).getDate();
    const chartStart = new Date(chartYear, chartMonth, 1);
    const chartEnd = new Date(chartYear, chartMonth + 1, 1);

    const [chartReviews, chartSessions] = await Promise.all([
      prisma.cardReview.findMany({
        where: {
          card: { deck: { userId } },
          createdAt: { gte: chartStart, lt: chartEnd },
        },
        select: { createdAt: true },
      }),
      prisma.studySession.findMany({
        where: {
          userId,
          startedAt: { gte: chartStart, lt: chartEnd },
        },
      }),
    ]);

    // Group reviews by day of month
    const reviewsByDay = new Map<number, number>();
    for (const r of chartReviews) {
      const day = r.createdAt.getDate();
      reviewsByDay.set(day, (reviewsByDay.get(day) || 0) + 1);
    }

    // Group session minutes by day of month
    const minutesByDay = new Map<number, number>();
    for (const s of chartSessions) {
      const day = s.startedAt.getDate();
      let mins: number;
      if (s.activeSeconds > 0) {
        mins = s.activeSeconds / 60;
      } else {
        const dayEnd = new Date(chartYear, chartMonth, day + 1);
        const end = s.endedAt || (dayEnd < now ? dayEnd : now);
        const MAX_SESS_MS = 2 * 60 * 60 * 1000;
        const duration = Math.min(end.getTime() - s.startedAt.getTime(), MAX_SESS_MS);
        mins = duration / (1000 * 60);
      }
      minutesByDay.set(day, (minutesByDay.get(day) || 0) + mins);
    }

    const dailyData = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStart = new Date(chartYear, chartMonth, day);
      dailyData.push({
        day,
        date: dayStart.toISOString().split("T")[0],
        reviews: reviewsByDay.get(day) || 0,
        minutes: Math.round(minutesByDay.get(day) || 0),
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
