---
command: ansible-playbook
source: https://docs.ansible.com/projects/ansible/latest/network/getting_started/network_roles.html
source_title: Use Ansible network roles — Ansible Community Documentation
platform: Cisco IOS XE router via cisco.ios.ios_config (sample 1); VyOS via vyos.vyos modules (sample 2)
retrieved: 2026-11-28
verified: raw from the GitHub source (ansible/ansible-documentation, devel) with the 3-space RST code-block indent removed; published pages re-fetched and confirmed to contain the samples
---

Sample 1 (Cisco, changed): section "Understanding roles", output of the playbook with two cisco.ios.ios_config tasks (configure hostname, configure DNS), run with `-l rtr1`.

~~~text
[user@ansible ~]$ ansible-playbook playbook.yml -l rtr1

PLAY [configure cisco routers] *************************************************

TASK [configure hostname] ******************************************************
changed: [rtr1]

TASK [configure DNS] ***********************************************************
changed: [rtr1]

PLAY RECAP *********************************************************************
rtr1                       : ok=2    changed=2    unreachable=0    failed=0
~~~

Sample 2 (ok + changed + debug msg, five tasks) from https://docs.ansible.com/projects/ansible/latest/network/getting_started/first_playbook.html ("Run Your First Command and Playbook — Ansible Community Documentation"), section "Create and run your first network Ansible Playbook", step 3 (first_playbook_ext.yml).

~~~text
$ ansible-playbook -i vyos.example.net, -u ansible -k -e ansible_network_os=vyos.vyos.vyos first_playbook_ext.yml

PLAY [Network Getting Started First Playbook Extended]
************************************************************************************************************************************

TASK [Get config for VyOS devices]
**********************************************************************************************************************************
ok: [vyos.example.net]

TASK [Display the config]
*************************************************************************************************************************************
ok: [vyos.example.net] => {
    "msg": "The hostname is vyos and the OS is VyOS 1.1.8"
}

TASK [Update the hostname]
*************************************************************************************************************************************
changed: [vyos.example.net]

TASK [Get changed config for VyOS devices]
*************************************************************************************************************************************
ok: [vyos.example.net]

TASK [Display the changed config]
*************************************************************************************************************************************
ok: [vyos.example.net] => {
    "msg": "The new hostname is vyos-changed and the OS is VyOS 1.1.8"
}

PLAY RECAP
************************************************************************************************************************************
vyos.example.net           : ok=5    changed=1    unreachable=0    failed=0
~~~

## Notes
- Sample 1 playbook on the same page (verbatim YAML in source): hosts `routers`, `connection: ansible.netcommon.network_cli`, tasks `cisco.ios.ios_config: lines: hostname {{ inventory_hostname }}` and `cisco.ios.ios_config: lines: ip name-server {{dns}}` with `dns: "8.8.8.8 8.8.4.4"`.
- The same page shows a second run through a role with idempotent results: `TASK [system_demo : configure hostname]` ... `ok: [rtr1]` and recap `rtr1             : ok=2    changed=0    unreachable=0    failed=0` (note the narrower padding in that source block).
- Sample 2: in the source the `****` separator is on its own line under each PLAY/TASK header and the star-line lengths vary; real ansible-playbook prints the stars on the same line padded to terminal width (as sample 1 shows). Older-format recap: no `skipped=`, `rescued=`, `ignored=` columns (current Ansible prints those too).
- MISSING: no official example of `debug: var: <result>.stdout_lines` output for cisco.ios.ios_command was found (docs show the YAML only, e.g. network_best_practices_2.5).
- Failure output: see ansible-playbook-failed.md.
