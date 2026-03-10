"use client";

import { AvatarConfig, BG_COLORS, ANIMAL_COLORS, parseAvatarConfig } from "@/lib/avatar";

interface AvatarDisplayProps {
  imageStr: string | null | undefined;
  fallbackInitial: string;
  size?: number;
  className?: string;
}

function renderEyes(style: number, cx: number, cy: number): JSX.Element {
  switch (style) {
    case 0: // Simple dots
      return (<><circle cx={cx - 7} cy={cy} r={2.5} fill="#1e293b" /><circle cx={cx + 7} cy={cy} r={2.5} fill="#1e293b" /></>);
    case 1: // Round eyes
      return (<><circle cx={cx - 7} cy={cy} r={3.5} fill="white" stroke="#1e293b" strokeWidth={1.2} /><circle cx={cx - 6} cy={cy} r={1.8} fill="#1e293b" /><circle cx={cx + 7} cy={cy} r={3.5} fill="white" stroke="#1e293b" strokeWidth={1.2} /><circle cx={cx + 8} cy={cy} r={1.8} fill="#1e293b" /></>);
    case 2: // Happy closed
      return (<><path d={`M${cx - 10} ${cy} Q${cx - 7} ${cy - 3} ${cx - 4} ${cy}`} stroke="#1e293b" strokeWidth={1.8} fill="none" strokeLinecap="round" /><path d={`M${cx + 4} ${cy} Q${cx + 7} ${cy - 3} ${cx + 10} ${cy}`} stroke="#1e293b" strokeWidth={1.8} fill="none" strokeLinecap="round" /></>);
    case 3: // Sparkle
      return (<><circle cx={cx - 7} cy={cy} r={3} fill="white" stroke="#1e293b" strokeWidth={1.2} /><circle cx={cx - 7} cy={cy} r={1.5} fill="#1e293b" /><circle cx={cx - 5.5} cy={cy - 1.5} r={0.8} fill="white" /><circle cx={cx + 7} cy={cy} r={3} fill="white" stroke="#1e293b" strokeWidth={1.2} /><circle cx={cx + 7} cy={cy} r={1.5} fill="#1e293b" /><circle cx={cx + 8.5} cy={cy - 1.5} r={0.8} fill="white" /></>);
    case 4: // Winking
      return (<><circle cx={cx - 7} cy={cy} r={2.5} fill="#1e293b" /><path d={`M${cx + 4} ${cy} Q${cx + 7} ${cy - 3} ${cx + 10} ${cy}`} stroke="#1e293b" strokeWidth={1.8} fill="none" strokeLinecap="round" /></>);
    case 5: // Sleepy
      return (<><line x1={cx - 10} y1={cy} x2={cx - 4} y2={cy} stroke="#1e293b" strokeWidth={1.8} strokeLinecap="round" /><line x1={cx + 4} y1={cy} x2={cx + 10} y2={cy} stroke="#1e293b" strokeWidth={1.8} strokeLinecap="round" /></>);
    default:
      return (<><circle cx={cx - 7} cy={cy} r={2.5} fill="#1e293b" /><circle cx={cx + 7} cy={cy} r={2.5} fill="#1e293b" /></>);
  }
}

function renderAnimalFeatures(animal: number, cx: number, cy: number, bodyColor: string): JSX.Element {
  const darker = darken(bodyColor, 0.15);
  const nose = "#1e293b";

  switch (animal) {
    case 0: // Cat — pointed ears + whiskers + triangle nose
      return (<>
        <polygon points={`${cx - 16},${cy - 16} ${cx - 10},${cy - 2} ${cx - 4},${cy - 14}`} fill={bodyColor} stroke={darker} strokeWidth={0.8} />
        <polygon points={`${cx + 4},${cy - 14} ${cx + 10},${cy - 2} ${cx + 16},${cy - 16}`} fill={bodyColor} stroke={darker} strokeWidth={0.8} />
        <polygon points={`${cx - 14},${cy - 14} ${cx - 9},${cy - 4} ${cx - 6},${cy - 12}`} fill="#f9a8d4" />
        <polygon points={`${cx + 6},${cy - 12} ${cx + 9},${cy - 4} ${cx + 14},${cy - 14}`} fill="#f9a8d4" />
        <polygon points={`${cx},${cy + 3} ${cx - 2},${cy + 1} ${cx + 2},${cy + 1}`} fill={nose} />
        <line x1={cx - 3} y1={cy + 3} x2={cx - 12} y2={cy + 1} stroke={nose} strokeWidth={0.7} />
        <line x1={cx - 3} y1={cy + 4} x2={cx - 11} y2={cy + 5} stroke={nose} strokeWidth={0.7} />
        <line x1={cx + 3} y1={cy + 3} x2={cx + 12} y2={cy + 1} stroke={nose} strokeWidth={0.7} />
        <line x1={cx + 3} y1={cy + 4} x2={cx + 11} y2={cy + 5} stroke={nose} strokeWidth={0.7} />
        <path d={`M${cx - 3} ${cy + 6} Q${cx} ${cy + 10} ${cx + 3} ${cy + 6}`} stroke={nose} strokeWidth={1.2} fill="none" strokeLinecap="round" />
      </>);
    case 1: // Dog — floppy ears + round nose
      return (<>
        <ellipse cx={cx - 14} cy={cy - 2} rx={6} ry={10} fill={darker} />
        <ellipse cx={cx + 14} cy={cy - 2} rx={6} ry={10} fill={darker} />
        <circle cx={cx} cy={cy + 3} r={3} fill={nose} />
        <path d={`M${cx - 4} ${cy + 7} Q${cx} ${cy + 11} ${cx + 4} ${cy + 7}`} stroke={nose} strokeWidth={1.2} fill="none" strokeLinecap="round" />
        <ellipse cx={cx} cy={cy + 2} rx={6} ry={4} fill={lighter(bodyColor, 0.2)} />
      </>);
    case 2: // Bunny — long ears + buck teeth
      return (<>
        <ellipse cx={cx - 6} cy={cy - 20} rx={5} ry={14} fill={bodyColor} stroke={darker} strokeWidth={0.8} />
        <ellipse cx={cx + 6} cy={cy - 20} rx={5} ry={14} fill={bodyColor} stroke={darker} strokeWidth={0.8} />
        <ellipse cx={cx - 6} cy={cy - 20} rx={3} ry={10} fill="#f9a8d4" />
        <ellipse cx={cx + 6} cy={cy - 20} rx={3} ry={10} fill="#f9a8d4" />
        <circle cx={cx} cy={cy + 3} r={2.5} fill="#f9a8d4" />
        <rect x={cx - 2.5} y={cy + 6} width={2.2} height={3.5} rx={0.5} fill="white" stroke={nose} strokeWidth={0.5} />
        <rect x={cx + 0.3} y={cy + 6} width={2.2} height={3.5} rx={0.5} fill="white" stroke={nose} strokeWidth={0.5} />
      </>);
    case 3: // Bear — round ears + round snout
      return (<>
        <circle cx={cx - 12} cy={cy - 10} r={6} fill={bodyColor} stroke={darker} strokeWidth={0.8} />
        <circle cx={cx + 12} cy={cy - 10} r={6} fill={bodyColor} stroke={darker} strokeWidth={0.8} />
        <circle cx={cx - 12} cy={cy - 10} r={3.5} fill={darker} />
        <circle cx={cx + 12} cy={cy - 10} r={3.5} fill={darker} />
        <ellipse cx={cx} cy={cy + 4} rx={7} ry={5} fill={lighter(bodyColor, 0.2)} />
        <circle cx={cx} cy={cy + 2} r={2.5} fill={nose} />
        <path d={`M${cx - 3} ${cy + 6} Q${cx} ${cy + 9} ${cx + 3} ${cy + 6}`} stroke={nose} strokeWidth={1.2} fill="none" strokeLinecap="round" />
      </>);
    case 4: // Fox — pointed ears + white snout
      return (<>
        <polygon points={`${cx - 15},${cy - 14} ${cx - 9},${cy - 1} ${cx - 3},${cy - 12}`} fill={bodyColor} stroke={darker} strokeWidth={0.8} />
        <polygon points={`${cx + 3},${cy - 12} ${cx + 9},${cy - 1} ${cx + 15},${cy - 14}`} fill={bodyColor} stroke={darker} strokeWidth={0.8} />
        <polygon points={`${cx - 13},${cy - 12} ${cx - 9},${cy - 3} ${cx - 5},${cy - 11}`} fill="#1e293b" />
        <polygon points={`${cx + 5},${cy - 11} ${cx + 9},${cy - 3} ${cx + 13},${cy - 12}`} fill="#1e293b" />
        <ellipse cx={cx} cy={cy + 4} rx={8} ry={5} fill="white" />
        <circle cx={cx} cy={cy + 2} r={2} fill={nose} />
        <path d={`M${cx - 3} ${cy + 5} Q${cx} ${cy + 8} ${cx + 3} ${cy + 5}`} stroke={nose} strokeWidth={1} fill="none" strokeLinecap="round" />
      </>);
    case 5: // Owl — ear tufts + beak
      return (<>
        <polygon points={`${cx - 12},${cy - 12} ${cx - 8},${cy - 4} ${cx - 4},${cy - 10}`} fill={darker} />
        <polygon points={`${cx + 4},${cy - 10} ${cx + 8},${cy - 4} ${cx + 12},${cy - 12}`} fill={darker} />
        <circle cx={cx - 7} cy={cy - 1} r={5} fill="white" stroke={darker} strokeWidth={0.8} />
        <circle cx={cx + 7} cy={cy - 1} r={5} fill="white" stroke={darker} strokeWidth={0.8} />
        <circle cx={cx - 7} cy={cy - 1} r={2.5} fill="#1e293b" />
        <circle cx={cx + 7} cy={cy - 1} r={2.5} fill="#1e293b" />
        <polygon points={`${cx},${cy + 3} ${cx - 2},${cy + 6} ${cx + 2},${cy + 6}`} fill="#f59e0b" />
      </>);
    case 6: // Penguin — white belly + beak
      return (<>
        <ellipse cx={cx} cy={cy + 2} rx={10} ry={12} fill="white" />
        <polygon points={`${cx},${cy + 3} ${cx - 3},${cy + 6} ${cx + 3},${cy + 6}`} fill="#f59e0b" />
        <circle cx={cx - 6} cy={cy - 2} r={2} fill="#1e293b" />
        <circle cx={cx + 6} cy={cy - 2} r={2} fill="#1e293b" />
      </>);
    case 7: // Frog — big eyes on top
      return (<>
        <circle cx={cx - 8} cy={cy - 8} r={6} fill={bodyColor} stroke={darker} strokeWidth={0.8} />
        <circle cx={cx + 8} cy={cy - 8} r={6} fill={bodyColor} stroke={darker} strokeWidth={0.8} />
        <circle cx={cx - 8} cy={cy - 8} r={4} fill="white" />
        <circle cx={cx + 8} cy={cy - 8} r={4} fill="white" />
        <circle cx={cx - 8} cy={cy - 8} r={2} fill="#1e293b" />
        <circle cx={cx + 8} cy={cy - 8} r={2} fill="#1e293b" />
        <path d={`M${cx - 8} ${cy + 5} Q${cx} ${cy + 10} ${cx + 8} ${cy + 5}`} stroke="#1e293b" strokeWidth={1.5} fill="none" strokeLinecap="round" />
        <circle cx={cx - 2} cy={cy + 2} r={1} fill="#1e293b" />
        <circle cx={cx + 2} cy={cy + 2} r={1} fill="#1e293b" />
      </>);
    default:
      return <></>;
  }
}

function renderAccessory(style: number, cx: number, cy: number): JSX.Element | null {
  switch (style) {
    case 0: return null;
    case 1: // Glasses
      return (<><circle cx={cx - 7} cy={cy - 2} r={5} fill="none" stroke="#1e293b" strokeWidth={1.3} /><circle cx={cx + 7} cy={cy - 2} r={5} fill="none" stroke="#1e293b" strokeWidth={1.3} /><line x1={cx - 2} y1={cy - 2} x2={cx + 2} y2={cy - 2} stroke="#1e293b" strokeWidth={1.3} /></>);
    case 2: // Top hat
      return (<><rect x={cx - 10} y={cy - 22} width={20} height={3} rx={1.5} fill="#1e293b" /><rect x={cx - 7} y={cy - 34} width={14} height={13} rx={2} fill="#1e293b" /><rect x={cx - 6} y={cy - 26} width={12} height={2} rx={1} fill="#ef4444" /></>);
    case 3: // Crown
      return <path d={`M${cx - 10} ${cy - 20} L${cx - 6} ${cy - 28} L${cx - 1} ${cy - 22} L${cx} ${cy - 30} L${cx + 1} ${cy - 22} L${cx + 6} ${cy - 28} L${cx + 10} ${cy - 20} Z`} fill="#fbbf24" stroke="#d97706" strokeWidth={0.8} />;
    case 4: // Flower
      return (<>{[0, 60, 120, 180, 240, 300].map((angle) => { const r = 3; const d = 5; const ax = cx + 12 + Math.cos((angle * Math.PI) / 180) * d; const ay = cy - 18 + Math.sin((angle * Math.PI) / 180) * d; return <circle key={angle} cx={ax} cy={ay} r={r} fill="#f472b6" />; })}<circle cx={cx + 12} cy={cy - 18} r={2.5} fill="#fbbf24" /></>);
    case 5: // Bow tie
      return (<><polygon points={`${cx - 8},${cy + 12} ${cx - 2},${cy + 15} ${cx - 8},${cy + 18}`} fill="#ef4444" /><polygon points={`${cx + 8},${cy + 12} ${cx + 2},${cy + 15} ${cx + 8},${cy + 18}`} fill="#ef4444" /><circle cx={cx} cy={cy + 15} r={1.5} fill="#b91c1c" /></>);
    case 6: // Scarf
      return (<><rect x={cx - 14} y={cy + 10} width={28} height={5} rx={2.5} fill="#3b82f6" /><rect x={cx + 6} y={cy + 13} width={5} height={10} rx={2} fill="#3b82f6" /><line x1={cx - 10} y1={cy + 12} x2={cx + 10} y2={cy + 12} stroke="#2563eb" strokeWidth={0.5} /></>);
    default: return null;
  }
}

function darken(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) * (1 - amount));
  const g = Math.max(0, ((num >> 8) & 0xff) * (1 - amount));
  const b = Math.max(0, (num & 0xff) * (1 - amount));
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

function lighter(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + (255 - ((num >> 16) & 0xff)) * amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + (255 - ((num >> 8) & 0xff)) * amount);
  const b = Math.min(255, (num & 0xff) + (255 - (num & 0xff)) * amount);
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

function AvatarSVG({ config, size }: { config: AvatarConfig; size: number }) {
  const bg = BG_COLORS[config.bgColor] || BG_COLORS[0];
  const bodyColor = ANIMAL_COLORS[config.color] || ANIMAL_COLORS[0];
  const cx = 32;
  const cy = 34;

  // For owl and penguin, skip separate eyes since they're built into the animal features
  const hasBuiltInEyes = config.animal === 5 || config.animal === 6 || config.animal === 7;

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <rect width={64} height={64} rx={32} fill={bg} />
      {/* Animal head shape */}
      <circle cx={cx} cy={cy} r={18} fill={bodyColor} />
      {/* Animal-specific features (ears, nose, snout, etc.) */}
      {renderAnimalFeatures(config.animal, cx, cy, bodyColor)}
      {/* Eyes (only if the animal doesn't draw its own) */}
      {!hasBuiltInEyes && renderEyes(config.eyes, cx, cy - 2)}
      {/* Accessory */}
      {renderAccessory(config.accessory, cx, cy)}
    </svg>
  );
}

export default function AvatarDisplay({ imageStr, fallbackInitial, size = 40, className = "" }: AvatarDisplayProps) {
  const config = parseAvatarConfig(imageStr);

  if (config) {
    return (
      <div className={`rounded-full overflow-hidden shrink-0 flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
        <AvatarSVG config={config} size={size} />
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

export { AvatarSVG };
