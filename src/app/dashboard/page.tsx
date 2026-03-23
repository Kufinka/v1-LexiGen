"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  BookOpen,
  Flame,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DailyEntry {
  day: number;
  date: string;
  reviews: number;
  minutes: number;
}

interface DashboardData {
  todayReviews: number;
  monthReviews: number;
  hoursStudiedToday: number;
  streak: number;
  dailyData: DailyEntry[];
  chartYear: number;
  chartMonth: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState<"reviews" | "time">("reviews");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [chartData, setChartData] = useState<DailyEntry[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session) fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const dashData = await res.json();
        setData(dashData);
        setChartData(dashData.dailyData);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load dashboard", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = useCallback(async (year: number, month: number) => {
    setChartLoading(true);
    try {
      const res = await fetch(`/api/dashboard?year=${year}&month=${month}`);
      if (res.ok) {
        const d = await res.json();
        setChartData(d.dailyData);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load chart data", variant: "destructive" });
    } finally {
      setChartLoading(false);
    }
  }, [toast]);

  const goToPrevMonth = () => {
    let newMonth = selectedMonth - 1;
    let newYear = selectedYear;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
    fetchChartData(newYear, newMonth);
  };

  const goToNextMonth = () => {
    const now = new Date();
    let newMonth = selectedMonth + 1;
    let newYear = selectedYear;
    if (newMonth > 11) { newMonth = 0; newYear++; }
    // Don't allow navigating past the current month
    if (newYear > now.getFullYear() || (newYear === now.getFullYear() && newMonth > now.getMonth())) return;
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
    fetchChartData(newYear, newMonth);
  };

  const isCurrentMonth = selectedYear === new Date().getFullYear() && selectedMonth === new Date().getMonth();

  const monthLabel = new Date(selectedYear, selectedMonth).toLocaleString("default", { month: "long", year: "numeric" });

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Reviews</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data?.todayReviews || 0}</div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Reviews</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data?.monthReviews || 0}</div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Streak</CardTitle>
              <Flame className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {data?.streak || 0} <span className="text-lg font-normal text-muted-foreground">days</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Hours Today</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {data?.hoursStudiedToday?.toFixed(1) || "0.0"} <span className="text-lg font-normal text-muted-foreground">hrs</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Monthly Activity</CardTitle>
              <Tabs value={chartMode} onValueChange={(v) => setChartMode(v as "reviews" | "time")}>
                <TabsList>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                  <TabsTrigger value="time">Time</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[140px] text-center">{monthLabel}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextMonth} disabled={isCurrentMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {chartLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.75rem",
                        color: "hsl(var(--foreground))",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                      cursor={{ fill: "hsl(var(--primary) / 0.08)" }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any) =>
                        chartMode === "reviews"
                          ? [`${value} reviews`, "Reviews"]
                          : [`${Math.round(value)} min`, "Time"]
                      }
                      labelFormatter={(label) => `Day ${label}`}
                    />
                    <Bar
                      dataKey={chartMode === "reviews" ? "reviews" : "minutes"}
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                      style={{ filter: "none" }}
                      onMouseEnter={() => {}}
                      activeBar={{ style: { filter: "brightness(1.1) drop-shadow(0 0 4px hsl(var(--primary) / 0.3))", stroke: "none" } }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No study activity for {monthLabel}.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
