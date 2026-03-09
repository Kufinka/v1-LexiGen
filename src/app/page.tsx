"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { BookOpen, Brain, Users, BarChart3, Sparkles, Zap, Sun, Moon } from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Bilingual Decks",
    description: "Create flashcard decks with any two languages. Add words and sentences to master vocabulary.",
  },
  {
    icon: Brain,
    title: "Spaced Repetition",
    description: "SM-2 algorithm ensures you review cards at optimal intervals for maximum retention.",
  },
  {
    icon: Sparkles,
    title: "AI Sentences",
    description: "Generate natural sentences using your saved words with AI-powered context generation.",
  },
  {
    icon: Zap,
    title: "Swipe Study",
    description: "Tinder-style card swiping for quick reviews, plus detailed 1-4 rating for precise SRS control.",
  },
  {
    icon: Users,
    title: "Community",
    description: "Share your decks publicly. Browse, rate, comment, and clone decks from other learners.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "Track your study streaks, daily reviews, and time spent with beautiful interactive charts.",
  },
];

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/decks");
    }
  }, [status, router]);

  if (status === "authenticated") return null;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-32">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-300/20 dark:bg-pink-500/10 rounded-full blur-3xl" />
          </div>
          {/* Theme toggle for non-logged-in users */}
          {!session && (
            <div className="absolute top-4 right-4 z-10">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full glass"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          )}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
              Master Languages with{" "}
              <span className="bg-gradient-to-r from-primary via-pink-400 to-rose-400 bg-clip-text text-transparent">
                LexiGen
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
              AI-powered flashcards with spaced repetition. Create bilingual decks, swipe to study,
              generate sentences, and learn with the community.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="text-lg px-8 py-6 rounded-xl shadow-lg shadow-primary/25">
                  Get Started Free
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="text-lg px-8 py-6 rounded-xl glass">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold">Everything You Need to Learn</h2>
              <p className="mt-4 text-muted-foreground text-lg">
                Powerful tools designed for effective language learning
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="glass-card rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200"
                >
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="glass-card rounded-3xl p-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Start Learning?</h2>
              <p className="text-muted-foreground text-lg mb-8">
                Join LexiGen today and transform how you learn languages.
              </p>
              <Link href="/register">
                <Button size="lg" className="text-lg px-8 py-6 rounded-xl">
                  Create Free Account
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
