/**
 * The ecosystem loop, drawn once as inline SVG. No chart library, no animation:
 * the diagram carries a mechanism, not a measurement, and nothing in it is a
 * projection. Money moves one way around this loop and comes back.
 *
 * Rendered as `role="img"` with a full text alternative, because a screen
 * reader should get the sequence rather than a pile of disconnected labels.
 */

const NODES = [
  { x: 16, w: 196, title: "Communities", lines: ["workshops that", "make the objects"] },
  { x: 262, w: 196, title: "MUD Naturals", lines: ["curate · develop", "· market"] },
  { x: 508, w: 196, title: "Customers", lines: ["buy the object", "at a listed price"] },
  { x: 754, w: 190, title: "Revenue", lines: ["what the sale", "generates"] },
];

const ROW_A_Y = 30;
const ROW_B_Y = 198;
const BOX_H = 92;
const SPLIT_Y = 160;
const RETURN_Y = 350;

const INK = "#1c1a17";
const INK_3 = "#948c7f";
const RULE = "#d6cebf";
const CLAY = "#b4552d";

const MONO = "var(--font-mono, ui-monospace, monospace)";
const SERIF = "var(--font-serif, Georgia, serif)";

function Box({
  x,
  y,
  w,
  title,
  lines,
  accent = false,
}: {
  x: number;
  y: number;
  w: number;
  title: string;
  lines: string[];
  accent?: boolean;
}) {
  const cx = x + w / 2;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={BOX_H}
        fill="none"
        stroke={accent ? CLAY : RULE}
        strokeWidth={accent ? 1.5 : 1}
      />
      <text
        x={cx}
        y={y + 38}
        textAnchor="middle"
        fontFamily={SERIF}
        fontSize={18}
        fill={accent ? CLAY : INK}
      >
        {title}
      </text>
      {lines.map((line, i) => (
        <text
          key={line}
          x={cx}
          y={y + 60 + i * 16}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={12}
          fill={INK_3}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

export function ImpactFlow({ className = "" }: { className?: string }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <svg
        viewBox="0 0 960 410"
        className="w-full min-w-[52rem]"
        role="img"
        aria-labelledby="impact-flow-title impact-flow-desc"
      >
        <title id="impact-flow-title">How the loop closes at MUD Naturals</title>
        <desc id="impact-flow-desc">
          Communities make the objects. MUD Naturals curates, develops and markets them.
          Customers buy them. The revenue splits two ways: eighty percent sustains and grows
          the enterprise, twenty percent goes to the MUD Impact Fund. Both flow back to the
          workshops — as more production runs bought outright, and as equipment, training and
          product development.
        </desc>

        <defs>
          <marker
            id="mud-flow-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={RULE} />
          </marker>
        </defs>

        {NODES.map((node) => (
          <Box key={node.title} {...node} y={ROW_A_Y} />
        ))}

        {/* Left to right along the top: make, curate, buy, earn. */}
        {NODES.slice(0, -1).map((node, i) => (
          <line
            key={node.title}
            x1={node.x + node.w}
            y1={ROW_A_Y + BOX_H / 2}
            x2={NODES[i + 1].x}
            y2={ROW_A_Y + BOX_H / 2}
            stroke={RULE}
            strokeWidth={1}
            markerEnd="url(#mud-flow-arrow)"
          />
        ))}

        {/* Revenue drops to the split. */}
        <line x1={849} y1={ROW_A_Y + BOX_H} x2={849} y2={SPLIT_Y} stroke={RULE} strokeWidth={1} />
        <line x1={620} y1={SPLIT_Y} x2={849} y2={SPLIT_Y} stroke={RULE} strokeWidth={1} />
        <line
          x1={620}
          y1={SPLIT_Y}
          x2={620}
          y2={ROW_B_Y}
          stroke={RULE}
          strokeWidth={1}
          markerEnd="url(#mud-flow-arrow)"
        />
        <line
          x1={849}
          y1={SPLIT_Y}
          x2={849}
          y2={ROW_B_Y}
          stroke={RULE}
          strokeWidth={1}
          markerEnd="url(#mud-flow-arrow)"
        />

        <Box
          x={520}
          y={ROW_B_Y}
          w={200}
          title="20% — Impact Fund"
          lines={["equipment · training", "· product development"]}
          accent
        />
        <Box
          x={754}
          y={ROW_B_Y}
          w={190}
          title="80% — Enterprise"
          lines={["stock bought outright,", "wages, rent, growth"]}
        />

        {/* And back to the workshops, which is the only reason it is a loop. */}
        <line x1={620} y1={ROW_B_Y + BOX_H} x2={620} y2={RETURN_Y} stroke={RULE} strokeWidth={1} />
        <line x1={849} y1={ROW_B_Y + BOX_H} x2={849} y2={RETURN_Y} stroke={RULE} strokeWidth={1} />
        <line x1={849} y1={RETURN_Y} x2={114} y2={RETURN_Y} stroke={RULE} strokeWidth={1} />
        <line
          x1={114}
          y1={RETURN_Y}
          x2={114}
          y2={ROW_A_Y + BOX_H}
          stroke={RULE}
          strokeWidth={1}
          markerEnd="url(#mud-flow-arrow)"
        />

        <text
          x={470}
          y={374}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={12}
          letterSpacing="0.09em"
          fill={INK_3}
        >
          BACK TO THE WORKSHOPS
        </text>
        <text x={470} y={394} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={INK_3}>
          more runs bought outright · equipment · training · product development
        </text>
      </svg>
    </div>
  );
}
