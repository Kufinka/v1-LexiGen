// Avatar configuration using react-nice-avatar
// We store the genConfig output as JSON in the user's image field.

import { genConfig, type AvatarFullConfig } from "react-nice-avatar";

export type AvatarConfig = Required<AvatarFullConfig>;

export const SEX_OPTIONS = ["man", "woman"] as const;
export const EAR_SIZE_OPTIONS = ["small", "big"] as const;
export const HAIR_STYLE_OPTIONS = ["normal", "thick", "mohawk", "womanLong", "womanShort"] as const;
export const HAT_STYLE_OPTIONS = ["none", "beanie", "turban"] as const;
export const EYE_STYLE_OPTIONS = ["circle", "oval", "smile"] as const;
export const GLASSES_STYLE_OPTIONS = ["none", "round", "square"] as const;
export const NOSE_STYLE_OPTIONS = ["short", "long", "round"] as const;
export const MOUTH_STYLE_OPTIONS = ["laugh", "smile", "peace"] as const;
export const SHIRT_STYLE_OPTIONS = ["hoody", "short", "polo"] as const;

export const BG_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4",
];

export const FACE_COLORS = [
  "#F9C9B6", "#AC6651", "#F4D150", "#FFECD2",
  "#C8E6C9", "#B5E0F5", "#D7BDE2", "#F5B7B1",
];

export const HAIR_COLORS = [
  "#000000", "#4A312C", "#A55728", "#D6B370",
  "#E8E1E1", "#FC909F", "#6366f1", "#10b981",
];

export function generateDefaultAvatar(): AvatarConfig {
  return genConfig();
}

export function generateRandomAvatar(): AvatarConfig {
  return genConfig();
}

export function parseAvatarConfig(imageStr: string | null | undefined): AvatarConfig | null {
  if (!imageStr) return null;
  try {
    const parsed = JSON.parse(imageStr);
    if (typeof parsed === "object" && ("sex" in parsed || "faceColor" in parsed)) {
      // It's a react-nice-avatar config — ensure all fields exist
      return genConfig(parsed);
    }
    // Legacy format (old animal or humanoid avatars) — generate a fresh one deterministically
    if (typeof parsed === "object" && ("animal" in parsed || "base" in parsed || "eyes" in parsed)) {
      return genConfig();
    }
  } catch {
    // Not an avatar config string
  }
  return null;
}

export function serializeAvatarConfig(config: AvatarConfig): string {
  return JSON.stringify(config);
}

export function isAvatarConfig(imageStr: string | null | undefined): boolean {
  return parseAvatarConfig(imageStr) !== null;
}
