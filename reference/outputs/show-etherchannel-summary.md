---
command: show etherchannel summary
source: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst2960x/software/15_2_6_e/command_reference/b_1526_2960x_cr/layer_2_commands.html
source_title: Consolidated Platform Command Reference, Cisco IOS Release 15.2(6)E (Catalyst 2960-X Switches) - Layer 2 Commands
platform: Catalyst 2960-X, Cisco IOS Release 15.2(6)E
retrieved: 2026-11-28
verified: three fetches agreed on both blocks (see the Sample 1 spacing note)
---

Sample 1: the "show etherchannel" command entry, Examples section: "This is an example of output from the show etherchannel channel-group-number summary command:"

~~~text
Device> show etherchannel 1 summary
Flags: D - down P - in port-channel
       I - stand-alone s - suspended
       H - Hot-standby (LACP only)
       R - Layer3 S - Layer2
       u - unsuitable for bundling
       U - in use f - failed to allocate aggregator
       d - default port

Number of channel-groups in use: 1
Number of aggregators: 1

Group  Port-channel  Protocol    Ports
------+-------------+-----------+----------------------------------------
 1     Po1(SU)       LACP        Gi1/0/1(P) Gi1/0/2(P)
~~~

Sample 2: the same Examples section: "This is an example of output from the show etherchannel auto command:" It uses the same summary layout, but with the newer, longer flag legend and the wider spacing a real switch prints.

~~~text
device# show etherchannel auto
Flags:  D - down        P - bundled in port-channel
        I - stand-alone s - suspended
        H - Hot-standby (LACP only)
        R - Layer3      S - Layer2
        U - in use      f - failed to allocate aggregator
        M - not in use, minimum links not met
        u - unsuitable for bundling
        w - waiting to be aggregated
        d - default port
        A - formed by Auto LAG

Number of channel-groups in use: 1
Number of aggregators:           1

Group  Port-channel  Protocol    Ports
------+-------------+-----------+-----------------------------------------------
1      Po1(SUA)        LACP      Gi1/0/45(P) Gi2/0/21(P) Gi3/0/21(P)
~~~

## Notes
- Spacing in Sample 1: in all three fetches the Flags legend has single spaces between pairs ("D - down P - in port-channel", "Number of aggregators: 1"). This looks like the Cisco page itself lost the spacing, not a fetch problem, because Sample 2 on the same page kept its wide spacing every time. If the app needs the column-aligned legend, use the Sample 2 layout.
- Flag meanings are as listed in the legend. Po1(SU) = Layer2 + in use. Member (P) = bundled in port-channel. In Sample 2, "A" = formed by Auto LAG.
- The Troubleshoot EtherChannels on Catalyst 9000 Switches tech note (https://www.cisco.com/c/en/us/support/docs/switches/catalyst-9300-series-switches/220367-troubleshoot-etherchannels-on-catalyst-9.html) only shows a partial summary, with the legend marked "<output omitted>":
  "1      Po1(SU)         LACP        Gi1/0/1(P)      Gi1/0/2(P)" with Gi1/0/3(P) and Gi1/0/4(P) on a second, indented line. So on Catalyst 9000 a long member list wraps onto a continuation line under the Ports column.
