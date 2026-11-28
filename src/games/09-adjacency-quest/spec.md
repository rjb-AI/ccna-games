# Adjacency Quest

Topics: v2-3.3 (OSPFv2 and OSPFv3, single area)

## Modes and levels

| Level        | Mode      | What's generated                                                                               | Pass | Time  |
| ------------ | --------- | ---------------------------------------------------------------------------------------------- | ---- | ----- |
| `states`     | Learn     | Order the 7 neighbor states; name a state from what is happening                               | 60%  | –     |
| `router-id`  | Learn     | Interfaces table (some down, some loopbacks), maybe a router-id command; type the router ID    | 60%  | –     |
| `dr-bdr`     | Learn     | 3–5 routers on one segment (priorities incl. 0, sometimes a late joiner); label DR/BDR/DROTHER | 60%  | –     |
| `ospf-drill` | Drill     | Router ID, states, DR/BDR mix                                                                  | 70%  | 240 s |
| `neighbors`  | Break-Fix | R1 and R2 settings side by side with one planted fault; pick it                                | 60%  | –     |

The CLI fix-it rounds and reading `show ip ospf neighbor` need real output samples (CLAUDE.md
rule 3) and the command line (M5), so this milestone shows settings tables instead.

## Player actions

Tap to order, tap a choice, type an IP on the keypad, or label each router.

## Generator rules

- Neighbor faults: area, hello/dead, subnet or mask (broadcast links only), MTU, passive
  interface, duplicate router ID, network type. A setup is kept only if exactly the planted
  fault is found.
- DR/BDR: unique router IDs; a late joiner shows that the election is not preemptive.

## Correctness source

`core/sim/l3/ospf.ts`: `routerId` (Cisco IOS order), `electDr` (RFC 2328 9.4, non-preemptive),
`ospfNeighborFaults` (RFC 2328 10.5, 10.6; Cisco "OSPF Neighbor Problems Explained").

## Faults used

`area-mismatch`, `timer-mismatch`, `subnet-mismatch`, `mtu-mismatch`, `passive-interface`,
`duplicate-router-id`, `network-type-mismatch`.

## Explanations

The rule, what it does to the adjacency (for example, stuck in ExStart/Exchange for MTU), and
the fix.

## Tests

`generator.test.ts`: answers pass their own checks; router ID re-derived from the table;
exactly one DR; priority 0 never elected; all 7 faults appear. `core/sim/l3/ospf.test.ts`.
