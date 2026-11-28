# ACL Bouncer

Topics: v2-4.6 (IPv4 ACLs)

## Modes and levels

| Level        | Mode      | What's generated                                                           | Pass | Time  |
| ------------ | --------- | -------------------------------------------------------------------------- | ---- | ----- |
| `standard`   | Learn     | Standard ACL + a packet: which line decides, or the implicit deny          | 60%  | –     |
| `extended`   | Learn     | Extended ACL (protocols, hosts, wildcards, eq/gt/range ports) + a packet   | 60%  | –     |
| `wildcard`   | Learn     | Wildcard for a subnet; range an entry matches; does this address match     | 60%  | –     |
| `door-drill` | Drill     | Mix of the three, 12 questions                                             | 70%  | 240 s |
| `builder`    | Learn     | A policy in words; pick the ACL that implements it                         | 60%  | –     |
| `placement`  | Learn     | Standard or extended ACL on a 3-router path: which interface and direction | 60%  | –     |
| `breakfix`   | Break-Fix | Policy + ACL with one wrong line; find it                                  | 60%  | –     |

## Player actions

Tap one choice, or type a wildcard or range on the keypad.

## Generator rules

- A small company: three team subnets (/24–/26) and web, DNS and mail servers, all RFC 1918.
- Door questions pick packets so that every line (and the implicit deny) gets used.
- Builder: three policy templates (HTTPS-only for a team, block Telnet, standard ACL to block one
  PC). Wrong candidates are named mistakes (order, missing permit any, wrong port, subnet mask
  instead of wildcard, swapped source and destination, TCP vs UDP). A candidate is offered only if
  it gets at least one of 50 test packets wrong; the explanation names one.
- Break-Fix: one line of a correct ACL is mutated; kept only if the test packets show a difference.

## Correctness source

`core/sim/services/acl.ts` (`evaluateAcl`: top-down, first match, implicit deny; standard =
source only), `disagreements` for the 50-packet check, `core/netmath` for wildcard maths.
Placement rule (standard near destination, extended near source): Cisco ACL guidance.

## Faults used

Break-Fix line mutations: subnet mask as wildcard, wrong port, action flipped, source and
destination swapped.

## Explanations

Which line matched first (or the implicit deny); for builder and Break-Fix, a real test packet
the wrong ACL mishandles.

## Tests

`generator.test.ts`; `core/sim/services/acl.test.ts` (first-match property over random ACLs).

## Door and bit board levels (mechanics steps 4-5)

- `door-standard`, `door-extended` (Learn) and `door-rush` (Drill): a queue of 5 packets against
  one ACL, swiped deny or permit; verdicts from core `evaluateAcl`. Learn shows a reason card
  after each packet and highlights the line that decided.
- `wildcard-bits` (Learn): build the wildcard that matches a given range on the bit board; target
  from core `prefixToWildcard`.
