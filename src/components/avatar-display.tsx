"use client";

import { AvatarConfig, BG_COLORS, SKIN_COLORS, parseAvatarConfig } from "@/lib/avatar";

interface AvatarDisplayProps {
  imageStr: string | null | undefined;
  fallbackInitial: string;
  size?: number;
  className?: string;
}

function renderEyes(style: number, cx: number, cy: number): JSX.Element {
  switch (style) {
    case 0: // Simple dots
      return (<><circle cx={cx - 8} cy={cy} r={3} fill="#1e293b" /><circle cx={cx + 8} cy={cy} r={3} fill="#1e293b" /></>);
    case 1: // Round eyes
      return (<><circle cx={cx - 8} cy={cy} r={4} fill="white" stroke="#1e293b" strokeWidth={1.5} /><circle cx={cx - 7} cy={cy} r={2} fill="#1e293b" /><circle cx={cx + 8} cy={cy} r={4} fill="white" stroke="#1e293b" strokeWidth={1.5} /><circle cx={cx + 9} cy={cy} r={2} fill="#1e293b" /></>);
    case 2: // Closed happy
      return (<><path d={`M${cx - 12} ${cy} Q${cx - 8} ${cy - 4} ${cx - 4} ${cy}`} stroke="#1e293b" strokeWidth={2} fill="none" strokeLinecap="round" /><path d={`M${cx + 4} ${cy} Q${cx + 8} ${cy - 4} ${cx + 12} ${cy}`} stroke="#1e293b" strokeWidth={2} fill="none" strokeLinecap="round" /></>);
    case 3: // Winking
      return (<><circle cx={cx - 8} cy={cy} r={3} fill="#1e293b" /><path d={`M${cx + 4} ${cy} Q${cx + 8} ${cy - 4} ${cx + 12} ${cy}`} stroke="#1e293b" strokeWidth={2} fill="none" strokeLinecap="round" /></>);
    case 4: // Surprised
      return (<><circle cx={cx - 8} cy={cy} r={4.5} fill="white" stroke="#1e293b" strokeWidth={1.5} /><circle cx={cx - 8} cy={cy} r={2.5} fill="#1e293b" /><circle cx={cx + 8} cy={cy} r={4.5} fill="white" stroke="#1e293b" strokeWidth={1.5} /><circle cx={cx + 8} cy={cy} r={2.5} fill="#1e293b" /></>);
    case 5: // Sleepy
      return (<><line x1={cx - 12} y1={cy} x2={cx - 4} y2={cy} stroke="#1e293b" strokeWidth={2} strokeLinecap="round" /><line x1={cx + 4} y1={cy} x2={cx + 12} y2={cy} stroke="#1e293b" strokeWidth={2} strokeLinecap="round" /></>);
    default:
      return (<><circle cx={cx - 8} cy={cy} r={3} fill="#1e293b" /><circle cx={cx + 8} cy={cy} r={3} fill="#1e293b" /></>);
  }
}

function renderMouth(style: number, cx: number, cy: number): JSX.Element {
  switch (style) {
    case 0: // Smile
      return <path d={`M${cx - 8} ${cy} Q${cx} ${cy + 8} ${cx + 8} ${cy}`} stroke="#1e293b" strokeWidth={2} fill="none" strokeLinecap="round" />;
    case 1: // Big smile
      return <path d={`M${cx - 10} ${cy} Q${cx} ${cy + 12} ${cx + 10} ${cy}`} stroke="#1e293b" strokeWidth={2} fill="#fff0f0" strokeLinecap="round" />;
    case 2: // Neutral
      return <line x1={cx - 6} y1={cy + 2} x2={cx + 6} y2={cy + 2} stroke="#1e293b" strokeWidth={2} strokeLinecap="round" />;
    case 3: // Smirk
      return <path d={`M${cx - 4} ${cy + 2} Q${cx + 4} ${cy + 6} ${cx + 8} ${cy}`} stroke="#1e293b" strokeWidth={2} fill="none" strokeLinecap="round" />;
    case 4: // Open mouth
      return <ellipse cx={cx} cy={cy + 3} rx={6} ry={5} fill="#1e293b" />;
    case 5: // Tongue out
      return (<><path d={`M${cx - 8} ${cy} Q${cx} ${cy + 10} ${cx + 8} ${cy}`} stroke="#1e293b" strokeWidth={2} fill="none" strokeLinecap="round" /><ellipse cx={cx} cy={cy + 7} rx={3} ry={4} fill="#f87171" /></>);
    default:
      return <path d={`M${cx - 8} ${cy} Q${cx} ${cy + 8} ${cx + 8} ${cy}`} stroke="#1e293b" strokeWidth={2} fill="none" strokeLinecap="round" />;
  }
}

function renderAccessory(style: number, cx: number, cy: number): JSX.Element | null {
  switch (style) {
    case 0: return null; // None
    case 1: // Glasses
      return (<><circle cx={cx - 8} cy={cy - 10} r={7} fill="none" stroke="#1e293b" strokeWidth={1.5} /><circle cx={cx + 8} cy={cy - 10} r={7} fill="none" stroke="#1e293b" strokeWidth={1.5} /><line x1={cx - 1} y1={cy - 10} x2={cx + 1} y2={cy - 10} stroke="#1e293b" strokeWidth={1.5} /></>);
    case 2: // Hat
      return (<><rect x={cx - 16} y={cy - 28} width={32} height={4} rx={2} fill="#1e293b" /><rect x={cx - 10} y={cy - 40} width={20} height={14} rx={3} fill="#1e293b" /></>);
    case 3: // Crown
      return <path d={`M${cx - 12} ${cy - 26} L${cx - 8} ${cy - 34} L${cx - 2} ${cy - 28} L${cx} ${cy - 36} L${cx + 2} ${cy - 28} L${cx + 8} ${cy - 34} L${cx + 12} ${cy - 26} Z`} fill="#fbbf24" stroke="#d97706" strokeWidth={1} />;
    case 4: // Headband
      return <rect x={cx - 18} y={cy - 22} width={36} height={5} rx={2.5} fill="#ef4444" />;
    case 5: // Bow
      return (<><ellipse cx={cx - 6} cy={cy - 24} rx={6} ry={4} fill="#ec4899" /><ellipse cx={cx + 6} cy={cy - 24} rx={6} ry={4} fill="#ec4899" /><circle cx={cx} cy={cy - 24} r={2.5} fill="#be185d" /></>);
    case 6: // Star
      return <path d={`M${cx + 14} ${cy - 20} l1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.5-3 1.5.6-3.3-2.4-2.3 3.3-.5z`} fill="#fbbf24" />;
    default: return null;
  }
}

function AvatarSVG({ config, size }: { config: AvatarConfig; size: number }) {
  const bg = BG_COLORS[config.bgColor] || BG_COLORS[0];
  const skin = SKIN_COLORS[config.base] || SKIN_COLORS[0];
  const cx = 32;
  const cy = 34;

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <rect width={64} height={64} rx={32} fill={bg} />
      {/* Head */}
      <circle cx={cx} cy={cy} r={20} fill={skin} />
      {/* Eyes */}
      {renderEyes(config.eyes, cx, cy - 4)}
      {/* Mouth */}
      {renderMouth(config.mouth, cx, cy + 6)}
      {/* Accessory */}
      {renderAccessory(config.accessory, cx, cy)}
    </svg>
  );
}

export default function AvatarDisplay({ imageStr, fallbackInitial, size = 40, className = "" }: AvatarDisplayProps) {
  const config = parseAvatarConfig(imageStr);

  if (config) {
    return (
      <div className={`rounded-full overflow-hidden shrink-0 ${className}`} style={{ width: size, height: size }}>
        <AvatarSVG config={config} size={size} />
      </div>
    );
  }

  // Fallback: initial letter
  return (
    <div
      className={`rounded-full shrink-0 flex items-center justify-center bg-primary/20 text-primary font-medium ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {fallbackInitial.charAt(0).toUpperCase()}
    </div>
  );
}

export { AvatarSVG };
