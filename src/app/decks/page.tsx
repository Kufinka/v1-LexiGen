"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, BookOpen, Loader2, Trash2, Eye, EyeOff, Search, Copy, Clock, CheckCircle2 } from "lucide-react";
import { LANGUAGES } from "@/lib/languages";

interface Deck {
  id: string;
  name: string;
  description: string | null;
  languageA: string;
  languageB: string;
  tags: string[];
  isPublic: boolean;
  isClone: boolean;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
  dueCount: number;
  clonedFromUser: { id: string; username: string } | null;
  _count: { cards: number };
}

export default function DecksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [allDecks, setAllDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDeckId, setDeletingDeckId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [newDeck, setNewDeck] = useState({ name: "", description: "", languageA: "", languageB: "", tags: "" });
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchDecks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("sort", sortBy);
      const res = await fetch(`/api/decks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAllDecks(data);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load decks", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [sortBy, toast]);

  useEffect(() => {
    if (session) fetchDecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, sortBy]);

  // Stable tag list from ALL decks, not filtered ones
  const allTags = useMemo(() => {
    const tags = Array.from(new Set(allDecks.flatMap((d) => d.tags)));
    if (allDecks.some((d) => d.isClone) && !tags.includes("Cloned")) tags.push("Cloned");
    return tags;
  }, [allDecks]);

  // Client-side filtering for instant search
  const decks = useMemo(() => {
    let filtered = allDecks;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.languageA.toLowerCase().includes(q) ||
          d.languageB.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q)) ||
          (d.isClone && "cloned".includes(q))
      );
    }
    if (tagFilter && tagFilter !== "all") {
      if (tagFilter === "Cloned") {
        filtered = filtered.filter((d) => d.isClone);
      } else {
        filtered = filtered.filter((d) => d.tags.includes(tagFilter));
      }
    }
    return filtered;
  }, [allDecks, search, tagFilter]);

  // Debounced search - no button needed
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {}, 200);
  };

  const MAX_TAG_LENGTH = 20;

  const createDeck = async () => {
    const rawTags = newDeck.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    const tooLong = rawTags.find((t) => t.length > MAX_TAG_LENGTH);
    if (tooLong) {
      toast({ title: "Tag too long", description: `"${tooLong}" exceeds ${MAX_TAG_LENGTH} characters. Please shorten it.`, variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const tags = Array.from(new Set(rawTags));
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDeck.name,
          description: newDeck.description || undefined,
          languageA: newDeck.languageA,
          languageB: newDeck.languageB,
          tags,
        }),
      });

      if (res.ok) {
        setDialogOpen(false);
        setNewDeck({ name: "", description: "", languageA: "", languageB: "", tags: "" });
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

  const deleteDeck = async () => {
    if (!deletingDeckId) return;
    setDeleteDialogOpen(false);
    try {
      const res = await fetch(`/api/decks/${deletingDeckId}`, { method: "DELETE" });
      if (res.ok) {
        fetchDecks();
        toast({ title: "Deck deleted" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete deck", variant: "destructive" });
    } finally {
      setDeletingDeckId(null);
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

  const getDeckBorderClass = (deck: Deck) => {
    if (deck.isClone) return "border-2 border-amber-500 dark:border-amber-400";
    if (deck.isPublic) return "border-2 border-emerald-500 dark:border-emerald-400";
    return "border-2 border-blue-500 dark:border-blue-400";
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
        <div className="flex items-center justify-between mb-6">
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
                    placeholder="e.g., Travel"
                    value={newDeck.name}
                    onChange={(e) => setNewDeck({ ...newDeck, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    placeholder="Describe your deck..."
                    value={newDeck.description}
                    onChange={(e) => setNewDeck({ ...newDeck, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Language A</Label>
                    <Select value={newDeck.languageA} onValueChange={(v) => setNewDeck({ ...newDeck, languageA: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.code} value={lang.name}>{lang.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Language B</Label>
                    <Select value={newDeck.languageB} onValueChange={(v) => setNewDeck({ ...newDeck, languageB: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.code} value={lang.name}>{lang.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tags (comma separated, max {MAX_TAG_LENGTH} chars each)</Label>
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

        {/* Search, Filter, Sort */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search decks, languages, tags, cloned..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={tagFilter || "all"} onValueChange={(v) => setTagFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Filter tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {allTags.map((tag) => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updatedAt">Last Modified</SelectItem>
              <SelectItem value="createdAt">Date Created</SelectItem>
              <SelectItem value="lastAccessedAt">Last Studied</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs text-muted-foreground mb-6">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm border-2 border-blue-500 dark:border-blue-400" /> Private</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm border-2 border-emerald-500 dark:border-emerald-400" /> Public</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm border-2 border-amber-500 dark:border-amber-400" /> Cloned</span>
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
              <Card key={deck.id} className={`glass-card hover:scale-[1.02] transition-transform duration-200 group ${getDeckBorderClass(deck)}`}>
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
                        {deck.isPublic ? <Eye className="h-4 w-4 text-emerald-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => { setDeletingDeckId(deck.id); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Link href={`/decks/${deck.id}`}>
                    <p className="text-sm text-muted-foreground mb-2">
                      {deck.languageA} ↔ {deck.languageB}
                    </p>
                    <div className="flex items-center gap-3 text-sm mb-3">
                      <span>{deck._count.cards} cards</span>
                      {deck.dueCount > 0 ? (
                        <span className="flex items-center gap-1 text-primary font-medium">
                          <Clock className="h-3 w-3" />
                          {deck.dueCount} due
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-500">
                          <CheckCircle2 className="h-3 w-3" />
                          All caught up!
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {deck.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                      {deck.isClone && (
                        <Badge variant="outline" className="text-xs border-amber-400 text-amber-600 dark:text-amber-400">
                          <Copy className="h-3 w-3 mr-1" />
                          {deck.clonedFromUser
                            ? `Cloned from ${deck.clonedFromUser.username}`
                            : "Cloned"}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                      <p>Last Studied {new Date(deck.lastAccessedAt).toLocaleDateString()}</p>
                      <p>Last Modified {new Date(deck.updatedAt).toLocaleDateString()}</p>
                      <p>Created {new Date(deck.createdAt).toLocaleDateString()}</p>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Deck</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this deck? All cards and study progress will be permanently removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={deleteDeck}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
