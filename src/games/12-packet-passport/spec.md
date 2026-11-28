# Packet Passport

Topics: v2-1.7 (DHCPv4 client, server, relay), v2-4.3 (NAT and PAT); the passport and ARP
levels practise reading headers (v2-2.4).

## Modes and levels

| Level          | Mode      | What's generated                                                                       | Pass | Time  |
| -------------- | --------- | -------------------------------------------------------------------------------------- | ---- | ----- |
| `passport`     | Learn     | PC → R1 → R2 → server; pick the MACs and IPs on one link                               | 60%  | –     |
| `arp`          | Learn     | Local or remote destination: which IP does the PC ARP for?                             | 60%  | –     |
| `dhcp`         | Learn     | DORA order, message meanings, where ip helper-address goes, giaddr, 169.254.x.x        | 60%  | –     |
| `nat-table`    | Learn     | Label inside local / inside global / outside local / outside global (static or PAT)    | 60%  | –     |
| `nat-passport` | Learn     | Passports with PAT on R1, both directions                                              | 60%  | –     |
| `nat-config`   | Learn     | Static NAT, PAT and inside/outside commands                                            | 60%  | –     |
| `border-drill` | Drill     | Mix                                                                                    | 70%  | 240 s |
| `breakfix`     | Break-Fix | Clients get 169.254.x.x (relay faults) or no Internet (NAT faults); config lines shown | 60%  | –     |

## Player actions

Tap a choice, put DORA in order, or label each NAT term.

## Generator rules

- Private LAN 192.168.x.0/24, a /30 between R1 and R2 (documentation ranges), a server on a
  public-looking /24. Random MACs.
- Passport wrong choices are named misconceptions: end-to-end MACs, IPs changing per hop,
  swapped MACs, NAT on the wrong side of R1, the previous link's MACs.
- Configuration is shown as IOS configuration lines (input syntax), not show output.

## Correctness source

`core/sim/l3/forwarding.ts` (`headersThere`, `headersBack`, `arpTarget`),
`core/sim/services/dhcp-nat.ts` (`relayGiaddr`, `diagnoseDhcp`, `natTerms`, `diagnoseNat`).
Facts: RFC 2131, RFC 3927, RFC 3022, Cisco NAT local/global definitions.

## Faults used

DHCP: `helper-missing`, `helper-wrong-interface`, `helper-wrong-ip`, `pool-wrong-subnet`.
NAT: `roles-swapped`, `inside-missing`, `acl-wrong`.

## Tests

`generator.test.ts`: answers pass their own checks; passport IPs re-derived from the interface
table; NAT table roles; all 7 faults appear. Core tests for forwarding, DHCP and NAT.

## Code tiles and match pairs (mechanics step 6)

- `nat-tiles` (Learn): build R1's NAT configuration from chips: PAT for the whole LAN
  (inside/outside interfaces, `ip nat inside source list 1 interface ... overload`) or static NAT
  for one server (`ip nat inside source static <inside local> <inside global>`). Syntax from
  Cisco "Configure Network Address Translation".
- The NAT table level now draws as match pairs (term ↔ address); answers unchanged.
