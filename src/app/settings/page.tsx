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
import { Loader2, Save, ChevronLeft, ChevronRight, Shuffle } from "lucide-react";
import {
  type AvatarConfig,
  generateDefaultAvatar,
  generateRandomAvatar,
  parseAvatarConfig,
  serializeAvatarConfig,
  BG_COLORS,
  FACE_COLORS,
  HAIR_COLORS,
  SEX_OPTIONS,
  EAR_SIZE_OPTIONS,
  HAIR_STYLE_OPTIONS,
  HAT_STYLE_OPTIONS,
  EYE_STYLE_OPTIONS,
  GLASSES_STYLE_OPTIONS,
  NOSE_STYLE_OPTIONS,
  MOUTH_STYLE_OPTIONS,
  SHIRT_STYLE_OPTIONS,
} from "@/lib/avatar";
import { NiceAvatarRenderer } from "@/components/avatar-display";

function cycleArray<T>(arr: readonly T[], current: T, dir: 1 | -1): T {
  const idx = arr.indexOf(current);
  const next = (idx + dir + arr.length) % arr.length;
  return arr[next];
}

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(generateDefaultAvatar());

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
              <div className="flex items-center justify-between mb-3">
                <Label>Avatar</Label>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAvatarConfig(generateRandomAvatar())}>
                  <Shuffle className="h-3.5 w-3.5" /> Randomize
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row gap-6 items-center">
                <div className="shrink-0">
                  <div className="rounded-full overflow-hidden border-4 border-primary/20 flex items-center justify-center" style={{ width: 96, height: 96 }}>
                    <NiceAvatarRenderer config={avatarConfig} size={96} />
                  </div>
                </div>
                <div className="flex-1 space-y-3 w-full">
                  {/* Sex */}
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground w-16">Style</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAvatarConfig({ ...avatarConfig, sex: cycleArray(SEX_OPTIONS, avatarConfig.sex as typeof SEX_OPTIONS[number], -1) })}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm w-20 text-center capitalize">{avatarConfig.sex}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAvatarConfig({ ...avatarConfig, sex: cycleArray(SEX_OPTIONS, avatarConfig.sex as typeof SEX_OPTIONS[number], 1) })}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                  {/* Background Color */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Background</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {BG_COLORS.map((color) => (
                        <button
                          key={color}
                          className={`w-7 h-7 rounded-full transition-all ${avatarConfig.bgColor === color ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : "hover:scale-105"}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setAvatarConfig({ ...avatarConfig, bgColor: color })}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Face Color */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Skin</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {FACE_COLORS.map((color) => (
                        <button
                          key={color}
                          className={`w-7 h-7 rounded-full transition-all border ${avatarConfig.faceColor === color ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : "hover:scale-105"}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setAvatarConfig({ ...avatarConfig, faceColor: color })}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Hair Color */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Hair Color</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {HAIR_COLORS.map((color) => (
                        <button
                          key={color}
                          className={`w-7 h-7 rounded-full transition-all border ${avatarConfig.hairColor === color ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : "hover:scale-105"}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setAvatarConfig({ ...avatarConfig, hairColor: color })}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Hair Style */}
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground w-16">Hair</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAvatarConfig({ ...avatarConfig, hairStyle: cycleArray(HAIR_STYLE_OPTIONS, avatarConfig.hairStyle as typeof HAIR_STYLE_OPTIONS[number], -1) })}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm w-20 text-center capitalize">{avatarConfig.hairStyle}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAvatarConfig({ ...avatarConfig, hairStyle: cycleArray(HAIR_STYLE_OPTIONS, avatarConfig.hairStyle as typeof HAIR_STYLE_OPTIONS[number], 1) })}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                  {/* Hat */}
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground w-16">Hat</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAvatarConfig({ ...avatarConfig, hatStyle: cycleArray(HAT_STYLE_OPTIONS, avatarConfig.hatStyle as typeof HAT_STYLE_OPTIONS[number], -1) })}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm w-20 text-center capitalize">{avatarConfig.hatStyle}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAvatarConfig({ ...avatarConfig, hatStyle: cycleArray(HAT_STYLE_OPTIONS, avatarConfig.hatStyle as typeof HAT_STYLE_OPTIONS[number], 1) })}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                  {/* Eyes */}
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground w-16">Eyes</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAvatarConfig({ ...avatarConfig, eyeStyle: cycleArray(EYE_STYLE_OPTIONS, avatarConfig.eyeStyle as typeof EYE_STYLE_OPTIONS[number], -1) })}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm w-20 text-center capitalize">{avatarConfig.eyeStyle}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAvatarConfig({ ...avatarConfig, eyeStyle: cycleArray(EYE_STYLE_OPTIONS, avatarConfig.eyeStyle as typeof EYE_STYLE_OPTIONS[number], 1) })}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                  {/* Glasses */}
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground w-16">Glasses</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAvatarConfig({ ...avatarConfig, glassesStyle: cycleArray(GLASSES_STYLE_OPTIONS, avatarConfig.glassesStyle as typeof GLASSES_STYLE_OPTIONS[number], -1) })}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm w-20 text-center capitalize">{avatarConfig.glassesStyle}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAvatarConfig({ ...avatarConfig, glassesStyle: cycleArray(GLASSES_STYLE_OPTIONS, avatarConfig.glassesStyle as typeof GLASSES_STYLE_OPTIONS[number], 1) })}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                  {/* Nose */}
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground w-16">Nose</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAvatarConfig({ ...avatarConfig, noseStyle: cycleArray(NOSE_STYLE_OPTIONS, avatarConfig.noseStyle as typeof NOSE_STYLE_OPTIONS[number], -1) })}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm w-20 text-center capitalize">{avatarConfig.noseStyle}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAvatarConfig({ ...avatarConfig, noseStyle: cycleArray(NOSE_STYLE_OPTIONS, avatarConfig.noseStyle as typeof NOSE_STYLE_OPTIONS[number], 1) })}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                  {/* Mouth */}
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground w-16">Mouth</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAvatarConfig({ ...avatarConfig, mouthStyle: cycleArray(MOUTH_STYLE_OPTIONS, avatarConfig.mouthStyle as typeof MOUTH_STYLE_OPTIONS[number], -1) })}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm w-20 text-center capitalize">{avatarConfig.mouthStyle}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAvatarConfig({ ...avatarConfig, mouthStyle: cycleArray(MOUTH_STYLE_OPTIONS, avatarConfig.mouthStyle as typeof MOUTH_STYLE_OPTIONS[number], 1) })}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                  {/* Ears */}
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground w-16">Ears</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAvatarConfig({ ...avatarConfig, earSize: cycleArray(EAR_SIZE_OPTIONS, avatarConfig.earSize as typeof EAR_SIZE_OPTIONS[number], -1) })}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm w-20 text-center capitalize">{avatarConfig.earSize}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAvatarConfig({ ...avatarConfig, earSize: cycleArray(EAR_SIZE_OPTIONS, avatarConfig.earSize as typeof EAR_SIZE_OPTIONS[number], 1) })}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                  {/* Shirt */}
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground w-16">Shirt</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAvatarConfig({ ...avatarConfig, shirtStyle: cycleArray(SHIRT_STYLE_OPTIONS, avatarConfig.shirtStyle as typeof SHIRT_STYLE_OPTIONS[number], -1) })}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm w-20 text-center capitalize">{avatarConfig.shirtStyle}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAvatarConfig({ ...avatarConfig, shirtStyle: cycleArray(SHIRT_STYLE_OPTIONS, avatarConfig.shirtStyle as typeof SHIRT_STYLE_OPTIONS[number], 1) })}><ChevronRight className="h-4 w-4" /></Button>
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
