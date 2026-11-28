---
command: show ip ospf neighbor
source: https://www.cisco.com/en/US/docs/ios-xml/ios/iproute_ospf/command/ospf-s1.html
source_title: Cisco IOS IP Routing: OSPF Command Reference - OSPF Commands: show ip ospf through T
platform: not stated for this example (Cisco IOS command reference; interfaces Ethernet0 and Fddi0, so an old capture)
retrieved: 2026-11-28
verified: two fetches agreed on every line. Both showed two TAB characters after "Neighbor ID" in the header line; they are kept as tabs here.
---

From the "show ip ospf neighbor" entry, Examples section: "The following sample output from the show ip ospf neighbor command shows a single line of summary information for each neighbor:"

~~~text
Device# show ip ospf neighbor

Neighbor ID 		Pri   State        Dead Time     Address         Interface
10.199.199.137  1    FULL/DR       0:00:31    192.168.80.37      Ethernet0
172.16.48.1     1    FULL/DROTHER  0:00:33    172.16.48.1        Fddi0
172.16.48.200   1    FULL/DROTHER  0:00:33    172.16.48.200      Fddi0
10.199.199.137  5    FULL/DR       0:00:33    172.16.48.189      Fddi0
~~~

## Notes
Field descriptions (second fetch quoted them as below. The first fetch gave shorter versions with the same meaning):
- Neighbor ID: "Neighbor router ID."
- Pri: "Router priority of the neighbor and neighbor state."
- State: "OSPF state." It shows adjacency state/role, for example FULL/DR or FULL/DROTHER.
- Dead Time: "Expected time in hours:minutes:seconds before Cisco IOS software will declare the neighbor dead."
- Address: "IP address of the interface." (the neighbor's interface address)
- Interface: "Interface type for the outgoing interface."

Odd things about this sample:
- The header line uses tab characters after "Neighbor ID", and the columns in the data rows do not line up exactly under the header. This is how the page publishes it.
- Dead Time is shown as "0:00:31" (one hour digit). Modern IOS prints "00:00:31". Do not build a template on the single-digit hour without another source.
- The same Neighbor ID (10.199.199.137) appears twice, on two different interfaces.
- No BDR or 2WAY rows appear in this sample.
