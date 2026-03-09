"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Star,
  MessageCircle,
  Copy,
  Loader2,
  Users,
} from "lucide-react";

interface CommunityDeck {
  id: string;
  name: string;
  languageA: string;
  languageB: string;
  tags: string[];
  avgRating: number;
  user: { username: string; image: string | null };
  _count: { cards: number; ratings: number; comments: number };
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { username: string; image: string | null };
}

export default function CommunityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [decks, setDecks] = useState<CommunityDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDeck, setSelectedDeck] = useState<CommunityDeck | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchDecks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/community?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDecks(data);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load decks", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    if (session) fetchDecks();
  }, [session, fetchDecks]);

  const openDeckDetail = async (deck: CommunityDeck) => {
    setSelectedDeck(deck);
    setDetailOpen(true);
    setUserRating(0);
    setNewComment("");
    try {
      const res = await fetch(`/api/decks/${deck.id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch {
      // Silently fail
    }
  };

  const rateDeck = async (score: number) => {
    if (!selectedDeck) return;
    setUserRating(score);
    try {
      await fetch(`/api/decks/${selectedDeck.id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score }),
      });
      toast({ title: `Rated ${score} stars` });
      fetchDecks();
    } catch {
      toast({ title: "Error", description: "Failed to rate", variant: "destructive" });
    }
  };

  const addComment = async () => {
    if (!selectedDeck || !newComment.trim()) return;
    try {
      const res = await fetch(`/api/decks/${selectedDeck.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });
      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => [comment, ...prev]);
        setNewComment("");
        toast({ title: "Comment added" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to add comment", variant: "destructive" });
    }
  };

  const cloneDeck = async (deckId: string) => {
    try {
      const res = await fetch(`/api/decks/${deckId}/clone`, { method: "POST" });
      if (res.ok) {
        toast({ title: "Deck cloned to your collection!" });
        router.push("/decks");
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to clone deck", variant: "destructive" });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDecks();
  };

  if (status === "loading") {
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
            <h1 className="text-3xl font-bold">Community Decks</h1>
            <p className="text-muted-foreground mt-1">Browse and clone public decks</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search decks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : decks.length === 0 ? (
          <div className="text-center py-20">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No public decks yet</h2>
            <p className="text-muted-foreground">Be the first to share a deck!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {decks.map((deck) => (
              <Card
                key={deck.id}
                className="glass-card hover:scale-[1.02] transition-transform duration-200 cursor-pointer"
                onClick={() => openDeckDetail(deck)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{deck.name}</CardTitle>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{deck.avgRating || "—"}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    {deck.languageA} ↔ {deck.languageB}
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={deck.user.image || ""} />
                      <AvatarFallback className="text-xs bg-primary/20 text-primary">
                        {deck.user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">{deck.user.username}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span>{deck._count.cards} cards</span>
                    <span>{deck._count.comments} comments</span>
                  </div>
                  {deck.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {deck.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Deck Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            {selectedDeck && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedDeck.name}</DialogTitle>
                  <DialogDescription>
                    {selectedDeck.languageA} ↔ {selectedDeck.languageB} &middot; {selectedDeck._count.cards} cards
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Rating */}
                  <div>
                    <p className="text-sm font-medium mb-2">Rate this deck</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => rateDeck(star)}
                          className="focus:outline-none"
                        >
                          <Star
                            className={`h-6 w-6 transition-colors ${
                              star <= (hoverRating || userRating)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clone */}
                  <Button onClick={() => cloneDeck(selectedDeck.id)} className="w-full gap-2">
                    <Copy className="h-4 w-4" />
                    Clone to My Decks
                  </Button>

                  {/* Comments */}
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Comments ({comments.length})
                    </p>
                    <div className="flex gap-2 mb-4">
                      <Textarea
                        placeholder="Write a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={2}
                        className="flex-1"
                      />
                      <Button onClick={addComment} disabled={!newComment.trim()} size="sm">
                        Post
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {comments.map((comment) => (
                        <div key={comment.id} className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2 mb-1">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={comment.user.image || ""} />
                              <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                                {comment.user.username.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{comment.user.username}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
