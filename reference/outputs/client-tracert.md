---
command: tracert
source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/tracert
source_title: tracert | Microsoft Learn
platform: Windows (Windows Server docs; version not stated, page dated 09/27/2023)
retrieved: 2026-11-28
verified: raw curl of the GitHub source (MicrosoftDocs/windowsserverdocs, main); published page re-fetched and confirmed to contain the same sample
---

Section "Examples", "Here's an example output:" for `tracert www.microsoft.com`.

~~~text
Tracing route to e13678.dscb.akamaiedge.net [23.216.93.114]
over a maximum of 30 hops:

 1     1 ms     1 ms    <1 ms  <devicename>.mshome.net [172.26.96.1]
 2    11 ms    13 ms     6 ms  192.168.191.20
 3    20 ms    11 ms    18 ms  192.168.1.1
 4    44 ms    41 ms    35 ms  10.228.0.1
 5    32 ms    31 ms    46 ms  10.41.0.49
 6    36 ms    39 ms    30 ms  10.41.0.221
 7    35 ms    36 ms    39 ms  10.41.0.225
 8    54 ms    45 ms    50 ms  204.111.0.147
 9    50 ms    52 ms    47 ms  ae-39.a02.atlnga05.us.bb.gin.ntt.net [128.241.219.117]
10    53 ms    51 ms    61 ms  ae-5.r24.atlnga05.us.bb.gin.ntt.net [129.250.4.192]
11    64 ms    45 ms    44 ms  ae-0.a03.atlnga05.us.bb.gin.ntt.net [129.250.2.20]
12    49 ms    67 ms    46 ms  ae-0.akamai-onnet.atlnga05.us.bb.gin.ntt.net [128.241.1.122]
13    67 ms   287 ms     *     ae20.r03.border101.atl02.fab.netarch.akamai.com [23.203.144.21]
14     *        *        *     Request timed out.
15     *        *        *     Request timed out.
16     *        *        *     Request timed out.
17   204 ms    58 ms    51 ms  a23-216-93-114.deploy.static.akamaitechnologies.com [23.216.93.114]

Trace complete.
~~~

## Notes
- `<devicename>` on hop 1 is a placeholder in the source.
- Hops 14-16 show the timeout form: `*        *        *     Request timed out.`; hop 13 shows a partial `*`.
- From the same page: "The beginning column displays the hop number starting from 1 and incrementing with each hop along the route from your device to the destination. Each hop represents an intermediate device, such as a router, that the packet passes through".
- Related real sample: pathping output at https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/pathping ("Example of the pathping command output"); not copied here.
