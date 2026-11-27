# CCNA v2.0 Games: Implementation Plan

*28 Nov 2026. This plan is meant to be handed to Claude Code, working in a GitHub repo.*

## Jump to
- [1. Scope](#1-scope)
- [2. Decisions made](#2-decisions-made)
- [3. Tech stack](#3-tech-stack)
- [4. Repo layout](#4-repo-layout)
- [5. Core systems](#5-core-systems)
- [6. Game specs](#6-game-specs)
- [7. Milestones](#7-milestones)
- [8. Getting the networking right](#8-getting-the-networking-right)
- [9. Testing](#9-testing)
- [10. Definition of done](#10-definition-of-done)
- [11. Risks](#11-risks)
- [12. Kick-off prompt for Claude Code](#12-kick-off-prompt-for-claude-code)

---

## 1. Scope

**Included**
- One hub web app with 19 games plus a capstone, covering every topic on the CCNA (Cisco Certified Network Associate) 200-301 **v2.0** blueprint (first test date 3 Feb 2027).
- Shared engines: question generators, network math, topology simulator, mini command line, fake device output, spaced review.
- Works offline once loaded, saves progress on the device, phone first.
- Automated tests for all networking logic.

**Left out**
- Everything only on v1.1 (TCP vs UDP, NTP, QoS, TFTP/FTP, REST/JSON, controller GUI setup, and the rest). The old "Rush Hour" game is dropped.
- User accounts, cloud sync, leaderboards, multiplayer.
- A full Cisco command-line simulator (each level only accepts the commands it needs).
- Real device connections or real packet capture.
- Sound, music, and fancy animation beyond simple transitions.
- A native iOS (Apple's iPhone/iPad operating system) or Android app. It's a web app you can add to the home screen.

---

## 2. Decisions made

| Question | Decision |
|---|---|
| Structure | One hub app with a shared progress map and one review queue |
| Device | Phone first; works fine on desktop and iPad |
| Command line depth | Per-level command sets, all backed by one shared device model |
| Builder | Claude Code, GitHub repo, staged milestones with tests |
| Exam version | v2.0 only |

---

## 3. Tech stack

| Part | Choice | Why |
|---|---|---|
| Language | TypeScript | Type checking catches mistakes in the networking logic |
| UI (user interface) | React + Vite | Common, fast builds, Claude Code knows it well |
| State | Zustand | Small and simple |
| Saved data | IndexedDB (the browser's built-in database) via Dexie | Progress and review cards stay on the phone |
| Offline | PWA (progressive web app) via `vite-plugin-pwa` | Add to home screen, works without signal |
| Spaced review | `ts-fsrs` (FSRS, Free Spaced Repetition Scheduler) | Proven scheduling, no need to invent one |
| YAML parsing | `yaml` package | For the Ansible game |
| Diagrams | Plain SVG (scalable vector graphics) drawn by React | Sharp on phones, easy to tap |
| Unit tests | Vitest + `fast-check` (random-input testing) | Proves the math works for thousands of random cases |
| Screen tests | Playwright at phone size (390×844) and desktop | Checks each game actually plays |
| Hosting | GitHub Pages, deployed by GitHub Actions | Free, automatic on every merge |

**Look and feel:** dark theme with a set background colour, full-opacity text, strong contrast, body text 20px or larger, nothing pinned to the top of the screen, tap targets at least 48px.

---

## 4. Repo layout

```
ccna-games/
  CLAUDE.md                  ← rules for Claude Code (see section 12)
  src/
    app/                     ← hub, progress map, settings, routing
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
        spec.md              ← the game's spec (from section 6)
        generator.ts
        levels.ts
        Game.tsx
        *.test.ts
  reference/
    outputs/                 ← real device output samples (see section 8)
  tests/e2e/                 ← Playwright tests
```

**Rule:** games never do networking math themselves. They call `core/`. This keeps all the logic in one tested place.

---

## 5. Core systems

### 5.1 Game frame (`core/game`)
Every game plugs into the same frame:
- **Modes:** Learn (guided, explanations after each step), Drill (timed, scored), Break-Fix (find the planted fault).
- **Level definition:** `{ id, mode, generatorParams, allowedCommands?, passScore, timeLimit? }`.
- **Results screen:** score, accuracy, time, and a "what you missed" list with explanations.
- **Every wrong answer** sends a card to the review queue, tagged with its blueprint topic (for example `v2-3.3`).

### 5.2 Seeded random generator (`core/rng`)
Every puzzle comes from a seed. Same seed gives the same puzzle, so bugs can be reproduced and puzzles can be shared.

### 5.3 Network math (`core/netmath`)
IPv4 (Internet Protocol version 4): parse, network/broadcast/host range, host count, VLSM (variable-length subnet masking) splitting, private/public check, wildcard masks.
IPv6 (version 6): parse, compress, expand, type detection, prefix counting, modified EUI-64 (Extended Unique Identifier).
**Must be correct for every input.** Tested with thousands of random cases.

### 5.4 Device model (`core/device`)
One shared description of a router or switch: hostname, interfaces (mode, VLAN, speed, duplex, status, IP), VLAN list, trunk settings, port-channels, SVIs (switch virtual interfaces), static routes, OSPF settings, HSRP/VRRP groups, ACLs, NAT rules, users, AAA settings, Layer 2 security settings.
The command line changes this model. The simulators read it. Output is printed from it. Checks are done against it, **never against the text the player typed.** That way `sw mode acc` and `switchport mode access` both pass.

### 5.5 Mini command line (`core/cli`)
- Modes: user `>`, privileged `#`, global config `(config)#`, interface `(config-if)#`, line, router, and so on.
- Cisco-style short forms (`sh ip int br`) matched against the level's allowed command list.
- `?` lists what the level allows next. `do` works in config modes.
- Clear error messages, like real IOS (Cisco's Internetwork Operating System): `% Invalid input detected`, `% Incomplete command`.
- **Phone helper:** a row of tap-to-insert chips for the next likely word, a Tab button, and command history arrows. Typing is still allowed.
- Each level gives a small grammar file listing the commands it accepts. Unknown but real commands reply "not available in this level" so the player isn't misled.

### 5.6 Topology engine (`core/topology`)
Graph of devices and links with fixed layouts per scenario (no auto-layout needed at first). SVG rendering, pinch to zoom, tap a device to open its command line or output.

### 5.7 Simulators (`core/sim`)
Rule-based, not packet-perfect. Each one answers the questions the games ask:
- **L2:** what a switch does with a frame; full STP (Spanning Tree Protocol) election per VLAN for Rapid PVST+.
- **L3:** which route a packet uses (longest match → AD, administrative distance → metric); OSPF (Open Shortest Path First) neighbor check (a list of rules that must all match); DR/BDR election; router ID choice; HSRP/VRRP active/standby and preemption.
- **Services:** ACL (access control list) evaluation, NAT/PAT (network/port address translation) table, DHCP DORA (Discover, Offer, Request, Acknowledge) with relay, ARP (Address Resolution Protocol), DNS (Domain Name System) record lookup.
- **Security:** what each attack does with and without each defense.

### 5.8 Fake output (`core/output`)
Turns the device model into text that looks like real IOS XE output: `show interfaces`, `show ip interface brief`, `show ip route`, `show ipv6 route`, `show spanning-tree`, `show etherchannel summary`, `show cdp neighbors detail`, `show lldp neighbors`, `show ip ospf neighbor`, `show standby brief`, `show vrrp brief`, `show ip nat translations`, `show access-lists`, `show port-security`, `show logging`.
Plus client output (`ipconfig /all`, `ifconfig`, `ip addr`, `nslookup`, `dig`, `ping`, `traceroute`) and short packet-capture summaries.
**Every template must match a real sample in `reference/outputs/`** (see section 8).

### 5.9 Fault injection (`core/faults`)
A list of named faults, each with: what it changes in the device model, which outputs show it, the fix, and the blueprint topic. Example: `ospf.hello-mismatch`, `vlan.native-mismatch`, `l1.duplex-mismatch`. Break-Fix levels and the capstone pick from this list.

### 5.10 Review queue (`core/srs`)
One queue across all games. Cards store enough to rebuild the exact question (game, seed, step). The hub shows "X reviews due" and runs a mixed review session.

### 5.11 Hub (`src/app`)
Progress map grouped by the five v2.0 domains, with domain weight shown. Each game shows stars per mode. Settings: timer on/off, hints on/off, export/import progress as a file (backup, since there's no cloud sync).

---

## 6. Game specs

Size: **S** small, **M** medium, **L** large. "Needs" lists the core systems a game depends on.

| # | Game | v2.0 topics | Needs | Size |
|---|---|---|---|---|
| 1 | Subnet Sprint | 1.3 | netmath | S |
| 2 | Hex Garden | 1.4 | netmath | S |
| 3 | Cable Doctor | 1.1 | output, faults | S |
| 4 | Frame Run | 2.1.b, 2.4 | topology, sim/l2 | M |
| 5 | Root Wars | 2.5 | topology, sim/l2, cli | M |
| 6 | Port Architect | 2.1, 2.2 | cli, device, sim/l2 | L |
| 7 | Neighbor Detective | 2.3 | topology, output | S |
| 8 | Longest Match | 3.1, 3.2 | netmath, sim/l3, output, cli | M |
| 9 | Adjacency Quest | 3.3 | sim/l3, cli, output, faults | L |
| 10 | Gateway Guardians | 3.4 | sim/l3, output | S |
| 11 | Help Desk Hotline | 1.6, 1.7, 4.4 | output, faults, sim/services | M |
| 12 | Packet Passport | 1.7, 4.3 | topology, sim/services, cli | M |
| 13 | ACL Bouncer | 4.6 | netmath, sim/services, cli | M |
| 14 | Port Defender | 4.7 | topology, sim/security | M |
| 15 | Locksmith | 4.1, 4.2, 4.5 | cli, device | M |
| 16 | Airwaves | 1.5, 2.2.b | own canvas logic | M |
| 17 | NOC Night Shift | 2.4, 5.1, 5.2, 5.3, 5.4, 5.6 | output | M |
| 18 | Playbook Runner | 5.5 | yaml, device, output | L |
| 19 | Blueprint Builder | 1.2 | none | S |
| 20 | Capstone: Outage | all | everything, faults | L |

The gameplay for each game is in **ccna-minigames-plan.md**, with these v2.0 changes:
- Remove every "[v1.1 pack] add-on".
- **Blueprint Builder** shrinks to hypervisors (type 1 and 2), VMs (virtual machines) and containers only.
- **Locksmith** drops the password-policy and security-program add-on.

Each game folder gets a `spec.md` written before coding. Template:

```
# <Game name>
Topics: v2-x.y …
Modes and levels: (table: level, mode, what's generated, pass score, time limit)
Player actions: (tap, drag, type)
Generator rules: (ranges, what's random, what's fixed)
Correctness source: (which core function decides the right answer)
Faults used: (fault IDs, Break-Fix only)
Allowed commands: (CLI games only, per level)
Explanations: (what's shown after a wrong answer)
Tests: (list)
```

---

## 7. Milestones

Each milestone ends with a pull request that passes all checks and is playable on GitHub Pages. You test on your phone before the next one starts.

### M0: Foundation
- Repo, TypeScript strict mode, linting, formatting, Vitest, Playwright, GitHub Actions (check → test → build → deploy).
- `CLAUDE.md`, dark theme tokens, empty hub that installs as a home-screen app and loads offline.
- **Done when:** the hub loads on your phone, works in airplane mode, and the pipeline deploys on merge.

### M1: Game frame, saving, review queue
- `core/game`, `core/rng`, `core/srs`, Dexie storage, results screen, progress export/import.
- A throwaway demo game to prove the frame works.
- **Done when:** a demo game records a miss, the miss shows up in reviews, and progress survives closing the app.

### M2: Network math + games 1 and 2
- `core/netmath` with random-input tests.
- Subnet Sprint, Hex Garden: all modes.
- **Done when:** 10,000 random IPv4 and IPv6 cases pass, and both games are playable start to finish on a phone.

### M3: Fake output + games 3, 8, 10, 7
- `core/output` (first set of templates), `core/faults` (first faults), `reference/outputs/` samples.
- `sim/l3` route lookup and HSRP/VRRP.
- Cable Doctor, Longest Match (reading levels only), Gateway Guardians, Neighbor Detective.
- **Done when:** every template has a matching real sample, and each game's Break-Fix mode has at least 5 different faults.

### M4: Topology + Layer 2 + games 4 and 5
- `core/topology`, `sim/l2` (MAC learning, VLANs, trunks, STP).
- Frame Run, Root Wars (election levels).
- **Done when:** the STP result matches hand-worked answers for 20 reference topologies (see section 8).

### M5: Device model + command line + game 6
- `core/device`, `core/cli` with phone helper chips.
- Port Architect. Add the CLI levels to Root Wars and Longest Match (static routes, floating routes).
- **Done when:** short and long forms of every allowed command work, and checks are based on device state, not typed text.

### M6: Games 13 and 9
- `sim/services` ACL part, `sim/l3` OSPF rules.
- ACL Bouncer, Adjacency Quest.
- **Done when:** the ACL builder fires 50 test packets at the player's ACL and reports correctly, and all 7 OSPF neighbor faults are detectable and fixable.

### M7: Games 11 and 12
- Client output templates, DNS and DHCP faults, NAT/PAT, ARP, DORA.
- Help Desk Hotline, Packet Passport.

### M8: Games 14 and 15
- `sim/security`, AAA, SSH and SCP/SFTP commands.
- Port Defender, Locksmith.

### M9: Games 16, 17, 19
- Airwaves channel planner and RF (radio frequency) lab.
- NOC Night Shift: syslog stream, SNMP, AI desk, prompt choice, capture reading.
- Blueprint Builder.

### M10: Game 18
- Fake Ansible runner: parse inventory and playbook, check YAML, "run" `cisco.ios.ios_command` and `ios_config` against the device model, print Ansible-style output, show idempotence (second run reports no changes).
- Playbook Runner.

### M11: Capstone + polish
- Outage: random multi-fault branch network, report card by domain.
- Accessibility pass, speed pass (first load under 3 seconds on 4G), bug fixes from your testing.
- **Done when:** you can play every game offline on your phone, and every v2.0 topic has at least one game with a Break-Fix or Drill mode.

**Suggested order if you want something to play sooner:** M0 → M1 → M2 gives a working Subnet Sprint early. That's the most-used skill on the exam.

---

## 8. Getting the networking right

A study game that teaches something wrong is worse than none. These rules guard against that.

1. **Real output samples.** Before writing a show-command template, put a real sample in `reference/outputs/`. Sources: Cisco documentation, or your own lab in Packet Tracer or CML (Cisco Modeling Labs). Claude Code must not invent output formats. If no sample exists, it stops and asks.
2. **Worked answers.** For STP, OSPF DR/BDR, route lookup and ACLs, keep a set of hand-checked reference cases (`*.fixtures.json`). The simulator must match them exactly.
3. **Source every fact.** Explanations that state a fact (port numbers, virtual MAC formats, AD values, syslog levels) cite where it came from in a code comment.
4. **Blueprint tags.** Every level is tagged with its v2.0 topic numbers. A test fails if any v2.0 topic has no level.
5. **Your review.** At the end of each milestone, you play it and flag anything that looks wrong. Flags become issues in GitHub.

---

## 9. Testing

| Layer | What | Tool |
|---|---|---|
| Network math | Random-input tests against reference formulas | Vitest + fast-check |
| Simulators | Hand-checked fixture cases | Vitest |
| CLI | Every allowed command, short and long forms, wrong-mode errors | Vitest |
| Output | Templates compared to `reference/outputs/` layouts | Vitest snapshots |
| Generators | Every seed produces a puzzle with exactly one right answer | Vitest |
| Games | Play through each mode at phone and desktop size | Playwright |
| Coverage | Every v2.0 topic has a level | Vitest |

All tests run on every pull request. Nothing merges with a failing test.

---

## 10. Definition of done

A game is done when:
- All three modes (Learn, Drill, Break-Fix) work, where the spec includes them.
- Its `spec.md` matches what was built.
- Unit and screen tests pass.
- Every right answer comes from a `core/` function, not hard-coded.
- Misses go to the review queue.
- It's readable and playable one-handed on a phone in dark mode.
- It works offline.

---

## 11. Risks

| Risk | Effect | Plan |
|---|---|---|
| Fake output doesn't match real IOS XE | Learning the wrong thing | Real samples required (section 8.1) |
| Typing commands on a phone is painful | You stop playing CLI games | Tap chips, Tab button, history; short forms accepted |
| Simulator logic gets too big | Milestones drag | Rule-based simulators only; answer just what the games ask |
| Data lost (no cloud sync) | Progress gone | Export/import backup file in settings |
| Cisco tweaks v2.0 topics before Feb 2027 | Gaps | Blueprint tag list in one file; coverage test flags gaps |
| Claude Code drifts from the spec | Rework | One milestone per pull request; you test before the next starts |

---

## 12. Kick-off prompt for Claude Code

Put this plan and **ccna-minigames-plan.md** in the repo's `docs/` folder, then start with:

```
Read docs/ccna-games-implementation-plan.md and docs/ccna-minigames-plan.md.
Create CLAUDE.md from sections 3, 4, 8 and 10 of the implementation plan.
Then do milestone M0 only. Open a pull request when the checks pass, and stop.
Rules: TypeScript strict, all networking logic in src/core with tests,
never invent Cisco output formats (ask me for a sample instead),
dark theme, 20px+ body text, nothing pinned to the top of the screen.
```

After each milestone: test it on your phone, then tell Claude Code "Do M1", "Do M2", and so on.
