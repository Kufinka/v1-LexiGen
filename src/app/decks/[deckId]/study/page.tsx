"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Loader2,
  RotateCcw,
  Undo2,
  CheckCircle2,
  RefreshCw,
  ArrowLeftRight,
  Info,
} from "lucide-react";
import { calculateSRS } from "@/lib/srs";

interface StudyCard {
  id: string;
  sideA: string;
  sideB: string;
  type: "WORD" | "SENTENCE";
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: string;
}

interface HistoryEntry {
  card: StudyCard;
  rating: number;
  prevEF: number;
  prevInterval: number;
  prevReps: number;
  prevNextReview: string;
}

function getNextReviewLabel(card: StudyCard, rating: number): string {
  const result = calculateSRS(
    { easeFactor: card.easeFactor, interval: card.interval, repetitions: card.repetitions },
    rating
  );
  if (result.interval === 0) return "~10 min";
  if (result.interval === 1) return "1 day";
  if (result.interval < 30) return `${result.interval} days`;
  if (result.interval < 365) return `${Math.round(result.interval / 30)} mo`;
  return `${Math.round(result.interval / 365)} yr`;
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
  const [direction, setDirection] = useState<"a2b" | "b2a">("a2b");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [completed, setCompleted] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [srsInfoOpen, setSrsInfoOpen] = useState(false);
  const sessionStartRef = useRef<number>(Date.now());

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
        sessionStartRef.current = Date.now();
      }
    } catch {
      // Session tracking is optional
    }
  }, []);

  const endSession = useCallback(async () => {
    if (sessionId) {
      try {
        await fetch(`/api/sessions/${sessionId}`, { method: "PATCH" });
      } catch {
        // ignore
      }
    }
  }, [sessionId]);

  useEffect(() => {
    if (session) {
      fetchCards();
      startSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, filter]);

  // End session when user leaves the page
  useEffect(() => {
    const handleBeforeUnload = () => { endSession(); };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      endSession();
    };
  }, [endSession]);

  const reviewCard = async (rating: number) => {
    const currentCard = cards[currentIndex];
    if (!currentCard) return;

    try {
      const res = await fetch(`/api/decks/${deckId}/study`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: currentCard.id, rating, sessionId }),
      });

      if (!res.ok) {
        toast({ title: "Error", description: "Failed to save review", variant: "destructive" });
        return;
      }

      const { card: updatedCard } = await res.json();

      // Store previous SRS state for undo
      setHistory((prev) => [
        ...prev,
        {
          card: currentCard,
          rating,
          prevEF: currentCard.easeFactor,
          prevInterval: currentCard.interval,
          prevReps: currentCard.repetitions,
          prevNextReview: currentCard.nextReview,
        },
      ]);

      // Update the card's SRS values in local state
      setCards((prev) =>
        prev.map((c) =>
          c.id === currentCard.id
            ? { ...c, easeFactor: updatedCard.easeFactor, interval: updatedCard.interval, repetitions: updatedCard.repetitions }
            : c
        )
      );

      setReviewCount((prev) => prev + 1);

      if (currentIndex + 1 >= cards.length) {
        setCompleted(true);
        endSession();
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

    try {
      // Revert the card's SRS state on the server
      await fetch(`/api/decks/${deckId}/cards/${lastEntry.card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sideA: lastEntry.card.sideA,
          sideB: lastEntry.card.sideB,
          type: lastEntry.card.type,
          easeFactor: lastEntry.prevEF,
          interval: lastEntry.prevInterval,
          repetitions: lastEntry.prevReps,
          nextReview: lastEntry.prevNextReview,
        }),
      });
    } catch {
      // Continue with local undo even if server fails
    }

    setHistory((prev) => prev.slice(0, -1));
    setReviewCount((prev) => Math.max(0, prev - 1));

    if (completed) {
      setCompleted(false);
    }

    // Restore local SRS values and go back
    setCards((prev) =>
      prev.map((c) =>
        c.id === lastEntry.card.id
          ? { ...c, easeFactor: lastEntry.prevEF, interval: lastEntry.prevInterval, repetitions: lastEntry.prevReps, nextReview: lastEntry.prevNextReview }
          : c
      )
    );

    const idx = cards.findIndex((c) => c.id === lastEntry.card.id);
    if (idx !== -1) {
      setCurrentIndex(idx);
      setFlipped(false);
    }
  };

  const resetDeck = async () => {
    setResetDialogOpen(false);
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
      reviewCard(4);
    } else if (xVal < -100) {
      reviewCard(1);
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
  const progressPercent = cards.length > 0 ? (reviewCount / cards.length) * 100 : 0;

  // Determine which side to show based on direction
  const frontSide = direction === "a2b" ? "sideA" : "sideB";
  const backSide = direction === "a2b" ? "sideB" : "sideA";

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
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDirection((d) => (d === "a2b" ? "b2a" : "a2b"))}
              title={direction === "a2b" ? "A → B" : "B → A"}
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
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
            <Button variant="outline" size="icon" onClick={() => setSrsInfoOpen(true)} title="SRS Info">
              <Info className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setResetDialogOpen(true)} title="Reset Deck Progress">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Direction indicator */}
        <div className="text-center text-xs text-muted-foreground mb-2">
          Direction: {direction === "a2b" ? "A → B" : "B → A"}
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>{reviewCount} reviewed</span>
            <span>{Math.min(currentIndex + 1, cards.length)} / {cards.length}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
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
              <Button onClick={() => { fetchCards(); startSession(); }} className="gap-2">
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
                key={currentCard.id + direction}
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
                      {flipped ? (direction === "a2b" ? "Side B" : "Side A") : (direction === "a2b" ? "Side A" : "Side B")} &middot; {currentCard.type}
                    </p>
                    <p className="text-2xl sm:text-3xl font-semibold">
                      {flipped ? currentCard[backSide] : currentCard[frontSide]}
                    </p>
                    <p className="text-sm text-muted-foreground mt-6">
                      {flipped ? "Click to see front" : "Click to reveal answer"}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Rating Buttons with SRS time hints */}
            <div className="grid grid-cols-4 gap-2 mt-6">
              <Button
                variant="outline"
                className="flex-col h-auto py-3 border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => reviewCard(1)}
              >
                <span className="text-lg font-bold">1</span>
                <span className="text-xs text-muted-foreground">Again</span>
                <span className="text-[10px] text-muted-foreground/70">{getNextReviewLabel(currentCard, 1)}</span>
              </Button>
              <Button
                variant="outline"
                className="flex-col h-auto py-3 border-orange-300 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950"
                onClick={() => reviewCard(2)}
              >
                <span className="text-lg font-bold">2</span>
                <span className="text-xs text-muted-foreground">Hard</span>
                <span className="text-[10px] text-muted-foreground/70">{getNextReviewLabel(currentCard, 2)}</span>
              </Button>
              <Button
                variant="outline"
                className="flex-col h-auto py-3 border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950"
                onClick={() => reviewCard(3)}
              >
                <span className="text-lg font-bold">3</span>
                <span className="text-xs text-muted-foreground">Good</span>
                <span className="text-[10px] text-muted-foreground/70">{getNextReviewLabel(currentCard, 3)}</span>
              </Button>
              <Button
                variant="outline"
                className="flex-col h-auto py-3 border-green-300 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-950"
                onClick={() => reviewCard(4)}
              >
                <span className="text-lg font-bold">4</span>
                <span className="text-xs text-muted-foreground">Easy</span>
                <span className="text-[10px] text-muted-foreground/70">{getNextReviewLabel(currentCard, 4)}</span>
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
              Swipe left = Again &middot; Swipe right = Easy &middot; Or use buttons
            </p>
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No cards due for review. Check back later or reset the deck!</p>
            <Button variant="outline" className="mt-4" onClick={() => setResetDialogOpen(true)}>
              Reset Progress
            </Button>
          </div>
        )}
      </div>

      {/* Reset Confirm Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Progress</DialogTitle>
            <DialogDescription>
              This will reset all SRS progress for this deck. All cards will be due for review again. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={resetDeck}>Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SRS Info Dialog */}
      <Dialog open={srsInfoOpen} onOpenChange={setSrsInfoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>How Spaced Repetition Works</DialogTitle>
            <DialogDescription>The SM-2 algorithm schedules reviews at optimal intervals.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4 text-sm">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
              <span className="font-bold text-red-600 dark:text-red-400 min-w-[60px]">1 Again</span>
              <span className="text-muted-foreground">Card resets to the beginning. You&apos;ll see it again immediately in the next session. The ease factor decreases.</span>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900">
              <span className="font-bold text-orange-600 dark:text-orange-400 min-w-[60px]">2 Hard</span>
              <span className="text-muted-foreground">The interval is reduced by ~20%. Next review comes sooner than normal. Ease factor slightly decreases.</span>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
              <span className="font-bold text-blue-600 dark:text-blue-400 min-w-[60px]">3 Good</span>
              <span className="text-muted-foreground">Normal progression. Interval grows based on the current ease factor. First review: 1 day, second: 6 days, then multiplied by ease.</span>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
              <span className="font-bold text-green-600 dark:text-green-400 min-w-[60px]">4 Easy</span>
              <span className="text-muted-foreground">The interval gets a 30% bonus. You won&apos;t see this card for a longer time. Ease factor increases.</span>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              The time shown under each button is the estimated next review date based on the card&apos;s current state.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
