// Avatar configuration types and options
export interface AvatarConfig {
  base: number;       // 0-5 base face shape/color
  eyes: number;       // 0-5 eye style
  mouth: number;      // 0-5 mouth style
  accessory: number;  // 0-6 accessory (0 = none)
  bgColor: number;    // 0-7 background color
}

export const DEFAULT_AVATAR: AvatarConfig = {
  base: 0,
  eyes: 0,
  mouth: 0,
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

export const SKIN_COLORS = [
  "#fde68a", // light
  "#fbbf24", // warm
  "#f59e0b", // tan
  "#d97706", // medium
  "#92400e", // dark
  "#78350f", // deep
];

export function parseAvatarConfig(imageStr: string | null | undefined): AvatarConfig | null {
  if (!imageStr) return null;
  try {
    const parsed = JSON.parse(imageStr);
    if (typeof parsed === "object" && "base" in parsed && "eyes" in parsed) {
      return parsed as AvatarConfig;
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
