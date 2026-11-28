---
command: ipconfig /all
source: https://learn.microsoft.com/en-us/troubleshoot/windows-server/software-defined-networking/troubleshoot-windows-server-software-defined-networking-stack
source_title: Troubleshoot the Windows Server software defined networking stack - Windows Server | Microsoft Learn
platform: Windows Server (Hyper-V host with SDN; version not stated)
retrieved: 2026-11-28
verified: raw curl of the GitHub source (MicrosoftDocs/SupportArticles-docs, main); published page re-fetched and confirmed to contain the same sample. Sample 2 is from a second page (see its heading line).
---

Sample 1 (static, DHCP Enabled: No): section "Hyper-V Network Virtualization Provider IP addresses" / compartment check, command `ipconfig /allcompartments /all`. The `<snip> ...` lines are in the source.

~~~text
C:\> ipconfig /allcompartments /all

<snip> ...
==============================================================================
Network Information for *Compartment 3*
==============================================================================
   Host Name . . . . . . . . . . . . : SA18n30-2
<snip> ...

Ethernet adapter VLAN11:

   Connection-specific DNS Suffix  . :
   Description . . . . . . . . . . . : Microsoft Hyper-V Network Adapter
   Physical Address. . . . . . . . . : 40-1D-D8-B7-1C-04
   DHCP Enabled. . . . . . . . . . . : No
   Autoconfiguration Enabled . . . . : Yes
   Link-local IPv6 Address . . . . . : fe80::5937:a365:d135:2899%39(Preferred)
   IPv4 Address. . . . . . . . . . . : 10.10.182.66(Preferred)
   Subnet Mask . . . . . . . . . . . : 255.255.255.128
   Default Gateway . . . . . . . . . : 10.10.182.1
   NetBIOS over Tcpip. . . . . . . . : Disabled

Ethernet adapter VLAN11:

   Connection-specific DNS Suffix  . :
   Description . . . . . . . . . . . : Microsoft Hyper-V Network Adapter
   Physical Address. . . . . . . . . : 40-1D-D8-B7-1C-05
   DHCP Enabled. . . . . . . . . . . : No
   Autoconfiguration Enabled . . . . : Yes
   Link-local IPv6 Address . . . . . : fe80::28b3:1ab1:d9d9:19ec%44(Preferred)
   IPv4 Address. . . . . . . . . . . : 10.10.182.67(Preferred)
   Subnet Mask . . . . . . . . . . . : 255.255.255.128
   Default Gateway . . . . . . . . . : 10.10.182.1
   NetBIOS over Tcpip. . . . . . . . : Disabled

*Ethernet adapter vEthernet (PAhostVNic):*
<snip> ...
~~~

Sample 2 (DHCP Enabled: Yes) from https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/windows-vm-imds-connection ("Azure Instance Metadata Service connection issues - Virtual Machines | Microsoft Learn"), step "To view the IP configuration of your VM, run the ipconfig command" (`ipconfig /all`). The `...` lines are in the source; it is an excerpt of one adapter.

~~~text
...
Ethernet adapter Ethernet:

Connection-specific DNS Suffix  . : xic3mnxjiefupcwr1mcs1rjiqa.cx.internal.cloudapp.net
Description . . . . . . . . . . . : Microsoft Hyper-V Network Adapter
Physical Address. . . . . . . . . : 00-0D-3A-E5-1C-C0
DHCP Enabled. . . . . . . . . . . : Yes
Autoconfiguration Enabled . . . . : Yes
Link-local IPv6 Address . . . . . : fe80::3166:ce5a:2bd5:a6d1%3(Preferred)
IPv4 Address. . . . . . . . . . . : 172.16.69.7(Preferred)
Subnet Mask . . . . . . . . . . . : 255.255.255.0
...
~~~

## Notes
- Sample 1: the `*Compartment 3*` and `*Ethernet adapter vEthernet (PAhostVNic):*` asterisks are literal in the source code block (markdown emphasis that did not render inside a code fence). Keep or strip deliberately; they are not real ipconfig output.
- Sample 1 shows two adapters with the same name "VLAN11" (as in the source).
- Neither modern sample shows DHCP Server, DNS Servers or Lease lines. The modern-format DNS Servers lines that do appear on Microsoft Learn are single-line excerpts, e.g. from https://learn.microsoft.com/en-us/troubleshoot/windows-server/licensing-and-activation/activation-error-0x8007232b-dns-name-does-not-exist (step 6, `ipconfig /all`):
  `DNS Servers . . . . . . . . . . . : 10.0.3.5`, with the second server `10.0.3.4` on the next line, indented so it lines up under the first value.
- For a full report with DHCP Server / DNS Servers / Lease Obtained see client-ipconfig-all-legacy.md (older Windows formats).
- Field meanings from the IMDS page: "The MAC address is shown in the `Physical Address` field, and the primary private IP address is shown in the `IPv4 Address` field."
- From https://learn.microsoft.com/en-us/troubleshoot/windows-client/networking/clear-register-addresses-not-remove-dns-records : "if the **DHCP Enabled** field under the network adapter is displayed as **Yes**, the network adapter is using a dynamic IP address. If it's displayed as **No**, the network adapter is using a static IP address."
- Modern format details visible: `(Preferred)` suffix on addresses, `%<zone index>` on link-local IPv6, MAC with hyphens in uppercase.
