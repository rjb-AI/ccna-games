---
command: show standby brief
source: https://www.cisco.com/en/US/docs/ios-xml/ios/ipapp_fhrp/command/fhp-s1.html
source_title: Cisco IOS First Hop Redundancy Protocols Command Reference - service-module ip redundancy through show vrrs summary
platform: not stated for this example (Cisco IOS command reference; interface "Et0")
retrieved: 2026-11-28
verified: three fetches agreed on every line of the output (fetch 1 and 3 showed trailing spaces after "Group addr" and after "10.0.0.12"; kept as published)
---

From the "show standby" entry, Examples section: "The following is sample output from the show standby command with the brief keyword specified:"

~~~text
Router# show standby brief

Interface   Grp Prio P State    Active addr     Standby addr    Group addr     
Et0         0   120    Init     10.0.0.1        unknown         10.0.0.12 
~~~

## Notes
Field descriptions (show standby brief Field Descriptions table). The three fetches gave slightly different wording, so this is a close summary, not a quote:
- Interface: interface type and number.
- Grp: HSRP (Hot Standby) group number.
- Prio: priority value of the interface in the group.
- P: preemption indicator. It is set when the router is configured to preempt. It is blank in this sample, so preempt is not configured.
- State: current HSRP state of the router (Init, Active, Standby, and so on).
- Active addr: IP address of the current active router.
- Standby addr: IP address of the standby router ("unknown" here).
- Group addr: virtual IP address of the HSRP group.

Odd things about this sample: the state is "Init" (not Active or Standby), the Active addr is 10.0.0.1 while the standby is "unknown", and the interface uses the old short name "Et0". It is the only brief example on the page.
