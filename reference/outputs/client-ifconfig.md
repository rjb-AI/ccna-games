---
command: ifconfig
source: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html-single/deployment_guide/index#sec-Using_Channel_Bonding
source_title: Deployment Guide | Red Hat Enterprise Linux | 6 | Red Hat Documentation
platform: Red Hat Enterprise Linux 6 (net-tools ifconfig, old output format)
retrieved: 2026-11-28
verified: raw curl of the published single-page HTML; <pre> block extracted programmatically (exact whitespace)
---

Section 31.8.1 "Using Channel Bonding" (under 31.8 "Specific Kernel Module Capabilities"). `[output truncated]` is in the source.

~~~text
~]# ifconfig
bond0     Link encap:Ethernet HWaddr 00:00:00:00:00:00
          UP BROADCAST RUNNING MASTER MULTICAST  MTU:1500  Metric:1
          RX packets:0 errors:0 dropped:0 overruns:0 frame:0
          TX packets:0 errors:0 dropped:0 overruns:0 carrier:0
          collisions:0 txqueuelen:0
          RX bytes:0 (0.0 b)  TX bytes:0 (0.0 b)
eth0      Link encap:Ethernet  HWaddr 52:54:00:26:9E:F1
          inet addr:192.168.122.251  Bcast:192.168.122.255  Mask:255.255.255.0
          inet6 addr: fe80::5054:ff:fe26:9ef1/64 Scope:Link
          UP BROADCAST RUNNING MULTICAST  MTU:1500  Metric:1
          RX packets:207 errors:0 dropped:0 overruns:0 frame:0
          TX packets:205 errors:0 dropped:0 overruns:0 carrier:0
          collisions:0 txqueuelen:1000
          RX bytes:70374 (68.7 KiB)  TX bytes:25298 (24.7 KiB)
[output truncated]
~~~

## Notes
- This is the OLD net-tools format (`Link encap:Ethernet  HWaddr`, `inet addr:`, `Bcast:`, `Mask:`). Current Linux net-tools (and macOS) print a different layout (`flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500`, `inet 192.0.2.1  netmask ...`, `ether ...`). No official-doc sample of the newer format or of macOS ifconfig was found, so do not mix the two.
- Context on the page: bond0 is a channel-bonding master, hence `MASTER` flag and an all-zero HWaddr; eth0 is a normal NIC. Note the source has one space between `Ethernet` and `HWaddr` on the bond0 line but two on the eth0 line (as published).
