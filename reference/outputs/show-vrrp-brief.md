---
command: show vrrp brief
source: https://www.cisco.com/en/US/docs/ios-xml/ios/ipapp_fhrp/command/fhp-s1.html
source_title: Cisco IOS First Hop Redundancy Protocols Command Reference - service-module ip redundancy through show vrrs summary
platform: not stated for this example (Cisco IOS / IOS XE command reference; the A-F column means VRRPv3 output)
retrieved: 2026-11-28
verified: two fetches agreed on every line, including the two-space indent on the data rows
---

From the "show vrrp" entry, Examples section: "The following is sample output from the show vrrp command with the brief keyword:"

~~~text
Device# show vrrp brief

Interface          Grp  A-F Pri  Time Own Pre State   Master addr/Group addr
  Et1/0              1 IPv4 150     0  N   Y  MASTER  10.0.0.1(local) 10.0.0.10
  Et1/0              1 IPv6 100     0  N   Y  INIT    AF-UNDEFINED no address
  Et1/0              6 IPv6 150     0  N   Y  MASTER  FE80::1(local) FE80::100
~~~

## Notes
Field descriptions from the same entry (quoted from the second fetch):
- Interface: "Interface type and number."
- Grp: "VRRP group to which this interface belongs."
- Pri: "VRRP priority number for this group."
- Time: "Calculated time that the master virtual device can be down before the backup virtual device takes over."
- Own: "IP address owner."
- Pre: "Preemption status. Y indicates that preemption is enabled. If this field is empty, preemption is disabled."
- State: "Role this interface plays within VRRP (master or backup)."
- Master addr: "IP address of the master virtual device."
- Group addr: "IP address of the virtual device."

Odd things about this sample:
- This is the VRRPv3 format (the A-F address-family column, IPv4 and IPv6 rows). The older VRRPv2 "show vrrp brief" format may have different columns. No VRRPv2 brief example was found on this page.
- The data rows start with two spaces, but the header does not.
- The A-F column has no description in the table.
- The state is shown in capitals (MASTER, INIT).
