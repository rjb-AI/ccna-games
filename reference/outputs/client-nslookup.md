---
command: nslookup
source: https://learn.microsoft.com/en-us/troubleshoot/azure/azure-kubernetes/connectivity/basic-troubleshooting-outbound-connections
source_title: Troubleshoot AKS outbound connections - Azure | Microsoft Learn
platform: Linux (AKS node, bind-utils style nslookup) for sample 1; Windows PowerShell console for sample 2
retrieved: 2026-11-28
verified: raw curl of the GitHub source (MicrosoftDocs/SupportArticles-docs, main); published page re-fetched and confirmed to contain the same sample. Sample 2 is from a second page (see its heading line).
---

Sample 1 (Linux nslookup): step "Test the DNS resolution to the endpoint." The command line has two spaces after `nslookup` in the source.

~~~text
$ nslookup  microsoft.com
Server:         168.63.129.16
Address:        168.63.129.16#53

Non-authoritative answer:
Name:   microsoft.com
Address: 20.112.52.29
Name:   microsoft.com
Address: 20.81.111.85
Name:   microsoft.com
Address: 20.84.181.62
Name:   microsoft.com
Address: 20.103.85.33
Name:   microsoft.com
Address: 20.53.203.50
~~~

Sample 2 (Windows nslookup) from https://learn.microsoft.com/en-us/troubleshoot/azure/hpc/batch/azure-batch-node-unusable-state ("Azure Batch node gets stuck in the Unusable state because of configuration issues - Azure | Microsoft Learn"), step "Test the DNS name resolution by running the following nslookup command". Angle-bracket placeholders and `x.x.x.x` are in the source.

~~~text
PS C:\Users\xxx> nslookup <node-management-endpoint-url>
Server:  UnKnown
Address:  x.x.x.x

Name:     <node-management-endpoint-url>
Address:  <private-ipnode-management-endpoint-private-ip>
Aliases:  <node-management-endpoint-url>
~~~

## Notes
- The two platforms format output differently: Linux prints `Server:` / `Address: <ip>#53` with tab-like spacing and a `Non-authoritative answer:` line; Windows prints `Server:  UnKnown` (two spaces; "UnKnown" when the DNS server has no PTR record), `Address:  x.x.x.x`, then `Name:` / `Address:` / `Aliases:` with padded spacing.
- Sample 2's second Address placeholder `<private-ipnode-management-endpoint-private-ip>` is garbled in the source; treat as a placeholder only.
- 168.63.129.16 is the Azure-provided DNS virtual IP (Azure-specific).
- Another real Windows example (debug mode, `set d2`, Windows 2000) is at https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-2000-server/cc940085(v=technet.10) ; not copied here.
