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
import { Loader2, Save, ChevronLeft, ChevronRight, Shuffle, Upload, Trash2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type AvatarConfig,
  generateDefaultAvatar,
  generateRandomAvatar,
  parseAvatarConfig,
  serializeAvatarConfig,
  BG_COLORS,
  FACE_COLORS,
  HAIR_COLORS,
  EAR_SIZE_OPTIONS,
  HAIR_STYLE_OPTIONS,
  HAT_STYLE_OPTIONS,
  EYE_STYLE_OPTIONS,
  GLASSES_STYLE_OPTIONS,
  NOSE_STYLE_OPTIONS,
  MOUTH_STYLE_OPTIONS,
  SHIRT_STYLE_OPTIONS,
  HAIR_STYLE_LABELS,
} from "@/lib/avatar";
import { NiceAvatarRenderer, isImageUrl } from "@/components/avatar-display";

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
  const [avatarMode, setAvatarMode] = useState<"builder" | "upload">("builder");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [bioError, setBioError] = useState("");

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
        if (data.createdAt) setCreatedAt(data.createdAt);
        if (isImageUrl(data.image)) {
          setUploadedImage(data.image);
          setAvatarMode("upload");
        } else {
          const parsed = parseAvatarConfig(data.image);
          if (parsed) {
            setAvatarConfig(parsed);
          }
          setAvatarMode("builder");
        }
      }
    } catch {
      toast({ title: "Error", description: "Failed to load profile", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (bio.length > 500) {
      setBioError("Bio must be at most 500 characters.");
      return;
    }
    setBioError("");
    setSaving(true);
    try {
      const image = avatarMode === "upload" && uploadedImage ? uploadedImage : serializeAvatarConfig(avatarConfig);
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
        let errorMsg = "Failed to save profile";
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch {
          if (res.status === 413) errorMsg = "Image is too large. Please use a smaller image.";
        }
        toast({ title: "Error", description: errorMsg, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save profile. The image may be too large — try a smaller one.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const MAX_AVATAR_FILE_SIZE = 2 * 1024 * 1024; // 2 MB raw file limit
  const AVATAR_MAX_DIM = 256; // resize to 256×256 max

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file (JPG, PNG, GIF).", variant: "destructive" });
      return;
    }
    if (file.size > MAX_AVATAR_FILE_SIZE) {
      toast({ title: "File too large", description: `Image must be under ${MAX_AVATAR_FILE_SIZE / (1024 * 1024)} MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)} MB.`, variant: "destructive" });
      return;
    }

    // Resize on canvas to keep base64 small
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > AVATAR_MAX_DIM || h > AVATAR_MAX_DIM) {
          const scale = AVATAR_MAX_DIM / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          toast({ title: "Error", description: "Could not process image.", variant: "destructive" });
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        if (dataUrl.length > 700_000) {
          toast({ title: "Image too large", description: "The image is still too large after compression. Please use a smaller image.", variant: "destructive" });
          return;
        }
        setUploadedImage(dataUrl);
        setAvatarMode("upload");
      } catch {
        toast({ title: "Error", description: "Failed to process image.", variant: "destructive" });
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast({ title: "Error", description: "Could not read image file. Please try another file.", variant: "destructive" });
    };
    img.src = objectUrl;
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
            {/* Avatar */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Avatar</Label>
                <Tabs value={avatarMode} onValueChange={(v) => setAvatarMode(v as "builder" | "upload")}>
                  <TabsList className="h-8">
                    <TabsTrigger value="builder" className="text-xs px-3 h-6">Builder</TabsTrigger>
                    <TabsTrigger value="upload" className="text-xs px-3 h-6">Photo</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {avatarMode === "upload" ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="rounded-full overflow-hidden border-4 border-primary/20 flex items-center justify-center" style={{ width: 96, height: 96 }}>
                    {uploadedImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={uploadedImage} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                        <Upload className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5" asChild>
                      <label className="cursor-pointer">
                        <Upload className="h-3.5 w-3.5" />
                        {uploadedImage ? "Change Photo" : "Upload Photo"}
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                      </label>
                    </Button>
                    {uploadedImage && (
                      <Button variant="ghost" size="sm" className="gap-1.5 text-destructive" onClick={() => { setUploadedImage(null); setAvatarMode("builder"); }}>
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Max 2 MB. JPG, PNG, or GIF. Images are resized to 256×256.</p>
                </div>
              ) : (
              <div className="flex flex-col sm:flex-row gap-6 items-center">
                <div className="shrink-0">
                  <div className="flex flex-col items-center gap-2">
                    <div className="rounded-full overflow-hidden border-4 border-primary/20 flex items-center justify-center" style={{ width: 96, height: 96 }}>
                      <NiceAvatarRenderer config={avatarConfig} size={96} />
                    </div>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAvatarConfig(generateRandomAvatar())}>
                      <Shuffle className="h-3.5 w-3.5" /> Randomize
                    </Button>
                  </div>
                </div>
                <div className="flex-1 space-y-3 w-full">
                  {/* Sex */}
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground w-16">Style</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const newSex = avatarConfig.sex === "man" ? "woman" : "man"; setAvatarConfig({ ...avatarConfig, sex: newSex, eyeBrowStyle: newSex === "woman" ? "upWoman" : "up" }); }}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm w-20 text-center capitalize">{avatarConfig.sex}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const newSex = avatarConfig.sex === "man" ? "woman" : "man"; setAvatarConfig({ ...avatarConfig, sex: newSex, eyeBrowStyle: newSex === "woman" ? "upWoman" : "up" }); }}><ChevronRight className="h-4 w-4" /></Button>
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
                          onClick={() => setAvatarConfig({ ...avatarConfig, hairColor: color, hairColorRandom: false })}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Hair Style */}
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground w-16">Hair</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAvatarConfig({ ...avatarConfig, hairStyle: cycleArray(HAIR_STYLE_OPTIONS, avatarConfig.hairStyle as typeof HAIR_STYLE_OPTIONS[number], -1) })}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm w-20 text-center">{HAIR_STYLE_LABELS[avatarConfig.hairStyle] || avatarConfig.hairStyle}</span>
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
              )}
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
                onChange={(e) => { setBio(e.target.value); setBioError(""); }}
                rows={3}
                className={bioError ? "border-destructive" : ""}
              />
              <p className={`text-xs ${bio.length > 500 ? "text-destructive" : "text-muted-foreground"}`}>{bio.length}/500 characters</p>
              {bioError && <p className="text-xs text-destructive">{bioError}</p>}
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={session?.user?.email || ""} disabled />
              <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
            </div>

            {createdAt && (
              <div className="space-y-2">
                <Label>Member Since</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            )}

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
