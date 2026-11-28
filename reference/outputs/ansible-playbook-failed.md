---
command: ansible-playbook (failed task)
source: https://docs.ansible.com/projects/ansible/latest/network/user_guide/network_debug_troubleshooting.html
source_title: Network Debug and Troubleshooting Guide — Ansible Community Documentation
platform: Cisco IOS (ios-csr1000v / ios01) network_cli
retrieved: 2026-11-28
verified: raw from the GitHub source (ansible/ansible-documentation, devel) with the RST code-block indent removed; published page re-fetched and confirmed to contain the samples
---

Sample 1: section 'Category "Unable to open shell"' (second example, ios_system task).

~~~text
TASK [ios_system : configure name_servers] *************************************************************
task path:
fatal: [ios-csr1000v]: FAILED! => {
    "changed": false,
    "failed": true,
    "msg": "unable to open shell",
}
~~~

Sample 2: section on ansible_terminal_stderr_re, "Playbook run output:" for a cisco.ios.ios_command `show logging` task.

~~~text
TASK [first fetch logs] ********************************************************
fatal: [ios01]: FAILED! => {
    "changed": false,
    "msg": "RF Name:\r\n\r\n <--nsip-->
           \"IPSEC-3-REPLAY_ERROR: Test log\"\r\n*Aug  1 08:36:18.483: %SYS-7-USERLOG_DEBUG:
            Message from tty578(user id: ansible): test\r\nan-ios-02#"}
~~~

## Notes
- Format: `fatal: [<host>]: FAILED! => {json}`. Sample 1 has a trailing comma after the last JSON key and an empty `task path:` (as published). Sample 2's msg is wrapped across lines in the source (real output would be one line).
- From the page: "The `unable to open shell` message means that the `ansible-connection` daemon has not been able to successfully talk to the remote network device. This generally means that there is an authentication issue."
- A one-line form from the same section: `TASK [prepare_eos_tests : enable cli on remote device] ****...` then `fatal: [veos01]: FAILED! => {"changed": false, "failed": true, "msg": "unable to open shell"}` (Arista EOS).
- No official sample showing a PLAY RECAP with failed=1 was found.
