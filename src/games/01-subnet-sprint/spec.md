# Subnet Sprint

Topics: v2-1.3 (IPv4 addressing and subnetting)

## Modes and levels

| Level            | Mode      | What's generated                                                                                    | Pass | Time  |
| ---------------- | --------- | --------------------------------------------------------------------------------------------------- | ---- | ----- |
| `basics-24`      | Learn     | Private address /24: network, broadcast, first, last, hosts                                         | 60%  | –     |
| `last-octet`     | Learn     | Same, /25–/30                                                                                       | 60%  | –     |
| `any-prefix`     | Learn     | Same, /8–/30                                                                                        | 60%  | –     |
| `sprint`         | Drill     | Same, /16–/30, 8 questions                                                                          | 70%  | 300 s |
| `how-many-learn` | Learn     | Hosts in /p, subnets of /q in /b, prefix for N subnets, prefix for N hosts, mask ↔ prefix, wildcard | 60%  | –     |
| `how-many-drill` | Drill     | Same mix, 10 questions                                                                              | 70%  | 150 s |
| `vlsm`           | Learn     | A /23 or /24 block, 2–3 teams plus a 2-host WAN link; give each team's network and prefix           | 60%  | –     |
| `breakfix`       | Break-Fix | LAN + router + PC settings with one planted fault; pick what is wrong                               | 60%  | –     |

Drill levels score streak points: x1 for 1–3 in a row, x2 for 4–6, x3 for 7–9, x4 from 10.

## Player actions

Tap a field, then type with the on-screen keypad (or the keyboard). Break-Fix: tap one choice.

## Generator rules

- Addresses come from RFC 1918 private ranges. The asked address is never the network or
  broadcast address itself.
- VLSM: each team needs a different subnet size, so "biggest first" has exactly one answer.
  Host counts are chosen so the team needs exactly that prefix. The rule (biggest first, packed
  from the start of the block) is stated in the question.
- Break-Fix faults: PC mask longer than the LAN's, so the gateway looks remote; PC gateway in the
  next or previous block; PC IP is the network or broadcast address; PC IP mistyped into a public
  address. The generator keeps only setups where `diagnoseHost` finds exactly the planted fault.

## Correctness source

`core/netmath`: `subnetInfo`, `usableHosts`, `subnetCount`, `prefixForSubnets`,
`prefixForHosts`, `prefixToMask`, `maskToPrefix`, `prefixToWildcard`, `vlsm`, `diagnoseHost`.
Answers are compared by value (`10.0.0.4` = `10.0.0.04` is rejected as invalid input, not wrong).

## Faults used

Break-Fix only: `wrong-mask`, `gateway-off-subnet`, `ip-is-network-or-broadcast`, `public-ip`
(from `core/netmath/hostcheck.ts`).

## Explanations

Subnet questions show the block-size method with the real numbers (mask, interesting octet,
block size, range, host count). Others show the formula used. Break-Fix explains the fault with
the PC's and LAN's real values.

## Tests

`generator.test.ts`: deterministic per seed; every answer passes its own checker; subnet answers
match independent arithmetic; prefix ranges per level; VLSM aligned, packed, smallest, distinct;
Break-Fix has exactly one fault and it is a choice. `core/netmath/*.test.ts`: 10,000 random cases
per property.
