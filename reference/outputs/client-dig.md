---
command: dig
source: https://learn.microsoft.com/en-us/troubleshoot/azure/azure-kubernetes/connectivity/dns/troubleshoot-localdns
source_title: Troubleshoot LocalDNS problems in AKS - Azure | Microsoft Learn
platform: Linux (dnsutils pod, DiG 9.16.27) for sample 1; Ubuntu 22.04 (DiG 9.18.39) for sample 2
retrieved: 2026-11-28
verified: raw curl of the GitHub source (MicrosoftDocs/SupportArticles-docs, main); published page re-fetched and confirmed to contain the same sample. Sample 2 is from a second page (see its heading line).
---

Sample 1 (NOERROR, two A records): section "Generate traffic from dnsutils pod" > "Test KubeDNS zone traffic". The first line is the command as shown in the source (run via kubectl).

~~~text
kubectl exec dnsutils -- dig bing.com +ignore +noedns +search +noshowsearch +time=10 +tries=6

; <<>> DiG 9.16.27 <<>> bing.com +ignore +noedns +search +noshowsearch +time=10 +tries=6
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 7452
;; flags: qr rd ra; QUERY: 1, ANSWER: 2, AUTHORITY: 0, ADDITIONAL: 0

;; QUESTION SECTION:
;bing.com.                      IN      A

;; ANSWER SECTION:
bing.com.               30      IN      A       150.171.27.10
bing.com.               30      IN      A       150.171.28.10

;; Query time: 3 msec
;; SERVER: 169.254.10.11#53(169.254.10.11)
;; WHEN: Thu Jul 03 16:57:42 UTC 2025
;; MSG SIZE  rcvd: 74
~~~

Sample 2 (NXDOMAIN with AUTHORITY/SOA) from https://learn.microsoft.com/en-us/troubleshoot/azure/front-door/certificate-issues ("Troubleshoot Azure Front Door certificate problems - Azure | Microsoft Learn"), "Troubleshooting" step 1 (`dig contoso.fabrikam.com CNAME`).

~~~text
dig contoso.fabrikam.com CNAME

; <<>> DiG 9.18.39-0ubuntu0.22.04.2-Ubuntu <<>> contoso.fabrikam.com CNAME
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: 55070
;; flags: qr rd ra; QUERY: 1, ANSWER: 0, AUTHORITY: 1, ADDITIONAL: 1
;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096

;; QUESTION SECTION:
;contoso.fabrikam.com. IN CNAME

;; AUTHORITY SECTION:
fabrikam.com. 300 IN SOA ns1-03.azure-dns.com. azuredns-hostmaster.microsoft.com. 1 3600 300 2419200 300

;; Query time: 123 msec
;; SERVER: 0.0.0.0#53(0.0.0.0) (UDP)
;; WHEN: Fri Mar 06 16:18:53 CST 2026
;; MSG SIZE rcvd: 132
~~~

## Notes
- Sample 1 shows the full structure: banner `; <<>> DiG ... <<>>`, `global options`, `Got answer`, `->>HEADER<<-` (opcode/status/id), `flags:` with counts, QUESTION SECTION (leading `;`), ANSWER SECTION (name, TTL, class, type, data), then footer stats (Query time, SERVER ip#port, WHEN, MSG SIZE rcvd). Because of `+noedns` there is no OPT PSEUDOSECTION.
- Sample 2 has had its column whitespace collapsed in the source (e.g. `;contoso.fabrikam.com. IN CNAME`, `;; MSG SIZE rcvd: 132` with one space; real dig pads with tabs/spaces and prints `MSG SIZE  rcvd:`). Use it for structure (NXDOMAIN, ANSWER: 0, AUTHORITY: 1, SOA in AUTHORITY SECTION), not for exact spacing. Also its blank line before `;; QUESTION SECTION:` sits after the OPT lines, as published. `SERVER: 0.0.0.0#53(0.0.0.0)` is as published.
- Also available (not copied): a SERVFAIL example and an MX query with RRSIG at Ubuntu Server docs, https://ubuntu.com/server/docs/how-to/networking/dnssec-troubleshooting/ and https://ubuntu.com/server/docs/explanation/dnssec/dnssec/ (GitHub source canonical/ubuntu-server-documentation).
