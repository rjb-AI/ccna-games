# Port Defender

Topics: v2-4.7 (Layer 2 security features)

## Modes and levels

| Level       | Mode      | What's generated                                                                                   | Pass | Time  |
| ----------- | --------- | -------------------------------------------------------------------------------------------------- | ---- | ----- |
| `match`     | Learn     | Attack → defense (rogue DHCP, ARP spoofing, MAC flooding, broadcast storm, fake RAs, rogue switch) | 60%  | –     |
| `trust`     | Learn     | Access switch diagram; mark every port trusted/untrusted for DHCP snooping                         | 60%  | –     |
| `outcome`   | Learn     | Settings table + attack: blocked, works, or blocked but real users break too                       | 60%  | –     |
| `violation` | Learn     | Port security config lines + a second MAC: what happens (protect/restrict/shutdown/default)        | 60%  | –     |
| `waves`     | Drill     | Mix                                                                                                | 70%  | 200 s |
| `breakfix`  | Break-Fix | The defense failed (or broke users): which setting is wrong?                                       | 60%  | –     |

## Player actions

Tap a choice or label each port.

## Generator rules

- Access switch with an uplink to the core (router and DHCP server), 4–8 user ports, sometimes
  a local DHCP server port, and an attacker on one user port.
- Break-Fix setups have exactly one mistake; the options are chosen so that every wrong option is
  false for the settings shown (checked by an independent test).

## Correctness source

`core/sim/security`: `rogueDhcpOutcome`, `arpSpoofOutcome` (DAI needs snooping bindings),
`correctTrust`, `portSecurityViolation`, attack → defense map. Sources: Cisco Catalyst security
configuration guide; Cisco BPDU guard tech note.

## Faults used

Snooping off, uplink untrusted, attacker port trusted, DAI off, DAI without snooping.

## Explanations

How the defense works, why the setting matters, and what breaks when it is wrong.

## Tests

`generator.test.ts` (including the independent option-truth check), `core/sim/security`.

## Match pairs level (mechanics step 6)

- `match-pairs` (Learn): four attacks, each tapped to the defence that stops it. The attacks are
  picked so each needs a different defence; pairs come from core `ATTACKS[...].defense`.
