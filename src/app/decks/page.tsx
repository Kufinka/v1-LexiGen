"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, BookOpen, Loader2, Trash2, Globe, Lock } from "lucide-react";

interface Deck {
  id: string;
  name: string;
  languageA: string;
  languageB: string;
  tags: string[];
  isPublic: boolean;
  isClone: boolean;
  _count: { cards: number };
}

export default function DecksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDeck, setNewDeck] = useState({ name: "", languageA: "", languageB: "", tags: "" });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session) fetchDecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchDecks = async () => {
    try {
      const res = await fetch("/api/decks");
      if (res.ok) {
        const data = await res.json();
        setDecks(data);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load decks", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const createDeck = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDeck.name,
          languageA: newDeck.languageA,
          languageB: newDeck.languageB,
          tags: newDeck.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });

      if (res.ok) {
        setDialogOpen(false);
        setNewDeck({ name: "", languageA: "", languageB: "", tags: "" });
        fetchDecks();
        toast({ title: "Deck created!" });
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create deck", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const deleteDeck = async (deckId: string) => {
    if (!confirm("Are you sure you want to delete this deck?")) return;
    try {
      const res = await fetch(`/api/decks/${deckId}`, { method: "DELETE" });
      if (res.ok) {
        fetchDecks();
        toast({ title: "Deck deleted" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete deck", variant: "destructive" });
    }
  };

  const togglePublic = async (deck: Deck) => {
    if (deck.isClone && !deck.isPublic) {
      toast({ title: "Error", description: "Cloned decks cannot be made public", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(`/api/decks/${deck.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !deck.isPublic }),
      });
      if (res.ok) {
        fetchDecks();
        toast({ title: deck.isPublic ? "Deck is now private" : "Deck is now public" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update deck", variant: "destructive" });
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

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Decks</h1>
            <p className="text-muted-foreground mt-1">
              {decks.length} deck{decks.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Deck
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Deck</DialogTitle>
                <DialogDescription>Set up a new flashcard deck with two languages.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Deck Name</Label>
                  <Input
                    placeholder="e.g., Travel Japanese"
                    value={newDeck.name}
                    onChange={(e) => setNewDeck({ ...newDeck, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Language A</Label>
                    <Input
                      placeholder="e.g., English"
                      value={newDeck.languageA}
                      onChange={(e) => setNewDeck({ ...newDeck, languageA: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Language B</Label>
                    <Input
                      placeholder="e.g., Japanese"
                      value={newDeck.languageB}
                      onChange={(e) => setNewDeck({ ...newDeck, languageB: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tags (comma separated)</Label>
                  <Input
                    placeholder="e.g., travel, beginner, japan"
                    value={newDeck.tags}
                    onChange={(e) => setNewDeck({ ...newDeck, tags: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createDeck} disabled={creating || !newDeck.name || !newDeck.languageA || !newDeck.languageB}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Deck
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {decks.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No decks yet</h2>
            <p className="text-muted-foreground mb-4">Create your first deck to start learning!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {decks.map((deck) => (
              <Card key={deck.id} className="glass-card hover:scale-[1.02] transition-transform duration-200 group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Link href={`/decks/${deck.id}`} className="flex-1">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">{deck.name}</CardTitle>
                    </Link>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => togglePublic(deck)}
                        title={deck.isPublic ? "Make private" : "Make public"}
                      >
                        {deck.isPublic ? <Globe className="h-4 w-4 text-green-500" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteDeck(deck.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Link href={`/decks/${deck.id}`}>
                    <p className="text-sm text-muted-foreground mb-3">
                      {deck.languageA} ↔ {deck.languageB}
                    </p>
                    <p className="text-sm mb-3">{deck._count.cards} cards</p>
                    {deck.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {deck.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {deck.isClone && (
                      <Badge variant="outline" className="mt-2 text-xs">Cloned</Badge>
                    )}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
