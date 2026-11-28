# Backlog

Kanban for the CCNA Games app. Claude keeps it current: every user request and every audit
finding goes here, and each pull request moves its items to Done. Newest decisions at the top
of each column.

## Doing

- **Game-like mechanics, game by game** (see "Mechanics ideas"). Next up: pick the order with
  the user.

## Next

- **Records (Help Desk Hotline) and every "label each item" question:** options in a fixed
  order every time (muscle memory), equal-size buttons in a tidy grid. For DNS add records to
  balance the grid (e.g. TXT, NS → 6 = 2 rows of 3). (User, 28 Nov)
- **Audit fixes: teaches something wrong** (verify each, fix at the owning module, add a test):
  - Longest Match "Dropped" explanation mentions a default route that isn't in the table.
  - Port Architect: VM host / AP trunks come up without `switchport mode trunk` (hosts and APs
    don't speak DTP).
  - Gateway Guardians: VRRP with equal priority must not preempt (RFC 5798 6.4.2).
  - Static routes: reject host bits set in the prefix; never install AD 255.
  - Trunk/phone/channel checks accept a routed port (`no switchport`).
  - Channel hint says "active + active forms a channel" for a mismatched or shut member.
  - Any command on a port-channel copies its L2 settings onto members (hides a fault).
  - Voice VLAN prints the access-VLAN `%` message (no real sample for voice).
- **Audit fixes: CLI parser**: caret position for `do`; `no ip route NET MASK`; abbreviations
  after `no`; "not in this level" hidden by the global fallback; `interface range
  port-channel1 - 2`; cap range size; VLAN 1 rename and 1002-1005; output validator mode `on`
  and reserved VLANs.
- **Audit fixes: ambiguous questions**: DHCP-snooping vs DAI trust shown as one flag; RADIUS
  "open standard" (TACACS+ is RFC 8907 too); Hyper-V on a Windows laptop is type 1; NAT
  "missing ip nat inside" vs "roles swapped"; "previous link" on replies; "denys"; 2-choice
  ACL break-fix; Te ports on a C9500-24Y4C; OSPF "different subnets" vs mask mismatch.

## Later

- **Systems consolidation** (from the systems audit): one Break-Fix fault planter in
  core/faults; one owner for "ports carrying a VLAN" and interface names; one VLAN module;
  EtherChannel protocol labels in one place; IPv6 routes through the same install/lookup as
  IPv4; tests for core/sim/l3/static.ts and core/device/status.ts; MAC generator in netmath;
  tagged mixed responses; registry-wide "answer passes" test; `makeCliQuestion` builder;
  fact tables for cabling and virtualisation in core; `MODE_RULES` and `MAX_STARS`.
- **Coverage gaps**: OSPF cost/reference bandwidth, multicast addresses, network statements;
  Rapid PVST+ port states and link types; FHRP timers; LLDP transmit/receive; IPv6 link-local
  next hops; agentic AI depth (5.1/5.2); syslog facility; SCP/SFTP file chapter.
- **show running-config**: needs a real Catalyst sample with voice VLAN, PoE, shutdown and
  channel-group lines in one interface.
- **M6+ milestones**: ACL builder CLI, OSPF CLI rounds; Capstone.

## Mechanics ideas (for the review above)

Reusable interaction kinds, then which games use them:

- **Drag into slots** (done): Adjacency Quest state ladder, Packet Passport DORA, NOC syslog
  ladder. Could also take Locksmith SSH steps.
- **Wire board** (done for Cable Doctor): connect each A to its B by dragging wires. Could also
  take Port Defender attack → defence, DNS record → job, port → device.
- **Tap the diagram**: Root Wars (tap the root bridge, tap root ports), Neighbor Detective (tap
  the wrong spot on the drawing), Frame Run (tap every port the frame leaves by), ACL placement
  (tap the interface and direction), Gateway Guardians (tap a link to fail it, then predict).
- **Sort into bins**: Hex Garden address types, Blueprint Builder VM vs container, Locksmith
  TACACS+ vs RADIUS, Port Defender attack → defence.
- **Moving packets**: Frame Run and Packet Passport show the frame/packet travelling hop by hop;
  you stamp each hop.
- **Bouncer swipe**: ACL Bouncer drill as packets arriving at the door; permit/deny quickly.
- **Floor plan**: Airwaves channel planning on a map, overlaps glow red.
- **Bit board**: Subnet Sprint mask builder, tap bits to set the prefix and watch network and
  broadcast light up.
- **Fix the file**: Playbook Runner, tap lines to indent/outdent YAML.

## Done

- 28 Nov: **Audit fixes: app bugs** (PR "App bug fixes"):
  - Malformed `%` in the URL no longer blanks the app (safe decode in the router), and a
    top-level error boundary shows "Something went wrong" with Back to hub.
  - `?foo=1` no longer forces seed 0: the router only takes `seed` when it is a whole number.
  - Time running out: results say how many questions were not answered and never "Well done";
    the question on screen goes to reviews (core/game `timeUp` decides, one place in the frame).
  - Command line: Check work order includes the line still typed; history arrows keep the
    draft; Start over clears input, history and help; chips are a labelled group and "?" has
    a name and controls the help list.
  - Multi-line answers keep their lines and indentation: one `Answer` component used by play
    and review feedback (now one shared `Feedback` panel) and the results list.
  - Topology labels are 20px at every size; layout owner `topology/layout.ts` spreads a
    drawing until no labels cover each other, and wide drawings scroll inside their own box.

- 28 Nov: **Wire board** (new reusable question kind): Cable Doctor's pinout is now a drag-the-
  wires puzzle on an RJ45 plug. **Drag-and-drop ordering** for every "put in order" question
  (OSPF states, DORA, syslog ladder). Cabling facts moved to core.

- 28 Nov: Questions fit one phone screen; safe-area padding for rounded corners; next question
  starts at the top; double tap on Next can't answer the next question (PR #19).
- 28 Nov: M5 command line, Port Architect, CLI levels (PR #18).
- 28 Nov: Hub game cards and domain chips (PR #17); real output samples (PR #16).
