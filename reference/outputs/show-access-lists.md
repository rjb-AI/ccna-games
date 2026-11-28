---
command: show access-lists
source: https://www.cisco.com/c/en/us/support/docs/security/ios-firewall/23602-confaccesslists.html
source_title: Configure IP Access Lists - Cisco
platform: not stated (Cisco IOS)
retrieved: 2026-11-28
verified: two fetches agreed on every line, including the three spaces in "25 deny   any" in the second output and the single space in "25 deny any" in the first
---

Sample 1: "Edit ACLs" section. A standard ACL before and after inserting sequence 18 (no match counts on this page). The page says: "This example shows the different entries, for example, how to permit an IP address (192.168.100.0) or the networks (10.10.10.0)."

~~~text
internetrouter#show access-lists
Standard IP access list 19
    10 permit 192.168.100.0
    15 permit 10.10.10.0, wildcard bits 0.0.0.255
    19 permit 10.101.110.0, wildcard bits 0.0.0.255
    25 deny any

internetrouter#show access-lists
Standard IP access list 19
    10 permit 192.168.100.0
    18 permit 172.22.1.1
    15 permit 10.10.10.0, wildcard bits 0.0.0.255
    19 permit 10.101.110.0, wildcard bits 0.0.0.255
    25 deny   any
~~~

Sample 2: match counts. This uses the related command "show ip access-list" (IP ACLs only), because no checked "show access-lists" page showed match counts.

- source: https://www.cisco.com/en/US/docs/ios-xml/ios/sec_data_acl/configuration/15-1mt/Displaying_and_Clearing_IP_Access_List_Data_Using_ACL_Manageability.html
- source_title: Displaying and Clearing IP Access List Data Using ACL Manageability
- platform: Cisco IOS 12.4(6)T and later (feature history on the page)
- section: "Example Displaying Global IP ACL Statistics" ("The following example displays global statistics for ACL 150:")
- verified: two fetches agreed on every line

~~~text
Router# show ip access-list 150
 
Extended IP access list 150 
   10 permit ip host 10.1.1.1 any (3 matches)
   30 permit ip host 10.2.2.2 any (27 matches)
~~~

## Notes
- Match counts are printed as " (N matches)" at the end of an entry. Entries that have never matched show no counter. For example, the same ACL Manageability page has "10 permit ip host 10.1.1.1 any " with no count in its per-interface example.
- Entries are indented with 4 spaces in sample 1 and 3 spaces in sample 2. The difference is in the published pages.
- Sample 2 has a line with one space after the prompt line, and a trailing space after "Extended IP access list 150". Both fetches showed these.
- In sample 1, standard ACL host entries print without a wildcard ("10 permit 192.168.100.0"). Network entries print as "<net>, wildcard bits <wc>". The second output lists sequence 18 right after 10, ahead of 15. The page explains: "This entry is added in the top of the list in order to give priority to the specific IP address rather than network." The page's text says "Add the entry in access list 2" but the commands and output use list 19. That mistake is in the source.
- The same 23602 page also has extended ACL "show access-list" outputs (for example "Extended IP access list 101" with "10 permit tcp any any"). Its outputs use both "show access-list" and "show access-lists".
