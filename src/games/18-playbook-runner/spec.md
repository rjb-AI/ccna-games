# Playbook Runner

Topics: v2-5.5 (Ansible)

| Level          | Mode      | What's generated                                                                            | Pass | Time  |
| -------------- | --------- | ------------------------------------------------------------------------------------------- | ---- | ----- |
| `modules`      | Learn     | ios_command, ios_config, ios_facts, debug; inventory groups and ansible_network_os          | 60%  | –     |
| `fill`         | Learn     | Fill the blank: register, commands, parents; idempotence of ios_config                      | 60%  | –     |
| `yaml`         | Break-Fix | A playbook that may have a tab or a mis-indented line: does it load, and which line breaks? | 60%  | –     |
| `runner-drill` | Drill     | Mix                                                                                         | 70%  | 200 s |

Validity comes from a real YAML parser (`core/automation` `checkYaml`, using the `yaml`
package); a broken variant is used only if the parser blames the changed line. A fake Ansible run
with Ansible-style output waits for a real output sample.

## Code tiles level (mechanics step 6)

- `fill-tiles` (Learn): fill the playbook's blanks (module, `commands`, `register`, debug module)
  from chips with near-miss distractors (`ios_config`, `lines`, `vars`).
