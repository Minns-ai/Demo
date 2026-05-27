// Side-by-side memory-system comparison, shaped like a chat.
//
// The demo's only product surface. The user picks a scenario (a multi-
// session conversation history), then asks the same question of every
// enabled memory system and watches the answers come back beside each
// other — with latency, system colour, and a hint at what the "right"
// answer is. Suggested follow-up prompts pull from the scenario's
// curated questions so a user without a question in mind always has a
// good next move.
//
// Layout:
//   • Header: scenario picker (segmented), system toggles (chips).
//   • Thread (scroll): one turn per question; each turn = user bubble
//     + a row of answer panels, one per enabled system. Each panel has
//     the macOS-window dot header to read like its own "terminal".
//   • Footer: free-form input + a row of suggested-prompt chips so the
//     interaction stays conversational, not template-driven.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Database, Layers, Network, Sparkles, X } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────

interface Message { role: string; content: string; }
interface ConvSession { session: string; date: string; messages: Message[]; }
interface Question { question: string; expected: string; why: string; }
interface Scenario {
  id: string;
  title: string;
  description: string;
  conversations: ConvSession[];
  questions: Question[];
}

interface SystemResult {
  system: string;
  answer: string;
  latency_ms: number;
}

interface Turn {
  question: string;
  expected?: string;
  results: SystemResult[] | 'loading' | { error: string };
}

// ── Systems ────────────────────────────────────────────────────────

// Each competing memory system: the on-the-wire name (matches the
// server's `systems` filter), an icon, and a HSL accent for the
// per-system answer header. Keeping accents subtle and inside the
// HSL token system so they read with the rest of the demo.
type SystemKey = 'MinnsDB' | 'mem0' | 'Zep' | 'Vector RAG';

const SYSTEMS: { key: SystemKey; label: string; tagline: string; icon: typeof Database; hue: string }[] = [
  { key: 'MinnsDB',    label: 'MinnsDB',    tagline: 'Temporal graph memory',           icon: Layers,   hue: '215 60% 60%' },
  { key: 'mem0',       label: 'mem0',       tagline: 'OSS memory layer for LLMs',       icon: Network,  hue: '38 80% 60%' },
  { key: 'Zep',        label: 'Zep',        tagline: 'Hosted knowledge graph memory',   icon: Sparkles, hue: '280 60% 65%' },
  { key: 'Vector RAG', label: 'Vector RAG', tagline: 'Naive embeddings + cosine baseline', icon: Database, hue: '0 0% 65%' },
];

// ── Scenarios ─────────────────────────────────────────────────────
//
// Curated tests that target a specific memory failure mode. Each
// includes a small set of canonical questions (used both as the
// "expected answer" hint and as the seed for follow-up suggestions
// after the user has fired off a few turns).

const SCENARIOS: Scenario[] = [
  {
    id: 'supersession',
    title: 'State supersession',
    description: 'The user moves cities mid-conversation. Which system knows where they live now?',
    conversations: [
      {
        session: 'Onboarding',
        date: '2025-01-15',
        messages: [
          { role: 'user', content: "I just moved to London! Starting my new job at Barclays next week." },
          { role: 'assistant', content: "Congratulations on the move to London and the new role at Barclays!" },
          { role: 'user', content: "I love visiting the British Museum on weekends, it's so close to my flat." },
          { role: 'assistant', content: "The British Museum is wonderful, especially with free admission." },
        ],
      },
      {
        session: 'Six months later',
        date: '2025-06-20',
        messages: [
          { role: 'user', content: "Big news — I've relocated to New York! Got a transfer to the NYC office." },
          { role: 'assistant', content: "That's exciting. NYC is a great city." },
          { role: 'user', content: "I've been exploring Central Park on weekends, it reminds me of Hyde Park." },
          { role: 'assistant', content: "Central Park is beautiful. Great way to settle in." },
        ],
      },
    ],
    questions: [
      { question: 'Where does the user live?',                                  expected: 'New York',                       why: 'Requires knowing the London → NYC move superseded the old location.' },
      { question: 'Does the user still visit the British Museum on weekends?',  expected: 'No — they moved to NYC.',        why: 'Cascade dependency: the weekend habit was location-bound.' },
      { question: 'Where does the user work?',                                  expected: 'Barclays, NYC office.',          why: 'Merging: same employer, different location.' },
    ],
  },
  {
    id: 'temporal',
    title: 'Temporal reasoning',
    description: 'Events arrive in order. Which system can reason about when things happened?',
    conversations: [
      { session: 'Got a cat', date: '2025-03-01', messages: [
        { role: 'user', content: "I just adopted a cat named Luna." },
        { role: 'assistant', content: "How lovely! Cats are great companions." },
      ]},
      { session: 'Got a dog',  date: '2025-05-15', messages: [
        { role: 'user', content: "We got a dog! His name is Max. Luna wasn't happy at first but they're getting along now." },
        { role: 'assistant', content: "That's great that Luna and Max are getting along!" },
      ]},
      { session: 'Sad news', date: '2025-08-10', messages: [
        { role: 'user', content: "Sad news — Luna passed away last week. Max seems lonely without her." },
        { role: 'assistant', content: "I'm so sorry to hear about Luna. That must be hard." },
      ]},
    ],
    questions: [
      // ── Core: surface a superseded fact + reason about state vs event ──
      { question: 'Which pet did the user get first?', expected: 'Luna the cat (March 2025).',  why: 'Temporal ordering across sessions.' },
      { question: 'Does the user currently have a cat?', expected: 'No — Luna passed away.',     why: 'State update: "passed away" invalidates the older fact.' },
      { question: 'How many pets does the user have?', expected: '1 — Max the dog.',             why: 'Combine temporal reasoning with state tracking.' },

      // ── Multilingual: same first-pet question in 4 other languages. ──
      // The NLQ planner's temporal_intent classification is multilingual
      // by construction — the LLM picks "first" semantics from the
      // question's meaning, not from English keyword matches. If any of
      // these fail, the prompt's cross-lingual examples need another
      // anchor.
      { question: 'Quel animal a-t-il adopté en premier ?',  expected: 'Luna le chat (mars 2025).', why: 'French — same "first" intent. Tests cross-lingual classification.' },
      { question: '他最早领养的宠物是什么？',                expected: '是猫 Luna（2025年3月）。', why: 'Chinese — same "first" intent. Tests cross-lingual classification.' },
      { question: '¿Qué mascota adoptó primero?',          expected: 'Luna la gata (marzo de 2025).', why: 'Spanish — same "first" intent. Tests cross-lingual classification.' },
      { question: 'Welches Haustier hatte er zuerst?',     expected: 'Luna die Katze (März 2025).',  why: 'German — same "first" intent. Tests cross-lingual classification.' },

      // ── Harder multi-turn: requires composing facts across all three
      // sessions, not just retrieving one. Vector-RAG baselines tend to
      // pick the most-recent fact and miss the order. ──
      { question: 'List the pets in chronological order with adoption dates.',           expected: 'Luna (cat, March 2025), then Max (dog, May 2025). Luna passed away August 2025.', why: 'Full temporal ordering: include superseded facts AND ordering by valid_from.' },
      { question: 'How long did the user have Luna before Max joined the household?',    expected: 'About 2.5 months — Luna adopted March 1, Max May 15.',                            why: 'Duration arithmetic across two event facts. Requires both adoption dates.' },
      { question: 'Did the user have any pets in April 2025?',                            expected: 'Yes — Luna the cat (Max joined in May).',                                          why: 'Point-in-time query: was Luna alive AND adopted by April? Pure AS OF reasoning.' },
    ],
  },
  {
    id: 'preference',
    title: 'Preference evolution',
    description: 'Preferences change. Which system applies the current one?',
    conversations: [
      { session: 'Veggie', date: '2025-02-01', messages: [
        { role: 'user', content: "I'm vegetarian, have been for about 3 years now." },
        { role: 'assistant', content: "Great! I'll keep that in mind for any food recommendations." },
      ]},
      { session: 'Pescatarian', date: '2025-07-15', messages: [
        { role: 'user', content: "I've actually started eating fish again. My doctor recommended it for the omega-3s. So I'm pescatarian now." },
        { role: 'assistant', content: "That makes sense. Pescatarian gives you more options." },
      ]},
    ],
    questions: [
      { question: "What is the user's dietary preference?",       expected: 'Pescatarian.',                  why: 'Single-valued preference supersession.' },
      { question: 'Can I recommend a sushi restaurant?',          expected: 'Yes — the user eats fish now.', why: 'Apply the updated preference, not the historical one.' },
    ],
  },
  {
    id: 'life-timeline',
    title: 'A life timeline',
    description: 'Six sessions across 18 months. Two cities, two jobs, two pets, a habit that depends on where the user lived, and a milestone that explicitly closes one of those states. The questions stress first / last / used-to / "while I lived there" across multiple entities at once.',
    conversations: [
      { session: 'New job in Berlin', date: '2024-01-10', messages: [
        { role: 'user',      content: "Started today at Stripe in Berlin. Senior engineer on the payments team. Subletting in Kreuzberg until I find something permanent." },
        { role: 'assistant', content: "Congrats on the Stripe move and the Kreuzberg start." },
        { role: 'user',      content: "I'm planning to go to the Pergamon Museum every Saturday — it's a five-minute walk from the sublet." },
        { role: 'assistant', content: "Noted: weekly Pergamon habit while you're in Kreuzberg." },
      ]},
      { session: 'Adopted Mochi', date: '2024-03-05', messages: [
        { role: 'user',      content: "Adopted a cat from the Berlin shelter today. Named her Mochi. The flat finally feels like home." },
        { role: 'assistant', content: "Welcome Mochi to the Kreuzberg life." },
      ]},
      { session: 'Promotion', date: '2024-07-22', messages: [
        { role: 'user',      content: "Got promoted to Staff Engineer at Stripe. Same team, more scope on the payments platform." },
        { role: 'assistant', content: "Big step up. Same team, broader scope — noted." },
        { role: 'user',      content: "Quick aside: still doing the Pergamon Saturday thing — that's seven months running." },
        { role: 'assistant', content: "Habit holding steady at seven months." },
      ]},
      { session: 'Moving to Amsterdam', date: '2024-09-12', messages: [
        { role: 'user',      content: "Big news — Stripe is moving me to the Amsterdam office. Found a place in Jordaan. Mochi comes with." },
        { role: 'assistant', content: "Stripe Amsterdam, Jordaan, Mochi makes the trip — got it." },
        { role: 'user',      content: "Starting Dutch lessons this week. The Pergamon thing obviously ends — I'll find a new Saturday routine here." },
        { role: 'assistant', content: "Dutch lessons begin; Pergamon Saturday closes with the move." },
      ]},
      { session: 'Adopted Pretzel', date: '2024-12-04', messages: [
        { role: 'user',      content: "Mochi seemed lonely so we adopted a second cat — Pretzel. Two cats now." },
        { role: 'assistant', content: "Two-cat household: Mochi and Pretzel." },
      ]},
      { session: 'Switching to Spotify', date: '2025-04-30', messages: [
        { role: 'user',      content: "Leaving Stripe — joining Spotify in Stockholm next month as a Principal. Moving the household with both cats." },
        { role: 'assistant', content: "Spotify Stockholm, Principal, two cats. Big chapter close." },
        { role: 'user',      content: "Sad note: Mochi passed away two weeks ago. Pretzel's been clingy since." },
        { role: 'assistant', content: "So sorry about Mochi. Pretzel will lean on you for a while." },
      ]},
    ],
    questions: [
      // ── First / last across multiple entities ──
      { question: 'Where did the user live first?',                                    expected: 'Berlin (Kreuzberg), starting January 2024.',                              why: 'TemporalFrame=First over the location predicate. Three cities exist in history; the answer is the earliest valid_from.' },
      { question: 'What was the user\'s first pet?',                                    expected: 'Mochi the cat, adopted March 2024 in Berlin.',                            why: 'TemporalFrame=First over adoption events. Mochi predates Pretzel by nine months.' },
      { question: 'What was the user\'s last role at Stripe?',                          expected: 'Staff Engineer (after the July 2024 promotion, before leaving for Spotify).', why: 'TemporalFrame=Last on Stripe-scoped employment state — the most-recent role at Stripe, NOT the current role (which is Principal at Spotify).' },

      // ── Cascade dependency: weekend habit was location-bound ──
      { question: 'Does the user still go to the Pergamon Museum on Saturdays?',       expected: 'No — that was the Berlin habit, ended when they moved to Amsterdam.',     why: 'Cascade: visits depends on lives_in:Berlin. When location supersedes, the habit closes too. Tests cascade invalidation against current state.' },
      { question: 'How many Pergamon visits would the user have made roughly?',         expected: 'Around 35-40 — weekly for about 8 months between January and September 2024.', why: 'Multi-step: anchor the habit to its valid window (Berlin period) and apply a weekly cadence.' },

      // ── Multi-pet current state vs history ──
      { question: 'How many cats does the user have now?',                              expected: '1 — Pretzel. Mochi passed away in April 2025.',                          why: 'Current state requires honoring the "passed away" supersession on Mochi while keeping Pretzel active.' },
      { question: 'Has the user ever lived in Stockholm before this year?',            expected: 'No — Stockholm is the most recent move (May 2025), prior cities were Berlin and Amsterdam.', why: 'Historical query over location: enumerate prior values, exclude the current one.' },

      // ── Chain across multiple entities ──
      { question: 'Trace the user\'s pets and where they were adopted from.',           expected: 'Mochi from the Berlin shelter (March 2024), Pretzel adopted in Amsterdam (December 2024). Mochi passed away April 2025; Pretzel moved with the user to Stockholm.', why: 'Cross-entity reasoning: pets + locations + lifecycle events ordered chronologically.' },
    ],
  },
  {
    id: 'sales-week',
    title: 'A week with the sales team',
    description: "Eight sessions across a single week tracking a SOC2-blocked launch, a slipping deal, a team transition, and a deadline change. The questions probe whether each system can hold the whole context together rather than answering the most recent fact in isolation.",
    conversations: [
      { session: 'Monday standup', date: '2025-04-07', messages: [
        { role: 'user',      content: "Weekly standup. Sarah is leading the SOC2 audit, Tom owns the API redesign, I'm covering the DataVault deal personally." },
        { role: 'assistant', content: "Got it. SOC2 with Sarah, API with Tom, DataVault with you." },
        { role: 'user',      content: "Pipeline this week: Acme $85k in Negotiation, BlockFi $120k moving to Proposal, ClearPath closed $45k, DataVault $200k still Discovery." },
        { role: 'assistant', content: "Pipeline noted. Total $450k with $45k closed." },
      ]},
      { session: 'Monday afternoon: SOC2 risk', date: '2025-04-07', messages: [
        { role: 'user',      content: "Sarah just flagged the external auditor confirmed availability for May 28, not earlier. That makes SOC2 by May 30 very tight." },
        { role: 'assistant', content: "Understood. SOC2 audit window is now May 28; finish-by-May-30 is at risk." },
        { role: 'user',      content: "If SOC2 slips past May 30 we have to push the Q3 launch to Q4. DataVault explicitly requires SOC2 to close." },
        { role: 'assistant', content: "Linked: SOC2 slip → Q3 → Q4 launch delay → DataVault at risk." },
      ]},
      { session: 'Tuesday: API redesign slip', date: '2025-04-08', messages: [
        { role: 'user',      content: "Tom says the API redesign needs one more sprint. New target is July 15 instead of July 1." },
        { role: 'assistant', content: "Noted: API redesign deadline moved July 1 → July 15." },
        { role: 'user',      content: "I prefer bullet-point updates from him going forward, not paragraphs. Set a Monday check-in." },
        { role: 'assistant', content: "Done. Tom: weekly Monday bullet-point update." },
      ]},
      { session: 'Wednesday: deal moves', date: '2025-04-09', messages: [
        { role: 'user',      content: "Acme moved Negotiation → Closed Won for $90k (up from $85k after we added the migration package)." },
        { role: 'assistant', content: "Acme: Closed Won $90k." },
        { role: 'user',      content: "DataVault asked for a SOC2 timeline letter. I'll need that ready before Friday's call." },
        { role: 'assistant', content: "Action: SOC2 timeline letter for DataVault by Friday." },
      ]},
      { session: 'Thursday: Sarah pivot', date: '2025-04-10', messages: [
        { role: 'user',      content: "Sarah is leaving for a senior role at Stripe. Last day May 20. She's handing SOC2 to Priya effective immediately so there's overlap before she goes." },
        { role: 'assistant', content: "Sarah → Stripe (last day May 20). SOC2 owner now: Priya." },
        { role: 'user',      content: "Tell Priya that the external auditor is locked for May 28. She needs to keep that date — pushing it costs us DataVault." },
        { role: 'assistant', content: "Will brief Priya: auditor May 28 is load-bearing for DataVault." },
      ]},
      { session: 'Friday: DataVault call', date: '2025-04-11', messages: [
        { role: 'user',      content: "DataVault call went well. They're comfortable with a May 30 SOC2 letter so long as the audit completes by then." },
        { role: 'assistant', content: "DataVault: OK with letter by May 30 conditional on audit completion." },
        { role: 'user',      content: "BlockFi pushed back on price. Going from $120k Proposal to $95k Negotiation. They want a 6-month pilot first." },
        { role: 'assistant', content: "BlockFi: $120k Proposal → $95k Negotiation, pilot requested." },
      ]},
      { session: 'Friday EOD: pipeline summary', date: '2025-04-11', messages: [
        { role: 'user',      content: "Pipeline EOD: Acme Closed Won $90k, BlockFi $95k Negotiation, ClearPath $45k Closed Won (from last week), DataVault $200k Discovery." },
        { role: 'assistant', content: "End-of-week pipeline: $430k open + $135k closed this week." },
      ]},
      { session: 'Sunday catch-up', date: '2025-04-13', messages: [
        { role: 'user',      content: "Quick note: I'm pushing Tom's Monday API check-in to Tuesday this week — Monday is a UK bank holiday." },
        { role: 'assistant', content: "Tom check-in: Tuesday April 15 (one-off, bank holiday)." },
      ]},
    ],
    questions: [
      { question: 'Who owns the SOC2 audit right now?',                                   expected: 'Priya — Sarah handed it off after leaving for Stripe.',                                    why: 'Supersession: owner changed Thursday. Older "Sarah leads SOC2" must not win.' },
      { question: 'What is the total Closed-Won value for this week?',                    expected: '$135k — Acme $90k + ClearPath $45k.',                                                    why: 'Sum across days; Acme price changed mid-week from $85k to $90k.' },
      { question: 'When is Tom\'s API check-in this week, and why?',                       expected: 'Tuesday April 15, because Monday is a UK bank holiday.',                                  why: 'Most-recent override of an earlier "weekly Monday" preference.' },
      { question: 'What happens to DataVault if the SOC2 audit slips past May 30?',      expected: 'The Q3 launch slips to Q4 and DataVault is at risk because they require SOC2 to close.', why: 'Chain across sessions: SOC2 timeline → Q3 launch → DataVault dependency.' },
      { question: 'What is the current BlockFi deal size and stage?',                     expected: '$95k, Negotiation — down from $120k Proposal after price pushback.',                        why: 'Last fact wins, but the system should also know the prior figure existed.' },
      { question: "What's the format the user wants for Tom's updates?",                  expected: 'Bullet points (not paragraphs).',                                                         why: 'A user preference set on Tuesday must persist through the rest of the week.' },
    ],
  },
];

// ── Page ──────────────────────────────────────────────────────────

const STORAGE_SYSTEMS_KEY = 'demo:enabled-systems:v1';

function loadEnabledSystems(): Set<SystemKey> {
  if (typeof window === 'undefined') return new Set(SYSTEMS.map(s => s.key));
  try {
    const raw = window.localStorage.getItem(STORAGE_SYSTEMS_KEY);
    if (raw) return new Set(JSON.parse(raw) as SystemKey[]);
  } catch { /* corrupt LS, fall through */ }
  return new Set(SYSTEMS.map(s => s.key));
}

export default function ComparisonPage() {
  const [activeScenario, setActiveScenario] = useState(0);
  const [enabledSystems, setEnabledSystems] = useState<Set<SystemKey>>(loadEnabledSystems);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  const scenario = SCENARIOS[activeScenario];

  // Persist the toggle so it survives a refresh — small touch but it's
  // the kind of stateful UI memory people expect.
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_SYSTEMS_KEY, JSON.stringify([...enabledSystems])); }
    catch { /* private mode etc. */ }
  }, [enabledSystems]);

  // Reset the thread when the scenario changes — answers don't carry
  // semantic meaning across scenarios.
  useEffect(() => {
    setTurns([]);
  }, [activeScenario]);

  // Keep the latest turn in view as new answers arrive.
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  const askedSet = useMemo(
    () => new Set(turns.map(t => t.question.trim().toLowerCase())),
    [turns]
  );
  const suggestions = scenario.questions
    .filter(q => !askedSet.has(q.question.trim().toLowerCase()))
    .slice(0, 4);

  const submit = useCallback(async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || busy) return;
    if (enabledSystems.size === 0) return;

    const expectedQ = scenario.questions.find(q => q.question.trim().toLowerCase() === trimmed.toLowerCase());

    setBusy(true);
    setInput('');
    setTurns(prev => [
      ...prev,
      { question: trimmed, expected: expectedQ?.expected, results: 'loading' },
    ]);

    try {
      const res = await fetch('/api/comparison/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario,
          question: trimmed,
          systems: [...enabledSystems],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { results: SystemResult[] } = await res.json();
      setTurns(prev =>
        prev.map((t, i) =>
          i === prev.length - 1 ? { ...t, results: data.results } : t,
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setTurns(prev =>
        prev.map((t, i) =>
          i === prev.length - 1 ? { ...t, results: { error: message } } : t,
        ),
      );
    } finally {
      setBusy(false);
    }
  }, [busy, enabledSystems, scenario]);

  const toggleSystem = (key: SystemKey) => {
    setEnabledSystems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* ── Header ────────────────────────────────────────────── */}
      <header
        className="shrink-0 border-b px-8 pt-6 pb-5"
        style={{
          borderColor: 'hsl(var(--border) / 0.5)',
          background: 'linear-gradient(180deg, hsl(var(--secondary) / 0.2), transparent)',
        }}
      >
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="text-lg font-semibold tracking-tight">{scenario.title}</h1>
          <span className="text-xs text-muted-foreground">{scenario.conversations.length} sessions ingested</span>
        </div>
        <p className="text-sm text-muted-foreground mb-5 max-w-2xl">{scenario.description}</p>

        {/* Scenario picker */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          {SCENARIOS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActiveScenario(i)}
              className="px-3 py-1.5 rounded-md text-xs font-medium border transition-colors"
              style={
                i === activeScenario
                  ? { backgroundColor: 'hsl(var(--secondary))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }
                  : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border) / 0.4)', color: 'hsl(var(--muted-foreground))' }
              }
            >
              {s.title}
            </button>
          ))}
        </div>

        {/* System toggles */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mr-1">
            Compare
          </span>
          {SYSTEMS.map(({ key, label, icon: Icon, hue }) => {
            const on = enabledSystems.has(key);
            return (
              <button
                key={key}
                onClick={() => toggleSystem(key)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
                style={
                  on
                    ? { backgroundColor: `hsl(${hue} / 0.15)`, borderColor: `hsl(${hue} / 0.4)`, color: `hsl(${hue})` }
                    : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border) / 0.4)', color: 'hsl(var(--muted-foreground))' }
                }
                aria-pressed={on}
              >
                <Icon size={11} />
                {label}
                {on && <X size={10} className="opacity-60" />}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── Thread ─────────────────────────────────────────────── */}
      <div ref={threadRef} className="flex-1 overflow-y-auto px-8 py-6">
        {turns.length === 0 && (
          <EmptyState scenario={scenario} onAsk={submit} disabled={busy} />
        )}

        {turns.map((turn, ti) => (
          <TurnRow key={ti} turn={turn} enabledSystems={enabledSystems} />
        ))}

        {turns.length > 0 && suggestions.length > 0 && !busy && (
          <div className="mt-6">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Try next
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map(s => (
                <button
                  key={s.question}
                  onClick={() => submit(s.question)}
                  className="px-3 py-1.5 rounded-md text-xs border transition-colors text-left max-w-md"
                  style={{
                    backgroundColor: 'hsl(var(--secondary) / 0.5)',
                    borderColor: 'hsl(var(--border) / 0.5)',
                    color: 'hsl(var(--foreground))',
                  }}
                >
                  {s.question}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Input ──────────────────────────────────────────────── */}
      <footer
        className="shrink-0 border-t px-8 py-4"
        style={{ borderColor: 'hsl(var(--border) / 0.5)' }}
      >
        <form
          onSubmit={(e) => { e.preventDefault(); submit(input); }}
          className="flex items-end gap-3"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            placeholder={enabledSystems.size === 0 ? 'Enable at least one system to compare' : 'Ask the same question of every enabled system…'}
            disabled={busy || enabledSystems.size === 0}
            rows={1}
            className="input-field resize-none min-h-[44px] max-h-32"
          />
          <button
            type="submit"
            disabled={busy || !input.trim() || enabledSystems.size === 0}
            className="btn-primary h-11 px-4 flex items-center gap-1.5 shrink-0"
          >
            {busy ? 'Asking…' : (<><ArrowUp size={14} /> Send</>)}
          </button>
        </form>
      </footer>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────

function EmptyState({ scenario, onAsk, disabled }: { scenario: Scenario; onAsk: (q: string) => void; disabled: boolean }) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="panel mb-6">
        <div className="panel-header-dots">
          <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          <span className="ml-3 text-xs text-muted-foreground font-mono">
            scenario / {scenario.id}
          </span>
        </div>
        <div className="p-5 space-y-3">
          {scenario.conversations.map((c, i) => (
            <div key={i} className="subpanel">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{c.session}</span>
                <span className="text-[10px] text-muted-foreground/70 font-mono">{c.date}</span>
              </div>
              <div className="space-y-1">
                {c.messages.map((m, j) => (
                  <div key={j} className="text-xs leading-relaxed">
                    <span className={`font-medium ${m.role === 'user' ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {m.role === 'user' ? 'User:' : 'AI:'}
                    </span>{' '}
                    <span className={m.role === 'user' ? 'text-foreground/90' : 'text-muted-foreground'}>
                      {m.content}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
          Start with one of these
        </div>
        <div className="flex flex-wrap gap-2">
          {scenario.questions.map(q => (
            <button
              key={q.question}
              onClick={() => onAsk(q.question)}
              disabled={disabled}
              className="px-3 py-1.5 rounded-md text-xs border transition-colors text-left max-w-md disabled:opacity-50"
              style={{
                backgroundColor: 'hsl(var(--secondary) / 0.5)',
                borderColor: 'hsl(var(--border) / 0.5)',
                color: 'hsl(var(--foreground))',
              }}
            >
              {q.question}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Turn ───────────────────────────────────────────────────────────

function TurnRow({ turn, enabledSystems }: { turn: Turn; enabledSystems: Set<SystemKey> }) {
  const loading = turn.results === 'loading';
  const error = !loading && typeof turn.results === 'object' && 'error' in turn.results
    ? (turn.results as { error: string }).error
    : null;
  const results = !loading && Array.isArray(turn.results) ? turn.results : [];

  // Render answers in the order systems are declared, not the order the
  // server returned them — keeps columns stable across turns.
  const ordered = SYSTEMS
    .filter(s => enabledSystems.has(s.key))
    .map(s => ({ meta: s, result: results.find(r => r.system === s.key) }));

  return (
    <div className="mb-8">
      {/* User question bubble — right-aligned, matches a chat. */}
      <div className="flex justify-end mb-3">
        <div
          className="max-w-2xl px-4 py-2.5 rounded-2xl rounded-br-md text-sm"
          style={{
            backgroundColor: 'hsl(var(--primary) / 0.18)',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--primary) / 0.3)',
          }}
        >
          {turn.question}
        </div>
      </div>

      {turn.expected && (
        <div className="text-[11px] text-muted-foreground mb-3 text-right max-w-2xl ml-auto">
          <span className="font-medium">Expected:</span> {turn.expected}
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive">Request failed: {error}</div>
      )}

      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${ordered.length}, minmax(0, 1fr))` }}>
        {ordered.map(({ meta, result }) => (
          <AnswerPanel
            key={meta.key}
            label={meta.label}
            hue={meta.hue}
            icon={meta.icon}
            loading={loading}
            answer={result?.answer}
            latencyMs={result?.latency_ms}
          />
        ))}
      </div>
    </div>
  );
}

// ── Answer panel ───────────────────────────────────────────────────

function AnswerPanel({
  label,
  hue,
  icon: Icon,
  loading,
  answer,
  latencyMs,
}: {
  label: string;
  hue: string;
  icon: typeof Database;
  loading: boolean;
  answer?: string;
  latencyMs?: number;
}) {
  return (
    <div className="panel flex flex-col">
      <div className="panel-header-dots">
        <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
        <div className="ml-2 flex items-center gap-1.5 text-xs font-medium" style={{ color: `hsl(${hue})` }}>
          <Icon size={12} />
          {label}
        </div>
        {typeof latencyMs === 'number' && (
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">{latencyMs}ms</span>
        )}
      </div>
      <div className="p-4 text-sm leading-relaxed min-h-[5rem]">
        {loading ? (
          <SkeletonText />
        ) : answer ? (
          <span className="whitespace-pre-wrap">{answer}</span>
        ) : (
          <span className="text-muted-foreground italic">No response</span>
        )}
      </div>
    </div>
  );
}

function SkeletonText() {
  return (
    <div className="space-y-2">
      <div className="h-3 rounded animate-pulse" style={{ width: '85%', backgroundColor: 'hsl(var(--muted) / 0.6)' }} />
      <div className="h-3 rounded animate-pulse" style={{ width: '65%', backgroundColor: 'hsl(var(--muted) / 0.6)' }} />
      <div className="h-3 rounded animate-pulse" style={{ width: '40%', backgroundColor: 'hsl(var(--muted) / 0.6)' }} />
    </div>
  );
}
