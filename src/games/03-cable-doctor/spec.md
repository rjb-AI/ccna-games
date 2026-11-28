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
