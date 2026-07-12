/** Checkmark drawn as dots on a soft white chip; dots twinkle on hover
 *  (see .dot-tick-chip rules in globals.css). */

const DOTS: [number, number, string][] = [
  [5.2, 12.6, "var(--accent-deep)"],
  [7.2, 14.7, "var(--text-muted)"],
  [9.2, 16.8, "var(--accent)"],
  [11.6, 13.9, "var(--text-secondary)"],
  [14.0, 11.0, "var(--accent-light)"],
  [16.5, 8.2, "var(--text-muted)"],
  [19.0, 5.4, "var(--accent)"],
];

export default function DotTick({ size = 46 }: { size?: number }) {
  return (
    <div
      className="dot-tick-chip"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <svg
        width={Math.round(size * 0.56)}
        height={Math.round(size * 0.56)}
        viewBox="0 0 24 24"
      >
        {DOTS.map(([cx, cy, fill], i) => (
          <circle key={i} cx={cx} cy={cy} r="1.55" fill={fill} />
        ))}
      </svg>
    </div>
  );
}
