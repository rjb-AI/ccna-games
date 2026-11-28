---
command: show spanning-tree
source: https://www.cisco.com/c/en/us/support/docs/switches/catalyst-9200-series-switches/221191-troubleshoot-layer-2-loops.html
source_title: Troubleshoot Layer-2 Loops on Catalyst 9000 Series Switches - Cisco
platform: Catalyst 9000 series (page says "This document is not restricted to specific software or hardware versions."; CDP output on the same page shows C9300-48P / C9500-48Y4C neighbours)
retrieved: 2026-11-28
verified: two fetches agreed (second fetch showed trailing spaces after the command on the ACCESS-SWITCH1 prompt line; dropped here)
---

Sample 1: the first "show spanning-tree" output on the page (non-root switch ACCESS-SWITCH1, Rapid PVST+, VLAN 1).

~~~text
ACCESS-SWITCH1#show spanning-tree

VLAN0001
  Spanning tree enabled protocol rstp
  Root ID    Priority    1
             Address     380e.4d77.4800
             Cost        2000
             Port        3 (TwentyFiveGigE1/0/3)
             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec

  Bridge ID  Priority    32769  (priority 32768 sys-id-ext 1)
             Address     b08b.d08d.6b80
             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec
             Aging Time  300 sec

Interface           Role Sts Cost      Prio.Nbr Type
------------------- ---- --- --------- -------- --------------------------------
Gig1/0/1            Desg FWD 20000     128.1    P2p
Gig1/0/2            Desg FWD 20000     128.2    P2p
Twe1/1/1            Root FWD 800       128.33   P2p
Twe1/1/2            Desg FWD 800       128.34   P2p
Twe1/1/3            Alt  BLK 800       128.35   P2p
~~~

Sample 2: the "CORE#show spanning-tree" output from the same page (the root bridge).

~~~text
CORE#show spanning-tree

VLAN0001
  Spanning tree enabled protocol rstp
  Root ID    Priority    1
             Address     380e.4d77.4800
             This bridge is the root
             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec

  Bridge ID  Priority    1      (priority 0 sys-id-ext 1)
             Address     380e.4d77.4800
             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec
             Aging Time  300 sec

Interface           Role Sts Cost      Prio.Nbr Type
------------------- ---- --- --------- -------- --------------------------------
Twe1/0/1            Desg FWD 800       128.25   P2p
Twe1/0/2            Desg FWD 800       128.26   P2p
~~~

## Notes
- The page gives no field-by-field table; it is a troubleshooting walkthrough.
- "Spanning tree enabled protocol rstp" is how Rapid PVST+ shows per VLAN. "show spanning-tree summary" on the same page prints "Switch is in rapid-pvst mode".
- Bridge ID priority is shown as the configured priority plus the VLAN number (sys-id-ext): 32768 + 1 = 32769, and 0 + 1 = 1 on the root.
- On the root bridge the Cost/Port lines are replaced by "This bridge is the root", and the Root ID and Bridge ID addresses match.
- Watch out in Sample 1: the Root ID block says "Port 3 (TwentyFiveGigE1/0/3)" and "Cost 2000", but the table shows Twe1/1/1 as the Root port with cost 800. That is an inconsistency in Cisco's own (likely hand-edited) example. Don't build a question that depends on those two agreeing.
- The page has more show spanning-tree blocks (ACCESS-A, DISTRO-A, DISTRO-B, ACCESS-C), but some are indented differently, use "<snip>", or have duplicated rows, so they were not used.
