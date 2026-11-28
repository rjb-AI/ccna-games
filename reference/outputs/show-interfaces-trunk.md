---
command: show interfaces trunk
source: https://www.cisco.com/c/en/us/support/docs/lan-switching/inter-vlan-routing/41260-189.html
source_title: Configure Inter-VLAN Routing with Catalyst Switches - Cisco
platform: Catalyst 3850 running Cisco IOS XE Software Release 16.12.7 (the page also covers Catalyst 4500 running IOS 03.09.00E)
retrieved: 2026-11-28
verified: two fetches agreed, character for character (including two trailing spaces after "Native vlan"; kept)
---

Sample 1: the Verify section, the "SW_3850#show interfaces trunk" output.

~~~text
SW_3850#show interfaces trunk

Port        Mode             Encapsulation  Status        Native vlan  
Gi1/0/3     on               802.1q         trunking      1
Gi1/0/5     on               802.1q         trunking      1

Port        Vlans allowed on trunk
Gi1/0/3     1-4094
Gi1/0/5     1-4094

Port        Vlans allowed and active in management domain
Gi1/0/3     1-3,10
Gi1/0/5     1-3,10

Port        Vlans in spanning tree forwarding state and not pruned
Gi1/0/3     1-3,10
Gi1/0/5     1,3,10
~~~

## Notes
- The page explains the command this way: "This command shows the status of trunk ports on the switch. It provides details about which interfaces are configured as trunks, the encapsulation type (for example 802.1Q), and the VLANs allowed on each trunk."
- There are four sections, each starting with its own "Port" header:
  1. mode, encapsulation, status and native VLAN;
  2. VLANs allowed on the trunk;
  3. VLANs allowed and active in the management domain (allowed VLANs that exist on this switch);
  4. VLANs in spanning-tree forwarding state and not pruned.
- Mode "on" means the trunk is set statically (switchport mode trunk). Other modes seen on real switches (desirable, auto) are not shown in this sample.
- Notice that Gi1/0/5 has VLAN 2 allowed and active but not in its forwarding/not-pruned list (1,3,10). This is a good real-world example of the difference between the last two sections.
- The same page also has show interfaces trunk blocks for two Catalyst 4500s (Gi1/3 and Gi1/1, same layout). They were fetched once and not included.
