# Frame Run

Topics: v2-2.1.b (trunks, native VLAN), v2-2.4 (reading what a switch does); Break-Fix also v2-2.1

## Modes and levels

| Level          | Mode      | What's generated                                                                                  | Pass | Time  |
| -------------- | --------- | ------------------------------------------------------------------------------------------------- | ---- | ----- |
| `one-vlan`     | Learn     | One switch, 4 hosts in VLAN 1; every 3rd question asks what is learned                            | 60%  | –     |
| `vlans`        | Learn     | One switch, 6 hosts in VLANs 10 and 20                                                            | 60%  | –     |
| `trunk`        | Learn     | One switch with an 802.1Q trunk to SW2; remote hosts arrive tagged (or untagged in native VLAN 1) | 60%  | –     |
| `two-switches` | Learn     | SW1 and SW2 joined by a trunk; questions follow the frame hop by hop                              | 60%  | –     |
| `rush`         | Drill     | Trunk scenario, 12 frames, one long pause so entries age out                                      | 70%  | 240 s |
| `breakfix`     | Break-Fix | Two hosts in the same VLAN on two switches can't talk; port settings table; pick the fault        | 60%  | –     |

## Player actions

Tap one choice. The diagram highlights the arrival port; the hosts table and the switch's MAC
table (before this frame) are shown.

## Generator rules

- The scenario (switches, hosts, MACs, frame list) comes from the session seed. Question k
  replays frames 0..k-1 through `processFrame`, so the MAC table is exactly what the switch has
  learned. Reviews rebuild the same state from the seed.
- Destinations: 20% broadcast, otherwise usually a host in the same VLAN.
- Remote hosts (beyond the trunk) arrive on Gi0/1, tagged unless in the native VLAN.
- Drill: one pause of 5.5–10 minutes (longer than the 300 s aging time).
- Wrong choices are named misconceptions: flooding into other VLANs, sending back out the
  arrival port, forwarding to a host's real port before it is learned, wrong 802.1Q tagging,
  filter or drop when neither applies, learning the destination instead of the source.

## Correctness source

`core/sim/l2`: `processFrame` (VLAN classification, learning, forward/flood/filter/drop,
egress tagging, aging), `deliver` (multi-switch). Break-Fix: `plantL2Fault` and `diagnoseL2`
in `core/faults/l2.ts`; a fault is kept only if it is the only one found and the hosts really
can't reach each other.

## Faults used

`vlan.native-mismatch`, `vlan.trunk-not-allowed`, `vlan.access-wrong-vlan`.

## Explanations

The switch's reasoning in order (VLAN, then lookup, then action) plus what it learned. Break-Fix
gives the fault's symptom and fix.

## Tests

`generator.test.ts`: deterministic; one right answer per question; action answers re-derived
from the tables shown on screen; learn answers use the arrival port; one aging pause per drill;
all three faults appear. `core/sim/l2/switching.test.ts` covers the switching rules.

## Be the switch (mechanics step 7)

| Level             | Scenario   | What you do                                                           |
| ----------------- | ---------- | --------------------------------------------------------------------- |
| `be-switch`       | two VLANs  | Tap every port the frame leaves by on SW1's faceplate, or filter/drop |
| `be-switch-trunk` | trunk      | Same, with a trunk port; exits show "tag N" or "untagged"             |
| `be-two-switches` | two-switch | Same, as whichever switch the frame is at                             |

Exits come from core `processFrame` (`out`, with tagging). Each wrong port gets the rule it
breaks (back out of the arrival port, another VLAN, known destination elsewhere, dropped).
