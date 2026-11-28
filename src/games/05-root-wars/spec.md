# Root Wars

Topics: v2-2.5 (Rapid PVST+)

## Modes and levels

| Level            | Mode      | What's generated                                                                                                   | Pass | Time  |
| ---------------- | --------- | ------------------------------------------------------------------------------------------------------------------ | ---- | ----- |
| `root`           | Learn     | 3–6 switches, priorities and MACs; pick the root bridge                                                            | 60%  | –     |
| `root-port`      | Learn     | Pick a switch's root port (tie-break cases preferred)                                                              | 60%  | –     |
| `roles`          | Learn     | Label every port (or two switches' ports on big topologies): root, designated, alternate                           | 50%  | –     |
| `election-drill` | Drill     | Root and root-port questions, link speeds only (no costs shown)                                                    | 70%  | 180 s |
| `events`         | Break-Fix | A link fails: which blocked port starts forwarding? Plus PortFast, BPDU guard, root guard and loop guard scenarios | 60%  | –     |
| `cli-root`       | Learn     | Command line on one switch: make it the root (priority or root primary), or the backup root (root secondary)       | 60%  | –     |

The CLI config round ("make SW-B root primary for VLAN 10") arrives with the command line in M5.

## Player actions

Tap one choice, or tap a role for every port and check.

## Generator rules

- Random connected topology, 3–6 switches, at most 4 links per switch, at least one loop (so a
  port blocks). Occasional parallel links. Speeds 100M, 1G or 10G.
- Priorities: all default (MAC decides), or one or two lowered. VLAN 1, 10, 20 or 30, so the
  system ID extension shows in the bridge ID column.
- Reconvergence: a link whose failure unblocks exactly one port; links that would split the
  network are skipped.
- Guard scenarios are fixed facts with random switch and port names.

## Correctness source

`core/sim/l2/stp.ts` `electStp` and `roleChanges`, verified by 20 hand-worked topologies in
`stp.fixtures.json` (independently re-checked) and random-topology property tests.
Guard facts: Cisco tech notes on PortFast BPDU guard, root guard, and loop guard (cited in
`generator.ts`).

## Faults used

Link failure (reconvergence); rogue switch with priority 0.

## Explanations

Bridge IDs compared; root path cost through every port; which tie-break decided; for failures,
which port took over and why.

## Tests

`generator.test.ts`: deterministic; one right answer; root answer re-derived from the table on
screen; role labels complete and include a blocked port; reconvergence shows the failed link.

## Command-line level (M5)

`cli-root` judges by `core/device/checks.ts`: `stp-root` reruns `electStp` with the switch's new
priority; `stp-backup` checks the current root stays root and that `rootWithout` (the root failed)
picks this switch. Backup rounds only use scenes where the root was lowered to 24576 or less,
every other switch is at 32768, and losing the root leaves one connected network. Allowed:
`spanning-tree vlan N priority P`, `spanning-tree vlan N root primary|secondary`, configure
terminal, exit, end, do.

## Cut a link (mechanics step 7)

- `cut` (Learn): a link fails; tap the blocked port that starts forwarding. Afterwards the
  diagram shows the new tree (core `electStp` without the link, `roleChanges`) with a frame
  crossing the port that opened. Scenes have up to 5 switches so the drawing fits a phone.
