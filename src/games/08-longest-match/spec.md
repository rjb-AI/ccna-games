# Longest Match

Topics: v2-3.1 (read the routing table), v2-3.2 (IPv4 and IPv6 static routes)

| Level           | Mode      | What's generated                                                                               | Pass | Time  |
| --------------- | --------- | ---------------------------------------------------------------------------------------------- | ---- | ----- |
| `pick-route`    | Learn     | Nested prefixes (/0, /8, /16, /24, /27) ± default route; which route a packet uses, or dropped | 60%  | –     |
| `installed`     | Learn     | Same prefix from several sources (AD) or the same protocol (metric); default AD values         | 60%  | –     |
| `static`        | Learn     | Network, host, default and IPv6 static route commands                                          | 60%  | –     |
| `floating`      | Learn     | A static route with AD 1–254 next to OSPF; before and after OSPF fails                         | 60%  | –     |
| `routing-drill` | Drill     | Mix                                                                                            | 70%  | 200 s |
| `breakfix`      | Break-Fix | Traffic takes the wrong path: longer static route, or lower-AD static replaced OSPF            | 60%  | –     |

The routing table is shown as a neutral table (prefix, learned by, AD/metric, next hop), not as
`show ip route` output. Reading the real IOS layout (codes C, L, S, S*, O, D) waits for a real
sample (CLAUDE.md rule 3).

Correctness source: `core/sim/l3/routing.ts` (`installRoutes`, `lookup`, `DEFAULT_AD` from
Cisco's administrative distance table). Tests: `generator.test.ts` re-derives the longest match
from the table on screen; `routing.test.ts`.
