---
command: traceroute
source: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/index#routing-traffic-from-a-specific-subnet-to-a-different-default-gateway-by-using-nmcli_configuring-policy-based-routing-to-define-alternative-routes
source_title: Configuring and managing networking | Red Hat Enterprise Linux | 9 | Red Hat Documentation
platform: Red Hat Enterprise Linux 9
retrieved: 2026-11-28
verified: raw curl of the published single-page HTML; <pre> blocks extracted programmatically (exact whitespace)
---

Sample 1: section 29.1 "Routing traffic from a specific subnet to a different default gateway by using nmcli", verification from a host in the internal subnet. The `...` line is in the source.

~~~text
# traceroute redhat.com
traceroute to redhat.com (209.132.183.105), 30 hops max, 60 byte packets
 1  10.0.0.1 (10.0.0.1)     0.337 ms  0.260 ms  0.223 ms
 2  192.0.2.2 (192.0.2.2)   0.884 ms  1.066 ms  1.248 ms
 ...
~~~

Sample 2: same section, verification from a host in the DMZ subnet (different first-hop gateway). The `...` line is in the source.

~~~text
# traceroute redhat.com
traceroute to redhat.com (209.132.183.105), 30 hops max, 60 byte packets
 1  203.0.113.1 (203.0.113.1)    2.179 ms  2.073 ms  1.944 ms
 2  198.51.100.2 (198.51.100.2)  1.868 ms  1.798 ms  1.549 ms
 ...
~~~

## Notes
- DOUBTFUL COMPLETENESS: both samples are truncated in the source after hop 2 (`...`); no complete official Linux traceroute run (with final hop or `* * *`) was found.
- Format shown: header `traceroute to <name> (<ip>), 30 hops max, 60 byte packets`, then `hop  name (ip)  t1 ms  t2 ms  t3 ms`. With no DNS, name and ip are the same, as here.
