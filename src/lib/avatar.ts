// Avatar configuration types and options — animal-based avatars
export interface AvatarConfig {
  animal: number;     // 0-7 animal type
  color: number;      // 0-7 animal body color
  eyes: number;       // 0-5 eye style
  accessory: number;  // 0-6 accessory (0 = none)
  bgColor: number;    // 0-7 background color
}

export const DEFAULT_AVATAR: AvatarConfig = {
  animal: 0,
  color: 0,
  eyes: 0,
  accessory: 0,
  bgColor: 0,
};

export const BG_COLORS = [
  "#6366f1", // indigo
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ef4444", // red
  "#06b6d4", // cyan
];

export const ANIMAL_COLORS = [
  "#fbbf24", // golden
  "#f97316", // orange
  "#a3a3a3", // gray
  "#fde68a", // cream
  "#8b5cf6", // purple
  "#f472b6", // pink
  "#34d399", // mint
  "#60a5fa", // sky blue
];

export const ANIMAL_LABELS = ["Cat", "Dog", "Bunny", "Bear", "Fox", "Owl", "Penguin", "Frog"];

export function parseAvatarConfig(imageStr: string | null | undefined): AvatarConfig | null {
  if (!imageStr) return null;
  try {
    const parsed = JSON.parse(imageStr);
    if (typeof parsed === "object" && "eyes" in parsed) {
      // Handle old format with "base" key (humanoid) — migrate to animal format
      if ("base" in parsed && !("animal" in parsed)) {
        return {
          animal: 0,
          color: parsed.base ?? 0,
          eyes: parsed.eyes ?? 0,
          accessory: parsed.accessory ?? 0,
          bgColor: parsed.bgColor ?? 0,
        };
      }
      if ("animal" in parsed) {
        return parsed as AvatarConfig;
      }
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
