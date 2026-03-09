"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Loader2,
  RotateCcw,
  Undo2,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

interface StudyCard {
  id: string;
  sideA: string;
  sideB: string;
  type: "WORD" | "SENTENCE";
}

export default function StudyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const deckId = params.deckId as string;
  const { toast } = useToast();

  const [cards, setCards] = useState<StudyCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("mixed");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [history, setHistory] = useState<{ card: StudyCard; rating: number }[]>([]);
  const [completed, setCompleted] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);
  const leftIndicator = useTransform(x, [-200, -50, 0], [1, 0.5, 0]);
  const rightIndicator = useTransform(x, [0, 50, 200], [0, 0.5, 1]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/decks/${deckId}/study?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setCards(data);
        setCurrentIndex(0);
        setFlipped(false);
        setHistory([]);
        setCompleted(data.length === 0);
        setReviewCount(0);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load study cards", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [deckId, filter, toast]);

  const startSession = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSessionId(data.id);
      }
    } catch {
      // Session tracking is optional
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchCards();
      startSession();
    }
  }, [session, filter, fetchCards, startSession]);

  const reviewCard = async (rating: number) => {
    const currentCard = cards[currentIndex];
    if (!currentCard) return;

    try {
      await fetch(`/api/decks/${deckId}/study`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: currentCard.id, rating, sessionId }),
      });

      setHistory((prev) => [...prev, { card: currentCard, rating }]);
      setReviewCount((prev) => prev + 1);

      if (currentIndex + 1 >= cards.length) {
        setCompleted(true);
        if (sessionId) {
          await fetch(`/api/sessions/${sessionId}`, { method: "PATCH" });
        }
      } else {
        setCurrentIndex((prev) => prev + 1);
        setFlipped(false);
      }
    } catch {
      toast({ title: "Error", description: "Failed to save review", variant: "destructive" });
    }
  };

  const undoLast = async () => {
    if (history.length === 0) return;
    const lastEntry = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setReviewCount((prev) => Math.max(0, prev - 1));

    if (completed) {
      setCompleted(false);
    }

    // Find the card index and go back
    const idx = cards.findIndex((c) => c.id === lastEntry.card.id);
    if (idx !== -1) {
      setCurrentIndex(idx);
      setFlipped(false);
    }
  };

  const resetDeck = async () => {
    if (!confirm("Reset all SRS progress for this deck? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/decks/${deckId}/reset`, { method: "POST" });
      if (res.ok) {
        toast({ title: "Progress reset" });
        fetchCards();
      }
    } catch {
      toast({ title: "Error", description: "Failed to reset deck", variant: "destructive" });
    }
  };

  const handleDragEnd = () => {
    const xVal = x.get();
    if (xVal > 100) {
      reviewCard(4); // Right swipe = Easy
    } else if (xVal < -100) {
      reviewCard(1); // Left swipe = Again
    }
    x.set(0);
  };

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

  const currentCard = cards[currentIndex];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href={`/decks/${deckId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mixed">Mixed</SelectItem>
                <SelectItem value="words">Words Only</SelectItem>
                <SelectItem value="sentences">Sentences Only</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={resetDeck} title="Reset Deck Progress">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>{reviewCount} reviewed</span>
            <span>{currentIndex + 1} / {cards.length}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all"
              style={{ width: `${cards.length > 0 ? ((currentIndex) / cards.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {completed ? (
          <div className="text-center py-20">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
            <p className="text-muted-foreground mb-6">
              You reviewed {reviewCount} card{reviewCount !== 1 ? "s" : ""}.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={fetchCards} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Study Again
              </Button>
              <Link href={`/decks/${deckId}`}>
                <Button variant="outline">Back to Deck</Button>
              </Link>
            </div>
            {history.length > 0 && (
              <Button variant="ghost" className="mt-4 gap-2" onClick={undoLast}>
                <Undo2 className="h-4 w-4" />
                Undo Last
              </Button>
            )}
          </div>
        ) : currentCard ? (
          <div>
            {/* Swipe indicators */}
            <div className="flex justify-between mb-4 px-4">
              <motion.div style={{ opacity: leftIndicator }} className="text-destructive font-bold text-lg">
                Again
              </motion.div>
              <motion.div style={{ opacity: rightIndicator }} className="text-green-500 font-bold text-lg">
                Easy
              </motion.div>
            </div>

            {/* Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentCard.id}
                style={{ x, rotate, opacity }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={handleDragEnd}
                className="cursor-grab active:cursor-grabbing"
              >
                <Card
                  className="glass-card min-h-[300px] flex items-center justify-center cursor-pointer select-none"
                  onClick={() => setFlipped(!flipped)}
                >
                  <CardContent className="text-center p-8">
                    <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">
                      {flipped ? "Side B" : "Side A"} &middot; {currentCard.type}
                    </p>
                    <p className="text-2xl sm:text-3xl font-semibold">
                      {flipped ? currentCard.sideB : currentCard.sideA}
                    </p>
                    <p className="text-sm text-muted-foreground mt-6">
                      {flipped ? "Click to see front" : "Click to reveal answer"}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Rating Buttons */}
            <div className="grid grid-cols-4 gap-2 mt-6">
              <Button
                variant="outline"
                className="flex-col h-auto py-3 border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => reviewCard(1)}
              >
                <span className="text-lg font-bold">1</span>
                <span className="text-xs text-muted-foreground">Again</span>
              </Button>
              <Button
                variant="outline"
                className="flex-col h-auto py-3 border-orange-300 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950"
                onClick={() => reviewCard(2)}
              >
                <span className="text-lg font-bold">2</span>
                <span className="text-xs text-muted-foreground">Hard</span>
              </Button>
              <Button
                variant="outline"
                className="flex-col h-auto py-3 border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950"
                onClick={() => reviewCard(3)}
              >
                <span className="text-lg font-bold">3</span>
                <span className="text-xs text-muted-foreground">Good</span>
              </Button>
              <Button
                variant="outline"
                className="flex-col h-auto py-3 border-green-300 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-950"
                onClick={() => reviewCard(4)}
              >
                <span className="text-lg font-bold">4</span>
                <span className="text-xs text-muted-foreground">Easy</span>
              </Button>
            </div>

            {/* Undo */}
            {history.length > 0 && (
              <div className="text-center mt-4">
                <Button variant="ghost" size="sm" className="gap-2" onClick={undoLast}>
                  <Undo2 className="h-4 w-4" />
                  Undo Last
                </Button>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground mt-4">
              Swipe left = Again &middot; Swipe right = Easy &middot; Or use buttons below
            </p>
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No cards due for review. Check back later or reset the deck!</p>
            <Button variant="outline" className="mt-4" onClick={resetDeck}>
              Reset Progress
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
