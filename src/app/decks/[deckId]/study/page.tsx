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
  const mins = result.interval;
  if (mins <= 10) return `<${mins} min`;
  if (mins < 60) return `${mins} min`;
  if (mins < 24 * 60) {
    const hrs = mins / 60;
    return hrs === Math.floor(hrs) ? `${hrs} hr` : `${hrs.toFixed(1)} hr`;
  }
  const days = Math.round(mins / (24 * 60));
  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.round(days / 30)} mo`;
  return `${Math.round(days / 365)} yr`;
}

export default function StudyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const deckId = params.deckId as string;
  const { toast } = useToast();

  // All cards from the deck (master list — updated with SRS values after each review)
  const [allCards, setAllCards] = useState<StudyCard[]>([]);
  // The current card being shown
  const [currentCard, setCurrentCard] = useState<StudyCard | null>(null);
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
  // Queue counters for UI display
  const [queueCounts, setQueueCounts] = useState({ newCount: 0, learningCount: 0, dueCount: 0 });
  const [waitingForLearning, setWaitingForLearning] = useState(false);
  const learningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeSecondsRef = useRef(0);
  const timerActiveRef = useRef(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const IDLE_TIMEOUT = 120_000; // 120 seconds

  // --- 3-Queue classification ---
  // Learning: interval <= 10 min AND has been reviewed at least once in this session (repetitions > 0)
  // Due: interval > 10 min AND nextReview <= now (mature cards that are due)
  // New: repetitions === 0 AND nextReview <= now (never reviewed)
  const LEARNING_THRESHOLD = 10; // minutes

  const classifyCards = useCallback((cards: StudyCard[]) => {
    const now = new Date();
    const newQueue: StudyCard[] = [];
    const learningQueue: StudyCard[] = [];
    const dueQueue: StudyCard[] = [];
    const waitingLearning: StudyCard[] = [];

    for (const card of cards) {
      const isDue = new Date(card.nextReview) <= now;
      if (card.repetitions === 0 && isDue) {
        newQueue.push(card);
      } else if (card.interval <= LEARNING_THRESHOLD && card.repetitions > 0) {
        if (isDue) {
          learningQueue.push(card); // Due learning — highest priority
        } else {
          waitingLearning.push(card); // Learning but not yet due — will loop back
        }
      } else if (isDue && card.repetitions > 0) {
        dueQueue.push(card);
      }
      // Cards with interval > 10 that aren't due yet are simply not shown
    }

    return { newQueue, learningQueue, dueQueue, waitingLearning };
  }, []);

  const pickNextCard = useCallback((cards: StudyCard[]): StudyCard | null => {
    const { learningQueue, dueQueue, newQueue, waitingLearning } = classifyCards(cards);

    setQueueCounts({
      newCount: newQueue.length,
      learningCount: learningQueue.length + waitingLearning.length,
      dueCount: dueQueue.length,
    });

    // Priority: due learning → due → new
    if (learningQueue.length > 0) return learningQueue[0];
    if (dueQueue.length > 0) return dueQueue[0];
    if (newQueue.length > 0) return newQueue[0];

    // If there are learning cards waiting, schedule a check
    if (waitingLearning.length > 0) {
      // Find soonest due learning card
      const soonest = waitingLearning.reduce((a, b) =>
        new Date(a.nextReview) < new Date(b.nextReview) ? a : b
      );
      const waitMs = Math.max(0, new Date(soonest.nextReview).getTime() - Date.now());
      setWaitingForLearning(true);
      if (learningTimerRef.current) clearTimeout(learningTimerRef.current);
      learningTimerRef.current = setTimeout(() => {
        setWaitingForLearning(false);
        // Re-pick — the card should now be due
        setAllCards((prev) => [...prev]); // trigger re-render
      }, waitMs + 100); // small buffer
      return null;
    }

    return null; // truly done
  }, [classifyCards]);

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
        const data: StudyCard[] = await res.json();
        setAllCards(data);
        setFlipped(false);
        setHistory([]);
        setReviewCount(0);
        setWaitingForLearning(false);
        if (learningTimerRef.current) clearTimeout(learningTimerRef.current);
        const next = pickNextCard(data);
        setCurrentCard(next);
        setCompleted(!next && classifyCards(data).waitingLearning.length === 0);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load study cards", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [deckId, filter, toast, pickNextCard, classifyCards]);

  const startTimer = useCallback(() => {
    if (timerActiveRef.current) return;
    timerActiveRef.current = true;
    timerIntervalRef.current = setInterval(() => {
      activeSecondsRef.current += 1;
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    timerActiveRef.current = false;
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    // If timer was stopped due to idle, restart it
    if (!timerActiveRef.current && document.visibilityState === "visible") {
      startTimer();
    }
    idleTimerRef.current = setTimeout(() => {
      stopTimer();
    }, IDLE_TIMEOUT);
  }, [startTimer, stopTimer]);

  const startSession = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSessionId(data.id);
        activeSecondsRef.current = 0;
        startTimer();
        resetIdleTimer();
      }
    } catch {
      // Session tracking is optional
    }
  }, [startTimer, resetIdleTimer]);

  const endSession = useCallback(async () => {
    if (sessionId) {
      const id = sessionId;
      setSessionId(null);
      stopTimer();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      try {
        await fetch(`/api/sessions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activeSeconds: activeSecondsRef.current }),
        });
      } catch {
        // ignore
      }
    }
  }, [sessionId, stopTimer]);

  useEffect(() => {
    if (session) {
      // End previous session before starting a new one (e.g. filter change)
      if (sessionId) {
        stopTimer();
        fetch(`/api/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activeSeconds: activeSecondsRef.current }),
        }).catch(() => {});
        setSessionId(null);
      }
      fetchCards();
      startSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, filter]);

  // Visibility & focus: pause/resume timer
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        stopTimer();
      } else if (sessionId) {
        startTimer();
        resetIdleTimer();
      }
    };
    const handleBlur = () => stopTimer();
    const handleFocus = () => {
      if (sessionId) {
        startTimer();
        resetIdleTimer();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [sessionId, startTimer, stopTimer, resetIdleTimer]);

  // Idle detection: any user interaction resets idle timer
  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    const handler = () => resetIdleTimer();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    return () => { events.forEach((e) => window.removeEventListener(e, handler)); };
  }, [resetIdleTimer]);

  // End session on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionId) {
        const blob = new Blob([JSON.stringify({ activeSeconds: activeSecondsRef.current })], { type: "application/json" });
        navigator.sendBeacon(`/api/sessions/${sessionId}/end`, blob);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      endSession();
    };
  }, [endSession, sessionId]);

  // When allCards changes (e.g. from learning timer re-trigger), re-pick next card
  useEffect(() => {
    if (!loading && allCards.length > 0 && !currentCard) {
      const next = pickNextCard(allCards);
      if (next) {
        setCurrentCard(next);
        setFlipped(false);
        setCompleted(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCards]);

  const advanceToNext = useCallback((updatedCards: StudyCard[]) => {
    const next = pickNextCard(updatedCards);
    if (next) {
      setCurrentCard(next);
      setFlipped(false);
    } else {
      setCurrentCard(null);
      const { waitingLearning } = classifyCards(updatedCards);
      if (waitingLearning.length === 0) {
        setCompleted(true);
        endSession();
      }
      // else: pickNextCard already scheduled a timer for learning cards
    }
  }, [pickNextCard, classifyCards, endSession]);

  const reviewCard = async (rating: number) => {
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

      // Update the card's SRS values in the master list
      const updatedCards = allCards.map((c) =>
        c.id === currentCard.id
          ? { ...c, easeFactor: updatedCard.easeFactor, interval: updatedCard.interval, repetitions: updatedCard.repetitions, nextReview: updatedCard.nextReview }
          : c
      );
      setAllCards(updatedCards);
      setReviewCount((prev) => prev + 1);

      // Pick next card from queues
      advanceToNext(updatedCards);
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

    // Restore local SRS values
    const restoredCards = allCards.map((c) =>
      c.id === lastEntry.card.id
        ? { ...c, easeFactor: lastEntry.prevEF, interval: lastEntry.prevInterval, repetitions: lastEntry.prevReps, nextReview: lastEntry.prevNextReview }
        : c
    );
    setAllCards(restoredCards);
    setCurrentCard(lastEntry.card);
    setFlipped(false);
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
      reviewCard(2); // Swipe right = Hard
    } else if (xVal < -100) {
      reviewCard(1); // Swipe left = Again
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

  // Total actionable cards (due + new + learning)
  const totalActionable = queueCounts.newCount + queueCounts.learningCount + queueCounts.dueCount;
  const progressPercent = totalActionable > 0 ? (reviewCount / (reviewCount + totalActionable)) * 100 : (reviewCount > 0 ? 100 : 0);

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

        {/* Progress & Queue Counts */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>{reviewCount} reviewed</span>
            <div className="flex gap-2 text-xs">
              <span className="text-blue-500">{queueCounts.newCount} new</span>
              <span className="text-orange-500">{queueCounts.learningCount} learning</span>
              <span className="text-green-500">{queueCounts.dueCount} due</span>
            </div>
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
              <motion.div style={{ opacity: leftIndicator }} className="text-red-500 font-bold text-lg">
                Again
              </motion.div>
              <motion.div style={{ opacity: rightIndicator }} className="text-orange-500 font-bold text-lg">
                Hard
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
              Swipe left = Again &middot; Swipe right = Hard &middot; Or use buttons
            </p>
          </div>
        ) : waitingForLearning ? (
          <div className="text-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Waiting for learning cards...</h2>
            <p className="text-muted-foreground mb-4">A card will become due shortly. Hang tight!</p>
            {history.length > 0 && (
              <Button variant="ghost" className="gap-2" onClick={undoLast}>
                <Undo2 className="h-4 w-4" />
                Undo Last
              </Button>
            )}
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
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-red-600 dark:text-red-400">1 &middot; Again</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">⬅ Swipe Left</span>
              </div>
              <p className="text-muted-foreground text-xs">You forgot the answer completely. The card resets and you&apos;ll see it again in under 1 minute.</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-orange-600 dark:text-orange-400">2 &middot; Hard</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300">➡ Swipe Right</span>
              </div>
              <p className="text-muted-foreground text-xs">You recalled it but with difficulty. Base interval: &lt;5 min, then grows slowly with each review.</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-blue-600 dark:text-blue-400">3 &middot; Good</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">Button Only</span>
              </div>
              <p className="text-muted-foreground text-xs">Normal recall. Base interval: 1 hour, then grows proportionally with your ease factor.</p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-green-600 dark:text-green-400">4 &middot; Easy</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">Button Only</span>
              </div>
              <p className="text-muted-foreground text-xs">Instant, effortless recall. Base interval: 5 hours, then grows faster than Good.</p>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              The time shown under each button is the estimated next review interval based on the card&apos;s current state.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
