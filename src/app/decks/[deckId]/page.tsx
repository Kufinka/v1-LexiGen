"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Loader2,
  Trash2,
  Pencil,
  Play,
  ArrowLeft,
  Sparkles,
  Upload,
} from "lucide-react";

interface CardItem {
  id: string;
  sideA: string;
  sideB: string;
  type: "WORD" | "SENTENCE";
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: string;
}

interface DeckDetail {
  id: string;
  name: string;
  languageA: string;
  languageB: string;
  tags: string[];
  isPublic: boolean;
  isClone: boolean;
  cards: CardItem[];
  _count: { cards: number };
}

export default function DeckDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const deckId = params.deckId as string;
  const { toast } = useToast();

  const [deck, setDeck] = useState<DeckDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCard, setNewCard] = useState({ sideA: "", sideB: "", type: "WORD" as "WORD" | "SENTENCE" });
  const [editingCard, setEditingCard] = useState<CardItem | null>(null);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [aiSentences, setAiSentences] = useState<{ sideA: string; sideB: string }[]>([]);
  const [aiSelectedIndices, setAiSelectedIndices] = useState<number[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchDeck = useCallback(async () => {
    try {
      const res = await fetch(`/api/decks/${deckId}`);
      if (res.ok) {
        const data = await res.json();
        setDeck(data);
      } else {
        router.push("/decks");
      }
    } catch {
      toast({ title: "Error", description: "Failed to load deck", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [deckId, router, toast]);

  useEffect(() => {
    if (session) fetchDeck();
  }, [session, fetchDeck]);

  const addCard = async () => {
    setCreating(true);
    try {
      const res = await fetch(`/api/decks/${deckId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCard),
      });
      if (res.ok) {
        setAddDialogOpen(false);
        setNewCard({ sideA: "", sideB: "", type: "WORD" });
        fetchDeck();
        toast({ title: "Card added!" });
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to add card", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const updateCard = async () => {
    if (!editingCard) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/decks/${deckId}/cards/${editingCard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sideA: editingCard.sideA, sideB: editingCard.sideB, type: editingCard.type }),
      });
      if (res.ok) {
        setEditDialogOpen(false);
        setEditingCard(null);
        fetchDeck();
        toast({ title: "Card updated!" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update card", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const deleteCard = async (cardId: string) => {
    if (!confirm("Delete this card?")) return;
    try {
      const res = await fetch(`/api/decks/${deckId}/cards/${cardId}`, { method: "DELETE" });
      if (res.ok) {
        fetchDeck();
        toast({ title: "Card deleted" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete card", variant: "destructive" });
    }
  };

  const toggleWordSelection = (word: string) => {
    setSelectedWords((prev) =>
      prev.includes(word)
        ? prev.filter((w) => w !== word)
        : prev.length < 10
        ? [...prev, word]
        : prev
    );
  };

  const generateSentences = async () => {
    if (selectedWords.length < 2 || !deck) return;
    setAiLoading(true);
    setAiSentences([]);
    setAiSelectedIndices([]);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          words: selectedWords,
          languageA: deck.languageA,
          languageB: deck.languageB,
        }),
      });
      const data = await res.json();
      if (res.ok && data.sentences) {
        setAiSentences(data.sentences);
      } else {
        toast({ title: "Error", description: data.error || "AI generation failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "AI generation failed", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const saveAiSentences = async () => {
    const toSave = aiSelectedIndices.map((i) => ({
      sideA: aiSentences[i].sideA,
      sideB: aiSentences[i].sideB,
      type: "SENTENCE" as const,
    }));
    if (toSave.length === 0) return;
    try {
      const res = await fetch(`/api/decks/${deckId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSave),
      });
      if (res.ok) {
        setAiDialogOpen(false);
        setAiSentences([]);
        setAiSelectedIndices([]);
        setSelectedWords([]);
        fetchDeck();
        toast({ title: `${toSave.length} sentences added!` });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save sentences", variant: "destructive" });
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast({ title: "Info", description: "APKG import processes basic text-based card data. Complex formatting may be simplified." });

    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      const importedCards: { sideA: string; sideB: string; type: "WORD" | "SENTENCE" }[] = [];

      for (const line of lines) {
        const parts = line.split("\t");
        if (parts.length >= 2) {
          const sideA = parts[0].replace(/<[^>]*>/g, "").trim();
          const sideB = parts[1].replace(/<[^>]*>/g, "").trim();
          if (sideA && sideB) {
            importedCards.push({
              sideA,
              sideB,
              type: sideA.split(" ").length > 3 ? "SENTENCE" : "WORD",
            });
          }
        }
      }

      if (importedCards.length === 0) {
        toast({ title: "Error", description: "No valid cards found in file. Expected tab-separated format.", variant: "destructive" });
        return;
      }

      setAiSentences(importedCards);
      setAiSelectedIndices(importedCards.map((_, i) => i));
      setImportDialogOpen(true);
    } catch {
      toast({ title: "Error", description: "Failed to read file", variant: "destructive" });
    }
  };

  const saveImportedCards = async () => {
    const toSave = aiSelectedIndices.map((i) => ({
      sideA: aiSentences[i].sideA,
      sideB: aiSentences[i].sideB,
      type: (aiSentences[i].sideA.split(" ").length > 3 ? "SENTENCE" : "WORD") as "WORD" | "SENTENCE",
    }));
    if (toSave.length === 0) return;
    try {
      const res = await fetch(`/api/decks/${deckId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSave),
      });
      if (res.ok) {
        setImportDialogOpen(false);
        setAiSentences([]);
        setAiSelectedIndices([]);
        fetchDeck();
        toast({ title: `${toSave.length} cards imported!` });
      }
    } catch {
      toast({ title: "Error", description: "Failed to import cards", variant: "destructive" });
    }
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

  if (!deck) return null;

  const wordCards = deck.cards.filter((c) => c.type === "WORD");

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <Link href="/decks">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{deck.name}</h1>
            <p className="text-muted-foreground">
              {deck.languageA} ↔ {deck.languageB} &middot; {deck.cards.length} cards
            </p>
          </div>
        </div>

        {deck.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-6 ml-14">
            {deck.tags.map((tag) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link href={`/decks/${deckId}/study`}>
            <Button className="gap-2">
              <Play className="h-4 w-4" />
              Study
            </Button>
          </Link>

          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Card
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Card</DialogTitle>
                <DialogDescription>Create a new flashcard for this deck.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{deck.languageA}</Label>
                  <Input
                    placeholder={`Enter ${deck.languageA} text`}
                    value={newCard.sideA}
                    onChange={(e) => setNewCard({ ...newCard, sideA: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{deck.languageB}</Label>
                  <Input
                    placeholder={`Enter ${deck.languageB} text`}
                    value={newCard.sideB}
                    onChange={(e) => setNewCard({ ...newCard, sideB: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newCard.type} onValueChange={(v) => setNewCard({ ...newCard, type: v as "WORD" | "SENTENCE" })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WORD">Word</SelectItem>
                      <SelectItem value="SENTENCE">Sentence</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={addCard} disabled={creating || !newCard.sideA || !newCard.sideB}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Card
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* AI Generate */}
          <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Sparkles className="h-4 w-4" />
                AI Generate
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>AI Sentence Generation</DialogTitle>
                <DialogDescription>Select 2-10 words then generate natural sentences.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label className="mb-2 block">Select words ({selectedWords.length}/10)</Label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                    {wordCards.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No word cards in this deck yet.</p>
                    ) : (
                      wordCards.map((card) => (
                        <Badge
                          key={card.id}
                          variant={selectedWords.includes(card.sideA) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleWordSelection(card.sideA)}
                        >
                          {card.sideA}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
                <Button onClick={generateSentences} disabled={aiLoading || selectedWords.length < 2}>
                  {aiLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Sentences
                </Button>
                {aiSentences.length > 0 && (
                  <div className="space-y-2">
                    <Label>Generated Sentences (select to save)</Label>
                    {aiSentences.map((s, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          aiSelectedIndices.includes(i) ? "bg-primary/10 border-primary" : "hover:bg-muted"
                        }`}
                        onClick={() =>
                          setAiSelectedIndices((prev) =>
                            prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
                          )
                        }
                      >
                        <p className="text-sm font-medium">{s.sideA}</p>
                        <p className="text-sm text-muted-foreground">{s.sideB}</p>
                      </div>
                    ))}
                    <Button onClick={saveAiSentences} disabled={aiSelectedIndices.length === 0}>
                      Save {aiSelectedIndices.length} Sentence{aiSelectedIndices.length !== 1 ? "s" : ""}
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Import */}
          <Button variant="outline" className="gap-2" asChild>
            <label>
              <Upload className="h-4 w-4" />
              Import
              <input type="file" accept=".apkg,.txt,.tsv,.csv" className="hidden" onChange={handleFileImport} />
            </label>
          </Button>
        </div>

        {/* Import Dialog */}
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Import Cards</DialogTitle>
              <DialogDescription>Select which cards to keep.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              {aiSentences.map((s, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    aiSelectedIndices.includes(i) ? "bg-primary/10 border-primary" : "hover:bg-muted"
                  }`}
                  onClick={() =>
                    setAiSelectedIndices((prev) =>
                      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
                    )
                  }
                >
                  <p className="text-sm font-medium">{s.sideA}</p>
                  <p className="text-sm text-muted-foreground">{s.sideB}</p>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={saveImportedCards} disabled={aiSelectedIndices.length === 0}>
                Import {aiSelectedIndices.length} Card{aiSelectedIndices.length !== 1 ? "s" : ""}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Card Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Card</DialogTitle>
              <DialogDescription>Modify this flashcard.</DialogDescription>
            </DialogHeader>
            {editingCard && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{deck.languageA}</Label>
                  <Input
                    value={editingCard.sideA}
                    onChange={(e) => setEditingCard({ ...editingCard, sideA: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{deck.languageB}</Label>
                  <Input
                    value={editingCard.sideB}
                    onChange={(e) => setEditingCard({ ...editingCard, sideB: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={editingCard.type}
                    onValueChange={(v) => setEditingCard({ ...editingCard, type: v as "WORD" | "SENTENCE" })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WORD">Word</SelectItem>
                      <SelectItem value="SENTENCE">Sentence</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={updateCard} disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cards List */}
        <div className="space-y-3">
          {deck.cards.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No cards yet. Add some cards to get started!</p>
            </div>
          ) : (
            deck.cards.map((card) => (
              <Card key={card.id} className="glass-card">
                <CardContent className="flex items-center justify-between py-4 px-6">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                    <p className="font-medium">{card.sideA}</p>
                    <p className="text-muted-foreground">{card.sideB}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={card.type === "WORD" ? "default" : "secondary"} className="text-xs">
                        {card.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditingCard(card);
                        setEditDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteCard(card.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
