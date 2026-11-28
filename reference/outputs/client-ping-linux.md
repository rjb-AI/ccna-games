---
command: ping
source: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html-single/deployment_guide/index#sec-Configuring_a_VLAN_over_a_Bond
source_title: Deployment Guide | Red Hat Enterprise Linux | 6 | Red Hat Documentation
platform: Red Hat Enterprise Linux 6 (iputils ping) for sample 1; Ubuntu Server for sample 2
retrieved: 2026-11-28
verified: Sample 1: raw curl of the published single-page HTML, <pre> block extracted programmatically. Sample 2: raw curl of the GitHub source (canonical/ubuntu-server-documentation, main); published page confirmed to contain it.
---

Sample 1 (success): section 11.2.5 "Configuring a VLAN over a Bond", checking connectivity to the second server.

~~~text
~]$ ping -c4 192.168.100.100
PING 192.168.100.100 (192.168.100.100) 56(84) bytes of data.
64 bytes from 192.168.100.100: icmp_seq=1 ttl=64 time=1.35 ms
64 bytes from 192.168.100.100: icmp_seq=2 ttl=64 time=0.214 ms
64 bytes from 192.168.100.100: icmp_seq=3 ttl=64 time=0.383 ms
64 bytes from 192.168.100.100: icmp_seq=4 ttl=64 time=0.396 ms

--- 192.168.100.100 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3002ms
rtt min/avg/max/mdev = 0.214/0.586/1.353/0.448 ms
~~~

Sample 2 (failure, Destination Host Unreachable) from https://ubuntu.com/server/docs/how-to/wireguard-vpn/troubleshooting/ ("Troubleshooting WireGuard VPN - Ubuntu Server documentation"), section "Required key not available". First line is the command.

~~~text
ping 10.10.11.1

PING 10.10.11.1 (10.10.11.1) 56(84) bytes of data.
From 10.10.11.2 icmp_seq=1 Destination Host Unreachable
ping: sendmsg: Required key not available
~~~

## Notes
- Sample 1 is a complete run with statistics: `--- <host> ping statistics ---`, `N packets transmitted, N received, X% packet loss, time Nms`, `rtt min/avg/max/mdev = ...`.
- Sample 2 is WireGuard-specific: the `ping: sendmsg: Required key not available` line is caused by the VPN interface (no AllowedIPs match), not generic. The `From <ip> icmp_seq=1 Destination Host Unreachable` line is the generic Linux form (reported by the local host/router, not the target). The same page's "Destination address required" section shows the same pattern with `ping: sendmsg: Destination address required`.
- Another Linux success sample (with `^C`) is at https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/troubleshoot-performance-bottlenecks-linux (section on network latency).
- No official Linux "100% packet loss" timeout sample was found.
