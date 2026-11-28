# Cable Doctor

Topics: v2-1.1 (cable and interface problems)

| Level        | Mode      | What's generated                                                                                          | Pass | Time  |
| ------------ | --------- | --------------------------------------------------------------------------------------------------------- | ---- | ----- |
| `pinout`     | Learn     | Put the 8 wire colours in T568A or T568B order                                                            | 60%  | –     |
| `cables`     | Learn     | Straight-through vs crossover (and Auto-MDIX); single-mode vs multimode; 100 m copper                     | 60%  | –     |
| `patients`   | Break-Fix | A symptom described in words → cause (duplex mismatch, CRC errors, admin down, down/down, up/down, runts) | 60%  | –     |
| `ward-round` | Drill     | Mix                                                                                                       | 70%  | 150 s |

Reading real `show interfaces` counters, and light-level readings, waits for real samples
(CLAUDE.md rule 3).

Correctness source: fixed fact tables in `generator.ts` with sources (TIA-568, IEEE 802.3, Cisco
Ethernet troubleshooting). Tests: `generator.test.ts`.

## Wire board (pinout level)

The `pinout` level is a wire-board puzzle (`src/app/frame/WireBoardView.tsx`): an RJ45 plug with
pins 1-8 at the top, eight loose wires hanging from the bottom in random order. Drag a wire's end
onto a pin to plug it in (dropping on a used pin pops the old wire out), tap a plugged wire to
pull it out, or tap a loose wire to plug it into the first free pin. Keyboard: focus a wire end,
press 1-8. Pin orders come from `src/core/cabling` (TIA-568 T568A/T568B).
