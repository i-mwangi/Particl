/** Landing-page icons drawn as dots tracing each shape; dots twinkle on
 *  hover (shares the .dot-tick-chip rules in globals.css with DotTick). */

const PALETTE = [
  "var(--accent-deep)",
  "var(--text-muted)",
  "var(--accent)",
  "var(--text-secondary)",
  "var(--accent-light)",
];

/** Dot coordinates in a 24x24 viewBox, tracing the original stroke icons. */
const SHAPES: Record<string, [number, number][]> = {
  // Stacked layers (natural language)
  layers: [
    [12, 2], [7, 4.5], [2, 7], [7, 9.5], [12, 12], [17, 9.5], [22, 7], [17, 4.5],
    [2, 12], [7, 14.5], [12, 17], [17, 14.5], [22, 12],
    [2, 17], [7, 19.5], [12, 22], [17, 19.5], [22, 17],
  ],
  // Lightning bolt (real-time streaming)
  bolt: [
    [13, 2], [10.5, 5], [8, 8], [5.5, 11], [3, 14],
    [6, 14], [9, 14], [12, 14],
    [11.7, 16.7], [11.3, 19.3], [11, 22],
    [13.5, 19], [16, 16], [18.5, 13], [21, 10],
    [18, 10], [15, 10], [12, 10], [12.3, 7.3], [12.7, 4.6],
  ],
  // Wrench (self-correcting)
  wrench: [
    [15.5, 4], [17.5, 3], [19.7, 3.3], [21.4, 5.4], [21.7, 7.7], [20.5, 9.8],
    [18.3, 10.7], [16.2, 10.3], [14.7, 8.6],
    [12.8, 11.2], [10.8, 13.2], [8.8, 15.2], [6.8, 17.2], [4.9, 19.1], [3.9, 20.3],
  ],
  // Document with data lines (data to document)
  data: [
    [6, 3.5], [6, 8], [6, 12.5], [6, 17], [6, 21],
    [9.5, 22], [13, 22], [16.5, 22], [20, 21],
    [20, 17], [20, 12.5], [20, 8.5],
    [17, 5.2], [14, 2.5], [10, 2], [7, 2.2],
    [14, 5.2], [14, 8], [17, 8],
    [9, 11.5], [12, 11.5], [15, 11.5],
    [9, 15.5], [12, 15.5], [15, 15.5],
  ],
  // Clock (session history)
  clock: [
    [12, 2], [17.9, 3.9], [21.5, 8.9], [21.5, 15.1], [17.9, 20.1],
    [12, 22], [6.1, 20.1], [2.5, 15.1], [2.5, 8.9], [6.1, 3.9],
    [12, 7], [12, 9.5], [12, 12], [14, 13], [16, 14],
  ],
  // Download tray (instant export)
  download: [
    [3, 15.5], [3, 18.5], [5, 21], [8.5, 21], [12, 21], [15.5, 21], [19, 21], [21, 18.5], [21, 15.5],
    [12, 3], [12, 6], [12, 9], [12, 12], [12, 15],
    [7, 10], [9.5, 12.5], [14.5, 12.5], [17, 10],
  ],
  // Graduation cap (researchers)
  gradcap: [
    [12, 4], [7, 6.5], [2, 9], [7, 11.5], [12, 14], [17, 11.5], [22, 9], [17, 6.5],
    [6, 12.8], [6, 16], [8.5, 18.3], [12, 19], [15.5, 18.3], [18, 16], [18, 12.8],
  ],
  // Open book (students)
  book: [
    [12, 6], [12, 10], [12, 14], [12, 18],
    [3, 5], [6.5, 4.2], [10, 5.2],
    [3, 9], [3, 13], [3, 16.8],
    [6.5, 16], [10, 17],
    [21, 5], [17.5, 4.2], [14, 5.2],
    [21, 9], [21, 13], [21, 16.8],
    [17.5, 16], [14, 17],
  ],
  // Briefcase (professionals)
  briefcase: [
    [2.5, 9], [2.5, 13.5], [2.5, 18], [6, 20.5], [10, 20.5], [14, 20.5], [18, 20.5],
    [21.5, 18], [21.5, 13.5], [21.5, 9],
    [6, 7.5], [10, 7.5], [14, 7.5], [18, 7.5],
    [9, 5], [12, 3.8], [15, 5],
    [12, 12.8],
  ],
};

export default function DotIcon({ shape, size = 46 }: { shape: keyof typeof SHAPES; size?: number }) {
  const dots = SHAPES[shape] ?? SHAPES.bolt;
  return (
    <div className="dot-tick-chip" style={{ width: `${size}px`, height: `${size}px` }}>
      <svg width={Math.round(size * 0.6)} height={Math.round(size * 0.6)} viewBox="0 0 24 24">
        {dots.map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r="1.15"
            fill={PALETTE[i % PALETTE.length]}
            style={{ animationDelay: `${(i * 90) % 720}ms` }}
          />
        ))}
      </svg>
    </div>
  );
}
