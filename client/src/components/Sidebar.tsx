// Left rail of the demo. Mirrors the TemporalQueries motif from the
// remberall marketing site: a static graph of dotted nodes joined by
// thin lines, rendered low-opacity behind the foreground content as a
// brand identity element. The same visual on both surfaces signals that
// the demo and the marketing site are one product.

import { Brain, ExternalLink, Activity } from 'lucide-react';

// 16 nodes positioned to look like a small connected sub-graph. The
// coordinates are static; the SVG viewBox stretches to fill the
// sidebar so the pattern scales without redoing the layout.
const NODES: { x: number; y: number }[] = [
  { x: 40, y: 50 },  { x: 110, y: 38 }, { x: 60, y: 120 }, { x: 130, y: 100 },
  { x: 50, y: 200 }, { x: 120, y: 180 }, { x: 70, y: 280 }, { x: 130, y: 260 },
  { x: 50, y: 360 }, { x: 120, y: 340 }, { x: 80, y: 440 }, { x: 130, y: 420 },
  { x: 60, y: 520 }, { x: 110, y: 500 }, { x: 80, y: 600 }, { x: 130, y: 580 },
];

const EDGES: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 5],
  [4, 6], [5, 7], [6, 7], [6, 8], [7, 9], [8, 9], [8, 10],
  [9, 11], [10, 11], [10, 12], [11, 13], [12, 13], [12, 14],
  [13, 15], [14, 15],
];

export default function Sidebar({ wsConnected }: { wsConnected: boolean }) {
  return (
    <aside
      className="fixed left-0 top-0 bottom-0 w-56 border-r flex flex-col overflow-hidden"
      style={{
        borderColor: 'hsl(var(--border) / 0.5)',
        backgroundColor: 'hsl(var(--secondary) / 0.25)',
      }}
    >
      {/* Background motif: dotted graph in low opacity. preserveAspectRatio
          slice means it always fills the rail; pointer-events none so it
          can't steal clicks from the foreground. */}
      <svg
        viewBox="0 0 180 680"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full opacity-25 pointer-events-none"
        aria-hidden="true"
      >
        {EDGES.map(([a, b], i) => {
          const na = NODES[a];
          const nb = NODES[b];
          return (
            <line
              key={`e-${i}`}
              x1={na.x}
              y1={na.y}
              x2={nb.x}
              y2={nb.y}
              stroke="hsl(var(--border))"
              strokeWidth={0.5}
            />
          );
        })}
        {NODES.map((p, i) => (
          <circle
            key={`n-${i}`}
            cx={p.x}
            cy={p.y}
            r={2.5}
            fill="hsl(var(--primary) / 0.7)"
          />
        ))}
      </svg>

      {/* Foreground content, layered above the motif. */}
      <div className="relative z-10 flex flex-col h-full p-5">
        <div className="flex items-center gap-2.5 mb-10">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{
              backgroundColor: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
            }}
          >
            M
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">MinnsDB</div>
            <div className="text-[10px] text-muted-foreground">Memory comparison</div>
          </div>
        </div>

        <nav className="flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-2">
            Demo
          </div>
          <a
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm font-medium"
            style={{
              color: 'hsl(var(--foreground))',
              backgroundColor: 'hsl(var(--secondary) / 0.7)',
            }}
          >
            <Brain size={14} /> Comparison
          </a>
        </nav>

        <div
          className="mt-auto pt-4 border-t flex flex-col gap-2 text-xs"
          style={{ borderColor: 'hsl(var(--border) / 0.4)' }}
        >
          <div className="flex items-center gap-2 px-2 text-muted-foreground">
            <Activity
              size={12}
              className={wsConnected ? 'text-emerald-400' : 'text-muted-foreground'}
            />
            <span>{wsConnected ? 'Live' : 'Offline'}</span>
          </div>
          <a
            href="https://github.com/Minns-ai/MinnsDB"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink size={12} /> GitHub
          </a>
        </div>
      </div>
    </aside>
  );
}
