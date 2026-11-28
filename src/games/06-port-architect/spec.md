# Port Architect

Topics: v2-2.1 (switch links, trunks, EtherChannel, SVIs), v2-2.2 (edge ports per device type),
v2-2.2.b (AP ports); Break-Fix also v2-2.4.

## Modes and levels

| Level          | Mode      | What's generated                                                                          | Pass | Time  |
| -------------- | --------- | ----------------------------------------------------------------------------------------- | ---- | ----- |
| `access`       | Learn     | Create and name a VLAN; access ports for end devices (some as edge ports)                 | 60%  | –     |
| `phone`        | Learn     | IP phone with a PC behind it (data + voice VLAN, PoE), plus an access port                | 60%  | –     |
| `trunks`       | Learn     | Trunk to a core switch (native VLAN, allowed list) or to a virtualised host               | 60%  | –     |
| `etherchannel` | Learn     | Two uplinks bundled with LACP or PAgP to match the far end's mode, trunking on the bundle | 60%  | –     |
| `svi`          | Learn     | Multilayer switch: `ip routing` and gateways (SVIs) for two VLANs                         | 60%  | –     |
| `ap-ports`     | Learn     | Ports for autonomous, lightweight (local mode) and FlexConnect APs                        | 60%  | –     |
| `drill`        | Drill     | Two tasks from access, phone, trunk, VM host; 4 rounds                                    | 70%  | 600 s |
| `breakfix`     | Break-Fix | A configured switch with one planted fault and a user's symptom                           | 60%  | –     |

## Player actions

Type in the mini command line, or tap the next-word chips. Tab completes, ↑/↓ recall commands,
? lists what this level accepts next. "Check work order" submits; "Start over" resets the switch.

## Generator rules

- A Catalyst-style switch: Gi1/0/1-24 (PoE) and Te1/1/1-4 uplinks. Four existing VLANs with names.
- What is plugged into each port (peers) is shown in a table; the far end's trunk or channel
  settings are given where they matter.
- VLAN ids never clash: one helper picks free ids for new VLANs and voice VLANs. Channel groups are
  distinct.
- Break-Fix: the generator configures the switch with the model answer, then plants one fault
  from core/faults/ports.ts and shows only the symptom.

## Correctness source

`core/device/checks.ts` `evaluate` on the device state after replaying the typed lines
(`core/cli/session.ts` `replay`). Model answers: `solution()`. EtherChannel forming:
`core/sim/l2/etherchannel.ts`. Interface up/down: `core/device/status.ts`.

## Faults used

`port.wrong-access-vlan`, `port.shutdown`, `port.poe-off`, `port.no-voice-vlan`,
`trunk.native-mismatch`, `trunk.vlan-not-allowed`, `channel.both-passive`,
`channel.member-mismatch`, `svi.shutdown`, `svi.no-ip-routing`.

## Allowed commands

Every level: enable/disable, configure terminal, exit, end, do, hostname, vlan / name, interface,
interface range, description, shutdown, show vlan brief, show ip interface brief. Plus, by task:
access (switchport mode access, access vlan, portfast, bpduguard), phone (voice vlan, power inline),
trunks (mode trunk/dynamic, native vlan, allowed vlan and add/remove/all/none/except, show
interfaces trunk), EtherChannel (channel-group active/passive/desirable/auto, show etherchannel
summary), SVIs (ip routing, ip address, no switchport). `channel-group … mode on` has its own id
and is not used yet (no real sample of an "on" row in show etherchannel summary).

## Explanations

After a check, every unmet requirement is listed in plain language; the hint shows the first one.

## Tests

`generator.test.ts`: deterministic; the start state fails; the model answer types with no IOS
errors and passes; Break-Fix covers at least 5 different faults. `src/app/registry.test.ts`
replays every command-line level's model answer.
