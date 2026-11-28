---
command: show cdp neighbors
source: https://www.cisco.com/c/en/us/support/docs/switches/catalyst-9200-series-switches/221191-troubleshoot-layer-2-loops.html
source_title: Troubleshoot Layer-2 Loops on Catalyst 9000 Series Switches - Cisco
platform: Catalyst 9000 series (page says "This document is not restricted to specific software or hardware versions."; the neighbour platform is C9300-48P)
retrieved: 2026-11-28
verified: two fetches agreed, character for character
---

Sample 1: the "ACCESS-A" step of the loop-tracing walkthrough, "show cdp neighbors" on one interface.

~~~text
ACCESS-A#show cdp neighbors twentyFiveGigE 1/1/1
Capability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge
                  S - Switch, H - Host, I - IGMP, r - Repeater, P - Phone,
                  D - Remote, C - CVTA, M - Two-port Mac Relay

Device ID        Local Intrfce     Holdtme    Capability  Platform  Port ID
DISTRO-A         Twe 1/1/1        137        S I         C9300-48P Twe 1/0/3
~~~

Sample 2: the IOS Cisco Discovery Protocol Command Reference, "show cdp neighbors" entry, first example ("The following is sample output from the show cdp neighbors command:"). Source: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/cdp/command/cdp-cr-book/cdp-cr-a1.html ("Cisco IOS Cisco Discovery Protocol Command Reference - cdp advertise-v2 through show cdp traffic [Support] - Cisco"). Two fetches agreed.

~~~text
Device# show cdp neighbors

Capability Codes:R - Router, T - Trans Bridge, B - Source Route Bridge S - Switch, 
H - Host, I - IGMP, r - Repeater
Device ID  Local Intrfce  Holdtme  Capability  Platform  Port ID
device1      Eth 0          133      R           4500      Eth 0
device2      Eth 0          152      R           AS5200    Eth 0
device3      Eth 0          144      R           3640      Eth0/0
device4      Eth 0          141                  RP1       Eth 0/0
device5      Eth 0          164                  7206      Eth 1/0
~~~

## Notes
Field descriptions from the CDP Command Reference (Sample 2's page), closely quoted:
- Capability Codes: the type of device that can be discovered.
- Device ID: the name of the neighbor device and either the MAC address or the serial number of this device.
- Local Intrfce: the local interface through which this neighbor is connected.
- Holdtime (column header "Holdtme"): the remaining amount of time (in seconds) the current device will hold the CDP advertisement from a sending device before discarding it.
- Capability: the type of the device listed in the CDP Neighbors table. Possible values: R-Router, T-Transparent bridge, B-Source-routing bridge, S-Switch, H-Host, I-IGMP device, r-Repeater.
- Platform: the product number of the device.
- Port ID: the interface and port number of the neighboring device.

Oddities:
- Sample 1 is the modern Catalyst layout: a three-line Capability Codes legend that adds P - Phone, D - Remote, C - CVTA, M - Two-port Mac Relay, and short interface names like "Twe 1/1/1". Its data row does not line up exactly under the headers; that is how the page has it (probably hand-edited).
- The same page's ACCESS-SWITCH1 example ends with this trailer line: "Total cdp entries displayed : 1". That example's data row is badly misaligned, so it is not used as a sample here.
- Sample 2 is old, sanitised router output. Its legend wraps oddly and some rows have an empty Capability column. Use it for field meanings, not for layout.
- The newer "CDP, LLDP, MAC, and UDLD Configuration Guide" (c9000 configure-cdp.html) has examples with "Router#" prompts, full interface names and "WS-C9350-24P". Those look illustrative, not captured from a real device, so they were rejected.
