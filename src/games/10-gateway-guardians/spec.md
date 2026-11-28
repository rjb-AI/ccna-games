# Gateway Guardians

Topics: v2-3.4 (HSRP and VRRP)

| Level         | Mode      | What's generated                                                        | Pass | Time  |
| ------------- | --------- | ----------------------------------------------------------------------- | ---- | ----- |
| `active`      | Learn     | 2–3 routers' priority, IP, preempt; who is active/master; key facts     | 60%  | –     |
| `vmac`        | Learn     | Virtual MAC ↔ protocol and group (HSRPv1, HSRPv2, VRRP)                 | 60%  | –     |
| `failover`    | Break-Fix | The active router fails and returns: who takes over, who ends up active | 60%  | –     |
| `guard-drill` | Drill     | Mix                                                                     | 70%  | 180 s |

Router state is shown as a settings table, not as `show standby brief` or `show vrrp brief`
output, until real samples are added (CLAUDE.md rule 3).

Correctness source: `core/sim/l3/fhrp.ts` (`electFhrp`, `failover`, `virtualMac`,
`parseVirtualMac`), from Cisco's HSRP configuration guide and RFC 5798. Tests: `fhrp.test.ts`,
`generator.test.ts`.
