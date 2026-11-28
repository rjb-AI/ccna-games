# Backlog

Kanban for the CCNA Games app. Claude keeps it current: every user request and every audit
finding goes here, and each pull request moves its items to Done. Newest decisions at the top
of each column.

## Doing

- **Game-like mechanics, in the MECHANICS.md build order** (user: "do them in the order you
  suggested"). Steps 1-6 done (bins, tap the diagram, labels on the diagram, swipe deck, bit
  board, match pairs and code tiles). Now: step 7, packet path (done: be the switch, the passport
  journey, what-happens-next replays for STP and FHRP, ACL place it and test it); next: step 8,
  grid placement (VLSM packing, AP placement, Blueprint racks). Still to
  move onto the diagram: Airwaves channels (needs a floor-plan visual), AP ports. Before each: inspiration from `docs/INSPIRATION.md` (user: look up
  games of each type first). Still to move onto tapping: Neighbor Detective (tap the mistake),
  Longest Match rows, ACL/YAML bad line, router ID row.

## Next

- **Coverage and ambiguity leftovers**: ACL break-fix with only 2 lines to choose from; ETSI
  channel plans note in Airwaves; AI desk depth; NAT static inside-global collision check.

- **Swipe deck for more games**: Hex Garden legal/broken, Wi-Fi "will it connect?", AI desk,
  FHRP preempt (each needs new level ids).
- **Bit board for more games**: Subnet Sprint scratchpad beside the keypad questions, EUI-64
  workbench (flip the 7th bit), IPv6 prune, syslog trap slider.
- **ACL door on one screen**: long ACL lines need a scroll to read on a phone; find a compact
  layout that still shows real IOS syntax.

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

- 28 Nov: **Packet path, part 4: ACL place it and test it** (mechanics step 7 done). ACL
  Bouncer `place-test`: tap the interface for a named ACL, then a test volley of three packets
  runs against your placement, with drops drawn red where they stop and a results table (tap
  questions can now show what happens for the spot you picked, `afterFor`). `build-tiles`: build
  the ACL from tiles; each wrong tile is fired at the test packets and says how many it gets
  wrong. New core: `pathBetween`, `crossingsOf`, `runAclOnPath`, `formatEntryParts`,
  `formatAclConfig` (named ACLs). System: packets can fade after a hop or end dropped; code and
  tiles captions are optional; the tap button reads "Tap the diagram to answer" (one line). All
  5,912 existing questions are unchanged.
- 28 Nov: **Packet path, part 3: what happens next** (mechanics step 7). Tap questions can
  carry the diagram after the event (`after`), shown once answered with packets moving and a
  Replay button. Root Wars "cut a link, watch the tree heal": tap the blocked port that opens,
  then see the new tree. Gateway Guardians "pull the plug": tap the active router, who takes
  over, and who is active after the return (preempt), with host traffic flowing to the right
  router. A check of every existing question showed none changed (5,824 compared).
- 28 Nov: **Nothing past the screen edge** (system). The every-level test now fails if any
  element pokes past the right edge (a clipped table column hid answers without making the page
  scroll). Fixed at the owners: table cells break after colons too (IPv6); Gateway settings use
  "Pri" like show standby brief; interface tables use short names (Gi0/1). Removed an unused
  second interface-name shortener (`shortPort`); `shortIfName` is the one owner.

- 28 Nov: **Packet path, part 2: the passport journey** (Packet Passport, with and without PAT).
  Stamp each link of one trip with interface chips; the packet moves on the current link; the
  passport so far sits under the chips. Systems: code tiles can reuse chips, name blanks and put
  reference tables below the controls; the trip is drawn as a loop; the diagram's "tap for
  details" line only shows when something is hidden or after a tap (saves two lines in every
  game); packets stop short of the far device's name.

- 28 Nov: **Packet path, part 1: be the switch** (mechanics step 7). New kind `exits`
  (`ExitsView`): tap every port a frame leaves by, or "Filter or drop it". It draws as a switch
  faceplate (one card per port with what is plugged in and its VLAN), because a star diagram
  crowded the port names on a phone. Exits get a packet chip ("➜ tag 10") and can be replayed.
  The diagram also supports multi-pick and packets moving along links (`flows`), for later
  replays. Frame Run: be the switch, with a trunk, and as both switches. Wrong ports name the
  rule they break.

- 28 Nov: **Match pairs and code tiles** (mechanics step 6). Match pairs (`PairsView`): tap one
  card on each side; both cards show the pair's number, and tapping again moves the link. Code
  tiles (`TilesView`): config lines with blanks, filled from a chip bank that keeps a gap where
  each chip came from. New levels: Port Defender match attacks to defences, Packet Passport
  build the NAT config (PAT or static), Playbook Runner build the playbook. The NAT table now
  uses match pairs.

- 28 Nov: **Bit board** (mechanics step 5): one row of 8 bits per octet with place values,
  each octet's value live, the whole value and its /prefix live, broken mask rules named (core
  `maskIssue`). Drill checks itself the moment it matches. Subnet Sprint: binary on the bit
  board, build masks and wildcards, binary rush (Drill). ACL Bouncer: build the wildcard for a
  range.

- 28 Nov: **Swipe deck** (mechanics step 4): one card at a time; drag left/right (tilt, preview
  label, springs back before the commit point), two big buttons or arrow keys. Learn shows a
  reason card after each card and highlights the ACL line that decided; Drill flashes ✓/✗.
  ACL Bouncer "the door": 5 packets per question against one ACL (new level ids door-standard,
  door-extended, door-rush). Views now get the level's mode from the frame.

- 28 Nov: **Labels on the diagram** (mechanics step 3): tap a badge on a port or router to cycle
  its label, with a letter legend (never colour alone) and ✓/✗ on the drawing after checking.
  Root Wars "label every port" (R/D/A), Port Defender trust (T/U on SW1's ports), Adjacency
  Quest DR/BDR on a drawn segment (D/B/O). Layout leaves room for badges.

- 28 Nov: **Tap the diagram** (mechanics step 2) and **every diagram fits a phone**. Layout
  stretches drawings down (phones are tall) and only then widens; ports become tap-to-read dots,
  then link labels move into the tap line, before anything scrolls; Frame Run and Port Defender
  redrawn in two columns. Fixed: highlighted-port rings were measured too small; stretching was
  scaled away. Every switch and port is tappable ("SW-B Gi0/2 to SW-C Gi0/1 · 1G·4"). New tap
  question kind: Root Wars root bridge and root port are answered on the drawing. Test: every
  diagram in every game fits 390px. Inspiration research for all later kinds:
  `docs/INSPIRATION.md`.

- 28 Nov: **Sort into bins** (mechanics step 1): a card deck sorted into a fixed grid of
  equal-size bins (tap, drag or number keys); sorted cards listed under the bins so the bins
  never move. Records now always shows A, AAAA, CNAME, MX, NS, PTR in the same 3x2 grid. Also
  used by VM or container, hypervisor type, TACACS+ or RADIUS, SSH needed, encrypted transfers,
  syslog sent or not, trusted ports. Registry test: bins never change order within a level.
  Hub chip test waits for the save (fixes a flake).

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
