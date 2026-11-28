---
command: show port-security / show port-security interface <x>
source: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/security/s1/sec-s1-xe-3se-3850-cr-book/sec-s1-xe-3se-3850-cr-book_chapter_011.html
source_title: Cisco IOS Security Command Reference: Commands S to Z, Cisco IOS XE Release 3SE (Catalyst 3850 Switches)
platform: Catalyst 3850, Cisco IOS XE Release 3SE (book title). The prompt in the example is "Router#" and the interfaces are Fa5/x, so the example was evidently carried over from an older platform.
retrieved: 2026-11-28
verified: two fetches agreed (the second showed a trailing space after the final "Router#" prompt; dropped)
---

Sample 1: the "show port-security" entry, Examples: "This example shows how to display port-security information for a specified interface:"

~~~text
Router# show port-security interface fastethernet 5/1
Port Security: Enabled
Port status: SecureUp
Violation mode: Shutdown
Maximum MAC Addresses: 11
Total MAC Addresses: 11
Configured MAC Addresses: 3
Aging time: 20 mins
Aging type: Inactivity
SecureStatic address aging: Enabled
Security Violation count: 0
Router#
~~~

Sample 2: the same entry: "This example shows the output from the show port-security command when you do not enter any options:" This is the summary table.

~~~text
Router# show port-security
Secure Port      MaxSecureAddr  CurrentAddr  SecurityViolation  Security
Action
                    (Count)        (Count)      (Count)
----------------------------------------------------------------------------
 
     Fa5/1           11            11            0            Shutdown
     Fa5/5           15            5             0            Restrict
     Fa5/11          5             4             0            Protect
----------------------------------------------------------------------------
 
Total Addresses in System: 21
Max Addresses limit in System: 128
Router#
~~~

## Notes
- The page gives no field-description table for these examples.
- In Sample 2, "Security Action" wraps onto two lines, "Action" lands at the left margin, and the "blank" lines after each dashed rule contain a single space. That is how the page has it. On a real switch the header row is usually wider and "Action" sits under "Security".
- The three violation modes appear in Sample 2: Shutdown, Restrict, Protect.
- Sample 1 is missing lines that current Catalyst IOS XE prints, such as "Sticky MAC Addresses" and "Last Source Address:Vlan". Search snippets confirm those fields exist, but no clean cisco.com page with them was verified. Don't add them to this sample without a real source.
- The same entry also has a per-VLAN example ("Default maximum: 10" followed by a "VLAN Maximum Current" table). It was fetched only once and is not included.
