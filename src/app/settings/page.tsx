"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, ChevronLeft, ChevronRight } from "lucide-react";
import { AvatarConfig, DEFAULT_AVATAR, BG_COLORS, SKIN_COLORS, parseAvatarConfig, serializeAvatarConfig } from "@/lib/avatar";
import { AvatarSVG } from "@/components/avatar-display";

const EYE_LABELS = ["Dots", "Round", "Happy", "Wink", "Surprised", "Sleepy"];
const MOUTH_LABELS = ["Smile", "Big Smile", "Neutral", "Smirk", "Open", "Tongue"];
const ACCESSORY_LABELS = ["None", "Glasses", "Hat", "Crown", "Headband", "Bow", "Star"];

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(DEFAULT_AVATAR);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setUsername(data.username || "");
        setBio(data.bio || "");
        const parsed = parseAvatarConfig(data.image);
        if (parsed) {
          setAvatarConfig(parsed);
        }
      }
    } catch {
      toast({ title: "Error", description: "Failed to load profile", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const image = serializeAvatarConfig(avatarConfig);
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, bio, image }),
      });

      if (res.ok) {
        const data = await res.json();
        await update({ name: data.username, image: data.image });
        toast({ title: "Profile updated!" });
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const cycleOption = (key: keyof AvatarConfig, max: number, dir: 1 | -1) => {
    setAvatarConfig((prev) => ({
      ...prev,
      [key]: (prev[key] + dir + max) % max,
    }));
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
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Manage your public profile information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Builder */}
            <div>
              <Label className="mb-3 block">Avatar</Label>
              <div className="flex flex-col sm:flex-row gap-6 items-center">
                <div className="shrink-0">
                  <div className="rounded-full overflow-hidden border-4 border-primary/20" style={{ width: 96, height: 96 }}>
                    <AvatarSVG config={avatarConfig} size={96} />
                  </div>
                </div>
                <div className="flex-1 space-y-3 w-full">
                  {/* Background Color */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Background</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {BG_COLORS.map((color, i) => (
                        <button
                          key={color}
                          className={`w-7 h-7 rounded-full transition-all ${avatarConfig.bgColor === i ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : "hover:scale-105"}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setAvatarConfig({ ...avatarConfig, bgColor: i })}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Skin Color */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Skin Tone</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {SKIN_COLORS.map((color, i) => (
                        <button
                          key={color}
                          className={`w-7 h-7 rounded-full transition-all border ${avatarConfig.base === i ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : "hover:scale-105"}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setAvatarConfig({ ...avatarConfig, base: i })}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Eyes */}
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground w-16">Eyes</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => cycleOption("eyes", 6, -1)}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm w-20 text-center">{EYE_LABELS[avatarConfig.eyes]}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => cycleOption("eyes", 6, 1)}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                  {/* Mouth */}
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground w-16">Mouth</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => cycleOption("mouth", 6, -1)}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm w-20 text-center">{MOUTH_LABELS[avatarConfig.mouth]}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => cycleOption("mouth", 6, 1)}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                  {/* Accessory */}
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground w-16">Accessory</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => cycleOption("accessory", 7, -1)}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm w-20 text-center">{ACCESSORY_LABELS[avatarConfig.accessory]}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => cycleOption("accessory", 7, 1)}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">{bio.length}/500 characters</p>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={session?.user?.email || ""} disabled />
              <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
            </div>

            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
