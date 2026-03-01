# Project Memory

## Hard Rules
- **Never use regex for intent/goal inference.** Always use the SDK's `extractIntentAndResponse` + `intentToGoal` mapping via the registry. This is a strict project rule.

## Architecture Notes
- MINNS SDK demo: ReAct agent loop in `server/src/agent/agent.ts`
- Goal is a living value: tracked per-customer across turns (`customerGoals` map), re-evaluated mid-loop via SDK intent extraction after each action/observation
- Knowledge context (memories, claims, strategies) is pre-ranked by significance/confidence/quality before injection — only top N items go into the prompt
- `server/src/agent/prompts.ts` builds the knowledge context; `server/src/minns/registry.ts` manages intent specs + goal mapping
