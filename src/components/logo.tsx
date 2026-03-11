"use client";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { text: "text-lg", hex: 16 },
  md: { text: "text-2xl", hex: 22 },
  lg: { text: "text-4xl", hex: 32 },
  xl: { text: "text-6xl", hex: 52 },
};

function HexagonO({ size }: { size: number }) {
  const w = size;
  const h = size * 1.15;
  const strokeWidth = size * 0.08;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      className="inline-block"
      style={{ verticalAlign: "baseline", marginBottom: `-${size * 0.05}px` }}
    >
      <polygon
        points={`${w / 2},${strokeWidth} ${w - strokeWidth},${h * 0.25} ${w - strokeWidth},${h * 0.75} ${w / 2},${h - strokeWidth} ${strokeWidth},${h * 0.75} ${strokeWidth},${h * 0.25}`}
        stroke="var(--accent-teal)"
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Inner pulse line */}
      <line
        x1={w * 0.2}
        y1={h * 0.5}
        x2={w * 0.35}
        y2={h * 0.5}
        stroke="var(--accent-teal)"
        strokeWidth={strokeWidth * 0.7}
      />
      <polyline
        points={`${w * 0.35},${h * 0.5} ${w * 0.42},${h * 0.3} ${w * 0.5},${h * 0.7} ${w * 0.58},${h * 0.35} ${w * 0.65},${h * 0.5}`}
        stroke="var(--accent-teal)"
        strokeWidth={strokeWidth * 0.7}
        fill="none"
        strokeLinejoin="round"
      />
      <line
        x1={w * 0.65}
        y1={h * 0.5}
        x2={w * 0.8}
        y2={h * 0.5}
        stroke="var(--accent-teal)"
        strokeWidth={strokeWidth * 0.7}
      />
    </svg>
  );
}

export function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
  const s = sizes[size];

  if (!showText) {
    return <HexagonO size={s.hex} />;
  }

  return (
    <span
      className={`font-display font-bold tracking-wider text-text-primary ${s.text} ${className}`}
    >
      AD
      <HexagonO size={s.hex} />
      NIS
    </span>
  );
}

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <span className={className}>
      <HexagonO size={24} />
    </span>
  );
}
