"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Star, BookOpen, Copy, MessageCircle, Pencil } from "lucide-react";
import AvatarDisplay from "@/components/avatar-display";

interface PublicDeck {
  id: string;
  name: string;
  description: string | null;
  languageA: string;
  languageB: string;
  tags: string[];
  avgRating: number;
  createdAt: string;
  _count: { cards: number; ratings: number; comments: number };
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  userRating: number | null;
  user: { id: string; username: string; image: string | null };
}

interface UserProfile {
  id: string;
  username: string;
  image: string | null;
  bio: string | null;
  createdAt: string;
  decks: PublicDeck[];
}

export default function PublisherProfilePage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDeck, setSelectedDeck] = useState<PublicDeck | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/users/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);

  const isOwnDeck = () => session?.user?.id === profile?.id;

  const openDeckDetail = async (deck: PublicDeck) => {
    setSelectedDeck(deck);
    setDetailOpen(true);
    setReviewRating(0);
    setReviewComment("");
    setEditingCommentId(null);
    try {
      const res = await fetch(`/api/decks/${deck.id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
        const ownComment = data.find((c: Comment) => c.user.id === session?.user?.id);
        if (ownComment) {
          setReviewComment(ownComment.content);
          setReviewRating(ownComment.userRating || 0);
        }
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
    if (isOwnDeck()) {
      toast({ title: "Error", description: "You cannot review your own deck", variant: "destructive" });
      return;
    }
    try {
      await fetch(`/api/decks/${selectedDeck.id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: reviewRating }),
      });
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
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to submit review", variant: "destructive" });
    }
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

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <p className="text-muted-foreground">User not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-8">
          <AvatarDisplay imageStr={profile.image} fallbackInitial={profile.username} size={64} />
          <div>
            <h1 className="text-2xl font-bold">{profile.username}</h1>
            {profile.bio && <p className="text-muted-foreground mt-1">{profile.bio}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              Member since {new Date(profile.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Public Decks */}
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Public Decks ({profile.decks.length})
        </h2>

        {profile.decks.length === 0 ? (
          <p className="text-muted-foreground">This user has no public decks yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.decks.map((deck) => (
              <Card
                key={deck.id}
                className="glass-card hover:scale-[1.02] transition-transform duration-200 cursor-pointer border"
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
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
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
                  <p className="text-xs text-muted-foreground mt-2">
                    Created {new Date(deck.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

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
                {/* Clone */}
                <Button onClick={() => cloneDeck(selectedDeck.id)} className="w-full gap-2">
                  <Copy className="h-4 w-4" />
                  Clone to My Decks
                </Button>

                {/* Review Section */}
                {isOwnDeck() ? (
                  <p className="text-sm text-muted-foreground italic">You cannot review your own deck.</p>
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
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Reviews ({comments.length})
                  </p>
                  <div className="space-y-3">
                    {comments.map((comment) => (
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
                              onClick={() => { setEditingCommentId(comment.id); setEditCommentText(comment.content); }}
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
                          <p className="text-sm">{comment.content}</p>
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
  );
}
