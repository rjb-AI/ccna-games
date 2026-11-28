---
command: IOS XE configuration mode prompts
source: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-15/configuration_guide/rtng/b_1715_rtng_9300_cg/configuring_ip_unicast_routing.html ; https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-14/configuration_guide/vlan/b_1714_vlan_9300_cg.pdf ; https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-15/configuration_guide/int_hw/b_1715_int_and_hw_9300_cg.pdf ; https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-15/configuration_guide/sec/b_1715_sec_9300_cg/controlling_switch_access_with_passwords_and_privilege_levels.html ; https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-15/configuration_guide/rtng/b_1715_rtng_9300_cg.pdf ; https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-15/configuration_guide/lyr2/b_1715_lyr2_9300_cg.pdf
platform: Catalyst 9300, IOS XE 17.14/17.15 (Cisco docs use hostname "Device")
retrieved: 2026-11-28
verified: Lines 1-3 come from the 17.15 Routing HTML page through WebFetch, which counted two spaces after "line."; PDF text collapses that to one space. All other lines are copied from pdftotext -layout output of the Cisco PDFs (leading indent removed) or from the 17.15 Security HTML page through WebFetch. Each group is a separate doc example, joined here.
---
~~~text
Device#configure terminal
Enter configuration commands, one per line.  End with CNTL/Z.
Device(config)#ip routing
Device(config)# vlan 20
Device(config-vlan)# private-vlan primary
Device(config)# interface range gigabitethernet1/0/1 - 4
Device(config-if-range)# speed 100
Device(config)# line vty 10
Device(config-line)# password let45me67in89
Device(config-line)# end
Device(config)# router ospf 1
Device(config-router)# router-id 192.168.0.1
Device(config)# interface gigabitethernet1/0/7
Device(config-if)# switchport access vlan 22
% Access VLAN does not exist. Creating vlan 22
Device(config)# end

Device#
*Feb 11 18:03:12.600: %SYS-5-CONFIG_I: Configured from console by console
~~~

## Notes
- Sources by group: lines 1-3 RTNG HTML (unicast routing example); vlan from the VLAN 17.14 PDF; interface range from the INTHW 17.15 PDF; line vty from the SEC 17.15 HTML; router ospf from the RTNG 17.15 PDF; switchport access vlan from the L2 17.15 PDF (802.1Q tunneling example); end and CONFIG_I from the INTHW 17.15 PDF (breakout example; other syslog lines between were dropped).
- Cisco samples are inconsistent about spaces: some have `Device#configure terminal` with no space, most have `Device# configure terminal`. On a real device nothing is printed between the prompt and what you type, so the space in docs is only formatting.
- The RTNG HTML example goes on with `Device(config-router)#end` after `ip routing`. That is a mistake in the doc (`ip routing` does not enter router mode), so it is not copied here.
- One copy of the configure-terminal line in the INTHW HTML has a single space and another says "CNTRL/Z". Most HTML copies match line 2.
- No sample with `line vty 0 4` exactly; `line vty 10` and `line console 0` both lead to `(config-line)#`.
