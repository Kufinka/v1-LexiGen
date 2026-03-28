"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AvatarDisplay from "@/components/avatar-display";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Search,
  Star,
  MessageCircle,
  Copy,
  Loader2,
  Users,
  Pencil,
  ThumbsUp,
} from "lucide-react";

interface CommunityDeck {
  id: string;
  name: string;
  description: string | null;
  languageA: string;
  languageB: string;
  tags: string[];
  avgRating: number;
  createdAt: string;
  user: { id: string; username: string; image: string | null };
  _count: { cards: number; ratings: number; comments: number };
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  userRating: number | null;
  upvoteCount: number;
  hasUpvoted: boolean;
  user: { id: string; username: string; image: string | null };
}

export default function CommunityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [allDecks, setAllDecks] = useState<CommunityDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedDeck, setSelectedDeck] = useState<CommunityDeck | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [hasCloned, setHasCloned] = useState(false);
  const [commentSort, setCommentSort] = useState<"newest" | "upvotes">("newest");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchDecks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("sort", sortBy);
      const res = await fetch(`/api/community?${params.toString()}`);
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
  }, [session, fetchDecks]);

  // Stable tag and language lists from ALL loaded decks (not filtered)
  const allTags = useMemo(() => Array.from(new Set(allDecks.flatMap((d) => d.tags))), [allDecks]);
  const allLanguages = useMemo(() => Array.from(new Set(allDecks.flatMap((d) => [d.languageA, d.languageB]))), [allDecks]);

  // Client-side filtering for instant search
  const decks = useMemo(() => {
    let filtered = allDecks;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q) ||
          d.languageA.toLowerCase().includes(q) ||
          d.languageB.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q)) ||
          d.user.username.toLowerCase().includes(q)
      );
    }
    if (tagFilter && tagFilter !== "all") {
      filtered = filtered.filter((d) => d.tags.includes(tagFilter));
    }
    if (languageFilter && languageFilter !== "all") {
      filtered = filtered.filter((d) => d.languageA === languageFilter || d.languageB === languageFilter);
    }
    return filtered;
  }, [allDecks, search, tagFilter, languageFilter]);

  const isOwnDeck = (deck: CommunityDeck) => session?.user?.id === deck.user.id;

  const openDeckDetail = async (deck: CommunityDeck) => {
    setSelectedDeck(deck);
    setDetailOpen(true);
    setReviewRating(0);
    setReviewComment("");
    setEditingCommentId(null);
    setHasCloned(false);
    setCommentSort("newest");
    try {
      const [commentsRes, decksRes] = await Promise.all([
        fetch(`/api/decks/${deck.id}/comments`),
        fetch(`/api/decks?search=`),
      ]);
      if (commentsRes.ok) {
        const data = await commentsRes.json();
        setComments(data);
        const ownComment = data.find((c: Comment) => c.user.id === session?.user?.id);
        if (ownComment) {
          setReviewComment(ownComment.content);
          setReviewRating(ownComment.userRating || 0);
        }
      }
      if (decksRes.ok) {
        const userDecks = await decksRes.json();
        const cloned = userDecks.some((d: { isClone: boolean; clonedFromId: string | null }) => d.isClone && d.clonedFromId === deck.id);
        setHasCloned(cloned);
      }
    } catch {
      // Silently fail
    }
  };

  const submitReview = async () => {
    if (!selectedDeck || !reviewComment.trim() || reviewRating === 0) {
      toast({ title: "Required", description: "Please provide both a star rating and a comment.", variant: "destructive" });
      return;
    }
    if (isOwnDeck(selectedDeck)) {
      toast({ title: "Error", description: "You cannot review your own deck", variant: "destructive" });
      return;
    }
    try {
      // Submit rating
      await fetch(`/api/decks/${selectedDeck.id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: reviewRating }),
      });
      // Submit comment (upserts on backend)
      const res = await fetch(`/api/decks/${selectedDeck.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reviewComment }),
      });
      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => {
          const existing = prev.findIndex((c) => c.user.id === comment.user.id);
          if (existing !== -1) {
            const updated = [...prev];
            updated[existing] = comment;
            return updated;
          }
          return [comment, ...prev];
        });
        toast({ title: "Review submitted!" });
        fetchDecks();
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to submit review", variant: "destructive" });
    }
  };

  const startEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.content);
  };

  const saveEditComment = async () => {
    if (!selectedDeck || !editCommentText.trim() || !editingCommentId) return;
    try {
      const res = await fetch(`/api/decks/${selectedDeck.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editCommentText }),
      });
      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => prev.map((c) => (c.user.id === comment.user.id ? comment : c)));
        setEditingCommentId(null);
        setEditCommentText("");
        toast({ title: "Comment updated!" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update comment", variant: "destructive" });
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

  const hasExistingReview = useMemo(() => {
    return comments.some((c) => c.user.id === session?.user?.id);
  }, [comments, session?.user?.id]);

  const toggleUpvote = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/upvote`, { method: "POST" });
      if (res.ok) {
        const { upvoted } = await res.json();
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, hasUpvoted: upvoted, upvoteCount: c.upvoteCount + (upvoted ? 1 : -1) }
              : c
          )
        );
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to toggle upvote", variant: "destructive" });
    }
  };

  const sortedComments = useMemo(() => {
    const sorted = [...comments];
    if (commentSort === "upvotes") {
      sorted.sort((a, b) => b.upvoteCount - a.upvoteCount);
    } else {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return sorted;
  }, [comments, commentSort]);

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Community Decks</h1>
            <p className="text-muted-foreground mt-1">Browse and clone public decks</p>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search decks, languages, users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
          <Select value={languageFilter || "all"} onValueChange={(v) => setLanguageFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages</SelectItem>
              {allLanguages.map((lang) => (
                <SelectItem key={lang} value={lang}>{lang}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="rating">Best Rated</SelectItem>
              <SelectItem value="most_rated">Most Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : decks.length === 0 ? (
          <div className="text-center py-20">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No public decks found</h2>
            <p className="text-muted-foreground">
              {search || tagFilter || languageFilter ? "Try adjusting your filters." : "Be the first to share a deck!"}
            </p>
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
                      <span className="text-muted-foreground text-xs">({deck._count.ratings})</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {deck.description && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{deck.description}</p>
                  )}
                  <p className="text-sm text-muted-foreground mb-2">
                    {deck.languageA} ↔ {deck.languageB}
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <Link href={`/profile/${deck.user.id}`} onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2 hover:underline">
                        <AvatarDisplay imageStr={deck.user.image} fallbackInitial={deck.user.username} size={24} />
                        <span className="text-sm text-muted-foreground">{deck.user.username}</span>
                      </div>
                    </Link>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span>{deck._count.cards} cards</span>
                    <span>{deck._count.comments} reviews</span>
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
                    {selectedDeck.description && (
                      <span className="block mt-1">{selectedDeck.description}</span>
                    )}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Publisher */}
                  <Link href={`/profile/${selectedDeck.user.id}`} className="flex items-center gap-2 hover:underline">
                    <AvatarDisplay imageStr={selectedDeck.user.image} fallbackInitial={selectedDeck.user.username} size={32} />
                    <span className="text-sm font-medium">{selectedDeck.user.username}</span>
                  </Link>

                  {/* Clone */}
                  <Button onClick={() => cloneDeck(selectedDeck.id)} className="w-full gap-2">
                    <Copy className="h-4 w-4" />
                    Clone to My Decks
                  </Button>

                  {/* Combined Review: Rating + Comment */}
                  {isOwnDeck(selectedDeck) ? (
                    <p className="text-sm text-muted-foreground italic">You cannot review your own deck.</p>
                  ) : !hasCloned ? (
                    <p className="text-sm text-muted-foreground italic">Clone this deck first to leave a review.</p>
                  ) : hasExistingReview ? (
                    <p className="text-sm text-muted-foreground italic">You have already reviewed this deck. Use the edit button on your review below to make changes.</p>
                  ) : (
                    <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                      <p className="text-sm font-medium">Write a Review</p>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Rating (required)</p>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              onClick={() => setReviewRating(star)}
                              className="focus:outline-none"
                            >
                              <Star
                                className={`h-6 w-6 transition-colors ${
                                  star <= (hoverRating || reviewRating)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Comment (required)</p>
                        <Textarea
                          placeholder="Share your thoughts about this deck..."
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <Button onClick={submitReview} disabled={!reviewComment.trim() || reviewRating === 0} className="w-full">
                        Submit Review
                      </Button>
                    </div>
                  )}

                  {/* Comments/Reviews List */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Reviews ({comments.length})
                      </p>
                      {comments.length > 1 && (
                        <Select value={commentSort} onValueChange={(v) => setCommentSort(v as "newest" | "upvotes")}>
                          <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="newest">Newest</SelectItem>
                            <SelectItem value="upvotes">Most Upvoted</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="space-y-3">
                      {sortedComments.map((comment) => (
                        <div key={comment.id} className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2 mb-1">
                            <AvatarDisplay imageStr={comment.user.image} fallbackInitial={comment.user.username} size={20} />
                            <span className="text-sm font-medium">{comment.user.username}</span>
                            {comment.userRating != null && comment.userRating > 0 && (
                              <span className="flex items-center gap-0.5 text-xs text-yellow-500">
                                <Star className="h-3 w-3 fill-yellow-400" />
                                {comment.userRating}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                            {comment.user.id === session?.user?.id && editingCommentId !== comment.id && (
                              <button
                                className="ml-auto text-muted-foreground hover:text-primary"
                                onClick={() => startEditComment(comment)}
                                title="Edit your review"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          {editingCommentId === comment.id ? (
                            <div className="mt-2 space-y-2">
                              <Textarea
                                value={editCommentText}
                                onChange={(e) => setEditCommentText(e.target.value)}
                                rows={2}
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={saveEditComment} disabled={!editCommentText.trim()}>Save</Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingCommentId(null)}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm">{comment.content}</p>
                              {comment.user.id !== session?.user?.id && (
                                <button
                                  className={`flex items-center gap-1 mt-1.5 text-xs transition-colors ${
                                    comment.hasUpvoted
                                      ? "text-primary font-medium"
                                      : "text-muted-foreground hover:text-primary"
                                  }`}
                                  onClick={() => toggleUpvote(comment.id)}
                                >
                                  <ThumbsUp className={`h-3 w-3 ${comment.hasUpvoted ? "fill-primary" : ""}`} />
                                  {comment.upvoteCount > 0 && comment.upvoteCount}
                                </button>
                              )}
                              {comment.user.id === session?.user?.id && comment.upvoteCount > 0 && (
                                <span className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                                  <ThumbsUp className="h-3 w-3" />
                                  {comment.upvoteCount}
                                </span>
                              )}
                            </>
                          )}
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
