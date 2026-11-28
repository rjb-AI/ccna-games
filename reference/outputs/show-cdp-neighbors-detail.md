---
command: show cdp neighbors detail
source: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/cdp/command/cdp-cr-book/cdp-cr-a1.html
source_title: Cisco IOS Cisco Discovery Protocol Command Reference - cdp advertise-v2 through show cdp traffic [Support] - Cisco
platform: not stated (generic Cisco IOS command reference; the neighbour in the sample is a cisco 3640 router)
retrieved: 2026-11-28
verified: two fetches agreed for each sample (Sample 2: the second fetch showed a trailing space on every line; dropped here)
---

Sample 1: the "show cdp neighbors" command entry, Examples: "The following is sample output for one neighbor from the show cdp neighbors detail command. Additional detail is shown about neighbors, including network addresses, enabled protocols, and software version."

~~~text
Device# show cdp neighbors detail

Device ID: device.cisco.com
Entry address(es):
  IPv6 address: FE80::203:E3FF:FE6A:BF81  (link-local)
  IPv6 address: 4000::BC:0:0:C0A8:BC06  (global unicast)
Platform: cisco 3640,  Capabilities: Router
Interface: Ethernet0/1,  Port ID (outgoing port): Ethernet0/1
Holdtime : 160 sec
Version :
Cisco Internetwork Operating System Software 
IOS (tm) 3600 Software (C3640-A2IS-M), Version 12.2(25)SEB4, RELE)
advertisement version: 2
Duplex Mode: half
Native VLAN: 42
VTP Management Domain: 'Accounting Group'
~~~

Sample 2: "Configuring Cisco Discovery Protocol on Cisco Routers and Switches Running Cisco IOS" tech note, the "show cdp neighbors detail" example. Source: https://www.cisco.com/c/en/us/support/docs/network-management/discovery-protocol-cdp/43485-cdponios43485.html. Two fetches agreed.

~~~text
router#show cdp neighbors detail
-------------------------
Device ID: lab-7206
Entry address(es):
IP address: 172.19.169.83
Platform: cisco 7206VXR, Capabilities: Router
Interface: Ethernet0, Port ID (outgoing port): FastEthernet0/0/0
Holdtime : 123 sec
Version :
Cisco Internetwork Operating System Software
IOS (tm) 5800 Software (C5800-P4-M), Version 12.1(2)
Copyright (c) 1986-2002 by Cisco Systems, Inc.
advertisement version: 2
Duplex: half
-------------------------
Device ID: lab-as5300-1
Entry address(es):
IP address: 172.19.169.87
Platform: cisco AS5300, Capabilities: Router
--More--
~~~

## Notes
Field descriptions from the CDP Command Reference page, closely quoted:
- Device ID: name of the neighbor device and either the MAC address or the serial number.
- Entry address(es): a list of network addresses of neighbor devices (IP, IPv6, etc.; IPv6 addresses are followed by the address type, e.g. link-local, global unicast).
- Platform: product name and number of the neighbor device.
- Capabilities: the device type of the neighbor (router, bridge, switch, host, IGMP device, repeater...).
- Interface: the local interface through which this neighbor is connected.
- Port ID: the interface and port number of the neighboring device.
- Holdtime: remaining time (seconds) the current device will hold the advertisement before discarding it.
- Version: software version of the neighbor device.
- advertisement version: version of CDP being used for advertisements.
- Duplex Mode: duplex state of the connection between the current device and the neighbor.
- Native VLAN: the ID number of the VLAN on the neighbor device.
- VTP Management Domain: name of the collective group of VLANs associated with the neighbor device.

Oddities / limits:
- Both samples are older router-style output. No reliable, real Catalyst 9000 "show cdp neighbors detail" block was found on cisco.com. The c9000 CDP config guide example looked illustrative (see show-cdp-neighbors.md), so it was rejected.
- Sample 1 has a truncated version string ("RELE)") and a trailing space after "Software". Both are on the page.
- In Sample 1 the IP addresses are indented two spaces under "Entry address(es):"; in Sample 2 they are not. Sample 2 uses "Duplex:" where Sample 1 uses "Duplex Mode:".
- Sample 2 shows the dashed separator line between neighbors and a --More-- pager prompt.
