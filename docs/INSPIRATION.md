# Design inspiration from real games

Research notes for the eight interaction kinds in [MECHANICS.md](MECHANICS.md) section 3
(K3 Match pairs, K4 Swipe deck, K5 Code tiles, K6 Bit board, K7 Packet path, K8 Grid
placement). For each kind there are 4–6 well-known games. Each table gives what the player does,
what we could borrow and a source. Below each table, per game: **feel** (feedback and juice),
**ramp** (how difficulty grows), **teaches** (how it teaches through play) and **avoid** (what
won't work on a 390 px phone or in a learning tool).

Rule 7 of MECHANICS.md applies: we borrow mechanics and UX only. No names, art, characters or
levels are copied. Haptics note for the whole document: the Web Vibration API does not work in
any iOS browser and Firefox removed it in v129 ([caniuse](https://caniuse.com/vibration),
[MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate)). Haptic feedback
can only be an extra on Android Chrome. Every cue below must also work as a visual cue.

A line marked *(play knowledge)* comes from knowing the game, not from the linked source.

## Jump to

1. [Swipe deck (K4)](#1-swipe-deck-k4)
2. [Bit board (K6)](#2-bit-board-k6)
3. [Match pairs (K3)](#3-match-pairs-k3)
4. [Code tiles (K5)](#4-code-tiles-k5)
5. [Packet path (K7)](#5-packet-path-k7)
6. [Grid placement (K8)](#6-grid-placement-k8)
7. [Cross-cutting juice](#7-cross-cutting-juice)

---

## 1. Swipe deck (K4)

| Game | What you do | What we borrow | Source |
| --- | --- | --- | --- |
| Reigns (Nerial, mobile) | Drag a card left or right to answer an advisor. Four meters at the top change. | **Preview while dragging:** as the card tilts, the choice label shows on the card and dots appear over the meters it will change; a bigger dot means a bigger effect. For us: while you drag an ACL packet card, mark which ACL line it will hit before you let go (Learn only). | [Game Developer deep dive](https://www.gamedeveloper.com/design/game-design-deep-dive-creating-an-adaptive-narrative-in-i-reigns-i-) · [AppSpy](https://www.appspy.com/features/tinder-disasterpeace-and-epic-binary-choices-why-reigns-should-be-your-next-ios-game/) · [Android Central guide](https://www.androidcentral.com/reigns-beginners-guide) |
| Papers, Please (Lucas Pope, PC/iPad) | Check papers at a border booth against the day's rules, then stamp approve or deny. | **The rulebook grows by one rule per day**, posted as a bulletin *before* the queue starts. **Inspect mode:** tap two things that disagree to flag a mismatch. **A citation slip** after a mistake names the rule you broke. For ACL Bouncer: one new ACE per round, then "tap the line and the field that clash". | [Game Developer](https://www.gamedeveloper.com/design/designing-the-bleak-genius-of-i-papers-please-i-) · [Mechanics of Magic](https://mechanicsofmagic.com/?p=2176) |
| Factitious (American University JoLT, browser) | Read a short news story, swipe right for real or left for fake. | **The answer card explains why** right after each swipe ("cites sources you can check", "quotes a named person"). It is a learning tool that went viral on swipe alone. | [NPR](https://www.npr.org/sections/ed/2017/07/03/533676536/test-your-fake-news-judgement-play-this-game) · [The Next Web](https://thenextweb.com/news/learn-to-spot-fake-news-with-this-tinder-style-browser-game) |
| Swipe flashcard apps (Deckster, Flippy, QuizJam) | Tap to flip a card, swipe right for "know it", left for "review again". | **Left swipes go back into the deck** for review in the same session. That is our review queue, shown as a pile size. | [Flippy (App Store)](https://apps.apple.com/app/id1522268839) · [Deckster](https://awesome.ecosyste.ms/projects/github.com%2Ffoobar404%2Fdeckster) · [QuizJam](https://github.com/mgorkani/QuizJam) |
| Not Not (Altered Matter, mobile) | Read a short rule ("not left") and swipe the right way before the timer runs out. | **One new rule twist per level** in the main mode, plus a separate endless challenge mode. Fits our split of Learn (one concept per level) and Drill (endless). | [App Store](https://apps.apple.com/us/app/-/id1107589341) · [Pocket Gamer review](https://ee.pocketgamer.com/articles/084198/not-not-review-think-you-can-read-think-again/) |

**Reigns.** *Feel:* the card tilts with your thumb. Past a threshold it commits and flies off.
The meters fill or drain, and you see the result at once. *Ramp:* cards are weighted by the
current state, so pressure builds as meters reach their limits. *Teaches:* the dots teach which
stat a kind of card touches without any text. *Avoid:* the dots show size but not direction.
Learners need the direction (permit or deny), or the preview becomes guessing. Death screens
are fine for a game but not in Learn.

**Papers, Please.** *Feel:* a loud stamp, a clacking shutter, a short desk shake *(play
knowledge)*. *Ramp:* rules stack day by day. On days with long dialogue the rules are made
easier to make up for lost time. *Teaches:* the bulletin brings one new rule. Pope found players
ignored the bulletin when someone spoke to them right away, so new rules need a quiet moment
before the first card. *Avoid:* a big desk with documents you drag around needs a large
screen. On a phone, show one card plus a rule strip you can tap to open.

**Factitious.** *Feel:* plain correct or incorrect banner and a score. *Ramp:* rounds get
harder stories. *Teaches:* the explanation after each swipe is the lesson. *Avoid:* long
article text on a card. Our cards must hold one fact at ≥20 px (a 5-tuple, an address).

**Swipe flashcards.** *Feel:* the card follows your finger with a tint and a ✓ or ↺ icon at the
edge. *Teaches:* self-rating plus spaced review. *Avoid:* self-rated "I knew it". Our swipe must
be judged by `src/core`, not by the player.

**Not Not.** *Feel:* fast, with the background tint showing the swipe direction. *Ramp:* new
negation layers. *Teaches:* reading carefully under time pressure. *Avoid:* reviewers complained
about ads after every death. Keep "game over" cheap: one tap to retry, no wait.

**Borrow list for K4:**

- **Live preview during the drag** (Reigns): the label shows on the card past about 25 % of
  the swipe distance. Let go before the commit point and the card springs back. This lets the
  learner take back a swipe before it counts.
- **One rule per round, posted before the queue** (Papers, Please), with a "new" badge on the
  rule strip.
- **Reason card after each answer** (Factitious). In Learn it stays until you tap. In Drill it
  stays about 1 s and goes to the end-of-round recap.
- **Mistakes go back into the deck** (flashcards), with the pile size shown as a number.
- **Two big buttons always visible**, ✕ Deny on the left and ✓ Permit on the right, under the
  card in the thumb zone. Swiping is a shortcut.

---

## 2. Bit board (K6)

| Game | What you do | What we borrow | Source |
| --- | --- | --- | --- |
| Flippy Bit & the Hexadecimals (Q42, mobile/web) | Enemies with a 2-digit hex number come down. Flip 8 bits at the bottom to match the number and fire. | **The bit row is the weapon.** A match fires at once, with no Submit button. Our Subnet Sprint and EUI-64 Drill could check live: when the bits equal the target, the round clears. | [App Store](https://apps.apple.com/app/id853100169) · [TouchArcade](https://toucharcade.com/games/flippy-bit-the-hexadecimals) |
| Cisco Binary Game (Cisco Learning Network, browser) | Rows rise from the bottom. Each row is a decimal to build from bits, or bits to read as a decimal. | **Two directions in one game** (bits → number, number → bits). **Rows stack up** as a visible pressure meter. Levels ramp by number range (0–15, then 0–255, then hex). | [Game Developer](https://gamedeveloper.com/game-platforms/cisco-teaches-binary-system-with-educational-game) · [Montana State PDF](https://www.montana.edu/csoutreach/Looney-challenges/Binary_Scratch_CiscoGames_Sept23_2015.pdf) |
| 0h h1 (Q42, web/mobile, a Takuzu binary puzzle) | Tap cells to cycle empty → colour A → colour B until the grid follows three rules. | **When you break a rule the game names it.** **Lock cells you are sure of. Undo the last tap. Hint button.** Starts at 4×4 and grows. | [Game Informer](https://www.gameinformer.com/b/news/archive/2014/11/21/check-out-this-free-minimalist-browser-puzzle-game-called-0h-h1.aspx) · [Takuzu rules](https://en.wikipedia.org/wiki/Takuzu) |
| CS Unplugged binary cards (classroom, plus online version) | Turn over cards worth 16, 8, 4, 2, 1 dots so the dots shown add up to a target. | **Each bit shows its place value as a quantity** (dots, or a block whose width is its weight), not only "1". Shows the pattern that each bit flips half as often as the one to its right. | [CS Unplugged](https://www.csunplugged.org/en/topics/binary-numbers/how-binary-digits-work/) · [activity PDF](https://unplugged.canterbury.ac.nz/en/activities/binary.pdf) |
| Brilliant interactive lessons | Change a model (toggle, slider) and watch a readout update before answering. | **Reacts while you reason:** the decimal and mask readouts update on every flip, so the learner tries things before Check. Concrete first, notation later. | [How Brilliant teaches](https://brilliant.org/resources/choosing-brilliant/how-brilliant-teaches-math/) |

**Flippy Bit.** *Feel:* each bit is a big toggle that lights up. The enemy blows up when the
bits match. *Ramp:* more enemies and faster ones. *Teaches:* there is no tutorial, so you learn
by trying. Reviewers found the start steep for adults. *Avoid:* no tutorial is wrong for us.
Learn levels must show the place values first. Reviewers also noted a lag between a match and
the shot. A match must react at once.

**Cisco Binary Game.** *Feel:* score pops, and the row clears when correct. *Ramp:* rows rise
faster, and the number range grows. *Teaches:* by repetition you start to spot patterns (128 +
64 = 192 and so on). *Avoid:* the speed only suits Drill (MECHANICS rule 3).

**0h h1.** *Feel:* soft colour fill, a calm look, a short wobble on a broken rule *(play
knowledge)*. *Ramp:* grid size. *Teaches:* the error message names the rule. That is our
`describe()`. *Avoid:* tap to cycle through three states is slow for 32 bits. For bits, use
two states only. Colours need a shape or a 0/1 digit as well.

**CS Unplugged.** *Teaches:* place value made physical, in the order "count the dots, then
write 0/1". *Avoid:* dot counts above 32 don't fit on a phone. Use width-scaled bars (the 128
cell is visibly wide) or a value printed under each cell.

**Brilliant.** *Teaches:* feedback while the reasoning is still fresh, and a chance to revise.
*Avoid:* free exploration with no goal. Each board still needs a target.

**Borrow list for K6:**

- **Live readout under every octet** (Brilliant): the decimal value, and for masks the
  prefix length, update on every flip.
- **The board clears itself when it matches the target** (Flippy Bit) in Drill. Learn keeps a
  Check button so the learner can think.
- **Place value printed under each cell** (128 64 32 …), always visible in Learn and faded in
  Drill (CS Unplugged).
- **Name the rule that broke** (0h h1): "Masks must be contiguous 1s: bit 13 is 0 but bit 14
  is 1." The text comes from `src/core`.
- **Lock and undo** (0h h1): long-press or a lock toggle to freeze an octet, plus one undo
  button.
- **Range ramp** (Cisco Binary Game): a single octet 0–15, then 0–255, then 4 octets, then
  hex groups.

---

## 3. Match pairs (K3)

| Game | What you do | What we borrow | Source |
| --- | --- | --- | --- |
| Duolingo "Tap the pairs" / Match Madness (mobile) | Two columns of word chips. Tap one on each side to pair them. Match Madness adds a timer and new pairs keep arriving. | **Tap–tap pairing, no drag.** A correct pair locks and fades. A wrong pair flashes and both go back to normal *(play knowledge)*. Match Madness: **refill** (matched slots get new cards) plus a **combo counter**. | [Duolingo blog: ways to practise](https://blog.duolingo.com/ways-to-practice-in-duolingo) · [Lingoly](https://lingoly.io/duoling-match-madness/) · [Duolingo guides](https://duolingoguides.com/madness-challenge-duolingo/) |
| Quizlet Match (web/mobile) | Drag a term onto its definition (or tap both). A timer runs. Best time is saved. | **Beat your own time** as the Drill goal (a personal best, no leaderboard needed). Cards vanish when matched, so the board shrinks to an end you can see. | [Purdue teaching hub](https://onlineteachinghub.education.purdue.edu/quizlet/) |
| Flow Free (Big Duck Games, mobile) | Draw a pipe from a dot to its partner. Fill the whole grid with no crossings. | **Drawing a new pipe across an old one cuts the old one** *(play knowledge)*, so fixing a mistake is a single move. **✓ on completion, ★ for a "perfect" solve** in the fewest moves. **A haptic tick and a "plop" on each connection.** | [Wikipedia](https://en.wikipedia.org/wiki/Flow_Free) · [App Store](https://apps.apple.com/us/app/id526641427) |
| Concentration / Memory (card game, many apps) | All cards are face down. Flip two per turn and keep them if they match. | **Pairs can be two different things** (a term and its definition, upper and lower case). Mostly a caution: hidden cards test memory, not understanding. | [Wikipedia](https://en.wikipedia.org/wiki/Concentration_(card_game)) |

**Duolingo pairs.** *Feel:* chips press down when tapped. A correct pair turns muted and is
disabled. A streak popup ("5 in a row") appears *(play knowledge)*. *Ramp:* Match Madness has
timed rounds of about 1:45 each, three or more rounds, and timer boosts. *Teaches:* retrieval
under light pressure. Easy exercise types come first in a lesson. *Avoid:* audio-only chips (we
have no audio). Chips with long text don't fit two columns at 390 px: at about 175 px per
column, a chip holds about 14 characters at 20 px. Long items (DNS record meanings) need one
left column of short keys and full-width answer cards stacked below.

**Quizlet Match.** *Feel:* matched cards vanish and the timer is always visible. *Avoid:* drag
only is a WCAG 2.5.7 problem. Always offer tap–tap.

**Flow Free.** *Feel:* haptic and sound on each link, and a ✓ or ★ on the level map. *Ramp:*
5×5 with 3 colours up to 15×15 with 16 colours, then new rule packs (bridges, hexes, wraps).
*Teaches:* constraint reasoning. *Avoid:* colour is the only pairing key, which fails for colour
blindness (later versions add labels). Grids larger than about 7×7 are fiddly on a phone.

**Concentration.** *Avoid:* hidden cards. For us both columns stay face up. The hidden-card
twist could only be a rare Drill bonus.

**Borrow list for K3:**

- **Tap left, tap right, done.** The selected chip lifts and gets a thick outline plus a "1"
  badge. The pair is drawn with a line between the cards (wire board style), so the result is
  not shown by colour alone.
- **Correct pairs lock and dim, with a ✓ on both cards.** A wrong pair shakes once (or, with
  reduced motion, gets a ✕ badge for 600 ms), both cards come free again, and a mistake is
  counted.
- **Refill in Drill** (Match Madness): a matched slot gets the next card, so the board never
  empties until the queue does. Combo counter for clean matches in a row.
- **Re-pair to fix** (Flow): tapping a paired card and then another card moves the link. No
  separate "unlink" step.
- **★ for zero mistakes, ✓ for done** on the level map (Flow).

---

## 4. Code tiles (K5)

| Game | What you do | What we borrow | Source |
| --- | --- | --- | --- |
| Human Resource Machine (Tomorrow Corporation, PC/mobile) | Drag commands from a short toolbox into a program list. Run it and watch a worker carry boxes from the inbox to the outbox. | **The toolbox grows by one or two commands per level.** **Run, step, and speed controls.** The program **stops at the first wrong output** and shows what was expected. Optional **size and speed targets** for a second star. | [Wikipedia](https://en.wikipedia.org/wiki/Human_Resource_Machine) |
| Lightbot (Danny Yaroslavski, web/mobile) | Put arrow, jump and light tiles into MAIN plus two procedure slots with a fixed number of spaces. Press play and the robot runs them. | **Fixed slot counts force the concept.** MAIN has too few slots, so you must use a procedure. **The running tile is highlighted** as the robot moves, which turns debugging into watching. | [Wikipedia](https://en.wikipedia.org/wiki/Lightbot) · [WPI game analysis](https://web.cs.wpi.edu/~rich/courses/imgd4600-c13/analyses/Light-Bot/pantaryl-game-analysis.html) · [Common Sense review](https://www.commonsense.org/education/reviews/lightbot-programming-puzzles) |
| Parsons problems (Runestone, research tool) | Drag mixed-up code lines into order, and indent them. Some lines are distractors. | **Adaptive help:** after a few failed tries, offer to make it easier by removing a distractor, merging two blocks, or giving the indentation. Research says this is as effective as writing the code and faster. **Distractors add load**, so use few in Learn. **Faded Parsons:** reorder and fill blanks. | [Runestone docs](https://runestone.academy/ns/books/published/authorguide/directives/parsons.html) · [Ericson et al., adaptive Parsons](https://par.nsf.gov/servlets/purl/10432947) · [Distractors study](https://profiles.wustl.edu/en/publications/distractors-in-parsons-problems-decrease-learning-efficiency-for-/) · [Variations survey](https://arxiv.org/html/2512.22407) |
| Swift Playgrounds (Apple, iPad/Mac) | Write real code by tapping suggestions in a shortcut bar above the keyboard. Run it and watch the character act. | **The author chooses which tokens the bar shows** for a lesson, so the chip bank shows only what is relevant. Real syntax from day one. | [Apple: shortcut bar docs](https://developer.apple.com/documentation/swift-playgrounds/customizing-the-completions-in-the-shortcut-bar.md) · [WWDC 2019](https://developer.apple.com/videos/play/wwdc2019/405) |
| Grasshopper (Google Area 120, phone) | Learn JavaScript on a phone. Tap code chips to insert them, and type only strings and names. | **A code keyboard of chips made for a phone.** Shows that real code entry works at 390 px if the chips are the keyboard. | [Wikipedia](https://www.wikipedia.com/wiki/Grasshopper_(mobile_app)) · [Career Karma review](https://careerkarma.com/blog/grasshopper-app-review/) |
| Duolingo word bank (mobile) | Build a sentence by tapping word chips into a line. Some chips are extras. | **Tap a chip to move it to the line, tap it again to send it back.** The chip leaves a grey gap in the bank so you can see where it came from *(play knowledge)*. | [Duolingo blog](https://blog.duolingo.com/ways-to-practice-in-duolingo) |

**Human Resource Machine.** *Feel:* the worker walks and carries, and a wrong box triggers a
manager pop-up with the expected value. *Ramp:* about 40 levels, each adding a command or
memory idea. *Teaches:* assembly through a visual metaphor. It is tested on random inputs, so
you can't hard-code. *Avoid:* long programs need scrolling and drag-to-reorder, which is
clumsy at 390 px. Our configs should be 3–8 lines.

**Lightbot.** *Feel:* tiles snap into slots, and the current tile glows during the run.
*Ramp:* procedures come after basic moves, loops via recursion later. Reviewers say "gets hard
fast". *Teaches:* constraints instead of text. *Avoid:* icon-only tiles. Ours must be real IOS
syntax.

**Parsons.** *Feel:* plain. Lines turn green or red after Check. *Teaches:* the strongest
research backing in this document. *Avoid:* drag-to-indent with small handles on a phone. Use
explicit ⇤ ⇥ buttons on the selected line.

**Swift Playgrounds / Grasshopper.** *Teaches:* real syntax with the typing removed. *Avoid:*
a full keyboard plus chips takes too much height on a phone. Pick one: chips, or our keypad.

**Duolingo word bank.** *Avoid:* too many extra chips. 2–3 distractors at most.

**Borrow list for K5:**

- **Tap to place, tap to return**, with a grey gap left in the bank (Duolingo). The bank holds
  only the tokens this level needs (Swift Playgrounds).
- **Slot limits as hints**: "this ACL uses 3 lines" shown as 3 empty slots (Lightbot). The
  learner knows the size of the answer.
- **Help button after 2 failed checks** (adaptive Parsons): remove one distractor, then
  pre-set the indentation, then merge two lines. Each step costs the ★ but not the ✓.
- **Run, step, and highlight the running line** (Lightbot, HRM): for ACL, step each test packet
  down the list. The line that matches glows, and a ✓ or ✕ shows beside it.
- **Second-star targets** (HRM): "fewest lines" for ACLs and static routes, as an optional ★.
- **⇤ ⇥ buttons** on the selected line for YAML indentation, never a drag handle alone.

---

## 5. Packet path (K7)

| Game | What you do | What we borrow | Source |
| --- | --- | --- | --- |
| Mini Metro (Dinosaur Polo Club, PC/mobile) | Drag lines between stations on a map. Trains run by themselves. New stations keep appearing. | **Overcrowding shows as a clock ring** that fills around a station. **Weekly upgrades** to choose between. **Redraw a line at any time** without penalty. | [Human Transit](https://humantransit.org/2014/03/the-lessons-of-mini-metro.html) · [GDC 2017 talk listing](https://www.gamedeveloper.com/design/attend-gdc-2017-and-learn-the-value-of-less-is-more-from-a-i-mini-metro-i-dev) · [Wikipedia](https://en.wikipedia.org/wiki/Mini_Metro_(video_game)) |
| Trainyard (Matt Rix, iPhone) | Draw tracks with a finger, press Start, and watch coloured trains run to matching stations. Fix the tracks after a crash. | **Plan, then run:** building and watching are two phases. **A crash stops the run where it happened** and you go back to editing with the tracks kept. **Speed control** for watching. Colour-blind mode. | [Pocket Gamer](https://www.pocketgamer.com/trainyard/review/) · [148Apps](https://www.148apps.com/reviews/trainyard) · [GeekDad](https://geekdad.com/2010/10/iphone-review-trainyards-tricky-tracks-transcend-trivial-tribulations/) |
| Pipe Mania / Pipe Dream (The Assembly Line, 1989, many ports) | Place pipe pieces from a queue onto a grid before the flow, which starts after a delay, reaches the open end. | **The flow front is the timer.** You see exactly how close the flow is to your last piece. **Preview of the next pieces in the queue.** | [Wikipedia](https://en.wikipedia.org/wiki/Pipe_Mania) |
| Net (Simon Tatham's Puzzles, web/mobile) | Rotate tiles until every tile joins one tree from a centre source, with no loops. | **Tiles linked to the source light up** as you work, which is built-in feedback for "can this host reach the router?". **Lock a tile** once you are sure. | [Net manual](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/doc/net.html) |
| Cisco Packet Tracer, Simulation mode (Cisco, desktop) | Send a PDU and press Capture/Forward to step it hop by hop. Click the envelope to see its headers by OSI layer. | **Time moves one event at a time, when you tap.** **An envelope per hop** with a ✓ or ✕ badge. **An event list** as a text log of each hop (our screen-reader track). | [Packt: Simulation mode](https://subscription.packtpub.com/book/cloud-and-networking/9781782170426/4/ch04lvl1sec22/using-the-simulation-mode) · [NetAcad PDU activity](https://contenthub.netacad.com/legacy/I2PT/1.1/en/course/files/3.1.1.3%20Packet%20Tracer%20-%20Explore%20Network%20Functionality%20Using%20PDUs.pdf) |
| "Be the router" classroom games (Router Game, Packetville / Pitching Packets, Netsim) | Players are hosts, switches and routers. They pass paper packets or beanbags and follow the rules of their device. | **The player is the device.** At each hop you decide what to do with the packet (forward out port X, rewrite a header, drop it). Netsim: build a packet and inject it, then watch. | [Router Game (TIB AV)](https://av.tib.eu/en/media/21213) · [Cisco blog: Pitching Packets](https://blogs.cisco.com/security/pitching-packets-game-teaches-cyber-security-with-beanbags) · [Netsim paper](https://www.cs.uwaterloo.ca/%7Eiang/pubs/netsim-ase17.pdf) |

**Mini Metro.** *Feel:* minimal and calm, tied to the music. The clock ring is a visual alarm
with no text. *Ramp:* stations spread out, and as lines grow longer, trains visit each stop
less often. *Teaches:* a trade-off you feel (one train per line). *Avoid:* precise line
dragging on a crowded map is hard at 390 px. Our topologies stay at 6 devices or fewer
(MECHANICS section 7).

**Trainyard.** *Feel:* trains move, colours mix and merge, and a crash puffs at the spot.
*Ramp:* 150 levels adding merge, split and paint. The tutorial explains each new piece
briefly. *Teaches:* the player predicts and the run shows if they were right. This is the
"what happens next" replay in MECHANICS. *Avoid:* drawing tracks freehand. We use tap-a-port.

**Pipe Mania.** *Feel:* the liquid creeping forward. *Avoid:* pressure in Learn. The creeping
flow belongs only in Drill.

**Net.** *Teaches:* reachability shown as lit and unlit. *Avoid:* rotate controls that use the
right mouse button or keys. On touch it is one tap = rotate 90°.

**Packet Tracer Simulation.** *Teaches:* per-hop headers by layer, the CCNA's own tool.
*Avoid:* the desktop event list and layer tabs are far too dense for a phone. Show one hop's
key fields (src/dst MAC, src/dst IP, TTL) as a card.

**Classroom router games.** *Teaches:* role play makes each device's rule concrete. *Avoid:*
nothing specific. The idea moves to our hop card well.

**Borrow list for K7:**

- **Two phases, plan and run** (Trainyard): the learner sets exit ports or ACL actions, then
  presses ▶ and watches. If it fails, the packet stops at the bad hop with a ✕ and a reason,
  and the plan stays editable.
- **Step button and speed button** (Packet Tracer, Trainyard): ▶ step, ▶▶ play, and "Show
  result" for reduced motion. Each hop adds a line to a text log.
- **Hop card** (Packet Tracer envelope): at each stop, a card shows the fields that change
  (MAC rewrite, TTL −1, NAT). In "be the device" mode the learner fills them in (router game).
- **Reachability glow** (Net): devices the frame can reach in the current state get a solid
  outline and a ✓. Unreachable ones are dashed.
- **Drill pressure shown as a ring that fills** (Mini Metro), not a number, around the switch
  whose queue is filling, plus a text count.

---

## 6. Grid placement (K8)

| Game | What you do | What we borrow | Source |
| --- | --- | --- | --- |
| 1010! / Block Blast (block puzzle apps) | Drag one of three given shapes onto a 10×10 grid. Full rows and columns clear. No gravity, no timer. | **No timer, plan at your own pace.** A **ghost shows where the piece will land** before you let go *(play knowledge)*. **Combo bonus for clearing several lines at once.** For VLSM: each subnet is a block whose size is a power of two, and a filled address range "clears". | [1010! App Store](https://apps.apple.com/us/app/id911793120) · [Tablo: Block Blast deep dive](https://tablo.com/libraries/yprl/discussions/12469-block-blast-a-deep-dive-into-the-addictive-puzzle-phenomenon) |
| Islanders (Grizzly Games, PC/mobile) | Place buildings from a pack. Points depend on what is nearby. Reach a score goal to get the next pack. | **Score preview before you commit:** while you hover, a circle shows the area of effect and +/− numbers float over the neighbours. **Placement is final**, so the preview is everything. | [Wikipedia](https://en.wikipedia.org/wiki/Islanders_(video_game)) · [Pocket Gamer (mobile)](https://www.pocketgamer.com/islanders-mobile/review) · [Kotaku](https://kotaku.com/islanders-is-almost-the-perfect-city-building-game-1833729123) |
| Kingdom Rush (Ironhide, mobile/PC) | Tap one of a few fixed build spots, pick a tower from a ring menu, and defend a path from waves. | **Fixed legal spots** instead of free placement. Tap a spot and a small ring menu opens on it, which is ideal for thumbs. **New tower or enemy types are held back** for later levels, with breather levels between hard ones. **1–3 stars per level.** | [Game Developer: level design](https://www.gamedeveloper.com/design/kingdom-rush---the-wonderful-campaign-level-design) · [Strategic points wiki](https://kingdomrushtd.fandom.com/wiki/Strategic_Point) · [Game Developer: TD rules](https://gamedeveloper.com/design/tower-defense-game-rules-part-1-) |
| Backpack Battles / Backpack Hero (inventory packing) | Fit odd-shaped items into a bag grid. Some items boost their neighbours. | **Adjacency marks** (small stars on the edges that get the bonus) show rules visually. For racks: "this server needs to sit next to a ToR switch". | [PC Gamer](https://pcgamer.com/games/arrange-your-items-to-optimize-your-fights-in-asynchronous-autobattler-backpack-battles) · [Epic Games: Backpack Hero](https://store.epicgames.com/news/backpack-hero-makes-inventory-management-a-blissful-delight) |
| Wi-Fi planners (Ekahau, NetSpot; professional tools) | Draw walls on a floor plan, place APs, and see the signal heatmap and channel overlap. | **Coverage drawn live as you drag an AP.** **Overlap zones for the same channel** marked as a clash. Tap a point to read the values there. The real job the Airwaves floor planner copies. | [Ekahau AI Pro](https://marketplace.cisco.com/en-US/apps/404912/ekahau-ai-pro) · [NetSpot planning tools](https://www.netspotapp.com/wifi-planning/best-wifi-planning-tools.html) |

**1010! / Block Blast.** *Feel:* the piece snaps to the grid, a cleared line flashes and pops.
Combo text. *Ramp:* the board fills. *Avoid:* the Tablo piece says these games tune the piece
generator and near-misses like slot machines. Don't copy random pieces or near-miss tuning: a
learning tool should be fair, so pieces come from `src/core`.

**Islanders.** *Feel:* calm, with floating +N numbers. *Ramp:* score goals unlock new packs.
*Teaches:* the rules come from the preview numbers, not a manual. *Avoid:* "cannot remove" is
harsh for learners. Let them undo in Learn.

**Kingdom Rush.** *Feel:* the ring menu blooms out of the spot. Stars on the map. *Ramp:*
held-back unlocks and breather levels. *Teaches:* each new enemy forces a gap in your plan
to show. *Avoid:* fast waves and micro-management. That stays in Drill (Port Defender).

**Backpack games.** *Avoid:* rotating shapes and dense item art at 390 px. Our pieces are
rectangles with text labels.

**Wi-Fi planners.** *Avoid:* free-form heatmaps and real RF maths. The coverage and clash shown
must come from a simple rule in `src/core` (circles on a grid, channel numbers), never
invented RF output.

**Borrow list for K8:**

- **Ghost and preview before you let go** (1010!, Islanders): the ghost shows the cells the
  piece will cover, with a ✓ outline if legal or a hatched ✕ outline if not, plus a +/− readout
  ("covers 3 more desks", "clashes with AP2 on channel 6").
- **Snap only to legal spots** (Kingdom Rush): legal anchors show as dashed boxes when a piece
  is picked up. Tap a spot, then pick from a small ring or tray (tap–tap).
- **Clash zones drawn with hatch plus a ✕ label**, never colour only (Wi-Fi planners).
- **"Line clear" for address blocks**: when a /24 is fully and legally used, it seals with a
  brief flash and a ✓ (1010! clear).
- **Held-back pieces and breather levels** (Kingdom Rush) in the level plan.

---

## 7. Cross-cutting juice

Small patterns from the games above that work for every kind. Juice means more feedback than
the input strictly needs, so each action feels like it counts
([Jonasson & Purho, "Juice it or lose it", GDC Vault](https://gdcvault.com/play/1016487/contactUs) ·
[summary](https://gamejuice.pages.dev/articles/juice-it-or-lose-it-lessons)). Each pattern
below includes its accessible version.

| Pattern | From | How it looks here | Accessible version |
| --- | --- | --- | --- |
| **Snap** | Flow, Lightbot, 1010! | A piece, chip or card eases into its slot in about 120 ms with a small 1.05× bump. | With reduced motion: no bump, just an outline change. The new state is shown by a shape or icon change, not motion alone. |
| **Commit threshold** | Reigns | Drag past about 25 % to show the label, past about 40 % to commit. Let go before that and it springs back. | The two buttons do the same thing. ← → keys work. |
| **Combo counter** | Duolingo, Match Madness, 1010! | "×3 clean" badge next to the score in Drill. It resets on a mistake. | A text badge at ≥20 px. No flashing (stay under 3 flashes per second). Never in Learn. |
| **Reason card** | Factitious, Papers, Please citation, 0h h1 | After each answer, one line from `describe()` naming the rule. | It is text, so screen readers read it (`aria-live="polite"`). It stays until tapped in Learn. |
| **Stars per level** | Flow, Kingdom Rush, HRM | ✓ done, ★ no hints and no mistakes, ★★ hits the stretch goal (fewest lines, under par time in Drill). | Stars plus a text label ("2 of 3 stars"). |
| **Progress map** | Kingdom Rush, Trainyard level packs, Duolingo path | The game's levels drawn as a path of nodes, each showing its stars. The next level pulses gently. | Pulse off with reduced motion. Each node is a ≥48 px button with "Level 4, 2 stars" as its label. |
| **Streaks with slack** | Duolingo streak and Streak Freeze | A day streak on the home screen, plus one free "rest day" a week. Duolingo found that some slack helps keep people coming back, and that keeping streak and daily goal separate helped retention. | Never punish. A broken streak shows a neutral message, not a sad character. |
| **Short milestone moment** | Duolingo streak milestone | A 1–2 s celebration at the end of a game (all levels ✓). Tap to skip. | Reduced motion shows a static badge. |
| **Live state glow** | Net, Brilliant, Islanders preview | The picture reacts before Check (lit path, readout, clash hatch). | Solid vs dashed, ✓/✕, hatch patterns. Text in the readout. |
| **Rules made adjustable, not "easy mode"** | Celeste Assist Mode | A per-game toggle for Drill: timer off or slower, more lives. No badge marks the save file (Celeste removed its badge after feedback). | This is itself the accessibility feature. Timers must be adjustable (WCAG 2.2.1). |
| **Fast retry** | Not Not (by contrast), Trainyard | Game over leads to a retry button in the thumb zone, one tap, no waiting screen. | Focus moves to Retry. |
| **Haptic tick (extra only)** | Flow Free | `navigator.vibrate(10)` on snap, Android Chrome only. | No support on iOS, so it must never carry meaning. Respect a "haptics off" setting. |

Sources for this section: [Duolingo: improving the streak](https://blog.duolingo.com/improving-the-streak) ·
[Duolingo: how streaks build habit](https://blog.duolingo.com/how-duolingo-streak-builds-habit) ·
[Duolingo: streak milestone animation](https://blog.duolingo.com/streak-milestone-design-animation) ·
[Celeste Assist Mode (Game Accessibility Guidelines)](https://gameaccessibilityguidelines.com/celeste-assist-mode) ·
[Vice on Celeste's Assist Mode change](https://www.vice.com/en/article/celeste-assist-mode-change-and-accessibility) ·
[WCAG 2.5.7 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements) ·
[Game Accessibility Guidelines: colour](https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-a-fixed-colour-alone/).

**Phone checklist (applies to every borrowed idea):** controls in the bottom third; every drag
has a tap–tap path; targets ≥48×48 px; text ≥20 px; right and wrong shown with ✓/✕ plus text;
all motion has a reduced-motion version and a "Show result" skip; timers and combos only in
Drill.
