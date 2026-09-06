# Ancient Greek Alphabet Trainer — Design

Date: 2026-09-06
Status: approved for planning

## Purpose

A single static web page, hosted directly from a GitHub repository via GitHub
Pages, that drills recognition of the 24 Ancient Greek letters in both cases.
The user presses one large PLAY button, answers ten multiple-choice cards, and
repeats until every glyph is mastered and a final test over the whole alphabet
is passed cleanly. Progress survives between visits in browser storage.

All decision logic is pure, dependency-free, and unit tested. Rendering is not
tested.

## Scope

In scope: letter recognition (glyph → name), progress tracking, error-driven
repetition, a final test, local persistence, unit tests.

Out of scope: pronunciation, audio, transliteration drills, name → glyph
direction, accounts, sync between devices, build tooling.

## Item Model

The trainable unit is a single glyph, not a letter. 24 letters × 2 cases = 48
items.

```js
{ id: "theta-lower", name: "theta", glyph: "θ", letter: "theta", case: "lower" }
```

- `id` is `` `${letter}-${case}` `` and is the key used everywhere in persisted
  state.
- `name` is the answer shown on option buttons, in English/Latin form
  (alpha, beta, gamma, … theta, xi, psi, omega).
- `Α` and `α` are two distinct items that share the name *alpha*. Distractors
  are therefore drawn from the pool of **names**, never from the pool of items,
  so a card can never offer the same name twice.

Final sigma `ς` is excluded. It is a positional variant, not a letter of the
alphabet, so the pool is exactly 48 items.

## Persisted State

One localStorage key, `greek-alphabet-progress`, holding a versioned JSON
document:

```js
{
  version: 1,
  phase: "training" | "finalTest" | "done",
  items: {
    "alpha-lower": { target: 10, correct: 0, errors: 0 },
    // … one entry per item id, 48 total
  },
  lastSessionIds: ["theta-lower", "psi-upper", /* … */],
  finalTest: { queue: ["…ids in test order"], index: 3, missed: ["…ids"] } | null,
  stats: { sessions: 0, cards: 0, errors: 0 }
}
```

Rules:

- `debt = target - correct`. An item is **retired** when `debt <= 0`.
- Every item starts at `target: 10, correct: 0, errors: 0`.
- `finalTest` is `null` outside the `finalTest` phase.
- State is written after **every answered card**, not at session end, so
  closing the tab mid-session costs at most the current card.
- On load, a payload whose `version` is missing or unrecognised, or whose shape
  fails validation, is discarded and replaced with a fresh initial state. No
  migration logic exists at version 1; the field is there so a later schema
  change has somewhere to hook.

## Progress Rules

### Correct answer

`correct += 1`. The item retires when `correct >= target`.

### Wrong answer

`correct` is unchanged; `errors += 1`; `target` grows by a penalty keyed to how
far along the item was at the moment of the error:

| `correct` at time of error | penalty added to `target` |
|---|---|
| 0–3 | +3 |
| 4–6 | +2 |
| 7 or more | +1 |

`target` is capped at 20, so a repeatedly-missed letter cannot become
unretirable.

Consequence worth stating explicitly: an error at `correct = 7`, `target = 10`
leaves the item owing 4 more correct answers (`target` 11, `correct` 7), not 3.

## Session Composition

`pickSession(items, lastSessionIds, rng)` returns up to 10 **distinct**
non-retired items, sampled without replacement with weight:

```
weight = debt × (errors > 0 ? 2 : 1) × (lastSessionIds includes id ? 0.25 : 1)
```

- Retired items have weight 0 and are never drawn.
- Debt makes struggling letters recur more often.
- The `0.25` factor implements "each round has different letters, not only
  letters from the previous round": last round's items are not banned, merely
  outbid by fresh ones.
- When fewer than 10 non-retired items remain, the session is simply shorter
  and contains all of them.
- `rng` is injected, so tests seed it and assert exact selections.

## Distractors

`alphabet.js` carries a curated confusion table mapping each letter to the
letters it is genuinely mistaken for, for example:

```
theta   → omicron, sigma, epsilon
xi      → zeta, chi
nu      → upsilon, omega
eta     → nu, pi          (uppercase Η/Ν/Π)
rho     → pi, gamma
zeta    → xi, chi
```

`pickOptions(item, names, rng)` returns exactly 4 options:

1. the correct name;
2. up to 3 wrong names taken from the item's confusion set, shuffled;
3. if the confusion set is too small, top up with names drawn uniformly from
   the remaining pool;
4. dedupe by name, then shuffle the four positions.

Every card shows 4 options. The correct name is always present exactly once.

## Phases

The page is a small state machine. Persisted `phase` has three values —
`training`, `finalTest`, `done` — because that is all that must survive a
reload. Within `training`, the UI moves through three transient screens (idle,
session, summary) that are not persisted: a reload during a session returns to
idle with every answered card already banked.

**idle** — a large PLAY button centred on the page, with a quiet progress line
beneath it (`31 / 48 letters mastered`).

**session** — 10 cards, one at a time. Each card shows one glyph and four name
buttons. Tapping an option shows a green ✓ on a correct choice or a red ✗ on a
wrong one, with the correct button highlighted on a miss, for roughly 600 ms,
then advances. Progress is saved after each card.

**summary** — score for the session (`8 / 10`) and the letters missed, then
back to idle.

**finalTest** — entered automatically once all 48 items are retired. All 48
items in random order, one pass, same ✓/✗ feedback. A miss sets that item's
`target = correct + 3` (the item owes 3 more correct answers) and records the id
in `missed`. Final-test answers do not use the training penalty table.

**done** — reached only after a 48-card pass with no misses. Shows a completion
screen.

### Transition on a failed final test

If `missed` is non-empty at the end of the pass, the phase returns to
`training` with only the missed items unretired. When those are paid off, the
**full 48-item final test runs again** — "done" means a clean sweep of the
whole alphabet, not merely of the previously missed letters.

## Module Layout

Logic modules are dependency-free and contain no DOM access. `ui.js` is the
only file that touches the document, and the only file without tests.

```
index.html            page shell, loads src/ui.js as type="module"
styles.css
src/alphabet.js       the 24 letters + confusion table (pure data)
src/items.js          builds the 48 items from alphabet.js
src/progress.js       penaltyFor, applyAnswer, isRetired, allRetired
src/scheduler.js      pickSession and its weighting
src/options.js        pickOptions (distractor selection)
src/finalTest.js      queue construction, applyFinalAnswer, phase transitions
src/storage.js        serialize / deserialize / validate + localStorage adapter
src/rng.js            seeded mulberry32 for tests, Math.random for the browser
src/ui.js             rendering and event wiring only
test/*.test.js        node --test
```

Randomness enters every logic function as an injected `rng` argument. This is
the single design choice that makes the scheduler, the distractor picker, and
the final-test queue deterministically testable.

## Hosting

No build step, no dependencies, no CI workflow. `index.html` loads ES modules
directly from `src/`. Commit to the repository and enable GitHub Pages on the
branch root; the served files are the source files.

## Testing

Run with `node --test`. Coverage targets the rules that can actually be wrong:

- **progress**: penalty at each boundary (`correct` = 3, 4, 6, 7); the cap at
  20; `applyAnswer` advancing `correct`, incrementing `errors`, and retiring an
  item; `allRetired` across a mixed pool.
- **scheduler**: returns 10 distinct items; never returns a retired item;
  returns all remaining items when fewer than 10 are left; returns an empty
  session when none remain; honours debt weighting and the last-session penalty
  under a seeded RNG.
- **options**: always contains the correct name exactly once; always 4 options;
  never duplicates a name; prefers confusables when the confusion set is large
  enough; tops up correctly when it is not.
- **storage**: round-trips a full state document; rejects a corrupt payload;
  rejects an unknown `version` and falls back to initial state.
- **finalTest**: queue contains all 48 items exactly once; a miss sets
  `target = correct + 3` and records the id; a clean pass reaches `done`; a
  failed pass returns to `training` with only the missed items unretired, and
  the next test again covers all 48.
- **phase machine**: the full path training → finalTest → miss → training →
  finalTest → done.

## Open Questions

None. Decisions taken during design, recorded here so they are not relitigated:
progress is counted as 10 correct answers per glyph; lowercase and uppercase
form one mixed pool of 48; distractors are confusable-biased; option labels are
English/Latin; a missed letter in the final test owes 3 rounds, not 10.
