# Backlog

Kanban for the CCNA Games app. Claude keeps it current: every user request and every audit
finding goes here, and each pull request moves its items to Done. Newest decisions at the top
of each column.

## Doing

- **Game-like mechanics, game by game**: full proposal in `docs/MECHANICS.md` (8 reusable kinds,
  every game, build order). Waiting for the user to pick where to start; recommended step 1 is
  "sort into bins" (also fixes the Records grid), then "tap the diagram".

## Next

- **Records (Help Desk Hotline) and every "label each item" question:** options in a fixed
  order every time (muscle memory), equal-size buttons in a tidy grid. For DNS add records to
  balance the grid (e.g. TXT, NS → 6 = 2 rows of 3). (User, 28 Nov)
- **Audit fixes: app bugs**: timed-out results say "Nothing. Well done."; Check work order drops
  the line still typed; multi-line CLI answers collapse to one line in feedback; topology text
  under 20px on phones; malformed `%` in the URL blanks the app (add an error boundary); CLI
  history arrows wipe the draft; Start over leaves input and help open; `?foo` forces seed 0.
- **Coverage and ambiguity leftovers**: ACL break-fix with only 2 lines to choose from; ETSI
  channel plans note in Airwaves; AI desk depth; NAT static inside-global collision check.

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

- 28 Nov: **Audit fixes, networking and CLI** (PR below):
  - VRRP/HSRP: equal priority never preempts (RFC 5798 6.4.2).
  - Longest Match: "Dropped" explanation names the matching route; destinations are routable
    unicast.
  - DTP only with switch peers (VM hosts and APs need `switchport mode trunk`); routed ports are
    their own mode, so trunk/phone/channel checks reject them.
  - EtherChannel hint gives the member's real reason; port-channel switchport changes copy to
    members, other commands don't; one owner for the shared member settings.
  - Static routes: host bits refused, distance 255 never installed, `no ip route NET MASK`;
    interfaces refuse network/broadcast addresses. New tests for static routing.
  - Parser: caret after `do`, abbreviations after `no`, "not in this level" from sub-modes,
    `interface range port-channel1 - 2`, range cap, VLAN 1 rename and 1002-1005 refused, voice
    VLAN note instead of an unsampled `%` line, validator covers mode `on`.
  - Wording: DHCP snooping vs DAI trust shown separately; RADIUS standards wording; VirtualBox
    lab; NAT "no ip nat command at all"; "next link" on replies; "denies"; C9500-16X; OSPF
    "subnet or mask mismatch"; RFC 5952 wording; uplink text when the DHCP server is local.

- 28 Nov: **Wire board** (new reusable question kind): Cable Doctor's pinout is now a drag-the-
  wires puzzle on an RJ45 plug. **Drag-and-drop ordering** for every "put in order" question
  (OSPF states, DORA, syslog ladder). Cabling facts moved to core.

- 28 Nov: Questions fit one phone screen; safe-area padding for rounded corners; next question
  starts at the top; double tap on Next can't answer the next question (PR #19).
- 28 Nov: M5 command line, Port Architect, CLI levels (PR #18).
- 28 Nov: Hub game cards and domain chips (PR #17); real output samples (PR #16).
