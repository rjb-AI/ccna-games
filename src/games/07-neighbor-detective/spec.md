# Neighbor Detective

Topics: v2-2.3 (CDP and LLDP)

| Level             | Mode      | What's generated                                                                                                   | Pass | Time  |
| ----------------- | --------- | ------------------------------------------------------------------------------------------------------------------ | ---- | ----- |
| `facts`           | Learn     | CDP vs LLDP, defaults, scope, security, commands                                                                   | 60%  | –     |
| `diagram`         | Break-Fix | Documented diagram + neighbour reports; one mistake (wrong model, wrong port, swapped cables, undocumented switch) | 60%  | –     |
| `detective-drill` | Drill     | Mix                                                                                                                | 70%  | 240 s |

The plan has 2–4 mistakes per diagram; this version plants one so each question has exactly one
true statement (verified by an independent test). Neighbour reports are a neutral summary table;
reading real `show cdp neighbors detail` / `show lldp neighbors` output waits for samples.

Correctness source: `core/topology` (`neighborsOf`, `diagramDiffs`). Facts cited in
`generator.ts` (Cisco CDP/LLDP guides, IEEE 802.1AB).
