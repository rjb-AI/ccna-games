---
command: show lldp neighbors / show lldp neighbors detail
source: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/cether/configuration/xe-16-6/ce-xe-16-6-book/ce-lldp-multivend.html
source_title: Carrier Ethernet Configuration Guide, Cisco IOS XE Everest 16.6 - Using Link Layer Discovery Protocol in Multivendor Networks
platform: Cisco IOS XE Everest 16.6 (the guide is filed under Cisco ASR 1000 Series Aggregation Services Routers)
retrieved: 2026-11-28
verified: two fetches agreed, character for character, on both blocks
---

Sample 1: the configuration examples / verification section, "show lldp neighbors" on Device1.

~~~text
Device1# show lldp neighbors
Capability codes:
    (R) Router, (B) Bridge, (T) Telephone, (C) DOCSIS Cable Device
    (W) WLAN Access Point, (P) Repeater, (S) Station, (O) Other
Device ID           Local Intf     Hold-time  Capability      Port ID
Device2             Et0/0          150        R               Et0/0
Total entries displayed: 1
~~~

Sample 2: the same page, "show lldp neighbors detail". The neighbor is a Cisco IP phone, so the output includes the LLDP-MED section.

~~~text
Device1# show lldp neighbors detail

Local Intf: Gi0/1/7
Chassis id: 10.10.0.1
Port id: C8F9F9D61BC2:P1
Port Description: SW PORT
System Name: SEPC8F9F9D61BC2

System Description:
Cisco IP Phone 7962G,V12, SCCP42.9-3-1ES27S

Time remaining: 127 seconds
System Capabilities: B,T
Enabled Capabilities: B,T
Management Addresses:
    IP: 10.10.0.1
Auto Negotiation - supported, enabled
Physical media capabilities:
    1000baseT(HD)
    1000baseX(FD)
    Symm, Asym Pause(FD)
    Symm Pause(FD)
Media Attachment Unit type: 16
Vlan ID: - not advertised

MED Information:

    MED Codes:
          (NP) Network Policy, (LI) Location Identification
          (PS) Power Source Entity, (PD) Power Device
          (IN) Inventory

    H/W revision: 12
    F/W revision: tnp62.8-3-1-21a.bin
    S/W revision: SCCP42.9-3-1ES27S
    Serial number: FCH1610A5S5
    Manufacturer: Cisco Systems, Inc.
    Model: CP-7962G
    Capabilities: NP, PD, IN
    Device type: Endpoint Class III
    Network Policy(Voice): VLAN 10, tagged, Layer-2 priority: 5, DSCP: 46
    Network Policy(Voice Signal): VLAN 10, tagged, Layer-2 priority: 4, DSCP: 32
    PD device, Power source: Unknown, Power Priority: Unknown, Wattage: 6.3
    Location - not advertised
~~~

## Notes
- The page has no field-description table. Search snippets from the IOS Carrier Ethernet Command Reference (https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/cether/command/ce-cr-book/ce-s1.html) describe "Chassis id" as the chassis component of the endpoint identifier of the transmitting LLDP agent, but that page was too large to fetch the "show lldp" entry verbatim.
- LLDP capability codes are different from CDP's: (R) Router, (B) Bridge, (T) Telephone, (C) DOCSIS Cable Device, (W) WLAN Access Point, (P) Repeater, (S) Station, (O) Other. Note that P = Repeater in LLDP but P = Phone in CDP.
- Unlike the CDP table, the LLDP table header is "Local Intf" and "Hold-time", and the output ends with "Total entries displayed: N".
- In Sample 2 the detail block starts with "Local Intf:" rather than the device name. No "Total entries displayed" trailer appears after the detail block on this page.
- This is router (ASR 1000) documentation; no Catalyst-switch LLDP sample was verified. The interface names (Et0/0, Gi0/1/7) are router-style.
