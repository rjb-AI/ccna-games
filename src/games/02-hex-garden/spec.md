# Hex Garden

Topics: v2-1.4 (IPv6 addressing, EUI-64)

## Modes and levels

| Level          | Mode      | What's generated                                                                     | Pass | Time  |
| -------------- | --------- | ------------------------------------------------------------------------------------ | ---- | ----- |
| `compress`     | Learn     | Full address → pick the shortest legal form                                          | 60%  | –     |
| `expand`       | Learn     | Short form with "::" → pick the full form                                            | 60%  | –     |
| `types`        | Learn     | Address → global unicast, link-local, unique local, multicast, loopback, unspecified | 60%  | –     |
| `eui64`        | Learn     | MAC (Cisco format) → interface ID, or full address with a /64 prefix                 | 60%  | –     |
| `prefix`       | Learn     | "You have a /48, how many /64s?" style                                               | 60%  | –     |
| `garden-drill` | Drill     | Mix of all five, 12 questions                                                        | 70%  | 180 s |
| `breakfix`     | Break-Fix | Four "full → short" lines; one is wrong                                              | 60%  | –     |

## Player actions

Tap one choice.

## Generator rules

- Practice addresses are global unicast (2001:db8::/32 documentation space and other 2000::/3
  prefixes) with one or two zero runs and groups that have leading zeros or trailing zeros.
- Wrong choices are named mistakes, each with its own explanation: two "::", "::" on the
  shorter run, a 0 left behind, trailing zeros dropped, inner zeros dropped, leading zeros kept,
  zero groups left out; for expand: padding on the wrong side, 7 or 9 groups, zeros moved.
- A wrong choice must be invalid, a different address, or strictly longer than the answer. Legal
  re-spellings of the same length (for example a tie between two zero runs) are never offered.
- Anycast is not in the sorting round: anycast addresses come from unicast space and cannot be
  told apart by looking (RFC 4291 2.6).
- EUI-64 wrong choices: no flip, wrong bit flipped (0x40), FFFE at the end, FEFF instead of FFFE.

## Correctness source

`core/netmath`: `compressIPv6` (RFC 5952), `expandIPv6`, `parseIPv6`, `ipv6Type` (RFC 4291 2.4,
RFC 4193), `eui64` / `eui64Address` (RFC 4291 Appendix A), `ipv6SubnetCount`.

## Faults used

Break-Fix only: the invalid or different-address mistakes above.

## Explanations

Each wrong choice shows why it is wrong, then the rule and the right answer. EUI-64 shows every
step with the real bytes and the bit flip in binary.

## Tests

`generator.test.ts`: deterministic; exactly one right answer; every wrong choice is clearly
wrong; answers re-derived independently (EUI-64 by hand, prefix counts by 2^n); Break-Fix has
exactly one wrong line and the other lines are canonical.
