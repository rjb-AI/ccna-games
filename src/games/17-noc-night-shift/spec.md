# NOC Night Shift

Topics: v2-5.1 (agentic AI), v2-5.2 (choosing prompts), v2-5.3 (management approaches),
v2-5.4 (SNMP), v2-5.6 (syslog)

| Level         | Mode      | What's generated                                                          | Pass | Time  |
| ------------- | --------- | ------------------------------------------------------------------------- | ---- | ----- |
| `severity`    | Learn     | Severity number ↔ name; order severities                                  | 60%  | –     |
| `trap`        | Learn     | Which levels "logging trap X" sends; triage by a stated rule              | 60%  | –     |
| `snmp`        | Learn     | Get/Set/Trap/Inform; v3 security; ports; MIB and OID                      | 60%  | –     |
| `mgmt`        | Learn     | Scenario → device, cloud, controller, automation or IaC                   | 60%  | –     |
| `ai-desk`     | Learn     | Human approval, least privilege, agents vs chatbots; pick the best prompt | 60%  | –     |
| `night-drill` | Drill     | Mix                                                                       | 70%  | 200 s |
| `breakfix`    | Break-Fix | Logging config lines; why don't the messages arrive?                      | 60%  | –     |

Reading real syslog lines, show output and packet captures waits for real samples
(CLAUDE.md rule 3).

Correctness source: `core/ops` (`SEVERITIES` from RFC 5424, `levelsIncluded`, `syslogFaults`,
`SNMP_OPS`, `SNMP_FACTS`, `MGMT`). AI guidance cited in `generator.ts`.

Tests: `generator.test.ts`, `core/ops/ops.test.ts`.
