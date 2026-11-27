# Frame Demo (throwaway)

Temporary game from milestone M1 that proves the game frame, saving and review queue work.
Delete it once a real game (Subnet Sprint, M2) is in place.

Topics: `demo` (not a blueprint topic on purpose)

Modes and levels:

| Level      | Mode      | What's generated                          | Pass score | Time limit |
| ---------- | --------- | ----------------------------------------- | ---------- | ---------- |
| `learn`    | Learn     | 5 sums of two numbers 1–20, pick from 4   | 60%        | none       |
| `drill`    | Drill     | 10 sums of two numbers 10–99, pick from 4 | 70%        | 60 s       |
| `breakfix` | Break-Fix | 5 sets of 4 sums, one is wrong: tap it    | 60%        | none       |

Player actions: tap one choice.

Generator rules: each step uses `stepRng(seed, step)`. Distractors are the answer ±1, ±2 or ±10,
kept positive and unique. Break-Fix: one equation's total is off by 1, 2, 3 or 10.

Correctness source: plain arithmetic in `generator.ts`. This is the one allowed exception to
"games never compute answers", because the demo has no networking content and will be deleted.
Real games must get answers from `src/core`.

Faults used: none.

Explanations: shows the correct sum.

Tests: `generator.test.ts`: deterministic per seed and step, exactly one right answer, 4 unique choices.
