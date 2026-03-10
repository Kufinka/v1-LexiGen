"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, BookOpen } from "lucide-react";
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

interface UserProfile {
  id: string;
  username: string;
  image: string | null;
  bio: string | null;
  createdAt: string;
  decks: PublicDeck[];
}

export default function PublisherProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

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
              <Card key={deck.id} className="glass-card hover:scale-[1.02] transition-transform duration-200">
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
    </div>
  );
}
