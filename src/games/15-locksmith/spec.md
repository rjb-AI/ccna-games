# Locksmith

Topics: v2-4.1 (local users, AAA, TACACS+, RADIUS), v2-4.2 (SFTP and SCP), v2-4.5 (IPsec VPNs)

## Modes and levels

| Level        | Mode      | What's generated                                                                              | Pass | Time  |
| ------------ | --------- | --------------------------------------------------------------------------------------------- | ---- | ----- |
| `ssh`        | Learn     | Which commands SSH-only access needs; what must come after hostname and domain (the RSA keys) | 60%  | –     |
| `aaa`        | Learn     | Sort facts into TACACS+ / RADIUS / both; AAA method-list command with local fallback          | 60%  | –     |
| `files`      | Learn     | Which transfers are encrypted; SCP/SFTP over SSH; TFTP has no login                           | 60%  | –     |
| `vpn`        | Learn     | Tunnel vs transport, ESP vs AH, IKE, site-to-site vs remote access                            | 60%  | –     |
| `keys-drill` | Drill     | Mix                                                                                           | 70%  | 200 s |
| `breakfix`   | Break-Fix | SSH logins fail; commands shown; pick the root cause                                          | 60%  | –     |

Password policy and the security-program add-on are dropped for v2.0 (plan section 6).

## Player actions

Tap a choice, label items, or put steps in order.

## Generator rules

- SSH Break-Fix plants one gap; hostname and domain gaps also stop key generation, and the
  question asks for the root cause (the first gap).
- Commands are shown as entered (input syntax), not as show output.

## Correctness source

`core/device/ssh.ts` (`sshGaps`). Facts with sources in `generator.ts`: RFC 8907 (TACACS+),
RFC 2865/2866 (RADIUS), RFC 1350 (TFTP), RFC 959 (FTP), RFC 4301/4302/4303 (IPsec), RFC 7296
(IKEv2), RFC 3947 (NAT-T), Cisco IOS SSH configuration guide.

## Tests

`generator.test.ts`, `core/device/ssh.test.ts`.
