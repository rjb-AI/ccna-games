---
command: show running-config (Catalyst switch interface blocks)
source:
  - S1 https://www.cisco.com/c/en/us/support/docs/lan-switching/inter-vlan-routing/41260-189.html (PDF: .../41260-189.pdf)
  - S2 https://www.cisco.com/c/en/us/support/docs/lan-switching/private-vlans-pvlans-promiscuous-isolated-community/40781-194.html (PDF: .../40781-194.pdf)
  - S3 https://www.cisco.com/c/en/us/support/docs/lan-switching/8021x/220919-troubleshoot-dot1x-on-catalyst-9000-seri.html (PDF: .../220919-troubleshoot-dot1x-on-catalyst-9000-seri.pdf)
  - S4 https://www.cisco.com/c/en/us/support/docs/switches/catalyst-9300-series-switches/217419-configure-and-verify-nat-on-catalyst-900.html (PDF: .../217419-configure-and-verify-nat-on-catalyst-900.pdf)
  - S5 https://www.cisco.com/c/en/us/support/docs/switches/catalyst-9300-series-switches/220367-troubleshoot-etherchannels-on-catalyst-9.html (PDF: .../220367-troubleshoot-etherchannels-on-catalyst-9.pdf)
  - S6 https://www.cisco.com/c/en/us/support/docs/switches/catalyst-9200-series-switches/222225-configure-autoqos-on-catalyst-9000-switc.html (PDF: .../222225-configure-autoqos-on-catalyst-9000-switc.pdf)
  - S7 https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-13/command_reference/b_1713_9300_cr/interface_and_hardware_commands.pdf
  - S8 https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-13/command_reference/b_1713_9300_cr/layer_2_3_commands.pdf
  - S9 https://www.cisco.com/c/en/us/support/docs/switches/catalyst-2950-series-switches/113260-voice-vlan-00.html (PDF: .../113260-voice-vlan-00.pdf)
source_title:
  - S1 Configure Inter-VLAN Routing with Catalyst Switches
  - S2 Configure Isolated Private VLANs on Catalyst Switches
  - S3 Troubleshoot Dot1x on Catalyst 9000 Series Switches
  - S4 Configure and Verify NAT on Catalyst 9000 Switches
  - S5 Troubleshoot EtherChannels on Catalyst 9000 Switches
  - S6 Configure AutoQoS on Catalyst 9000 Switches
  - S7 Command Reference, Cisco IOS XE 17.13.x (Catalyst 9300 Switches) - Interface and Hardware Commands (macro auto execute; show tech-support poe)
  - S8 Command Reference, Cisco IOS XE 17.13.x (Catalyst 9300 Switches) - Layer 2/3 Commands (switchport voice vlan)
  - S9 Configure Catalyst 2960/2950 Series Switches with Voice VLAN
platform:
  - S1 Catalyst 3850, Cisco IOS XE 16.12.7 (output says "version 16.12")
  - S2 Catalyst 9300, IOS XE 17.x / 26.x (outputs say "version 26.1" on 9300-1 and "version 17.12" on 9300-2)
  - S3 Catalyst 9300/9400/9500/9600, IOS XE 17.6.x and later (prompt C9300#)
  - S4 Catalyst 9300, Cisco IOS XE 16.12.4
  - S5 Catalyst 9200/9300/9400/9500/9600 (no release stated)
  - S6 Catalyst 9300, 17.09.05 (prompt C9300#)
  - S7 Catalyst 9300 command reference, IOS XE 17.13.x (example content is older; see notes)
  - S8 Catalyst 9300 command reference, IOS XE 17.13.x
  - S9 Catalyst 2950 (Components Used says "based on the Cisco Catalyst 2950 Switch"; NOT a 2960 sample)
retrieved: 2026-11-28
verified: >
  Each source was fetched twice with WebFetch. For S1, S3-S8 the PDF version was fetched twice
  (second fetch with a cache-busting query string), both PDFs were converted with
  `pdftotext -layout`, and the two texts were byte-identical. For S1, S3, S4, S5, S6, S9 the HTML
  page was also fetched and asked for the block verbatim; the line order agreed with the PDF in
  every kept block. S2 was fetched as HTML twice with different prompts plus once as PDF; the
  trunk block and the line order of all blocks agreed (see the S2 note on one joined line).
  Editing done by me: blank lines and page-break characters introduced by PDF layout were removed;
  the blank line between "Building configuration..." and "Current configuration" is kept where
  the source shows it. Cisco's own editorial annotations ("!---" comments, "<--" notes,
  "<output omitted>") are kept as printed, because they are part of the page. Leading-space
  indentation is copied as the page renders it, which is NOT consistent across Cisco pages
  (some show 0 spaces, some 1, one shows 2); real IOS uses one space, so do not treat the
  indentation in S4/S6 as authoritative.
---

## S1 - Catalyst 3850 (IOS XE 16.12), full `show running-config`, Verify > Catalyst 3850

Top of the output:

~~~text
SW_3850#show running-config
Building configuration...

Current configuration : 11543 bytes
!
! Last configuration change at 12:16:54 UTC Tue Nov 15 2022
!
version 16.12
no service pad
~~~

Interface section (the "!---" lines are Cisco's annotations on the page):

~~~text
!--- Output suppressed.
!--- Configure IEEE 802.1q trunks.
!--- Issue the switchport mode trunk command to force the switch port to trunk mode.
!
interface GigabitEthernet1/0/1
 shutdown
!
interface GigabitEthernet1/0/2
 shutdown
!
interface GigabitEthernet1/0/3
 description To_Switch-B
 switchport mode trunk
!
interface GigabitEthernet1/0/4
no switchport
no ip address
shutdown
!
interface GigabitEthernet1/0/5
 description To_Switch-A
 switchport mode trunk
!
interface GigabitEthernet1/0/6
no switchport
no ip address
shutdown
!
interface Vlan1
 no ip address
 shutdown
!
!--- This Switch Virtual Interface (SVI) is the default gateway for Users.
!
interface Vlan2
 description User-SVI
 ip address 10.1.2.1 255.255.255.0
!
!--- This SVI is the default gateway for Servers VLAN.
!
interface Vlan3
 description Server-SVI
 ip address 10.1.3.1 255.255.255.0
!
!--- This SVI is the default gateway for other L2 switches management interface.
!
interface Vlan10
 description Management-SVI
 ip address 10.1.10.1 255.255.255.0
!
!--- This route statement allows the 3850 to send Internet traffic to the Cisco router.
ip route 0.0.0.0 0.0.0.0 10.1.1.2
~~~

End of the output:

~~~text
line con 0
line vty 5 15
!
end
~~~

## S2 - Catalyst 9300, full `show running-config` (side-by-side table, Example 2)

9300-1 interface section (HTML fetch, agreed with the PDF text):

~~~text
interface TenGigabitEthernet1/1/3
 description Community Host VLAN 102
 switchport private-vlan host-association 100 102 switchport mode private-vlan host
 spanning-tree portfast
!
interface TenGigabitEthernet1/1/6
 description Trunk to SW2
 switchport trunk allowed vlan 100-102
 switchport mode trunk
!
!
end
~~~

9300-2 interface blocks (HTML fetch):

~~~text
interface TenGigabitEthernet1/1/6
 description Trunk to SW1
 switchport trunk allowed vlan 100-102
 switchport mode trunk
!
interface TenGigabitEthernet1/1/7
 description Isolated Host 1
 switchport private-vlan host-association 100 101
 switchport mode private-vlan host
 spanning-tree portfast
!
interface TenGigabitEthernet1/1/8
 description Isolated Host 2
 switchport private-vlan host-association 100 101
 switchport mode private-vlan host
 spanning-tree portfast
!
!
end
~~~

Note: on the page itself the Te1/1/3 (and Te1/1/5) host-association and mode lines are printed
joined on one line, as shown above for 9300-1; one fetch split them. This is a page formatting
artifact, but the order (host-association before mode) is the same either way. The same page's
configuration steps typed `switchport mode private-vlan host` BEFORE `switchport private-vlan
host-association`, yet the running-config lists host-association first: evidence that the
running-config order is the switch's own canonical order, not the order typed.

## S3 - Catalyst 9300, `show running-config interface te1/0/4`, Verify Configuration and Operations

~~~text
C9300#show running-config interface te1/0/4
Building configuration...

Current configuration : 148 bytes
!
interface TenGigabitEthernet1/0/4
 switchport access vlan 50
 switchport mode access
 authentication order dot1x mab  <-- Specifies authentication order, dot1x and then mab
 authentication priority dot1x mab  <-- Specifies authentication priority, dot1x and then mab
 authentication port-control auto  <-- Enables 802.1x dynamic authentication on the port
 mab  <-- Enables MAB
 dot1x pae authenticator  <-- Puts interface into "authenticator" mode.
end
~~~

(Copied as the HTML fetch gave it. The "<--" notes are Cisco's annotations; in the PDF each sits
on its own line after its command. The PDF renders the first sub-command with 2 leading spaces,
the HTML with 1.)

## S4 - Catalyst 9300 (IOS XE 16.12.4), routed ports, Configure > Static NAT

~~~text
NAT-Device#show run interface te1/0/1
Building configuration...

Current configuration : 109 bytes
!
interface TenGigabitEthernet1/0/1
no switchport
ip address 192.168.1.1 255.255.255.0
ip nat inside                                 <-- NAT inside interface
end
~~~

~~~text
NAT-Device#show run interface te1/0/2
Building configuration...

Current configuration : 109 bytes
!
interface TenGigabitEthernet1/0/2
no switchport
ip address 10.10.10.1 255.255.255.0
ip nat outside                              <-- NAT outside interface
end
~~~

## S5 - Catalyst 9000, EtherChannel members and Port-channel, Verify Etherchannel Programming > Verify Software

~~~text
switch#show run interface gigabitEthernet 1/0/1

<output omitted>
interface GigabitEthernet1/0/1
 channel-group 1 mode active
end
~~~

~~~text
switch#show run interface port-channel 1

<output omitted>
interface Port-channel1
end
~~~

(Gi1/0/2-1/0/4 are identical apart from the interface name. Cisco omitted the header lines.)

## S6 - Catalyst 9300 (17.09.05), `show running-config interface gi1/0/1` after AutoQoS

~~~text
C9300#show running-config interface gi1/0/1
Building configuration...

Current configuration : 199 bytes
!
interface GigabitEthernet1/0/1
trust device cisco-phone
auto qos voip cisco-phone
service-policy input AutoQos-4.0-CiscoPhone-Input-Policy
service-policy output AutoQos-4.0-Output-Policy
end
~~~

## S7 - Catalyst 9300 command reference 17.13, `macro auto execute` example

~~~text
Device# show running-config interface gigabitethernet1/0/1
Building configuration...

Current configuration : 284 bytes
!
interface GigabitEthernet1/0/1
 switchport trunk encapsulation dot1q
 switchport trunk native vlan 10
 switchport mode trunk
 srr-queue bandwidth share 10 10 60 20
 queue-set 2
 priority-queue out
 mls qos trust cos
 auto qos voip trust
 macro description CISCO_SWITCH_EVENT
end
~~~

Caution: this example is printed in the 9300 reference but its content (srr-queue, queue-set,
mls qos) is older Catalyst 3750/3560-era output carried forward; use it for the
native-vlan vs mode-trunk order only.

## S7 - Catalyst 9300 command reference 17.13, `show tech-support poe` example (embedded `show running-config`)

~~~text
------------------ show running-config ------------------


Building configuration...

Current configuration : 22900 bytes
!
! Last configuration change at 14:59:57 PDT Mon Sep 11 2017
!
version 16.3
~~~

~~~text
interface Port-channel1
 no switchport
 no ip address
!
interface GigabitEthernet0/0
 vrf forwarding Mgmt-vrf
 ip address 10.5.49.131 255.255.255.0
 negotiation auto
!
interface FortyGigabitEthernet1/1/1
!
interface TenGigabitEthernet1/0/1
!
interface FortyGigabitEthernet2/1/1
 shutdown
!
interface TenGigabitEthernet2/1/1
 shutdown
!
interface GigabitEthernet3/0/40
 shutdown
!
interface GigabitEthernet9/0/1
 power inline port poe-ha
!
interface GigabitEthernet9/0/11
 power inline port priority high
!
interface Vlan1
 no ip address
!
ip forward-protocol nd
~~~

(The full output ends with `end`. Interfaces are listed Port-channel first, then Gi0/0, then by
port, then Vlan.)

## S8 - Catalyst 9300 command reference 17.13, `switchport voice vlan` example, Part 4 - Verifying configuration

~~~text
Device# show running-config
interface gigabitethernet3/1/1
Building configuration...
Current configuration : 113 bytes
!
interface GigabitEthernet3/1/1
switchport voice vlan 55
switchport mode access
Switch#
~~~

Caution: this example is visibly hand-edited (the command is split over two lines, the
configuration step used `switchport voice vlan name test` but the output shows 55, there is no
`end`, and the prompt changes from Device# to Switch#). Do not rely on its line order.

## S9 - Catalyst 2950 (not 2960), `show running-config interface`, Verify

~~~text
Switch#show running-config interface fastEthernet 0/6
Building configuration...

Current configuration : 139 bytes
!
interface FastEthernet0/6
 switchport voice vlan dot1p
 switchport voice vlan 10
 switchport priority extend trust
 mls qos trust cos
 priority-queue out
 spanning-tree portfast
 spanning-tree bpduguard enable
end
~~~

~~~text
Switch#show running-config interface fastEthernet 0/8
Building configuration...

Current configuration : 137 bytes
!
interface FastEthernet0/8
 switchport voice vlan 10
 switchport access vlan 20
 mls qos trust cos
 priority-queue out
 spanning-tree portfast
 spanning-tree bpduguard enable
end
~~~

Caution: Catalyst 2950 only, and the Fa0/6 block shows two `switchport voice vlan` lines, which
real IOS would not keep, so the page was edited. Fa0/8 puts `switchport voice vlan` BEFORE
`switchport access vlan`. No Catalyst 9300/3850/2960 sample here shows access vlan and voice
vlan together, so this order is unconfirmed for the platforms the app targets.

## Header and trailer of `show running-config interface X`

- First line after the command: `Building configuration...`, then a blank line, then
  `Current configuration : N bytes` (S3, S4, S6, S7, S9; S1 for the full config). S8 shows no
  blank line, but S8 is hand-edited.
- Then `!`, then the `interface` line, then the sub-commands.
- Last line: `end` (S3, S4, S5, S6, S7, S9). There is no `!` between the last sub-command and
  `end` in any per-interface sample.
- An interface with no sub-commands prints just the interface line then `end` (S5 Port-channel1).
- In a full `show running-config`, blocks are separated by `!` and the output ends with `end` (S1, S2, S7).

## Line order observed

Pairs below are "A comes before B". Platform in brackets.

1. `description` before `switchport mode trunk` - S1 Gi1/0/3, Gi1/0/5 [3850]; S2 Te1/1/6 [9300].
2. `description` before `switchport trunk allowed vlan` - S2 Te1/1/6 [9300].
3. `description` before `ip address` (SVI) - S1 Vlan2, Vlan3, Vlan10 [3850].
4. `description` before `switchport private-vlan ...` / `switchport mode private-vlan host` and before `spanning-tree portfast` - S2 [9300].
5. `switchport access vlan N` before `switchport mode access` - S3 Te1/0/4 [9300].
6. `switchport trunk allowed vlan ...` before `switchport mode trunk` - S2 Te1/1/6 on both switches [9300].
7. `switchport trunk encapsulation dot1q` before `switchport trunk native vlan N` before `switchport mode trunk` - S7 macro example [9300 reference, older-platform content].
8. `switchport mode ...` before `spanning-tree portfast` - S2 Te1/1/3, Te1/1/7, Te1/1/8 [9300] (mode private-vlan host).
9. `switchport ...` lines before `authentication ...`, `mab`, `dot1x pae authenticator` - S3 [9300].
10. `no switchport` before `ip address` (routed port) - S4 Te1/0/1, Te1/0/2 [9300].
11. `no switchport` before `no ip address` before `shutdown` - S1 Gi1/0/4, Gi1/0/6 [3850]; `no switchport` before `no ip address` also on Port-channel1 in S7.
12. `no ip address` before `shutdown` (SVI) - S1 Vlan1 [3850].
13. `vrf forwarding` before `ip address` before `negotiation auto` - S7 Gi0/0 [9300 mgmt port].
14. `spanning-tree portfast` before `spanning-tree bpduguard enable` - S9 only [2950]; both are the last lines of the block, after `switchport ...`, `mls qos trust cos` and `priority-queue out`.
15. `switchport voice vlan N` relative to `switchport access vlan N` - only S9 Fa0/8 [2950] shows it (voice before access), and only S8 [9300, hand-edited] shows voice before `switchport mode access`. No trustworthy 9300/3850/2960 sample.
16. `channel-group N mode active` - S5 [9000] shows it as the ONLY line, so its position relative to `description`, `switchport ...` or `shutdown` is NOT shown by any sample.
17. `interface Port-channelN` - S5 (empty), S7 (`no switchport`, `no ip address`). A Layer 2 Port-channel with `switchport` lines is NOT shown.

Not shown by any sample:
- `switchport trunk native vlan N` relative to `switchport trunk allowed vlan ...` (no sample has both).
- `switchport voice vlan N` on a 9300/9200/3850/3650/2960 alongside `switchport access vlan` and `switchport mode access`.
- `power inline never` (S7 shows only `power inline port poe-ha` and `power inline port priority high`, each alone in its block).
- `shutdown` relative to `description`, any `switchport` line, `channel-group` or `spanning-tree` (all samples with `shutdown` have only `no switchport`/`no ip address` before it, or nothing).
- `spanning-tree bpduguard enable` on a 9300/9200/3850/3650/2960.
- `description` relative to `no switchport` on a routed port.

Rejected / out of scope: the Cisco IOS XE 17 EtherChannel Configuration Guide
(c9000/lyr2-fwd/etherchannel/.../etherchannels.html) shows `show running-config interface
port-channel 1` with `Current configuration:` (no byte count) and `no ip address` BEFORE
`no switchport`. It applies to C9350/C9550/C9610 smart switches and looks hand-written, so it was
not kept. The QinQ tech note (217726) shows `switchport trunk allowed vlan` before `switchport mode
trunk` too, but on a C9500 and in hand-assembled "Configuration on" listings, so it was not kept.
