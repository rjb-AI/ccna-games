# Game Mechanics: from quiz questions to play

*Written 28 Nov 2026. A design proposal only; nothing here is built yet. It covers all 19 games
(111 levels) in `src/games/`. The Capstone is not built yet, so it is left out.*

## Jump to

- [1. Summary](#1-summary)
- [2. Design rules for every mechanic](#2-design-rules-for-every-mechanic)
- [3. The interaction kinds](#3-the-interaction-kinds)
- [4. Game by game](#4-game-by-game)
- [5. Cross-game ranking](#5-cross-game-ranking)
- [6. Build order](#6-build-order)
- [7. Phone constraints and accessibility](#7-phone-constraints-and-accessibility)
- [8. Sources](#8-sources)

---

## 1. Summary

Today almost every level is one of three things: tap one of four sentences (`choice`), type
numbers on a keypad (`fields`), or pick a label from a list (`labels`). The exceptions are the
wire board (Cable Doctor pinout), drag-to-order (OSPF states, DORA, syslog ladder) and the
command line (Port Architect, Root Wars, Longest Match). Many games already *draw* a topology,
a table or config lines, but the player never touches the drawing. The answer sits in a list
underneath it.

The biggest win is cheap: **let the player answer on the picture they are already looking at.**
Most proposals below are new *views* over question data that already exists (a `ChoiceQuestion`
or `LabelsQuestion` whose items are tied to spots on a diagram). That keeps `check`, the review
queue and the `src/core` answer functions as they are.

Eight reusable kinds cover every game. The two to build first are **tap the diagram** (16
games) and **sort into bins** (10 games). By score they are followed by code tiles, swipe deck,
bit board, match pairs, packet path and grid placement.

---

## 2. Design rules for every mechanic

1. **The answer still comes from `src/core`.** Each proposal names the core function that
   decides what is right. The view only collects the player's input. No mechanic may need the
   game to compute networking facts.
2. **Make the player build the answer, not just recognise it.** Tapping the port a frame leaves
   by, or setting the bits of a mask, is closer to the exam skill than picking a sentence that
   describes it.
3. **Fast play goes in Drill, thinking goes in Learn.** A review of Tetris-style training
   (Pilegard & Mayer, 2018) found little transfer from fast, forward-moving games, because
   transfer needs reflective effort. So Learn levels stay untimed and show the reasoning after
   each answer. Timers, queues and lives belong in Drill.
4. **Feedback while the reasoning is still fresh.** Where possible the picture reacts as the
   player works: bits light up, a clash zone appears, a lock pin turns. Brilliant and PhET both
   use this kind of built-in feedback ("implicit scaffolding": guided without feeling guided).
5. **Never invent Cisco output.** Mechanics that need `show` output, syslog lines, Ansible run
   output or client command output wait for real samples (CLAUDE.md rule 3). Those are marked
   *waits for samples* below.
6. **New level ids when output changes.** A view change over the same question data needs no
   new id. A generator change (for example VLSM with more than one right layout) needs a new
   level id so saved reviews still rebuild.
7. **Borrow genres, not games.** The references in section 8 are for mechanics only: dragging
   nodes to untangle, swiping cards left and right, lanes of defenders, a queue at a checkpoint.
   No names, art, characters or levels are copied.

---

## 3. The interaction kinds

Kinds that exist today (`src/app/frame/`):

| Kind     | What the player does                                   | Used by                               |
| -------- | ------------------------------------------------------ | ------------------------------------- |
| `choice` | Tap one answer                                         | Almost every game                     |
| `fields` | Type values on the on-screen keypad                    | Subnet Sprint, Longest Match, others  |
| `labels` | Give every item one of a few options                   | Root Wars roles, Airwaves channels    |
| `order`  | Drag items into numbered slots                         | OSPF states, DORA, syslog severities  |
| `cli`    | Type commands; judged on the resulting device state    | Port Architect, Root Wars, Longest M. |
| `wires`  | Drag each loose wire onto its connector                | Cable Doctor pinout                   |

New reusable kinds proposed here (details in section 5):

| #   | Kind                          | One-line idea                                                                                                                                                                                      |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| K1  | **Tap the diagram**           | The answers are spots on a topology, table row, config line or faceplate. *Pick* mode: tap one or several. *Assign* mode: tap a spot to cycle its label, or tap a token in a tray and then a spot. |
| K2  | **Sort into bins**            | Cards arrive one at a time; tap (or fling) each into one of 2–6 bins. In Drill the cards queue up and the queue is the timer.                                                                       |
| K3  | **Match pairs**               | Two columns of cards; join each left card to its right card. A generalised wire board.                                                                                                             |
| K4  | **Swipe deck**                | A yes/no card: swipe right or left, or tap the two big buttons. Drill adds a queue and lives.                                                                                                      |
| K5  | **Code tiles**                | Config or YAML lines as tiles: fill blanks from a chip bank, reorder lines, indent lines. Live check where core can judge it.                                                                      |
| K6  | **Bit board**                 | A row of cells (32 bits, 128 bits, hex digits, MAC bytes) grouped into octets or groups. Tap to flip a cell, drag a divider for the prefix; readouts update live.                                  |
| K7  | **Packet path**               | A packet or frame moves hop by hop across a topology. At each stop the player acts (stamp headers, pick exit ports, permit or drop). Also plays "what happens next" after an answer.                |
| K8  | **Grid placement**            | Place pieces on a grid or strip: APs on a floor plan, subnets in an address block, workloads on servers. Pieces snap only to legal spots; clashes show live.                                       |

The key system idea for K1 and K2: **they are new views of existing question types.** A
`LabelsQuestion` can be drawn as bins (K2), or on a diagram if each item has an anchor (K1
assign mode). A `ChoiceQuestion` whose choices have anchors can be answered by tapping the
diagram (K1 pick mode). So the work is mostly one new field, `anchors` (item or choice id →
device, port, link, table row or code line), plus hotspot support in the existing topology,
table and code renderers in `src/app/topology` and `VisualsView.tsx`. `check`, `describe` and
the review queue stay the same.

---

## 4. Game by game

Effort: **S** = a few days on top of the kind, **M** = about a week, **L** = more than a week.
Learning value: 1 (cosmetic) to 5 (practises the real exam skill much better than today).

### 01 Subnet Sprint (8 levels)

**Today:** `basics-24`, `last-octet`, `any-prefix`, `sprint` (keypad: network, broadcast,
first, last, hosts); `how-many-learn`, `how-many-drill` (keypad); `vlsm` (keypad, 2–3 teams);
`breakfix` (choice).

**What's weak:** Five keypad fields per question feel like a form. The block-size method is
explained after the answer but never seen while working. VLSM is the most puzzle-like topic and
it is all typing.

**Proposal A: Bit board with a prefix bar (Learn).** The address is shown as 32 bit cells in
four octet rows, with the octet's decimal value at the end of each row. A bold bar between bits
splits network from host bits. The player drags the bar, or taps the gap between two bits, to
set the prefix. Host bits get a hatched fill, not only a colour. Two buttons, "host bits all 0"
and "host bits all 1", turn the board into the network and broadcast address, and the decimal
readout updates as they go. The keypad fields stay below, so the board is a scratchpad that
teaches the idea. *Ramp:* /24 (only the last octet moves) → /25–/30 → any prefix, where the
"interesting octet" is outlined. *Drill:* the board is hidden and appears in the feedback. *Core:*
`subnetInfo`, `networkOf`, `broadcastOf`, `prefixToMask`, `blockSize`. *Kind:* K6. *Effort:* M.
*Value:* 5.

**Proposal B: Block ruler (Learn and Drill).** The interesting octet is drawn as a ruler from 0
to 255, cut into blocks of the block size. A marker shows where the host address falls. The
player taps the block that contains it, and the block's two ends become the network and
broadcast answers. In Drill the ruler is drawn without tick labels, so the player has to work
out the block size. It looks like a number line with draggable points. *Core:* `blockSize`,
`subnetInfo`. *Kind:* K1 pick mode on a new "ruler" visual. *Effort:* S once K1 exists. *Value:*
4.

**Proposal C: VLSM packing (new level id).** The block (/23 or /24) is a long strip of cells.
Each team is a piece sized to the subnet it needs, sitting in a tray. The player taps a piece,
then taps a spot on the strip. Pieces snap only to aligned boundaries, so alignment is a rule
the board enforces, not a fact to remember. A piece that is too small shows the hosts that don't
fit. *Ramp:* 2 teams → 3 teams plus a WAN /30 → "packed from the start" scoring a bonus star.
*Core:* `prefixForHosts`, `vlsm` (the model answer), plus a rule check (right size, aligned, no
overlap, inside the block) that belongs in `core/netmath` next to `vlsm`. *Kind:* K8. *Effort:*
M. *Value:* 5.

**Break-Fix:** show the PC settings card. The player taps the wrong field (IP, mask or gateway)
and then picks the fault. *Core:* `diagnoseHost`. *Kind:* K1 on a table. *Effort:* S. *Value:* 3.

### 02 Hex Garden (7 levels)

**Today:** `compress`, `expand`, `types`, `eui64`, `prefix`, `garden-drill`, `breakfix`. All
`choice` (through `MixedView`).

**What's weak:** Every level is "pick the right spelling", which tests recognising an answer,
not producing it. The garden theme is only in the titles.

**Proposal A: Prune the hedge (compress and expand).** The full address is shown as 8 group
tiles of 4 hex digits. Tap a leading zero to snip it; a trailing or inner zero won't snip and
shakes with the reason. Swipe across a run of all-zero groups, or tap its first and last group,
to fold it into `::`. A second `::` is refused with "only once". The address is right when it
equals `compressIPv6`. Expand runs the other way: tap `::` and grow back the right number of
groups, then pad each group. *Ramp:* one zero run → two runs (the longer must fold) → a tie
(fold the first, per RFC 5952). *Core:* `compressIPv6`, `expandIPv6`, `ipv6Equal`. *Kind:* K6
(hex-digit cells). *Effort:* M. *Value:* 5.

**Proposal B: Seed beds (types).** Addresses arrive as seed packets; tap the bed: global
unicast, link-local, unique local, multicast, loopback, unspecified. Drill: packets queue up.
*Core:* `ipv6Type`. *Kind:* K2. *Effort:* S. *Value:* 3.

**Proposal C: EUI-64 workbench.** The MAC is shown as 6 byte tiles. Step 1: tap the gap in the
middle to split it. Step 2: drop the `FFFE` tile into the gap. Step 3: the first byte opens up
as 8 bits; tap the 7th bit to flip it. Each step is checked on its own, so a mistake shows
exactly which step went wrong (as the plan asks). *Prefix round:* a /48 on the bit board; drag
the bar to /64 and the board counts the 16 borrowed bits as 2^16. *Core:* `eui64`,
`eui64Address`, `ipv6SubnetCount`. *Kind:* K6. *Effort:* M. *Value:* 4.

**Break-Fix:** four compressed lines, each a swipe card: "legal" or "broken". *Kind:* K4.
*Effort:* S. *Value:* 3.

### 03 Cable Doctor (4 levels)

**Today:** `pinout` (wire board, done), `cables` (choice), `patients` (choice: symptom in words
→ cause), `ward-round` (drill mix).

**What's weak:** The pinout is already a real puzzle. Cable choice and diagnosis are text
choices.

**Proposal A: Patch the links.** A small topology (PC, switch, router, a far building) with the
distance on each link. Tap a link to cycle its cable: straight-through, crossover, multimode
fibre, single-mode fibre. Each option has an icon and a short name, not only a colour. An
Auto-MDIX switch on a device changes what is acceptable. *Ramp:* copper only → add distance
(over 100 m needs fibre) → mixed. *Core:* the cable facts table, which should move from
`generator.ts` into `src/core/cabling` (already in the backlog). *Kind:* K1 assign mode.
*Effort:* S. *Value:* 3.

**Proposal B: Crossover wire board.** Two RJ45 plugs, one per end; wire the second plug so the
cable is a crossover. *Core:* `T568A`, `T568B`. *Kind:* `wires` (existing) with two connectors.
*Effort:* S. *Value:* 2.

**Proposal C: Triage ward (Drill).** Patient cards (symptom) arrive; tap a diagnosis bin
(duplex mismatch, bad cable or interference, admin down, down/down, up/down, healthy). Healthy
patients are mixed in, and calling a fault that isn't there costs a life. Reading real counters
*waits for samples*. *Kind:* K2. *Effort:* S. *Value:* 3.

### 04 Frame Run (6 levels)

**Today:** `one-vlan`, `vlans`, `trunk`, `two-switches`, `rush` (with aging), `breakfix`. All
`choice`: "What does SW1 do with this frame?" and "What does SW1 add to its MAC table?".

**What's weak:** "You are the switch", but the player picks a sentence. The ports drawn on the
diagram are the real answer, and they can't be tapped.

**Proposal A: Be the switch.** A frame card (source MAC, destination MAC, tag) slides in on its
arrival port. Step 1 (learn): drag the source MAC sticker into the MAC table, or tap the table's
empty row. Step 2 (forward): tap every port the frame leaves by, or tap "Drop". Flooding means
tapping every port in the VLAN except the arrival port. On trunk scenarios each chosen trunk port
also gets a tagged/untagged toggle. Press Send and the frame copies animate out of the ports
`processFrame` returns; wrong ports flash with the reason ("VLAN 20 port: a flood stays inside
VLAN 10"). *Ramp:* one VLAN → two VLANs → trunk tagging → two switches (the frame continues onto
SW2, with the player playing both). *Core:* `processFrame` (egress list, tagging, learning),
`deliver`. *Kind:* K1 pick (several ports) + K7 animation. *Effort:* M. *Value:* 5.

**Proposal B: Frame rush (Drill).** Frames queue at several ports; a clock runs; MAC table
entries fade as they age and drop out after the aging time. A queue that overflows costs a
life. *Core:* `processFrame` with aging, `activeEntries`. *Kind:* K7. *Effort:* M. *Value:* 4.

**Proposal C: Find the bad port (Break-Fix).** Two switches, two hosts that can't talk. Tap the
port whose setting is wrong (an access port, a trunk end), then pick the fault from the port's
settings card. *Core:* `plantL2Fault`, `diagnoseL2`. *Kind:* K1. *Effort:* S. *Value:* 4.

### 05 Root Wars (6 levels)

**Today:** `root` (choice), `root-port` (choice), `roles` (labels list), `election-drill`,
`events` (choice: which port unblocks; guard facts), `cli-root` (command line).

**What's weak:** The topology is drawn, but the answer is a list below it. Labelling ports in a
list loses the picture, which is where the reasoning happens.

**Proposal A: Crown the root.** Tap the switch that becomes root. On a wrong pick, the two
bridge IDs face off in a "duel" card that walks through priority, then MAC, using the real
values. *Core:* `electStp`, `compareBridgeId`, `TIEBREAK_TEXT`. *Kind:* K1 pick. *Effort:* S.
*Value:* 4.

**Proposal B: Paint the ports.** Each port end on the diagram is a hotspot. Tap to cycle Root
(circle, "R"), Designated (square, "D"), Alternate (crossed, "A"). Shapes and letters carry the
meaning, so colour is extra. Root path costs can be shown on request. *Ramp:* costs shown →
speeds only → 5–6 switches with parallel links (port ID tie-breaks). *Core:* `electStp` roles.
*Kind:* K1 assign. *Effort:* S. *Value:* 5.

**Proposal C: Cut and guard (Break-Fix).** The player picks a link and taps it to cut it, then
taps the port they predict will start forwarding; the tree then animates its new roles. Rogue
switch event: a new switch with priority 0 slides in at an edge port; the player places a guard
token (PortFast, BPDU guard, root guard, loop guard) from a tray onto a port before the "go"
timer ends. *Core:* `roleChanges`, `withoutLink`, `rootWithout`; guard facts are cited in
`generator.ts`. *Kind:* K1 pick + assign (token tray), K7 for the replay. *Effort:* M. *Value:*
5.

### 06 Port Architect (8 levels)

**Today:** all `cli`: `access`, `phone`, `trunks`, `etherchannel`, `svi`, `ap-ports`, `drill`,
`breakfix`.

**What's weak:** The CLI is the right skill and should stay. What's missing is a picture of the
switch that reacts to what the player types, and a sense of handling work orders.

**Proposal A: Live faceplate.** Above the terminal, a drawing of the switch front: 24 ports and
4 uplinks, with each port showing the device plugged into it (phone, PC, AP, server). As the
player types, port icons change: link up (filled square), down (hollow), err-disabled
(triangle), trunk (double line), in a channel (bracket). A requirement checklist ticks off live.
This gives feedback while typing instead of only at "Check work order". *Core:*
`interfaceStatus`, `evaluateAll`, `describeRequirement`, `channelStatus`. *Kind:* `cli` plus a
new "faceplate" visual (K1 hotspots: tap a port to fill in `interface Gi1/0/5`). *Effort:* M.
*Value:* 4.

**Proposal B: Ticket queue (Drill).** Work order cards stack on the right; finishing one slides
the next in; the faceplate carries over between tickets, so a careless `interface range` breaks
an earlier ticket. *Core:* `evaluateAll` over every ticket so far. *Kind:* `cli`. *Effort:* S.
*Value:* 4.

**Break-Fix:** the faceplate shows the symptom (a dark port, a missing channel bracket). Tap the
port to see its config lines, then fix it in the CLI. *Core:* `plantPortFault`. *Effort:* S
after A. *Value:* 4.

### 07 Neighbor Detective (3 levels)

**Today:** `facts` (choice), `diagram` (choice of four sentences about a drawing plus a
neighbour table), `detective-drill`.

**What's weak:** The player compares a table to a drawing and then picks a sentence. The
drawing, where the mistake actually is, can't be touched. The plan asked for 2–4 mistakes; the
game plants one because a choice question needs exactly one true sentence.

**Proposal A: Spot the difference.** Tap the wrong thing on the documented diagram: a port
label, a model note, a link, or a "missing device here" marker on a port. Then fix it from
chips taken from the neighbour report. With taps, several mistakes per diagram work naturally,
so the plan's 2–4 come back. *Ramp:* 1 mistake → 2 → 3 with a timer. *Core:* `diagramDiffs`,
`neighborsOf`. *Kind:* K1 pick (several). *Effort:* S. *Value:* 4.

**Proposal B: Map the dark network.** Only your own switch is drawn. Tap a switch to "ask its
neighbours", which reveals its rows of the report as a neutral table (not show output). Draw
each link by tapping a port and then the far port. Fewer asks earns more stars. *Core:*
`neighborsOf`. *Kind:* K1 with a connect mode (tap–tap, the way the wire board does it).
*Effort:* L. *Value:* 4.

**Facts:** swipe cards "CDP", "LLDP" or "both" as three bins. *Kind:* K2. *Effort:* S. *Value:*
2.

### 08 Longest Match (8 levels)

**Today:** `pick-route`, `installed`, `static`, `floating`, `routing-drill`, `breakfix` (all
choice), `build-routes`, `build-floating` (cli).

**What's weak:** The routing table is a table, but the answer is a list of route strings below
it. Choosing among routes is really "tap the row".

**Proposal A: Tap the row.** The destination IP is shown in binary above the table. Each route
row shows its prefix length as a bar. Tap the row the router uses, or "Dropped". Feedback lights
the matching bits of every candidate row and shows the longest one winning. In the `installed`
level, rows for the same prefix stack up, and the player taps the one that gets installed (lowest
AD, then metric). *Ramp:* nested prefixes → default route → same prefix, different AD → same
protocol, different metric. *Core:* `lookup`, `installRoutes`, `DEFAULT_AD`. *Kind:* K1 pick on a
table. *Effort:* S. *Value:* 4.

**Proposal B: Route rush (Drill).** A router at the bottom with 3–4 exit lanes (next hops)
labelled with their prefixes. Packets with destination IPs drop from the top; tap the lane each
packet belongs in before it lands (falling-blocks pressure; "Drop" is a lane too). *Core:*
`lookup`. *Kind:* K2 in queue mode, drawn as lanes. *Effort:* S. *Value:* 4.

**Proposal C: Floating backup.** R1 with a primary path (OSPF) and a backup link. The player
sets the static route's AD with a stepper, then taps the primary link to cut it and watches the
packet take the backup (or not, if the AD is above 110 or below it while OSPF is up). The
command-choice level becomes code tiles: build `ip route NET MASK NEXT-HOP [AD]` from chips.
*Core:* `installRoutes`, `lookup`, `staticRouteCommand`, `DEFAULT_AD`. *Kind:* K7 + K5. *Effort:*
M. *Value:* 4.

### 09 Adjacency Quest (5 levels)

**Today:** `states` (order + choice), `router-id` (keypad), `dr-bdr` (labels), `ospf-drill`,
`neighbors` (choice on side-by-side settings).

**What's weak:** The state ladder works. Router ID is typed from a table, when the real skill is
choosing the right row. DR/BDR is a labels list next to a picture of the segment.

**Proposal A: Election on the wire.** Routers hang off a shared LAN line, each with priority and
router ID. Tap the DR, then the BDR (priority 0 routers are drawn with a "never" badge). Then a
late joiner arrives with a higher priority; swipe "takes over" or "waits". The answer
(non-preemptive) animates. *Core:* `electDr`. *Kind:* K1 assign + K4. *Effort:* S. *Value:* 4.

**Proposal B: Tap the router ID.** The interface table includes loopbacks, down interfaces and
sometimes a `router-id` line. Tap the row or line that becomes the router ID. *Core:*
`routerId`. *Kind:* K1 on a table. *Effort:* S. *Value:* 3.

**Proposal C: Spot the mismatch (Break-Fix).** R1's and R2's settings cards side by side; tap
the field pair that blocks the adjacency (area, timers, MTU, passive...). A state ladder next to
it then shows where the adjacency stalls (for example stuck at ExStart for MTU). Fixing it in
the CLI waits for OSPF commands and real `show ip ospf neighbor` samples. *Core:*
`ospfNeighborFaults`, `OSPF_STATES`, `STATE_MEANING`. *Kind:* K1 on two tables. *Effort:* S.
*Value:* 4.

### 10 Gateway Guardians (4 levels)

**Today:** `active`, `vmac`, `failover`, `guard-drill`, all `choice`.

**What's weak:** Failover is a story told in words. It should be something the player does.

**Proposal A: Pull the plug.** Two or three routers with settings chips (priority, preempt) and
a virtual gateway cloud that hosts point to. Tap the router that is active or master. Then tap a
router's plug to fail it, and tap who takes over; then restore it and swipe "takes back
control" or "stays standby". Each step animates the virtual IP moving. *Ramp:* 2 routers →
3 routers → HSRP and VRRP defaults mixed (VRRP preempts by default, HSRP doesn't). *Core:*
`electFhrp`, `failover`, `PREEMPT_DEFAULT`, `ACTIVE_WORD`. *Kind:* K1 pick + K4 + K7. *Effort:*
M. *Value:* 4.

**Proposal B: MAC decoder.** The virtual MAC is shown as byte tiles. Tap the bytes that name the
protocol, then tap the digits that hold the group number. Reverse round: build a group's MAC on
hex cells. *Core:* `parseVirtualMac`, `virtualMac`. *Kind:* K6 (pick mode). *Effort:* S.
*Value:* 3.

### 11 Help Desk Hotline (5 levels)

**Today:** `records` (labels), `commands` (choice), `clients` (choice from a settings table),
`dns-calls` (choice from a zone table), `hotline-drill`.

**What's weak:** The plan's "run commands, fewest commands wins" loop is missing (it waits for
real client output samples). What is left is choosing sentences.

**Proposal A: Tap the bad setting.** A caller card (the complaint) and the PC's settings card.
Tap the field that's wrong (a 169.254 address, a gateway off the subnet, a wrong mask, a wrong
DNS server), then pick the fix. *Core:* `diagnoseHost`, `subnetInfo`. *Kind:* K1 on a table.
*Effort:* S. *Value:* 3.

**Proposal B: Zone repair.** The zone file is a table. Tap the broken record row, or tap the
"missing record" slot and pick its type from chips. *Core:* `webProblems`, `mailProblems`,
`ptrProblems`, `resolve`. *Kind:* K1 + K5 chips. *Effort:* S. *Value:* 4.

**Records:** match pairs (record type → job), in a fixed grid order with balancing extras (TXT,
NS), as the backlog asks. *Core:* `RECORD_MEANING`. *Kind:* K3. *Effort:* S. *Value:* 2.

**Later (waits for samples):** a toolbox of commands (`ipconfig /all`, `ip addr`, `nslookup`);
each run costs a star, and real output appears.

### 12 Packet Passport (8 levels)

**Today:** `passport`, `arp`, `dhcp` (order + choice), `nat-table` (labels), `nat-passport`,
`nat-config`, `border-drill`, `breakfix`. Mostly `choice`.

**What's weak:** The "stamp the passport" idea is good, but the player picks one of four whole
header sets. The lesson (MACs change every hop, IPs don't) needs the player to fill each field
hop after hop.

**Proposal A: Stamp it hop by hop.** The packet travels PC → R1 → R2 → server, stopping on each
link. The passport has four slots: source MAC, destination MAC, source IP, destination IP. Every
NIC on the diagram carries its address as a sticker; tap a slot, then tap the NIC whose address
goes there (or drag the sticker). Wrong stamps get a short reason ("R1 rewrote the source MAC
when it forwarded"). *Ramp:* one link → the whole trip → the trip back → through PAT on R1,
where a NAT stamp rewrites the IP and port. *Core:* `headersThere`, `headersBack`. *Kind:* K7
with K1 assign. *Effort:* L. *Value:* 5.

**Proposal B: Who do you ARP for?** Tap the device whose IP the PC ARPs for (the gateway if the
destination is remote). *Core:* `arpTarget`. *Kind:* K1. *Effort:* S. *Value:* 3.

**Proposal C: Relay and NAT desk.** DHCP: drag the `ip helper-address` token onto the right
router interface; DORA then plays, with broadcast and unicast arrows and the giaddr shown.
*Core:* `relayGiaddr`, `diagnoseDhcp`, `DORA`. NAT table: match the four addresses to inside
local / inside global / outside local / outside global. *Core:* `natTerms`. NAT config: code
tiles (`ip nat inside source ... overload`). *Kinds:* K1 assign, K3, K5. *Effort:* M. *Value:* 4.

### 13 ACL Bouncer (7 levels)

**Today:** `standard`, `extended` (choice: what happens to this packet), `wildcard` (keypad and
choice), `door-drill`, `builder` (choose the ACL), `placement` (choose interface and
direction), `breakfix` (choose the bad line).

**What's weak:** The bouncer theme is the best in the series, but the door isn't played. The
player never says "in" or "out" or points at the line that decided.

**Proposal A: The door.** A packet card (source, destination, protocol, port) arrives at the
door, with the ACL posted on the wall. Swipe right to permit, left to deny, or use the two big
buttons. In Learn, the player must also tap the ACL line that matched first (or the "invisible
deny" line drawn faintly at the bottom). In Drill, a queue builds at the door like a border
checkpoint; three mistakes and the shift ends. *Ramp:* standard → extended with ports → ranges
and `gt`/`lt` → named ACLs. *Core:* `evaluateAcl` (verdict and matching line),
`describeVerdict`. *Kind:* K4 + K1 on code lines. *Effort:* S. *Value:* 5.

**Proposal B: Wildcard bits.** The bit board shows the address bits and the wildcard bits
underneath. Tap wildcard bits to toggle "care / don't care"; a ruler shows the range of
addresses the entry matches, updating live. *Core:* `prefixToWildcard`, `matchesWildcard`.
*Kind:* K6. *Effort:* S once K6 exists. *Value:* 5.

**Proposal C: Place it and test it.** A 3-router path. Tap the interface, then the in or out
arrow on it. A test volley of packets plays: legitimate traffic that gets blocked by a
standard ACL placed too close to the source is shown dropped. The builder becomes code tiles:
build the lines from chips (action, protocol, source, wildcard, destination, `eq` port), then
fire the 50 test packets and see the misses. *Core:* `disagreements`, `evaluateAcl`,
`formatAclLines`. *Kind:* K1 + K7 + K5. *Effort:* M. *Value:* 5.

**Break-Fix:** tap the bad line. *Kind:* K1 on code. *Effort:* S. *Value:* 4.

### 14 Port Defender (6 levels)

**Today:** `match`, `outcome`, `violation`, `breakfix` (choice), `trust` (labels), `waves`
(drill mix).

**What's weak:** The plan describes tower defence; the levels are text choices and one labels
list. The trust lesson ("the wrong choice breaks the network, not the attacker") never plays
out.

**Proposal A: Lane defence.** The access switch's ports are lanes running from the end devices
to the uplink. A tray holds defences: DHCP snooping (per VLAN), "trusted" flags, DAI, port
security (with violation mode), storm control, RA guard, BPDU guard. Tap a defence, then a port
or the VLAN to place it. A small budget forces choosing the right defence instead of placing all
of them. Press "Wave" and the attack plays down its lane: a rogue DHCP offer, spoofed ARP, a MAC
flood, fake RAs. Each one is blocked, gets through, or is blocked *and* real users lose DHCP
(drawn as a user's PC going dark). The debrief explains each outcome. Syslog lines wait for real
samples. *Ramp:* one attack → two at once → trust traps (an uplink left untrusted, DAI without
snooping). *Core:* `rogueDhcpOutcome`, `arpSpoofOutcome`, `correctTrust`,
`portSecurityViolation`, `ATTACKS`, `DEFENSES`. *Kind:* K1 assign (token tray) + K7. *Effort:*
L. *Value:* 5.

**Proposal B: Match and violation.** Attack → defence as match pairs. Violation: a second MAC
arrives on a port; tap protect / restrict / shutdown bins, and the port icon shows the result
(err-disabled triangle, counter tick). *Core:* `VIOLATION_TEXT`, `portSecurityViolation`.
*Kind:* K3, K2. *Effort:* S. *Value:* 3.

### 15 Locksmith (6 levels)

**Today:** `ssh` (choice + order), `aaa` (labels + choice), `files` (choice), `vpn` (choice),
`keys-drill`, `breakfix` (choice).

**What's weak:** Facts in lists. The SSH steps have a real order and real dependencies (no keys
without a hostname and domain), which a list hides.

**Proposal A: Pick the lock (SSH).** A lock with five pins and the SSH config lines as tiles.
Drag or tap the tiles into order; each correct line raises a pin. A key line placed before the
domain name jams the lock with the reason. *Break-Fix:* a config is shown; tap the missing or
wrong line, and the lock shows which pin can't lift. Doing it for real in the CLI comes with the
M6+ CLI work. *Core:* `sshGaps`, `sshConfigLines`, `SSH_GAPS`. *Kind:* K5 (order) + K1 on code.
*Effort:* S. *Value:* 4.

**Proposal B: Wrap the packet (VPN).** Header blocks (new IP header, ESP header, original IP
header, data, ESP trailer) in a tray. Stack them into the packet for tunnel mode, then for
transport mode. The difference (the original IP header kept or wrapped) becomes something you
see. The facts table should move from `generator.ts` into core. *Kind:* `order` with a stacked
drawing. *Effort:* S. *Value:* 4.

**Proposal C: Sorting.** AAA facts into TACACS+ / RADIUS / both bins; file transfers swiped
"encrypted" or "clear text". *Kind:* K2, K4. *Effort:* S. *Value:* 2.

### 16 Airwaves (5 levels)

**Today:** `channels` (labels, graded by "neighbours differ"), `rf` (choice and keypad),
`security`, `ap-ports`, `airwaves-drill`.

**What's weak:** The channel plan is the right puzzle, but it is a list of APs with dropdowns.
The plan calls for a floor plan with interference you can see.

**Proposal A: Floor planner.** A floor grid with APs and their coverage circles. Tap an AP to
cycle channel 1 → 6 → 11. Each channel has its own number and hatch pattern. Two neighbours on
the same channel show a striped clash zone where their circles overlap, live. The puzzle is
solved when no clash remains (any valid plan counts, as today). *Ramp:* a small grid → bigger
irregular floors → the player places the APs too, to cover every room (K8). 5 GHz with wider
channels needs channel sets in `core/wireless` first. *Core:* `channelConflicts`,
`planChannels`, `NON_OVERLAPPING_24`. *Kind:* K1 assign on a new floor visual; K8 for placing
APs. *Effort:* M. *Value:* 4.

**Proposal B: RF lab.** An AP and a laptop with a signal bar between them. Drag obstacles (a
concrete wall, a metal cabinet, a fish tank, a microwave) into the path. First pick the effect
(absorption, reflection, scattering, interference), then see the signal and SNR bars change.
*Core:* `RF_OBJECTS`, `RF_EFFECT_LABELS`, `snr`. *Kind:* K8 + K2. *Effort:* M. *Value:* 3.

**Proposal C: Will it connect?** Client card + WLAN card (WPA2/WPA3, Personal/Enterprise);
swipe "connects" or "fails". AP ports: tap each AP's link on the diagram to set access or trunk.
*Core:* `WIFI_SECURITY`, `AP_PORT`. *Kind:* K4, K1 assign. *Effort:* S. *Value:* 3.

### 17 NOC Night Shift (7 levels)

**Today:** `severity` (choice + order), `trap` (choice + labels), `snmp`, `mgmt`, `ai-desk`
(choice), `night-drill`, `breakfix` (choice on logging config lines).

**What's weak:** A night shift should feel like a stream of events to sort. Today it is a quiz.
Real syslog lines, captures and traceroutes wait for samples.

**Proposal A: Trap threshold slider.** A vertical ladder of severities 0 (Emergency) to 7
(Debug). Drag a "logging trap" marker onto a level; the levels that reach the server light up.
Questions then ask "set the trap so the server gets warnings and worse". *Core:* `SEVERITIES`,
`levelsIncluded`. *Kind:* K6 (a one-column cell board with a divider). *Effort:* S. *Value:* 3.

**Proposal B: The console (Drill).** Event cards stream in, described in plain words (not
fake syslog lines) with their severity. Three bins: ignore, watch, wake someone, judged by the
rule stated at the start of the shift. Severity in, the right bin by the rule out. *Core:*
`SEVERITIES`, `levelsIncluded`. *Kind:* K2 queue mode. *Effort:* S. *Value:* 3.

**Proposal C: The AI desk.** An agent's proposed actions arrive as cards; swipe "may do alone"
or "needs a human". Prompt round: build a prompt from chips (persona, task, output format,
data), where some chips are traps (a chip that pastes a password or customer data into a public
tool). *Core:* the AI rules cited in `generator.ts`, which should move to `core/ops`. *Kind:* K4,
K5 chips. *Effort:* S. *Value:* 3. SNMP and management approaches: match pairs (`SNMP_OPS`,
`MGMT`), K3, S, value 2.

### 18 Playbook Runner (4 levels)

**Today:** `modules`, `fill`, `yaml`, `runner-drill`, all `choice`.

**What's weak:** v2.0 expects hands-on Ansible, and YAML indentation is a physical skill. Picking
"which line breaks" from four choices doesn't practise it.

**Proposal A: Indent fixer.** The playbook is shown as code lines. Tap a line, then use the big ◀
▶ buttons to move it two spaces left or right. Each change runs the real YAML parser, and a
status chip reads "loads" or "breaks at line N". *Ramp:* one bad line → a tab character (shown
as a visible ⇥ glyph) → two bad lines. *Core:* `checkYaml`. *Kind:* K5 (indent mode). *Effort:*
S. *Value:* 4.

**Proposal B: Fill and run.** Blanks in the playbook (`hosts:`, module, `commands:`,
`register:`) are filled from chips. "Run" then shows a neutral board of inventory hosts, each
lighting up as reached, not Ansible-style output (that waits for a sample). Idempotence: run an
`ios_config` play twice; the second run shows "nothing changed" icons. *Core:* `IOS_MODULES`,
`checkYaml`. *Kind:* K5. *Effort:* M. *Value:* 4.

**Proposal C: Inventory.** Drag hosts into groups, then tap which hosts `hosts: branch` targets.
*Kind:* K2 + K1. *Effort:* S. *Value:* 3.

### 19 Blueprint Builder (4 levels)

**Today:** `vm-container` (labels), `hypervisors` (labels), `briefs` (choice), `quick-fire`.

**What's weak:** A "builder" game with nothing to build.

**Proposal A: Stack builder.** Layer blocks (hardware, host OS, hypervisor, guest OS, container
engine, app) in a tray. Build the stack for a type 1 VM, a type 2 VM and a container. Type 1 vs
type 2 becomes "does the hypervisor sit on the hardware or on an OS". *Core:* the facts table in
`generator.ts`, which should move to core (backlog: virtualisation facts). *Kind:* `order` with a
stacked drawing. *Effort:* S. *Value:* 4.

**Proposal B: Quick-fire.** Fact cards into VM / container / both bins; product cards into type 1
/ type 2. *Kind:* K2. *Effort:* S. *Value:* 2.

**Proposal C: Rack it.** A brief plus servers drawn as racks. Place workloads as VMs or
containers; each piece carries its need ("own kernel", "boots in seconds", "Windows on a Linux
host"). A wrong platform shows the clash. *Kind:* K8. *Effort:* M. *Value:* 3.

---

## 5. Cross-game ranking

Score = games served × learning value ÷ effort (S = 1, M = 2, L = 3). The learning value is the
typical value of that kind's proposals above.

| Rank | Kind               | Games served (from section 4)                                                                                                                           | Value | Effort | Score |
| ---- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ | ----- |
| 1    | K1 Tap the diagram | 16: Subnet, Cable, Frame Run, Root Wars, Port Architect, Neighbor, Longest Match, Adjacency, Gateway, Help Desk, Passport, ACL, Port Defender, Airwaves, Locksmith, Playbook | 5     | M      | 40    |
| 2    | K2 Sort into bins  | 10: Hex, Cable, Neighbor, Longest Match (lanes), Port Defender, Locksmith, Airwaves, NOC, Playbook, Blueprint                                           | 3     | S      | 30    |
| 3    | K5 Code tiles      | 7: Longest Match, Passport, ACL, Locksmith, NOC, Playbook, Help Desk                                                                                    | 4     | S      | 28    |
| 4    | K4 Swipe deck      | 7: ACL, Hex, Adjacency, Gateway, Airwaves, Locksmith, NOC                                                                                               | 3     | S      | 21    |
| 5    | K6 Bit board       | 5: Subnet, Hex, ACL, Gateway, NOC (trap slider)                                                                                                         | 5     | M      | 12.5  |
| 6    | K3 Match pairs     | 4: Help Desk, Passport, Port Defender, NOC                                                                                                              | 3     | S      | 12    |
| 7    | K7 Packet path     | 7: Frame Run, Passport, Root Wars, Longest Match, ACL, Gateway, Port Defender (and the Capstone later)                                                  | 5     | L      | 11.7  |
| 8    | K8 Grid placement  | 3: Subnet (VLSM), Airwaves (floor and RF lab), Blueprint                                                                                                | 4     | M      | 6     |

Reading the table:

- **K1 is the clear first build.** It reuses the renderers that exist and the question types
  that exist. Its pick mode is a `ChoiceQuestion` with anchors; its assign mode is a
  `LabelsQuestion` with anchors.
- **K2, K5 and K3 are almost free.** K2 is another way to draw `LabelsQuestion`. K5 reuses the
  drag-to-slot code in `OrderView`. K3 is the wire board with two card columns in place of a
  plug. Together they lift most of the weak "learn the facts" levels.
- **K6 and K7 score lower on the formula but carry the most-examined skills** (subnetting,
  wildcards, per-hop headers, frame forwarding). Build them right after the cheap kinds, not
  last.
- **K4 swipe** is cheap and makes the Drill levels feel like games; it is the "bouncer at the
  door" that ACL Bouncer was named for.
- **K8** serves fewer games; build it when VLSM packing and the Airwaves floor planner are next.

---

## 6. Build order

Each step ships on its own: one new kind (or mode), moved onto a handful of existing levels,
with tests, without changing any generator output for released level ids.

| Step | Ships                                                                                                                                                                                                               | Kind      | Effort |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ |
| 1    | **Sort into bins** as a second view of `LabelsQuestion` (fixed bin order, equal-size grid, from the backlog). Hex Garden types, Blueprint quick-fire, Locksmith AAA, Cable Doctor triage, NOC console.               | K2        | S      |
| 2    | **Tap the diagram, pick mode.** `anchors` on visuals plus hotspots in the topology, table and code renderers. Root Wars root and root port, Neighbor Detective (with several mistakes, new level id), Longest Match rows, ACL bad line, YAML bad line, router ID row. | K1        | M      |
| 3    | **Tap the diagram, assign mode** (cycle and token tray). Root Wars "paint the ports", DR/BDR on the wire, Port Defender trust, Airwaves floor channels, AP ports, cable types per link.                                | K1        | S      |
| 4    | **Swipe deck + Drill queue.** ACL door (with "tap the line" in Learn), Hex Garden legal or broken, Wi-Fi "will it connect?", AI desk, FHRP preempt.                                                                    | K4        | S      |
| 5    | **Bit board.** Subnet Sprint scratchpad and block ruler, ACL wildcard, EUI-64 workbench, IPv6 prune, trap slider.                                                                                                     | K6        | M      |
| 6    | **Match pairs + code tiles.** DNS records, attack → defence, NAT terms, SNMP; static-route and NAT command builders, Playbook fill and indent, SSH lock.                                                               | K3, K5    | S–M    |
| 7    | **Packet path.** Frame Run "be the switch", then Packet Passport hop-by-hop stamps, then replay for STP cut, FHRP failover and ACL test volleys.                                                                      | K7        | L      |
| 8    | **Grid placement + Port Defender waves.** VLSM packing (new level id, rule check in core), AP placement, Blueprint racks; lane defence built from K1 tray + K7 waves.                                                  | K8 (+K7)  | L      |

After step 3 every game except Port Architect has at least one level you play on a picture.
After step 7 the two "journey" games (Frame Run, Packet Passport) work the way the plan
describes.

---

## 7. Phone constraints and accessibility

**Layout and thumbs.** At 390×844 the picture goes in the top half and the controls (bins,
swipe buttons, tray, Check) in the bottom third, where the thumb reaches. Nothing is fixed to the
top of the screen (theme rule). One screen per question still holds: diagrams over about 6
devices need fewer labels or a "tap to zoom one switch" view, not page-wide pan and zoom.

**Tap first, drag optional.** Every drag has a tap–tap alternative (tap the item, then tap where
it goes), as the wire board already does. This meets WCAG 2.5.7 (dragging movements), and is
faster for one hand. Swipes always have two big buttons as well; flings into bins are a
shortcut for tapping a bin.

**Hit areas.** Ports, bits and table rows are drawn small, but each gets an invisible hit area of
at least 48×48 px. Where hit areas would overlap (ports close together on a small switch), the
first tap zooms that device and the second tap picks the port. A 32-bit board on a phone is 4
rows of 8 cells, about 44 px wide each; make the row the hit target for the prefix bar and the
cell for flips, or use 2 rows of 16 on wide screens only.

**Colour.** Never only colour (Game Accessibility Guidelines). STP roles use shapes and letters
(R circle, D square, A crossed); Wi-Fi channels use numbers plus hatch patterns; the network and
host parts of the bit board use solid vs hatched fill; right and wrong use ✓ and ✕ plus text.
Check each new visual with a colour-blindness simulator before it ships.

**Keyboard and screen readers.** Arrow keys move between hotspots; Enter or Space selects;
number keys pick bins (1–6) and swipe sides (← →); Tab reaches the tray. Each hotspot has an
`aria-label` ("SW2 Gi0/2, designated"). Animations (packet path, frame copies) respect
`prefers-reduced-motion` and can be skipped with a "Show result" button. Each animated step also
has a text line, so nothing is learned only from motion.

**Timers and pressure.** Queues, lives and falling items stay in Drill. Learn levels are untimed
and always explain (design rule 3).

**Text.** Card and chip text at least 20px. If a long address doesn't fit a card at 20px, the
card wraps or shrinks the layout, never the text.

---

## 8. Sources

Genre and design references (mechanics borrowed only, nothing copied):

| Reference                                         | What we borrow                                                                                  | Link                                                                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Planarity (graph untangling puzzle genre)         | Dragging nodes to fix a drawing; the picture is the answer (Neighbor Detective map)              | https://en.wikipedia.org/wiki/Planarity · https://www.chiark.greenend.org.uk/~sgtatham/puzzles/doc/untangle.html |
| Number Link / Flow-style path puzzles             | Drawing connections between pairs; break when crossing (match pairs, map links)                  | https://en.wikipedia.org/wiki/Number_Link                                                                         |
| Line-drawing network sims (Mini Metro-style)      | Drawing lines between stations; live re-routing under pressure (route rush)                      | https://store.steampowered.com/app/287980/Mini_Metro/                                                             |
| Tower defence genre, lane-grid variant            | Lanes, a tray of defences, waves, placement matters most (Port Defender)                         | https://en.wikipedia.org/wiki/Tower_defense · https://strategywiki.org/wiki/Plants_vs._Zombies/Gameplay          |
| Swipe-decision card games (Reigns-style)          | Binary swipe as the only verb; peek before committing (ACL door, AI desk)                        | https://www.pcgamer.com/how-reigns-and-its-forthcoming-sequel-make-their-tinderocracy-work                       |
| Document-inspection games (Papers, Please-style)  | Queue at a checkpoint, cross-check a card against posted rules, rules grow over time (ACL door) | https://www.gamedeveloper.com/design/designing-the-bleak-genius-of-i-papers-please-i-                            |
| Sliding-tile merge puzzles (2048)                 | Merging and splitting blocks by size (VLSM packing, block sizes)                                 | https://en.wikipedia.org/wiki/2048_(video_game)                                                                   |
| Falling-block games and transfer research         | Falling pressure for Drill only; Learn stays reflective                                          | https://escholarship.org/uc/item/8tn4h59s (Pilegard & Mayer 2018, "Game over for Tetris as a platform for cognitive skill training") |
| Bit-flipping games (Cisco Binary Game, Flippy Bit) | Tap bits to reach a target value; readout updates live (bit board)                              | https://gist.github.com/LimeShep/9fb6f38cf0a2b8a721288b838bcbe0b0 · https://apps.apple.com/us/app/id853100169    |
| Cisco Subnetting Game, subnet practice sites      | Endless generated subnet problems with instant feedback (what Subnet Sprint already does)        | https://newsroom.cisco.com/c/r/newsroom/en/us/a/y2007/m03/cisco-launches-subnetting-game.html · https://crucialexams.com/study/simulations/subnet-machine/start |
| Instruction-puzzle games (Human Resource Machine) | Small fixed toolbox of commands, assemble a program from tiles (code tiles)                      | https://en.wikipedia.org/wiki/Human_Resource_Machine                                                              |
| Logic grid puzzles                                | Elimination grid; mark yes/no per pair (OSPF mismatch, attack/defence)                           | https://brilliant.org/wiki/elimination-grids/                                                                     |
| Brilliant interactive problems                    | Manipulate the idea directly; feedback while reasoning is fresh; simplest case first             | https://brilliant.org/resources/choosing-brilliant/how-brilliant-teaches-math/                                   |
| PhET implicit scaffolding                         | Constraints and live feedback guide without text (snap-to-aligned blocks, live clash zones)      | https://arxiv.org/abs/1306.6544                                                                                   |
| Duolingo exercise types                           | Tap the pairs, word bank chips into blanks, easy types first (match pairs, code tiles)          | https://duolingo.fandom.com/wiki/Exercise                                                                         |
| Khan Academy Perseus widgets                      | Exercises as reusable React widgets, including interactive graphs (our kinds)                    | https://github.com/Khan/perseus                                                                                   |
| Cisco Packet Tracer / NetAcad                     | Drag devices and cables onto a workspace (faceplate, patch links)                                | https://www.cisco.com/web/learning/netacad/course_catalog/PacketTracer.html                                       |

Accessibility:

- WCAG 2.2, 2.5.7 Dragging Movements: https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements
- Game Accessibility Guidelines, no information by colour alone:
  https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-a-fixed-colour-alone/
