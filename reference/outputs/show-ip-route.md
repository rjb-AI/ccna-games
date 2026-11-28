---
command: show ip route
source: https://www.cisco.com/c/en/us/support/docs/ip/ip-routing/116264-technote-ios-00.html
source_title: Local Host Routes Installed in the Routing Table on Cisco IOS and Cisco IOS-XR
platform: Cisco IOS (page does not state a release; interface names are Ethernet0/0)
retrieved: 2026-11-28
verified: two fetches agreed on every line (second fetch showed trailing spaces at line ends; dropped here)
---

Sample 1: the first "show ip route" output in the "Cisco IOS" local routes section (shows C and L codes, and the modern Codes legend with "L - local").

~~~text
R1#show ip route
 Codes: L - local, C - connected, S - static, R - RIP,
        M - mobile, B - BGP
        D - EIGRP, EX - EIGRP external, O - OSPF,
        IA - OSPF inter area
        N1 - OSPF NSSA external type 1, N2 - OSPF NSSA
        external type 2
        E1 - OSPF external type 1, E2 - OSPF external type 2
        i - IS-IS, su - IS-IS summary, L1 - IS-IS level-1,
        L2 - IS-IS level-2
        ia - IS-IS inter area, * - candidate default, U -
        per-user static route
        o - ODR, P - periodic downloaded static route, H - NHRP
        + - replicated route, % - next hop override

 Gateway of last resort is not set

 C        10.1.1.0/30 is directly connected, Ethernet0/0
 L        10.1.1.1/32 is directly connected, Ethernet0/0
~~~

Sample 2: second source, with a static default route (S*), static routes (S), and C/L pairs.

- source: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst1000/software/releases/15_2_7_e/configuration_guides/rtng/b_1527e_routing_c1000_cg/configuring_ip_unicast_routing.html
- source_title: IP Routing Configuration Guide, Cisco IOS Release 15.2(7)Ex (Catalyst 1000 Switches) - Configuring IP Unicast Routing
- platform: Catalyst 1000, Cisco IOS 15.2(7)Ex
- section: "Example: Displaying Current Status of the Routing Table" ("This following is sample output from the show ip route command:")
- verified: two fetches agreed on every line. Both fetches showed single spaces between fields and no indentation. The page's own text has lost its column alignment, so the original device spacing cannot be recovered from this source.

~~~text
Device# show ip route

Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP
D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area
N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2
E1 - OSPF external type 1, E2 - OSPF external type 2
i - IS-IS, su - IS-IS summary, L1 - IS-IS level-1, L2 - IS-IS level-2
ia - IS-IS inter area, * - candidate default, U - per-user static route
o - ODR, P - periodic downloaded static route, H - NHRP, l - LISP
a - application route
+ - replicated route, % - next hop override, p - overrides from PfR

Gateway of last resort is 192.0.2.5 to network 0.0.0.0

S* 0.0.0.0/0 [0/0] via 192.0.2.5
10.0.0.0/8 is variably subnetted, 2 subnets, 2 masks
C 10.3.3.0/24 is directly connected, GigabitEthernet1/0/23
L 10.3.3.2/32 is directly connected, GigabitEthernet1/0/23
172.16.0.0/24 is subnetted, 1 subnets
S 172.16.0.1 [1/0] via 192.0.2.5
10.0.0.0/8 is variably subnetted, 2 subnets, 2 masks
C 192.0.2.4/24 is directly connected, Vlan1
L 192.0.2.10/24 is directly connected, Vlan1
209.165.201.0/24 is subnetted, 1 subnets
S 209.165.201.1 [1/0] via 192.0.2.5
Device#
~~~

## Notes
- Sample 1 page text: local routes are marked "L" and each one is a /32 host route for the interface's own address. They are installed next to the connected (C) route for the subnet.
- Sample 1 has a leading space on most lines, and the Codes legend wraps at about 60 columns. Both fetches showed this, so it is probably the tech note's own formatting and not how the device prints it. The column spacing between the code and the prefix ("C        10.1.1.0/30") was the same in both fetches.
- Sample 2 is copied as published, including mistakes in Cisco's own example. The "S* 0.0.0.0/0 [0/0]" shows AD 0 for a static default. A "10.0.0.0/8 is variably subnetted" header appears above the 192.0.2.x routes. "L 192.0.2.10/24" is a local route with /24 instead of /32, and 192.0.2.10 does not match the C network 192.0.2.4/24. Do not use this sample to teach AD values or L-route masks.
- No sample with OSPF (O) routes and the modern "L - local" legend was found on the pages checked. The IOS XE Protocol-Independent Command Reference (iri-cr-book.pdf) has an O E2 example, but it uses an obsolete legend (EGP "E" routes) and has no L routes, so it was not kept.
- Also seen but not kept: https://www.cisco.com/c/en/us/support/docs/ip/routing-information-protocol-rip/16448-default.html ("Configure a Gateway of Last Resort that Uses IP Commands", Cisco 3900 / IOS 15M). It has S*, C, L and a D (EIGRP) route with the full modern legend, but its column spacing is collapsed in the same way as sample 2.
