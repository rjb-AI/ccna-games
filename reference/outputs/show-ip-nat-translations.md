---
command: show ip nat translations
source: https://www.cisco.com/c/en/us/support/docs/switches/catalyst-9300-series-switches/217419-configure-and-verify-nat-on-catalyst-900.html
source_title: Configure and Verify NAT on Catalyst 9000 Switches - Cisco
platform: Catalyst 9000, Cisco IOS XE 16.12.4 (as stated on the page)
retrieved: 2026-11-28
verified: two fetches agreed on every data row. The second fetch left out the prompt line on both blocks, and the first fetch included it. It also said the column spacing on the page is kept (runs of spaces).
---

Sample 1: "Configure" section, Static NAT. The first "show ip nat translations" output on the page, showing a dynamic ICMP entry and the static entry ("---" protocol).

~~~text
NAT-Device#show ip nat translations
Pro Inside global      Inside local      Outside local      Outside global
icmp 172.16.10.10:4    192.168.1.100:4   10.20.30.40:4      10.20.30.40:4
---  172.16.10.10      192.168.1.100     ---                ---
~~~

Sample 2: "Configure" section, Dynamic NAT Overload (PAT). Many inside sessions share one inside global address, with different ports.

~~~text
NAT-Device#show ip nat translations
Pro Inside global      Inside local      Outside local      Outside global
icmp 10.10.10.1:1024   192.168.1.100:1   10.20.30.40:1        10.20.30.40:1024
icmp 10.10.10.1:1025   192.168.1.100:2   10.20.30.40:2        10.20.30.40:1025
icmp 10.10.10.1:1026   192.168.1.100:3   10.20.30.40:3        10.20.30.40:1026
icmp 10.10.10.1:1027   192.168.1.100:4   10.20.30.40:4        10.20.30.40:1027
icmp 10.10.10.1:1028   192.168.1.100:5   10.20.30.40:5        10.20.30.40:1028
icmp 10.10.10.1:1029   192.168.1.100:6   10.20.30.40:6        10.20.30.40:1029
icmp 10.10.10.1:1030   192.168.1.100:7   10.20.30.40:7        10.20.30.40:1030
icmp 10.10.10.1:1031   192.168.1.100:8   10.20.30.40:8        10.20.30.40:1031
~~~

## Notes
Field descriptions. The tech note has no field table, so these are quoted from "Table 37: show ip nat translations Field Descriptions" in the Cisco IOS IP Addressing Services Command Reference (https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr/command/ipaddr-cr-book.pdf, text taken from the PDF with pdftotext):
- Pro: "Protocol of the port identifying the address."
- Inside global: "The legitimate IP address that represents one or more inside local IP addresses to the outside world."
- Inside local: "The IP address assigned to a host on the inside network; probably not a legitimate address assigned by the Network Interface Card (NIC) or service provider."
- Outside local: "IP address of an outside host as it appears to the inside network; probably not a legitimate address assigned by the NIC or service provider."
- Outside global: "The IP address assigned to a host on the outside network by its owner."

Odd things about these samples:
- The static entry uses "---" in the Pro column and in both outside columns.
- For ICMP, the ":n" after each address is the ICMP identifier, not a TCP/UDP port.
- In sample 2 the Outside global port follows the translated inside port (1024 onward), while Outside local keeps the original identifier (1, 2, 3...).
- The same page also has TCP examples (Dynamic NAT and PAT verification sections) and a "verbose" form. They were seen in only one fetch, so they are not copied here.
- The command reference PDF has its own examples (inside 10.69.233.x / 192.168.1.x, udp/tcp with overload, and "Total number of translations: 6"). They were seen but not double-checked, so they are not included.
