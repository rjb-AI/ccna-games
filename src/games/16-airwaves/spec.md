# Airwaves

Topics: v2-1.5 (wireless principles), v2-2.2.b (edge ports for APs)

| Level            | Mode  | What's generated                                                                | Pass | Time  |
| ---------------- | ----- | ------------------------------------------------------------------------------- | ---- | ----- |
| `channels`       | Learn | 3–9 APs on a floor grid; give each a 2.4 GHz channel (any valid plan is right)  | 60%  | –     |
| `rf`             | Learn | Absorption, reflection, scattering, refraction, interference; SNR maths; bands  | 60%  | –     |
| `security`       | Learn | WPA2/WPA3, Personal (PSK/SAE) vs Enterprise (802.1X), WPA3-only vs WPA2 clients | 60%  | –     |
| `ap-ports`       | Learn | Access or trunk for autonomous, lightweight (local) and FlexConnect APs         | 60%  | –     |
| `airwaves-drill` | Drill | Mix                                                                             | 70%  | 180 s |

Player actions: tap a channel per AP (graded by the rule "neighbours differ"), tap a choice, or
type the SNR.

Correctness source: `core/wireless` (`channelConflicts`, `planChannels`, `snr`, `RF_OBJECTS`,
`AP_PORT`). The controller GUI and AP modes add-ons are v1.1 only and are left out.

Tests: `generator.test.ts`, `core/wireless/wireless.test.ts`, `src/app/frame/labels.test.ts`.
