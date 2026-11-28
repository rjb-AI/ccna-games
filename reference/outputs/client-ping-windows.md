---
command: ping
source: https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/connect/cannot-generate-sspi-context-error
source_title: Fix "Cannot generate SSPI context" Error in SQL Server - SQL Server | Microsoft Learn
platform: Windows (version not stated)
retrieved: 2026-11-28
verified: raw curl of the GitHub source (MicrosoftDocs/SupportArticles-docs, main); published page re-fetched and confirmed to contain the same sample
---

Section on checking name resolution with `ping -a <IPAddress>` ("For example:"). Two runs: `ping SQLSERVER1` then `ping -a 123.123.123.123`.

~~~text
C:\>ping SQLSERVER1

Pinging SQLSERVER1 [123.123.123.123] with 32 bytes of data:

Reply from 123.123.123.123: bytes=32 time<10ms TTL=128
Reply from 123.123.123.123: bytes=32 time<10ms TTL=128
Reply from 123.123.123.123: bytes=32 time<10ms TTL=128
Reply from 123.123.123.123: bytes=32 time<10ms TTL=128

Ping statistics for 123.123.123.123:
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),
Approximate round trip times in milli-seconds:
    Minimum = 0ms, Maximum =  0ms, Average =  0ms 
C:\>ping -a 123.123.123.123

Pinging SQLSERVER1.northamerica.corp.mycompany.com [123.123.123.123] with 32 bytes of data:

Reply from 123.123.123.123: bytes=32 time<10ms TTL=128
Reply from 123.123.123.123: bytes=32 time<10ms TTL=128
Reply from 123.123.123.123: bytes=32 time<10ms TTL=128
Reply from 123.123.123.123: bytes=32 time<10ms TTL=128
Ping statistics for 123.123.123.123:
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),
Approximate round trip times in milli-seconds:
    Minimum = 0ms, Maximum =  0ms, Average =  0ms

C:\> 
~~~

## Notes
- Source oddities kept as-is: the second run has no blank line before `Ping statistics`; there is a trailing space after `Average =  0ms` on the first run and after the final `C:\>`; `Maximum =  0ms` has two spaces; `time<10ms` (older Windows rounding).
- No verbatim Windows "Request timed out." or "Destination host unreachable." ping output was found in official Microsoft docs. Meanings, from https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-2000-server/cc940095(v=technet.10) ("Test Network Connection with Ping and PathPing"): "If the message is simply \"Destination Host Unreachable,\" then there is no route from the local system ... If the message is \"Reply From < IP address >: Destination Host Unreachable,\" then the routing problem occurred at a remote router"; "Request Timed Out: This message indicates that no Echo Reply messages were received within the default time". Also lists "TTL Expired in Transit" and "Unknown Host".
- From https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/troubleshoot-tcp-ip-communication-guidance : "Destination host unreachable error means that the ARP requests that are sent by the node aren't getting a response." and "The Request timed out error means that the ARP request got a response, but the ICMP Echo Request ... isn't getting an ICMP echo response."
- The windows-commands ping page (https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping) has an example with odd indentation, lowercase "pinging" and no statistics block; not used.
