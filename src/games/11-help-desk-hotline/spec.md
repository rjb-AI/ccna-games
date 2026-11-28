# Help Desk Hotline

Topics: v2-1.6 (client connectivity), v2-1.7 (DHCP client), v2-4.4 (DNS record problems)

| Level           | Mode      | What's generated                                                                  | Pass | Time  |
| --------------- | --------- | --------------------------------------------------------------------------------- | ---- | ----- |
| `records`       | Learn     | Match A, AAAA, CNAME, MX, PTR, NS to their job                                    | 60%  | –     |
| `commands`      | Learn     | ipconfig /all, ip addr, nslookup, ipconfig /release and /renew                    | 60%  | –     |
| `clients`       | Break-Fix | PC settings table + complaint → DHCP failed, wrong gateway, wrong mask, wrong DNS | 60%  | –     |
| `dns-calls`     | Break-Fix | Zone table + complaint → missing A/AAAA, wrong A, MX to CNAME, no MX, missing PTR | 60%  | –     |
| `hotline-drill` | Drill     | Mix                                                                               | 70%  | 240 s |

Reading real ipconfig, ifconfig, ip addr, nslookup and dig output, and the "fewest commands"
scoring, wait for real samples (CLAUDE.md rule 3).

Correctness source: `core/netmath` (`diagnoseHost`), `core/sim/services/dns.ts` (`resolve`,
`mailProblems`, `webProblems`, `ptrProblems`; RFC 1035, 2181, 3596).
