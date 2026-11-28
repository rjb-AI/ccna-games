# Known gaps and doubtful samples

Read before building a template from the top-level `*.md` samples.

## Doubtful (use for structure, not exact detail)

- `cli-prompts-and-errors.md`: in the "configure terminal" example the `^` sits under a correctly
  spelled word (looks like a doc error); use the samples for format, not caret placement.
- `show-ip-route.md` sample 2: column spacing lost on the source page, and it has Cisco doc
  mistakes (AD 0 on a static default, an L route with /24). Prefer the ntc-templates captures.
- `show-ip-ospf-neighbor.md`: old capture (tabs in the header, one-digit hour in Dead Time).
- `show-vrrp-brief.md`: VRRPv3 format only.
- `client-dig.md` sample 2 and `client-ipconfig-all-legacy.md`: spacing or blank lines lost.
- `client-ipconfig-all.md` sample 1: literal `*...*` markdown on two lines is not real output.
- `client-traceroute-linux.md`: both samples are cut short after hop 2 in the source.
- `client-nslookup.md` sample 2: placeholders only.
- `ansible-playbook-run.md` sample 2 (VyOS): older PLAY RECAP without skipped/rescued/ignored.

## Missing

- Plain `ipconfig`; a modern `ipconfig /all` with DHCP Server, DNS Servers and lease lines together.
- Windows ping "Request timed out" / "Destination host unreachable"; Linux ping with 100% loss.
- `ifconfig` in the newer `flags=4163` format; macOS `ifconfig`.
- Ansible `debug` output of `ios_command` stdout_lines; a PLAY RECAP with `failed=1`.
