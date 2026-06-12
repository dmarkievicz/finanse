"use client";

interface CategorySparklineProps {
  values: number[];
  className?: string;
  color?: string;
}

export function CategorySparkline({ values, className = "", color = "#64748b" }: CategorySparklineProps) {
  if (!values.length || values.every((v) => v === 0)) {
    return <span className="text-xs text-slate-300">—</span>;
  }

  const w = 64;
  const h = 20;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? w / (values.length - 1) : w;

  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = h - (v / max) * (h - 2) - 1;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`inline-block h-5 w-16 ${className}`}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
