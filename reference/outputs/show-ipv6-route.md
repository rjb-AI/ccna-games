---
command: show ipv6 route
source: https://www.cisco.com/c/en/us/support/docs/ip/ip-routing/116264-technote-ios-00.html
source_title: Local Host Routes Installed in the Routing Table on Cisco IOS and Cisco IOS-XR
platform: Cisco IOS (page does not state a release; interface names are Ethernet0/0)
retrieved: 2026-11-28
verified: two fetches agreed on every line (second fetch showed trailing spaces at line ends; dropped here)
---

Sample 1: the "show ipv6 route" output in the "Cisco IOS" local routes section, right after the IPv4 example.

~~~text
R1#show ipv6 route
 IPv6 Routing Table - default - 3 entries
 Codes: C - Connected, L - Local, S - Static, U - Per-user Static route
        B - BGP, R - RIP, I1 - ISIS L1, I2 - ISIS L2
        IA - ISIS interarea, IS - ISIS summary, D - EIGRP, EX - EIGRP external
        ND - Neighbor Discovery
        O - OSPF Intra, OI - OSPF Inter, OE1 - OSPF ext 1, OE2 - OSPF ext 2
        ON1 - OSPF NSSA ext 1, ON2 - OSPF NSSA ext 2
 C   2001:DB8::/64 [0/0]
      via Ethernet0/0, directly connected
 L   2001:DB8::1/128 [0/0]
      via Ethernet0/0, receive
 L   FF00::/8 [0/0]
      via Null0, receive
~~~

## Notes
- Page text: Cisco IOS installs a host route (here /128) in the IPv6 table for each IPv6 address on an interface, marked "L". The command "show ipv6 route local" shows only the local routes.
- Format differs from IPv4: each route takes two lines. The first line has the code, prefix and [AD/metric]. The second line is indented and has "via <interface>, directly connected" or "via <interface>, receive".
- The multicast route "L FF00::/8 [0/0] via Null0, receive" is always present.
- Like the IPv4 sample on the same page, most lines have one leading space. That is probably the page's formatting, not the device's.
- The same page has a second "show ipv6 route" example (manually configured host route on Loopback0, code "LC") with an older legend (HA - Home Agent, MR - Mobile Router, NM - NEMO). It was not copied here.
