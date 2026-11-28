# Catalyst 9300 / IOS XE CLI facts (verified against cisco.com)

Retrieved 2026-11-28. Quotes are copied from Cisco documents. PDFs were converted with `pdftotext -layout`, which turns runs of spaces into single spaces and breaks lines at the page width, so a quote may join text that wraps across lines in the PDF. HTML quotes came through WebFetch.

Source key (cited by tag below):

- [VLAN] VLAN Configuration Guide, Cisco IOS XE 17.14.x (Catalyst 9300) — https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-14/configuration_guide/vlan/b_1714_vlan_9300_cg.pdf
- [L2] Layer 2 Configuration Guide, Cisco IOS XE 17.15.x (Catalyst 9300) — https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-15/configuration_guide/lyr2/b_1715_lyr2_9300_cg.pdf
- [INTHW] Interface and Hardware Components Configuration Guide, Cisco IOS XE 17.15.x (Catalyst 9300) — https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-15/configuration_guide/int_hw/b_1715_int_and_hw_9300_cg.pdf
- [INTHW-HTML] same guide, chapter "Configuring Interface Characteristics" — https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-15/configuration_guide/int_hw/b_1715_int_and_hw_9300_cg/configuring_interface_characteristics.html
- [RTNG] IP Routing Configuration Guide, Cisco IOS XE 17.15.x (Catalyst 9300) — https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-15/configuration_guide/rtng/b_1715_rtng_9300_cg.pdf
- [RTNG-HTML] same guide, chapter "Configuring IP Unicast Routing" — https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-15/configuration_guide/rtng/b_1715_rtng_9300_cg/configuring_ip_unicast_routing.html
- [SEC-HTML] Security Configuration Guide 17.15.x (Catalyst 9300), "Controlling Switch Access with Passwords and Privilege Levels" — https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-15/configuration_guide/sec/b_1715_sec_9300_cg/controlling_switch_access_with_passwords_and_privilege_levels.html
- [CR-L23] Command Reference, Cisco IOS XE 17.15.x (Catalyst 9300), Layer 2/3 Commands — https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-15/command_reference/b_1715_9300_cr/layer_2_3_commands.pdf
- [CR-IH] Command Reference, Cisco IOS XE 17.15.x (Catalyst 9300), Interface and Hardware Commands — https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-15/command_reference/b_1715_9300_cr/interface_and_hardware_commands.pdf
- [CR-CLI] Command Reference, Cisco IOS XE Cupertino 17.8.x (Catalyst 9300), Using the Command-Line Interface — https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-8/command_reference/b_178_9300_cr/using_the_command_line_interface.html
- [EC-C9K] Etherchannel Configuration Guide, Cisco IOS XE 17 (C9000) — https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/lyr2-fwd/etherchannel/etherchannel-configuration-guide/etherchannels.html
- [TN-EC] Tech note "Troubleshoot EtherChannels on Catalyst 9000 Switches" (220367) — https://www.cisco.com/c/en/us/support/docs/switches/catalyst-9300-series-switches/220367-troubleshoot-etherchannels-on-catalyst-9.pdf
- [ISR4K] Cisco 4000 Series ISRs Software Configuration Guide, IOS XE Fuji 16.7.x, Slot and Subslot Configuration — https://www.cisco.com/c/en/us/td/docs/routers/access/4400/software/configuration/xe-16-7/isr4400swcfg-xe-16-7-book/slot_and_subslot_configuration.html

---

## 1. VLAN configuration prompt
**Answer:** `Device(config-vlan)#`
**Quote [VLAN]:**
```
Device(config)# vlan 20
Device(config-vlan)# private-vlan primary
```
The Step 2 text says "vlan vlan-id Enters a VLAN ID, and enters VLAN configuration mode." [CR-CLI] lists the mode prompt as `Switch(config-vlan)#` (that page uses the hostname "Switch").

## 2. Interface range prompt
**Answer:** `Device(config-if-range)#`
**Quote [INTHW], "Example: Configuring a Range of Interfaces":**
```
Device# configure terminal
Device(config)# interface range gigabitethernet1/0/1 - 4
Device(config-if-range)# speed 100
```

## 3. Line configuration prompt (line vty)
**Answer:** `Device(config-line)#`
**Quote [SEC-HTML]:**
```
Device(config)# line vty 10
Device(config-line)# password let45me67in89
```
No Catalyst 9300 sample with exactly `line vty 0 4` followed by the prompt was found. The same prompt follows `line console 0` in [INTHW] ("Device(config)# line console 0" / "Device(config-line)# media-type rj45 switch 1").

## 4. Router configuration prompt (router ospf)
**Answer:** `Device(config-router)#`
**Quote [RTNG]:**
```
Device(config)# router ospf 1
Device(config-router)# router-id 192.168.0.1
Device(config-router)# log-adjacency-changes
```

## 5. `configure terminal` output
**Answer:** `Enter configuration commands, one per line.  End with CNTL/Z.` with **two spaces** after "line.".
**Quote [RTNG-HTML], "Configuration Example for Enabling IP Routing" (WebFetch counted 2 spaces):**
```
Device#configure terminal
Enter configuration commands, one per line.  End with CNTL/Z.
Device(config)#ip routing
```
Caveats: [INTHW-HTML] has three copies of the line. Two have 2 spaces. One has 1 space, and another misspells it as "CNTRL/Z". PDF text always shows one space because PDF extraction collapses spaces. The source is inconsistent, but most HTML copies show two spaces. (The same [RTNG-HTML] example then shows `Device(config-router)#end` straight after `ip routing`. That is a mistake in the doc, so do not copy it.)

## 6. Output after `end`
**Answer:** The prompt returns to privileged EXEC (`Device#`). A `%SYS-5-CONFIG_I` syslog line follows, in the form `<timestamp>: %SYS-5-CONFIG_I: Configured from console by console`.
**Quote [INTHW]:**
```
Device(config)# end

Device#
*Feb 11 18:03:11.673: %PLATFORM_PM-6-MODULE_REMOVED: SFP module with interface name Fo1/1/1
 removed
*Feb 11 18:03:12.600: %SYS-5-CONFIG_I: Configured from console by console
```
[VLAN] has another sample: "Dec 10 13:51:28.423 PST: %SYS-5-CONFIG_I: Configured from console by console" (the doc's copy has the typo "consolesumm"). The timestamp prefix depends on the logging settings (`*` = clock not synchronised).

## 7. Default switchport mode
**Answer:** `dynamic auto`.
**Quote [INTHW], Table 1 "Default Layer 2 Ethernet Interface Configuration":** "VLAN trunking | Switchport mode dynamic auto (supports DTP) (Layer 2 interfaces only)." and "Operating mode | Layer 2 or switching mode (switchport command)."
**Quote [VLAN], Table 5:** "The default switchport mode for all Ethernet interfaces is dynamic auto."
**Quote [CR-L23], switchport mode:** "Command Default The default mode is dynamic auto."

## 8. Default trunk allowed VLANs and native VLAN
**Answer:** All VLANs 1–4094 are allowed. The native VLAN is VLAN 1.
**Quote [INTHW], Table 1:** "Allowed VLAN range | VLANs 1 to 4094." / "Native VLAN (for IEEE 802.1Q trunks) | VLAN 1 (Layer 2 interfaces only)."
**Quote [VLAN]:** "By default, a trunk port sends traffic to and receives traffic from all VLANs. All VLAN IDs, 1 to 4094, are allowed on each trunk." / "The native VLAN is VLAN 1 by default."
**Quote [CR-L23], switchport trunk:** "VLAN 1 is the default native VLAN ID on the port. The default for all VLAN lists is to include all VLANs."

## 9. Default PoE mode
**Answer:** `power inline auto` (enabled).
**Quote [CR-IH], power inline:** "Command Default The default is auto (enabled)."
**Quote [INTHW]:** "auto: The auto mode is the default setting. The device automatically detects if the connected device requires power."

## 10. `ip routing` default
**Answer:** Disabled by default.
**Quote [RTNG]:** "By default, the device is in Layer 2 switching mode and IP routing is disabled. To use the Layer 3 capabilities of the device, you must enable IP routing." and "By default, IP routing is disabled on the device, and you must enable it before routing can take place."

## 11. `switchport trunk encapsulation dot1q`
**Answer:** The command does not exist on Catalyst 9300, because 802.1Q is the only trunk encapsulation. The [CR-L23] syntax for `switchport trunk` has no `encapsulation` keyword, and no `switchport trunk encapsulation` command appears in the Layer 2/3 command list.
**Quote [CR-L23]:** "switchport trunk {allowed vlan vlan-list | native vlan vlan-id | pruning vlan vlan-list}"
**Quote [VLAN]:** "IEEE 802.1Q— Industry-standard trunking encapsulation is available on all Ethernet interfaces." / "The device supports IEEE 802.1Q trunking methods for sending VLAN traffic over Ethernet ports." The trunk procedure in [VLAN] has no encapsulation step.
Not found: the exact error text the switch prints if you type the command.

## 12. `root primary` / `root secondary`
**Answer (configuration guide):**
- `root primary` sets the priority to 24576 if that makes the switch root.
- If the current root's priority is already below 24576, `root primary` sets 4096 less than the lowest priority. This sentence appears only in the MST section; the PVST+ section gives just the 24576 rule.
- `root secondary` sets 28672.

**Quote [L2], PVST+:** "the switch sets its own priority for the specified VLAN to 24576 if this value causes this switch to become the root for the specified VLAN."
**Quote [L2], MST:** "If any root switch for the specified instance has a switch priority lower than 24576, the switch sets its own priority to 4096 less than the lowest switch priority."
**Quote [L2], secondary:** "the switch priority is modified from the default value (32768) to 28672."
**Conflict:** The [CR-L23] `spanning-tree vlan` usage text is legacy and contradicts the guide: "The spanning-tree root primary command alters this switch's bridge priority to 8192. ... the bridge priority is changed to 100 less than the bridge priority of the current bridge." / "The spanning-tree root secondary command alters this switch's bridge priority to 16384." The config guide values (24576 / 4096 less / 28672) are the ones that match the 4096-step rule in item 13.

## 13. STP priority range and increment
**Answer:** 0–61440 in steps of 4096. The default is 32768.
**Quote [L2], spanning-tree vlan priority:** "For priority, the range is 0 to 61440 in increments of 4096; the default is 32768. ... Valid priority values are 4096, 8192, 12288, 16384, 20480, 24576, 28672, 32768, 36864, 40960, 45056, 49152, 53248, 57344, and 61440. All other values are rejected."
The PVST+ list leaves out 0, but the stated range starts at 0. The MST list in [L2] and [CR-L23] includes 0: "valid values are 0, 4096, 8192, ..."
**Quote [L2], Table 3:** "Device priority | 32768".
(The [CR-L23] `spanning-tree vlan` syntax line says "the range is from 0 to 65535". That is legacy text, as in item 12.)

## 14. EtherChannel mode compatibility
**Answer:**
- LACP: active+active and active+passive form a channel. passive+passive does not.
- PAgP: desirable+desirable and desirable+auto form a channel. auto+auto does not.
- `on` forms a channel only with `on`.
- LACP and PAgP do not interoperate, and `on` does not negotiate with either.

**Quote [L2]:**
- "A port in the active mode can form an EtherChannel with another port that is in the active or passive mode."
- "A port in the passive mode cannot form an EtherChannel with another port that is also in the passive mode because neither port starts LACP negotiation."
- "A port in the desirable mode can form an EtherChannel with another port that is in the desirable or auto mode." / "A port in the auto mode can form an EtherChannel with another port in the desirable mode." / "A port in the auto mode cannot form an EtherChannel with another port that is also in the auto mode because neither port starts PAgP negotiation."
- "on —Forces the port to channel without PAgP or LACP. In the on mode, an EtherChannel exists only when a port group in the on mode is connected to another port group in the on mode."
- "Individual EtherChannel groups can run either PAgP or LACP, but they cannot interoperate."

## 15. Voice VLAN
**Answer:** The interface command is `switchport voice vlan {vlan-id | dot1p | none | untagged}`. It works on access ports only. The access VLAN carries the data traffic from the PC behind the phone.
**Quote [VLAN]:** "Step 4 switchport voice vlan {vlan-id | dot1p | none | untagged} Configures the voice VLAN." / "Voice VLAN configuration is only supported on device access ports; voice VLAN configuration is not supported on trunk ports."
**Quote [VLAN]:** "You can configure an access port with an attached Cisco IP Phone to use one VLAN for voice traffic and another VLAN for data traffic from a device attached to the phone."
No sentence says in so many words that "access VLAN = PC data VLAN". The voice-traffic options ("In the voice VLAN tagged…" / "In the access VLAN…") treat the access VLAN as the port's other (data) VLAN.

## 16. SVI requirements for inter-VLAN routing
**Answer:**
- An SVI is created by `interface vlan N`.
- It needs an IP address and `no shutdown`.
- It is not active until a port in the VLAN is associated with it (autostate).
- `ip routing` must be enabled.

**Quote [INTHW]:** "SVIs are created the first time that you enter the vlan interface configuration command for a VLAN interface. ... Configure a VLAN interface for each VLAN for which you want to route traffic, and assign it an IP address." / "When you create an SVI, it does not become active until it is associated with a physical port." / "you can use the switchport autostate exclude command on a port to exclude that port from being included in determining SVI line-state."
**Quote [INTHW], Layer 3 procedure (applies to `interface ... vlan vlan-id`):** "Step 6 no shutdown Enables the interface."
**Quote [RTNG]:** "A switch virtual interface (SVI): a VLAN interface that is created by using the interface vlan vlan_id ..." under "By default, IP routing is disabled on the device, and you must enable it before routing can take place."
Not found: a Catalyst 9300 sentence saying the VLAN itself must exist in the VLAN database for the SVI to come up.

## 17. `interface range` syntax
**Answer:** Put a space before the hyphen; the examples also put one after it (`1/0/1 - 4`). Comma-separated ranges are allowed, with spaces around the comma and the interface type repeated in each entry. Up to five ranges.
**Quote [INTHW]:** "You can use the interface range command to configure up to five port ranges or a previously defined macro." / "In a comma-separated port-range, you must enter the interface type for each entry and enter spaces before and after the comma." / "In a hyphen-separated port-range, you do not need to re-enter the interface type, but you must enter a space before the hyphen."
**Example [INTHW]:** `Device(config)# interface range gigabitethernet1/1/1 - 3 , tengigabitethernet1/1/1 - 2`

## 18. Default admin state of physical ports and SVIs
**Answer:** Physical ports are enabled (no shutdown) by default. For SVIs, no Catalyst 9300 sentence states the default state. The documented procedure includes `no shutdown`, and the [CR-IH] sample shows Vlan1 as administratively down.
**Quote [INTHW], Table 1:** "Port enable state | All ports are enabled."
**Quote [CR-IH], show ip interface brief example:** "Vlan1 unassigned YES NVRAM administratively down down"
Not found: an explicit statement that a newly created `interface vlan N` starts shut down.

## 19. `switchport access vlan N` for a VLAN that doesn't exist
**Answer:** The VLAN is created automatically, and this message is printed: `% Access VLAN does not exist. Creating vlan N`
**Quote [L2], 802.1Q tunneling example:**
```
Device(config)# interface gigabitethernet1/0/7
Device(config-if)# switchport access vlan 22
% Access VLAN does not exist. Creating vlan 22
```
**Quote [VLAN]:** "If you assign an interface to a VLAN that does not exist, the new VLAN is created."

## 20. Default VLAN name
**Answer:** `VLAN` followed by the VLAN ID padded to four digits with leading zeros, e.g. VLAN0010 for VLAN 10.
**Quote [VLAN]:** "If no name is entered for the VLAN, the default is to append the vlan-id value with leading zeros to the word VLAN. For example, VLAN0004 is a default VLAN name for VLAN 4."

## 21. Error for a priority that is not a multiple of 4096
**Answer:** Not found. Cisco docs say only that such values "are rejected".
**Quote [L2]:** "All other values are rejected." / [CR-L23] (MST): "You can set the bridge priority in increments of 4096 only."
The exact error text appears only on community.cisco.com, so it is not used.

## 22. Does `channel-group N mode active` create Port-channelN?
**Answer:** Yes, for Layer 2 EtherChannels. The command creates the port-channel interface automatically.
**Quote [CR-L23], channel-group:** "For Layer 2 EtherChannels, the channel-group command automatically creates the port-channel interface when the channel group gets its first physical port. You do not have to use the interface port-channel command in global configuration mode to manually create a port-channel interface."
**Quote [L2]:** "This command automatically creates the port-channel logical interface."
Not found: any console message such as "Creating a port-channel interface Port-channel 1". No Catalyst 9300 example shows one.

## 23. What else a Cisco IP phone needs
**Answer:**
- CDP on the port (on by default).
- QoS trust: `trust device cisco-phone`, or auto QoS.
- The voice VLAN must exist and be active.
- PortFast is turned on automatically when you configure a voice VLAN.
- PoE `auto` is the default (item 9).

**Quote [VLAN], Prerequisites:** "Before you enable voice VLAN, enable QoS on the device by entering the trust device cisco-phone interface configuration command. If you use the auto QoS feature, these settings are automatically configured." / "You must enable CDP on the device port connected to the Cisco IP Phone to send the configuration to the phone. (CDP is globally enabled by default on all device interfaces.)"
**Quote [VLAN], Guidelines:** "The voice VLAN should be present and active on the device for the IP phone to correctly communicate on the voice VLAN." / "The Port Fast feature is automatically enabled when voice VLAN is configured. When you disable voice VLAN, the Port Fast feature is not automatically disabled."
**Example [VLAN]:** `Device(config-if)# trust device cisco-phone`

## 24. `spanning-tree portfast` warning text, and `portfast trunk`
**Answer:** The warning text was not found in official Cisco docs; it appears only in community posts, which are not used. The command for trunk ports is `spanning-tree portfast trunk`.
**Quote [L2]:** "Step 4 spanning-tree portfast [trunk] Enables PortFast on an access port that is connected to a single workstation or server. ... By specifying the trunk keyword, you can enable PortFast on a trunk port." / "To enable PortFast on trunk ports, you must use the spanning-tree portfast trunk interface configuration command."
**Caution text [L2] (documentation, not CLI output):** "Use PortFast only when connecting a single end station to an access or trunk port. Enabling this feature on an interface that is connected to a switch or hub could prevent spanning tree from detecting and disabling loops in your network, which could cause broadcast storms and address-learning problems."

## 25. `show ip interface brief` Method for a CLI-configured address
**Answer:** `manual`.
**Quote [CR-IH], field descriptions:** "manual: Manually changed by the command-line interface." The list of values also includes "NVRAM: Configuration file in NVRAM." and "unset: Unset."
**Real output [ISR4K] (IOS XE router; spacing as rendered by WebFetch):**
```
Router# show ip interface brief
Interface              IP-Address      OK?  Method  Status                 Protocol
GigabitEthernet0/0/0    10.0.0.1       YES  manual  down                   down
GigabitEthernet0/0/1    unassigned     YES  NVRAM   administratively down  down
```
No Catalyst 9300 sample showing `manual` was found. The [CR-IH] Catalyst 9300 sample shows only NVRAM and unset.

## 26. `show etherchannel summary` flag when a channel does not form
Legend [CR-L23]: "D - down P - in port-channel / I - stand-alone s - suspended / H - Hot-standby (LACP only) / R - Layer3 S - Layer2 / u - unsuitable for bundling / U - in use f - failed to allocate aggregator / d - default port"

All official sample outputs found show only bundled `(P)` members. Not found: any official output that shows (I), (s) or (D) for these specific failures. What the text says:

- **(a) LACP passive on both ends:** The channel does not form, because "neither port starts LACP negotiation" [L2]. When no LACP peer responds, the port is suspended by default: "When no response is received from an LACP peer, ports in the port channel are moved to suspended state." [L2]. The same chapter, however, describes standalone (I) for "unmatched ports" and says "LACP standalone mode is disabled by default" [L2], so the wording is not fully consistent. The best-supported answer is (s).
- **(b) LACP on one end, PAgP on the other:** The groups "cannot interoperate" [L2]. The tech note shows the syslog for a peer that is not running LACP: `%ETC-5-L3DONTBNDL2: Gig1/0/1 suspended: LACP currently not enabled on the remote port.` [TN-EC]. That points to (s) on the LACP side. No summary output with this flag was found.
- **(c) A member with a different VLAN/trunk config:** "When there are any misconfigurations detected in a port mode or VLAN mask, the ports are suspended." [EC-C9K, section "Unsupported EtherChannel features"]. That means (s). For `on` mode: "Ports that are not compatible are suspended, even though they are configured in the on mode." [L2].
