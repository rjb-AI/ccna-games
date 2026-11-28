---
command: ipconfig /all
source: https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-2000-server/cc940124(v=technet.10)
source_title: Ipconfig | Microsoft Learn (Windows 2000 Server Resource Kit, TCP/IP troubleshooting)
platform: Windows 2000 (sample 1); Windows Embedded Compact 2013 (sample 2)
retrieved: 2026-11-28
verified: raw curl of the published HTML, text extracted programmatically. Sample 1: each output line is its own <p><code> element, so leading spaces are as published but blank lines between sections are NOT recoverable (none shown). One &nbsp; in "Windows 2000" converted to a normal space. Sample 2 is a <pre> block, exact.
---

Sample 1: body text "A sample report is shown here:".

~~~text
C:>\ipconfig /all
Windows 2000 IP Configuration
        Host Name . . . . . . . . . . . . : TESTPC1
        Primary DNS Suffix  . . . . . . . : reskit.com
        Node Type . . . . . . . . . . . . : Hybrid
        IP Routing Enabled. . . . . . . . : No
        WINS Proxy Enabled. . . . . . . . : No
DNS Suffix Search List. . . . . . : ntcorpdc1.reskit.com
        dns.reskit.com
        reskit.com
Ethernet adapter Local Area Connection:
        Connection-specific DNS Suffix  . : dns.reskit.com
        Description . . . . . . . . . . . : Acme XL 10/100Mb Ethernet NIC
        Physical Address. . . . . . . . . : 00-CC-44-79-C3-AA
        DHCP Enabled. . . . . . . . . . . : Yes
        IP Address. . . . . . . . . . . . : 172.16.245.111
        Subnet Mask . . . . . . . . . . . : 255.255.248.0
        Default Gateway . . . . . . . . . : 172.16.240.1
        DHCP Server . . . . . . . . . . . : 172.16.248.8
        DNS Servers . . . . . . . . . . . : 172.16.55.85
                                            172.16.55.134
                                            172.16.55.54
        Primary WINS Server . . . . . . . : 172.16.248.10
        Secondary WINS Server . . . . . . : 172.16.248.9
        Lease Obtained. . . . . . . . . . : Friday, May 05, 1999 2:21:40 PM
        Lease Expires . . . . . . . . . . : Monday, May 07, 1999 2:21:40 PM
~~~

Sample 2 from https://learn.microsoft.com/en-us/previous-versions/windows/embedded/jj919366(v=winembedded.80) ("IPConfig (Compact 2013) | Microsoft Learn"), example under the syntax section.

~~~text
\> ipconfig /all
Windows IP configuration
    Host Name . . . . . . . . . . . . : Compact
    Primary Dns suffix. . . . . . . . : mydomain.com
    Node Type. .  . . . . . . . . . . : Unknown
    IP Routing Enabled. . . . . . . . : NO
    Proxy Enabled . . . . . . . . . . : NO

Ethernet adapter Local Area Connection:
    Adapter Name. . . . . . . . . . . : PCI\RTL81391
    Description . . . . . . . . . . . : PCI\RTL81391
    Adapter Index . . . . . . . . . . : 2
    Physical Address. . . . . . . . . : 00-50-BA-5D-54-9A
    DHCP Enabled. . . . . . . . . . . : YES
    Autoconfiguration Enabled . . . . : YES
    IPv6 Managed Address. . . . . . . : enabled
    IPv6 Other Stateful . . . . . . . : disabled
    Link-local IPv6 Address . . . . . : fe80::e561:95b2:dc97:9dd6%2 (Preferred)
    IPv4 Address [DHCP] . . . . . . . : 10.125.148.141 (Preferred)
    Subnet Mask . . . . . . . . . . . : 255.255.254.0
    Lease obtained on . . . . . . . . : Monday, October 08, 2012 1:40:38 PM
    Lease expires on. . . . . . . . . : Tuesday, October 16, 2012 1:40:38 PM
    Default Gateway . . . . . . . . . : 10.125.148.1
    DHCP Server . . . . . . . . . . . : 157.54.14.155
    DHCPv6 IAID . . . . . . . . . . . : 33575098
    DHCPv6 Client DUID. . . . . . . . : 00-01-00-01-18-04-F2-9D-00-50-BA-5D-54-9A
    WINS Server . . . . . . . . . . . : 157.54.14.163
                                        157.59.200.249
    DNS Server. . . . . . . . . . . . : 157.54.14.178
                                        157.59.200.240
                                        157.54.10.29
    NetBIOS over TCP. . . . . . . . . : Disabled

Loopback Adapter [Loopback Pseudo-Interface 1]:
    Adapter Name. . . . . . . . . . . : Loopback Pseudo-Interface 1
    Description . . . . . . . . . . . : Software Loopback Interface 1
    Adapter Index . . . . . . . . . . : 1
    DHCP Enabled. . . . . . . . . . . : NO
    Autoconfiguration Enabled . . . . : YES
    IPv6 Managed Address. . . . . . . : disabled
    IPv6 Other Stateful . . . . . . . : disabled
    IPv6 Address. . . . . . . . . . . : ::1
    IPv4 Address. . . . . . . . . . . : 127.0.0.1 (Preferred)
    Subnet Mask . . . . . . . . . . . : 255.0.0.0
    Default Gateway . . . . . . . . . : 0.0.0.0
    NetBIOS over TCP. . . . . . . . . : Disabled
~~~

## Notes
- LEGACY FORMATS. Do not present these as current desktop Windows output. Differences from modern Windows: Windows 2000 uses `IP Address` (modern: `IPv4 Address ... (Preferred)`), `Primary WINS Server`/`Secondary WINS Server`, and no IPv6. Compact 2013 uses non-desktop labels (`DNS Server` singular, `IPv4 Address [DHCP]`, `Adapter Name`, `Adapter Index`, `Lease obtained on`, `NetBIOS over TCP`).
- Sample 1 oddities in the source: prompt is written `C:>\ipconfig /all` (sic), the `DNS Suffix Search List` line and its two continuation lines are not indented like the others, and lease dates say 1999 for a "Friday, May 05" (as published).
- Sample 1 does contain every field the CCNA game wants: Description, Physical Address, DHCP Enabled, IP Address, Subnet Mask, Default Gateway, DHCP Server, DNS Servers (multi-line), Lease Obtained/Expires.
- From the same page: "When used with the /all switch, it displays a detailed configuration report for all interfaces, including any configured WAN miniports". Other switches listed: /flushdns, /registerdns, /displaydns, /release, /renew, /showclassid, /setclassid.
