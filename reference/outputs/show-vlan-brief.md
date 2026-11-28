---
command: show vlan brief
source: https://www.cisco.com/c/en/us/support/docs/switches/catalyst-9300-switch/221717-troubleshoot-dhcp-on-catalyst-9000-switc.html
source_title: Troubleshoot DHCP on Catalyst 9000 Switches
platform: Catalyst 9300 (prompt "c9300"; page covers Catalyst 9000 switches, IOS XE)
retrieved: 2026-11-28
verified: two differently worded WebFetch prompts agreed on every line; exact spacing then taken from the page's own EPUB export (same URL with .epub), decoding the <pre> block (&nbsp; to space, <br /> to newline)
---

Sample 1: "Step 2. Check the layer 2 path", under the bullet "The VLAN must be created and active on the switch." On the page, the "10   users" line is shown in bold (highlighting, not part of the output).

~~~text
c9300#show vlan brief

VLAN Name                             Status    Ports

---- -------------------------------- --------- -------------------------------
1    default                          active    Gi1/0/2, Gi1/0/3, Gi1/0/4, Gi1/0/5, Gi1/0/6, Gi1/0/7
                                                Gi1/0/8, Gi1/0/9, Gi1/0/10, Gi1/0/11, Gi1/0/13
                                                Gi1/0/14, Gi1/0/15, Gi1/0/16, Gi1/0/17, Gi1/0/18
                                                Gi1/0/19, Gi1/0/20, Gi1/0/21, Gi1/0/22, Gi1/0/23
                                                Gi1/0/24
10   users                            active    Gi1/0/12
1002 fddi-default                     act/unsup
1003 token-ring-default               act/unsup
1004 fddinet-default                  act/unsup
1005 trnet-default                    act/unsup
~~~

Sample 2: a long port list that wraps many times. This page shows a Catalyst 4500, which is outside the 9300/9200/3850/2960 list, but it is the cleanest official example of wrapping.

- source: https://www.cisco.com/c/en/us/support/docs/lan-switching/vtp/98154-conf-vlan.html
- source_title: Configure VLAN Trunk Protocol (VTP)
- platform: Catalyst 4500 ("This example involves two Catalyst 4500 switches that are connected by a TenGigabitEthernet link"; the page says it "is not restricted to specific software and hardware versions")
- section: "Practical Examples", the first Switch-A "show vlan brief" (before VTP sync)
- verified: a WebFetch of the HTML page matched every port and line (it collapsed the spaces); exact spacing taken from the page's EPUB export (98154-conf-vlan.epub), where the block is plain text inside <code> with real newlines. The page shows "show vlan brief" in bold.

~~~text
Switch-A#show vlan brief

VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Gi1/1, Gi1/2, Gi1/4, Gi1/5
                                                Gi1/6, Gi1/7, Gi1/8, Gi1/9
                                                Gi1/10, Gi1/11, Gi1/12, Gi1/13
                                                Gi1/14, Gi1/15, Gi1/16, Gi1/17
                                                Gi1/18, Gi1/19, Gi1/20, Gi1/21
                                                Gi1/22, Gi1/23, Gi1/24, Gi1/25
                                                Gi1/26, Gi1/27, Gi1/28, Gi1/29
                                                Gi1/30, Gi1/31, Gi1/32, Gi1/33
                                                Gi1/34, Gi1/35, Gi1/36, Gi1/37
                                                Gi1/38, Gi1/39, Gi1/40, Gi1/41
                                                Gi1/42, Gi1/43, Gi1/44, Gi1/45
                                                Gi1/46, Gi1/47, Gi1/48, Te3/2
                                                Te3/3, Te3/4, Te3/5, Te3/6
                                                Te3/7, Te3/8
1002 fddi-default                     act/unsup 
1003 token-ring-default               act/unsup 
1004 fddinet-default                  act/unsup 
1005 trnet-default                    act/unsup 
Switch-A#
~~~

## Notes
- The pages give no column descriptions for "brief". The Catalyst command references describe the option as "Displays one line for each VLAN with the VLAN name, status, and its ports". Status values seen: "active" and "act/unsup" (VLANs 1002-1005).
- Fixed columns, same in both samples: VLAN ID at column 1 (4 wide), Name at column 6 (32 wide), Status at column 39 (9 wide), Ports at column 49. The dashed rule line is 79 characters long ("----" + 32 + 9 + 31 dashes, separated by single spaces).
- Continuation lines: 48 spaces, so the port text starts at column 49, directly under the first port.
- Sample 2 (classic wrap): ports are separated by ", ". A wrapped line has no trailing comma. Each line holds as many ports as fit in 79 characters. The longest line is 78 characters. With 1-digit and 2-digit Gi1/x numbers you get 4 ports per line. VLANs 1002-1005 have one trailing space after "act/unsup". There is a blank line after the command line.
- Sample 1 does NOT follow the 80-column wrap. Its first port line is 100 characters long, and the next lines are 94, 96, 96 and 56. It has 6 ports on the first line and 5 on the next. It also has blank lines after the command and between the header and the dashed rule. Gi1/0/1 and Gi1/0/12 are missing from VLAN 1 (Gi1/0/1 is not listed anywhere, and Gi1/0/12 is in VLAN 10). These look like edits made by the document's author. Use sample 1 for the Catalyst 9000 port names and layout, and sample 2 for how a real wrap works. Do not copy the 100-character lines as typical device behaviour.
- There is no trailing space after "act/unsup" in sample 1, and one in sample 2. Both are exactly as published.
- No "show vlan brief" output was found in the Catalyst 9300 16.5 / 9200 17.10 command references, the Catalyst 9300 17.13 VLAN configuration guide, or the 2960-L / 2960-XR / 3650 command references. Those pages show only plain "show vlan".
