"use client";

import dynamic from "next/dynamic";
import { parseAvatarConfig, type AvatarConfig } from "@/lib/avatar";

const ReactNiceAvatar = dynamic(() => import("react-nice-avatar"), { ssr: false });

interface AvatarDisplayProps {
  imageStr: string | null | undefined;
  fallbackInitial: string;
  size?: number;
  className?: string;
}

export function NiceAvatarRenderer({ config, size }: { config: AvatarConfig; size: number }) {
  return (
    <ReactNiceAvatar
      style={{ width: size, height: size }}
      shape="circle"
      {...config}
    />
  );
}

export default function AvatarDisplay({ imageStr, fallbackInitial, size = 40, className = "" }: AvatarDisplayProps) {
  const config = parseAvatarConfig(imageStr);

  if (config) {
    return (
      <div className={`rounded-full overflow-hidden shrink-0 flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
        <NiceAvatarRenderer config={config} size={size} />
      </div>
    );
  }

  return (
    <div
      className={`rounded-full shrink-0 flex items-center justify-center bg-primary/20 text-primary font-medium ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {fallbackInitial.charAt(0).toUpperCase()}
    </div>
  );
}
