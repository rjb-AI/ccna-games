# CLAUDE.md

Rules for Claude Code in this repo. Built from sections 3, 4, 8 and 10 of
`docs/ccna-games-implementation-plan.md`. Game designs are in `docs/ccna-minigames-plan.md`.
Target: CCNA 200-301 **v2.0** only.

## Hard rules

1. **All networking logic lives in `src/core` and has tests.** Subnet math, route lookup, STP, ACL
   matching, NAT, device state, output templates: all in `src/core`, all covered by Vitest.
2. **Games never compute answers themselves.** A game calls a `src/core` function to get the right
   answer. No networking math in `src/games/`, no hard-coded answers.
3. **Never invent Cisco output formats.** Every show-command, syslog or client-output template
   must match a real sample in `reference/outputs/` (see `reference/outputs/SOURCES.md`). Where
   that folder has a TextFSM template for the command, generated output must parse with it into
   the fields the simulator intended. If there is no sample, stop and ask the user for a real
   one. Do not guess.
4. **One milestone per pull request.** Do only the milestone asked for (M1, M2, ...; see section
   7 of the implementation plan). Open a PR, and once CI passes merge it yourself with
   `gh pr merge --squash --delete-branch`. Do not wait for the user. Wait for the Pages deploy
   to finish, check the live site serves the new build, then tell the user the milestone is live
   so they can test it on their phone. Then stop: do not start the next milestone until asked.
5. **Build systems, not one-off fixes.** Every rule has one owner module (for example "what is
   due" lives in `src/app/review/queue.ts` on top of `src/core/srs`). When fixing a bug, find
   that owner, write a test that fails, fix it there, and route every screen through it. Never
   patch the same rule separately in several screens. If logic is repeated, consolidate it.
6. **Keep `docs/BACKLOG.md` current.** It is the user's Kanban view of the work: add every
   request and audit finding to it, and move items to Done in the PR that finishes them.
7. **Follow the theme rules** (below). All colours, sizes and spacing come from
   `src/app/theme/tokens.css`.

## Theme rules

- Dark background set explicitly, never the browser default.
- Text at full opacity with strong contrast. No `opacity` or alpha on text.
- Body text at least 20px. Nothing smaller.
- Tap targets at least 48px.
- Nothing `position: fixed` or `position: sticky` at the top of the screen. Jump links scroll
  with the page.
- Phone first (390×844), but it must also work on desktop and iPad.

## Tech stack (section 3)

| Part          | Choice                                                              |
| ------------- | ------------------------------------------------------------------- |
| Language      | TypeScript, strict mode                                             |
| UI            | React + Vite                                                        |
| State         | Zustand                                                             |
| Saved data    | IndexedDB via Dexie                                                 |
| Offline       | PWA via `vite-plugin-pwa`                                           |
| Spaced review | `ts-fsrs`                                                           |
| YAML parsing  | `yaml` (Ansible game)                                               |
| Diagrams      | Plain SVG drawn by React                                            |
| Unit tests    | Vitest + `fast-check`                                               |
| Screen tests  | Playwright at phone size (390×844) and desktop                      |
| Hosting       | GitHub Pages, deployed by GitHub Actions (base path `/ccna-games/`) |

## Repo layout (section 4)

```
CLAUDE.md
docs/                      ← the two plan files
src/
  app/                     ← hub, progress map, settings, routing; theme/tokens.css
  core/
    netmath/               ← IPv4/IPv6 math, wildcard masks, EUI-64
    rng/                   ← seeded random numbers (same seed = same puzzle)
    topology/              ← network graph + SVG renderer
    sim/
      l2/                  ← MAC learning, VLANs, trunks, STP
      l3/                  ← route lookup, static routes, OSPF rules, HSRP/VRRP
      services/            ← ACL, NAT/PAT, DHCP, DNS, ARP
      security/            ← DHCP snooping, DAI, port security, storm control, RA guard
    device/                ← shared device model (interfaces, VLANs, routes, config)
    cli/                   ← mini command line: parser, modes, per-level grammar
    output/                ← fake show-command, syslog, client and capture output
    faults/                ← fault injection for Break-Fix modes
    srs/                   ← review cards and scheduling
    game/                  ← shared game frame: modes, timer, scoring, results
  games/
    01-subnet-sprint/ … 20-capstone/
      spec.md              ← written before coding (template in plan section 6)
      generator.ts
      levels.ts
      Game.tsx
      *.test.ts
reference/
  outputs/                 ← real device output samples
tests/e2e/                 ← Playwright tests
```

## Getting the networking right (section 8)

1. **Real output samples.** Before writing a show-command template, put a real sample in
   `reference/outputs/` (Cisco documentation, Packet Tracer or CML, or the real device captures
   imported from ntc-templates and genieparser by `scripts/import-reference-samples.sh`; add a
   command to that script's lists rather than copying files by hand). If none exists, stop and ask.
2. **Worked answers.** STP, OSPF DR/BDR, route lookup and ACLs keep hand-checked reference cases
   in `*.fixtures.json`. The simulator must match them exactly.
3. **Source every fact.** Explanations that state a fact (port numbers, virtual MAC formats, AD
   values, syslog levels) cite their source in a code comment.
4. **Blueprint tags.** Every level is tagged with its v2.0 topic numbers (for example `v2-3.3`).
   A test fails if any v2.0 topic has no level.
5. **User review.** At the end of each milestone the user plays it and flags problems. Flags
   become GitHub issues.

## Definition of done for a game (section 10)

- All three modes (Learn, Drill, Break-Fix) work, where the spec includes them.
- Its `spec.md` matches what was built.
- Unit and screen tests pass.
- Every right answer comes from a `src/core` function, not hard-coded.
- Misses go to the review queue.
- Readable and playable one-handed on a phone in dark mode.
- Works offline.

## Adding a game (frame from M1)

- A game is a folder in `src/games/NN-name/` that exports `defineGame({...})` from `index.ts`, and
  is listed in `src/app/registry.ts`.
- It supplies `makeQuestion(params, seed, step)` (must be deterministic: use `stepRng` from
  `src/core/rng`), `check(question, response)`, `describe(question)`, its `levels` and a `View`.
  Multiple-choice games can reuse `src/app/frame/ChoiceView.tsx`.
- The frame (`src/app/frame/PlayScreen.tsx`) runs sessions with `src/core/game`, saves results,
  and sends every miss to the review queue (`src/core/srs`) as `{gameId, levelId, seed, step}`.
  The review screen rebuilds the question from that, so never change a released level's
  generator output for a given seed without a new level id.
- Every level has `topics` with v2.0 blueprint tags like `v2-1.3`.
- Question kinds the frame already supports (all in `src/app/frame/`): `ChoiceView` (tap one;
  optional facts and per-choice "why wrong"), `FieldsView` (typed answers on an on-screen keypad,
  compared by value), `LabelsView` (give every item one of a few options), `OrderView` (put items
  in order, drag-and-drop), `BinsView` (a `LabelsQuestion` with `display: 'bins'`: sort cards
  into a fixed grid of bins), `WireBoardView` (drag wires onto connectors), `TapView` (answer by
  tapping a switch or port on a topology), `CliView` (the command line). Mix them in one game
  with `MixedView`. Diagrams must fit a 390px phone (layout.ts decides; `layout.test.ts`
  enforces it): ports become tap-to-read dots before anything scrolls sideways. Any question can show `visuals`: topology
  diagrams (`src/app/topology`), tables, and numbered configuration lines. Build new kinds and
  visuals there so every game can reuse them.
- Show device settings as tables or configuration lines (input syntax). Never draw something that
  looks like show-command output without a real sample (rule 3).
- Command-line rounds use the `cli` kind (`src/app/frame/cli.ts`, `CliView.tsx`). The question
  carries a start `DeviceState`, the allowed command ids, and `Requirement`s from
  `src/core/device/checks.ts`; the answer is the typed lines, replayed by `src/core/cli` and judged
  on the resulting state, never the text. Add commands to `src/core/cli/commands.ts` (one
  catalogue; levels pick by id) with tests in `src/core/cli/cli.test.ts`. Device messages (lines
  starting `%`) must come from a real sample; anything else the game says is a note.
- Show commands live in `src/core/cli/show.ts` and print through `src/core/output`. Each template
  that has a TextFSM parser is registered in `src/core/output/validation.ts`; CI parses 200 random
  outputs per command with the real parser (`npm run test:outputs`) and fails on any difference.
- `src/app/registry.test.ts` checks every level: unique ids, real blueprint tags, and that every
  step generates. `tests/e2e/levels.spec.ts` opens every level at phone and desktop size.

## Commands

```
npm run dev          # local dev server
npm run lint         # ESLint
npm run format       # Prettier (write); CI runs format:check
npm run typecheck    # tsc -b
npm test             # Vitest unit tests
npm run test:e2e     # Playwright (builds, then serves the production build)
npm run test:outputs # generated show output parsed by the real TextFSM templates (needs python3 + textfsm)
npm run build        # production build to dist/
```

CI (`.github/workflows/ci.yml`) runs lint, format check, typecheck, unit, e2e and build on every
PR, and on push to `main` also deploys to GitHub Pages. Nothing merges with a failing check.
