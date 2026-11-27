# CCNA Mini-Game Series: Design Plan

*Planned 28 Nov 2026. Planning only, nothing built yet.*

## Jump to
- [1. Which exam version this targets](#1-which-exam-version-this-targets)
- [2. Shared building blocks](#2-shared-building-blocks)
- [3. The games](#3-the-games)
- [4. Coverage matrix](#4-coverage-matrix)
- [5. Suggested build order](#5-suggested-build-order)
- [6. Open decisions](#6-open-decisions)

---

## 1. Which exam version this targets

CCNA (Cisco Certified Network Associate) is the single exam 200-301. Two blueprints matter right now:

| Version | Last / first test date | Domains (weight) |
|---|---|---|
| **v1.1** (current) | Last day: **2 Feb 2027** | Network Fundamentals 20%, Network Access 20%, IP Connectivity 25%, IP Services 10%, Security Fundamentals 15%, Automation & Programmability 10% |
| **v2.0** (new) | First day: **3 Feb 2027** | Network Infrastructure & Connectivity 25%, Switching & Network Access 25%, IP Routing 20%, Network Services & Security 20%, AI and Network Operations & Management 10% |

**Design choice:** the series is built around **v2.0**, because any exam booked more than about 9 weeks from now will be v2.0. v2.0 leans hard on *troubleshooting and reading real output* (show commands, packet captures, syslog), and expects you to actually *run* Ansible, not just describe it. So most games make you diagnose, not just recall.

Topics that exist **only in v1.1** (dropped from v2.0) are kept in a separate optional pack, marked **[v1.1 pack]**: TCP vs UDP, NTP (Network Time Protocol), QoS (Quality of Service), TFTP/FTP (Trivial / File Transfer Protocol), REST APIs (Representational State Transfer application programming interfaces) and JSON (JavaScript Object Notation), software-defined architecture, WLC (wireless LAN controller) GUI (graphical user interface) setup, topology architectures, and security-program and password-policy concepts.

---

## 2. Shared building blocks

These are built once and reused by many games, so each new game is cheaper than the last.

1. **Question generators, not question banks.** Every drill makes fresh random problems (random IP addresses, random topologies, random ACL rules), so you can never memorise the answer list.
2. **Mini IOS CLI (command-line interface).** A fake Cisco IOS (Internetwork Operating System) prompt that understands a limited set of config and `show` commands, checks what you typed against the goal, and prints realistic output. Used by 6 games.
3. **Topology engine.** Draws small networks (switches, routers, hosts, links) that you can tap, and simulates basic behaviour: MAC (Media Access Control) learning, STP (Spanning Tree Protocol), route lookups, ACL (access control list) matching.
4. **Output faker.** Produces realistic `show interfaces`, `show ip route`, `show ip ospf neighbor`, `show standby`, syslog lines, `ipconfig /all`, `ip addr`, and packet-capture summaries, with one planted fault to find.
5. **Spaced repetition (SRS, spaced repetition system).** Every miss becomes a card that comes back later. One shared review queue across all games.
6. **Three modes per game:** *Learn* (guided, with explanations), *Drill* (timed, scored), *Break-Fix* (find what's wrong).
7. **Mobile-first.** Big tap targets, dark theme, no typing needed except in CLI games.

---

## 3. The games

19 games: 15 core (v2.0), 2 that are mostly v1.1, plus a capstone. Each lists topics covered using blueprint numbers (`v2 1.3` = v2.0 topic 1.3).

### Game 1: Subnet Sprint
**Covers:** IPv4 (Internet Protocol version 4) addressing, subnetting, private ranges. `v2 1.3` · `v1 1.6, 1.7`
- **Loop:** An address like `172.16.45.130/27` appears. Tap-enter the network address, broadcast address, first/last usable host and host count. Beat the clock; streaks multiply your score.
- **Levels:** /24 only → any prefix → "how many subnets/hosts" questions → VLSM (variable-length subnet masking) puzzles where you carve one block into right-sized pieces for several departments.
- **Break-Fix:** A PC (personal computer) can't reach its gateway. You see its IP, mask and gateway; spot that the gateway sits in a different subnet, or the mask is wrong, or it's using a public range by mistake.
- **Why it works:** Speed at subnetting is the most common reason people run out of time. This builds it into a reflex.

### Game 2: Hex Garden
**Covers:** IPv6 (Internet Protocol version 6) addressing, compression, prefix sizing, address types, modified EUI-64 (Extended Unique Identifier). `v2 1.4` · `v1 1.8, 1.9`
- **Loop:** Addresses grow as "plants". Prune them to shortest legal form (drop leading zeros, one `::` only), or expand them back.
- **Sorting round:** Drop addresses into the right bed: global unicast (2000::/3), link-local (FE80::/10), unique local (FC00::/7), multicast (FF00::/8), loopback, anycast.
- **EUI-64 round:** Given a MAC address, build the interface ID step by step: split it, insert `FFFE`, flip the 7th bit. Errors show exactly which step went wrong.
- **Prefix round:** "Your ISP gave you a /48. How many /64s?" style questions.

### Game 3: Cable Doctor
**Covers:** Copper and fiber problems, collisions, errors, duplex/speed mismatch, distance, signal levels, pinouts, cable types. `v2 1.1` · `v1 1.3, 1.4`
- **Loop:** A "patient" interface arrives with `show interfaces` output. Read the counters and diagnose: late collisions on one side = duplex mismatch; rising CRC (cyclic redundancy check) errors = bad cable or interference; runts/giants; interface down/down vs up/down.
- **Pinout round:** Wire an RJ45 plug to T568A or T568B by dragging coloured wires.
- **Fiber round:** Pick single-mode vs multi-mode for a distance; read a transceiver's light-level reading and decide if it's too weak.
- **Twist:** Some patients are healthy. Calling a fault that isn't there costs points.

### Game 4: Frame Run
**Covers:** How a switch learns and forwards: MAC table, flooding, aging, VLANs (virtual LANs), 802.1Q trunks, native VLAN. `v2 2.1.b, 2.4` · `v1 1.13, 2.1, 2.2`
- **Loop:** You *are* the switch. Frames arrive on ports. For each one: learn the source MAC, then forward, flood, or drop. The MAC table fills as you go.
- **Levels:** one VLAN → multiple VLANs (flood only inside the VLAN) → trunks (add or strip the 802.1Q tag) → two switches linked by a trunk.
- **Break-Fix:** Native VLAN mismatch, a VLAN missing from the trunk's allowed list, or an access port in the wrong VLAN. Find why host A can't reach host B.

### Game 5: Root Wars
**Covers:** Rapid PVST+ (Per-VLAN Spanning Tree Plus): root bridge, port roles and states, PortFast, root guard, loop guard, BPDU (bridge protocol data unit) guard. `v2 2.5` · `v1 2.5`
- **Loop:** A topology of 3–6 switches appears with priorities, MAC addresses and link costs. Tap to elect the root bridge, then label each port: root, designated, or alternate/blocking.
- **Config round:** Make a chosen switch root primary and another root secondary for VLAN 10, using the CLI.
- **Events:** A link fails (where does the tree reconverge?); a rogue switch with priority 0 plugs in (place root guard or BPDU guard to stop it); a user port needs PortFast.
- **Scoring:** Speed plus accuracy. The tiebreak chain (priority → MAC → cost → sender ID → port ID) is drilled until automatic.

### Game 6: Port Architect
**Covers:** Switch-to-switch and switch-to-router links, Layer 2/3 interfaces, trunks, LACP (Link Aggregation Control Protocol) EtherChannel, SVIs (switch virtual interfaces), and edge port setup for each device type, including PoE (Power over Ethernet). `v2 2.1, 2.2` · `v1 2.1, 2.2, 2.4, 2.7`
- **Loop:** A work order: "Connect an IP phone with a PC behind it", "Connect a VM (virtual machine) host carrying VLANs 10, 20, 30", "Bundle two uplinks to the core with LACP", "Give VLAN 20 a gateway on this switch". You configure it in the mini CLI.
- **Device cards:** desktop, printer, IoT (Internet of Things) sensor, standalone AP (access point), controller-based AP, VoIP (voice over IP) phone, virtualised host, firewall appliance. Each needs a different port setup.
- **Checking:** The game reads your config and tests it: does the phone get the voice VLAN? Does the port-channel come up (active/passive combos)? Does inter-VLAN routing work?
- **Hints:** Show which command is missing, never the full answer.

### Game 7: Neighbor Detective
**Covers:** CDP (Cisco Discovery Protocol) and LLDP (Link Layer Discovery Protocol) for checking network documentation. `v2 2.3` · `v1 2.3`
- **Loop:** You get a network diagram that's *wrong* in 2–4 places, plus `show cdp neighbors detail` and `show lldp neighbors` output from each device. Fix the diagram: wrong port labels, a missing switch, a swapped cable, the wrong device model.
- **Bonus round:** Quick facts: CDP is Cisco-only, LLDP is an open standard; when to turn them off for security.

### Game 8: Longest Match
**Covers:** Reading a routing table, longest prefix match, AD (administrative distance), metrics, default routes, IPv4/IPv6 static routes, floating static routes. `v2 3.1, 3.2` · `v1 3.1, 3.2, 3.3`
- **Loop:** A packet with a destination IP drops in. A real-looking routing table sits below (codes C, L, S, S*, O, D). Tap the route it will use and the next hop. Instant feedback shows why.
- **Levels:** pick the longest match → same prefix from two sources (lower AD wins) → same source, compare metrics → "nothing matches and no default route: dropped".
- **Build round:** Write static routes in the CLI: network route, host route (/32 or /128), default route, and a floating backup with a higher AD. Then a link fails and you watch whether your backup takes over.

### Game 9: Adjacency Quest
**Covers:** Single-area OSPFv2 (Open Shortest Path First, IPv4) and OSPFv3 (IPv6): neighbors, point-to-point vs broadcast networks, DR/BDR (designated / backup designated router) election, router ID. `v2 3.3` · `v1 3.4`
- **State ladder:** Put the neighbor states in order (Down → Init → 2-Way → ExStart → Exchange → Loading → Full) and match each to what's happening.
- **Election round:** Given routers with priorities and router IDs on a shared segment, pick the DR and BDR. Includes the catch that election isn't preemptive.
- **Router ID round:** Work out each router's ID from: manual `router-id` → highest loopback → highest active interface.
- **Break-Fix (the main game):** Two routers are stuck and won't become neighbors. Check outputs for the cause: area mismatch, hello/dead timer mismatch, different subnets, MTU (maximum transmission unit) mismatch stuck at ExStart, passive interface, duplicate router ID, network-type mismatch. Fix it in the CLI.

### Game 10: Gateway Guardians
**Covers:** Reading HSRP (Hot Standby Router Protocol) and VRRP (Virtual Router Redundancy Protocol) status. `v2 3.4` · `v1 3.5`
- **Loop:** Two or three routers share a virtual gateway. Read `show standby brief` / `show vrrp brief` and answer: who's active/master? Who takes over if it fails? Will the old one take back control (preemption on or off)?
- **Recognition drill:** Match virtual MAC formats to the protocol (HSRPv1 `0000.0c07.acXX`, HSRPv2 `0000.0c9f.fXXX`, VRRP `0000.5e00.01XX`) and pull the group number out.
- **Failover sim:** Pull a cable and predict the new state before the game shows it.

### Game 11: Help Desk Hotline
**Covers:** Troubleshooting wired and wireless clients on Windows, macOS and Linux; DHCPv4 (Dynamic Host Configuration Protocol) client problems; DNS (Domain Name System) record problems. `v2 1.6, 1.7, 4.4` · `v1 1.10, 4.3`
- **Loop:** A user "calls" with a complaint ("I can't get to the intranet", "Email stopped working", "Wi-Fi says connected, no internet"). You pick commands to run (`ipconfig /all`, `ifconfig`, `ip addr`, `ping`, `nslookup`, `dig`) and the game shows output. Find the cause in as few commands as possible.
- **Faults include:** 169.254.x.x self-assigned address (DHCP failed); wrong gateway; wrong DNS server; Wi-Fi security mismatch (WPA2 vs WPA3); a missing A or AAAA record; an MX (mail exchanger) record pointing to a CNAME (alias); a missing PTR (reverse lookup) record; wrong NS (name server) delegation.
- **Score:** Fewer commands and correct root cause = more stars.

### Game 12: Packet Passport
**Covers:** End-to-end packet journey: ARP (Address Resolution Protocol), DHCP DORA (Discover, Offer, Request, Acknowledge) with relay, NAT/PAT (network/port address translation). `v2 1.7, 4.3` · `v1 4.1, 4.3, 4.6` (plus TCP/UDP for the v1.1 pack, `v1 1.5`)
- **Loop:** Follow one packet hop by hop across a network. At each hop, stamp its "passport": what are the source/destination MAC and IP *now*? (Lesson that sticks: MACs change every hop, IPs don't, unless NAT changes them.)
- **DHCP chapter:** Order the DORA steps; then a client sits on a different subnet from the server, so you add `ip helper-address` on the right interface.
- **NAT chapter:** Fill in the NAT table: inside local, inside global, outside local, outside global. Configure static NAT, a pool, and PAT (overload) on an IOS XE router.
- **[v1.1 pack] add-on:** TCP vs UDP: three-way handshake, which apps use which, common port numbers.

### Game 13: ACL Bouncer
**Covers:** IPv4 ACLs: standard, extended, numbered, named, wildcard masks. `v2 4.6` · `v1 5.6`
- **Loop:** Packets queue at a router's door. The ACL is posted on the wall. Wave each packet in or out. Rules: top-down, first match wins, invisible "deny all" at the end.
- **Wildcard round:** Turn a subnet into its wildcard mask, and say which addresses a wildcard matches.
- **Builder round:** "Let accounting reach the web server on HTTPS only; block everything else from that subnet." Write the ACL, choose where to place it (standard near the destination, extended near the source) and which direction (in/out). The game fires 50 test packets at it and shows your mistakes.

### Game 14: Port Defender
**Covers:** Layer 2 security: DHCP snooping, DAI (Dynamic ARP Inspection), storm control, RA (Router Advertisement) guard, port security. `v2 4.7` · `v1 5.1, 5.7`
- **Loop:** Tower-defense style. Attacks come down switch ports: a rogue DHCP server, ARP spoofing, MAC flooding, a broadcast storm, fake IPv6 router advertisements, a rogue switch. Place the right defense on the right port.
- **Details that matter:** mark uplinks as *trusted* for snooping/DAI (wrong choice breaks the network, not the attacker); DAI depends on the snooping table; port-security violation modes (protect / restrict / shutdown) and sticky MACs.
- **Debrief:** After each wave, a short "what happened" with the syslog line each defense would print.

### Game 15: Locksmith
**Covers:** Device access with local users; AAA (authentication, authorization, accounting) with TACACS+ (Terminal Access Controller Access-Control System Plus) and RADIUS (Remote Authentication Dial-In User Service); SSH (Secure Shell); secure file transfer with SFTP (SSH File Transfer Protocol) and SCP (Secure Copy Protocol); IPsec (Internet Protocol Security) VPNs (virtual private networks). `v2 4.1, 4.2, 4.5` · `v1 2.8, 4.8, 5.3, 5.5, 5.8`
- **SSH chapter:** Put the SSH setup steps in order (hostname, domain name, generate RSA keys, local user, `line vty` with `login local` and `transport input ssh`), then do it in the CLI.
- **AAA chapter:** Sort facts into TACACS+ vs RADIUS (TCP port 49 vs UDP 1812/1813; encrypts the whole packet vs just the password; separates the three A's vs combines two). Then configure a router as an AAA client with a local fallback.
- **File chapter:** Back up a config and copy a new IOS image using `copy scp:` / SFTP; spot why a transfer failed.
- **VPN chapter:** Build a site-to-site tunnel and a remote-access tunnel from parts: IKE (Internet Key Exchange), ESP (Encapsulating Security Payload) vs AH (Authentication Header), tunnel vs transport mode. Questions like "Which mode keeps the original IP header?"
- **[v1.1 pack] add-on:** threats vs vulnerabilities vs exploits, password policy, MFA (multi-factor authentication), certificates, biometrics, user awareness, physical security.

### Game 16: Airwaves
**Covers:** Wireless principles: bands and channels, RF (radio frequency) behaviour, interference, security protocols; AP connection types. `v2 1.5, 2.2.b` · `v1 1.11, 2.6, 2.7, 2.9, 5.9, 5.10`
- **Channel planner:** A floor plan with APs. Assign 2.4 GHz channels so neighbours don't overlap (1, 6, 11), then 5 GHz with wider channels. A heat map shows interference.
- **RF lab:** Place a microwave, a concrete wall, a metal cabinet and a fish tank; predict absorption, reflection, scattering, and their effect on RSSI (received signal strength indicator) and SNR (signal-to-noise ratio).
- **Security match:** WPA2 vs WPA3 (Wi-Fi Protected Access), Personal (PSK, pre-shared key) vs Enterprise (802.1X), and which pairs won't connect.
- **[v1.1 pack] add-on:** AP modes (local, FlexConnect, monitor, sniffer, bridge) and building a WPA2-PSK WLAN in a fake controller GUI.

### Game 17: NOC Night Shift
**Covers:** Syslog severity and facility; SNMP (Simple Network Management Protocol); network management approaches; agentic AI; choosing prompts for generative AI; reading show/ping/traceroute/packet-capture output. `v2 2.4, 5.1, 5.2, 5.3, 5.4, 5.6` · `v1 4.4, 4.5, 6.1, 6.2, 6.4`
- **Loop:** You run the NOC (network operations centre) overnight. Messages stream in. For each one: read the syslog line, name the severity (0 Emergency → 7 Debug), the facility, and decide: ignore, watch, or wake someone.
- **SNMP shift:** Match get / set / trap / inform, MIB (management information base), OIDs (object identifiers), and why SNMPv3 is the safe one.
- **AI desk:** An AI agent offers to fix an outage. Judge what it may do alone vs what needs a human. Then pick the best of 4 prompts for a task, judged on data classification (don't paste passwords or customer data into a public tool), output format, persona and clear instructions.
- **Management round:** Match scenarios to device-based, cloud-based, controller-based, automation-based or IaC (infrastructure as code) management.
- **Capture round:** Read a packet-capture summary and a traceroute, and say where the traffic stops and why.
- **[v1.1 pack] add-on:** controller-based vs traditional networks, underlay/overlay/fabric, northbound/southbound APIs.

### Game 18: Playbook Runner
**Covers:** Using Ansible to run commands (hands-on in v2.0). `v2 5.5` · `v1 6.5, 6.6, 6.7`
- **Loop:** A fake terminal with an inventory file and a half-written playbook. Fill the gaps (hosts, module such as `cisco.ios.ios_command`, commands, `register`, `debug`), run it, and read the result. Wrong indentation in YAML (a config file format) breaks it, just like the real thing.
- **Levels:** ad-hoc command against one router → playbook against a group → gather `show version` from 10 devices and spot the one on old software → push a config change and check it's idempotent (running twice changes nothing).
- **[v1.1 pack] add-on:** REST API verbs to CRUD (create, read, update, delete), HTTP status codes, reading JSON structure, Ansible vs Terraform.

### Game 19: Blueprint Builder
**Covers:** Hypervisors, VMs and containers; plus for v1.1: device roles, topology architectures, VRFs (virtual routing and forwarding). `v2 1.2` · `v1 1.1, 1.2, 1.12`
- **Loop:** A client brief: "small office of 12", "data centre with east-west traffic", "factory with cloud apps". Drag in devices and pick a layout (two-tier, three-tier, spine-leaf, SOHO small office/home office). Place workloads as VMs or containers on type 1 or type 2 hypervisors.
- **Quick-fire:** "Is this a VM or a container?" from short descriptions (own kernel? boots in seconds?).

### Game 20 (v1.1 pack only): Rush Hour
**Covers:** QoS and NTP. `v1 4.2, 4.7` (and TFTP/FTP, `v1 4.9`)
- **QoS loop:** Traffic of different kinds floods a congested link. Classify and mark it (DSCP, Differentiated Services Code Point: EF 46 for voice, AF classes), put it in queues, and choose policing (drop excess) vs shaping (delay excess). Voice calls break up if you get it wrong.
- **NTP round:** Set up a client/server chain and read stratum levels.
- **File round:** TFTP vs FTP: ports, authentication, when each is used.

### Capstone: Outage
**Covers:** Everything, mixed. Matches v2.0's scenario-based troubleshooting style.
- **Loop:** A full branch network breaks in a random way (one fault at first, up to three at once later). You get a ticket, a diagram and access to `show` commands on every device. Find and fix all faults against the clock.
- **Unlocks:** after you hit a set score in at least 10 core games.
- **Report card:** Shows which blueprint domain cost you the most time, and feeds those topics into the shared review queue.

---

## 4. Coverage matrix

Every v2.0 topic and the game(s) that cover it.

| v2.0 topic | Game(s) |
|---|---|
| 1.1 Cable and interface problems | 3 Cable Doctor |
| 1.2 Hypervisors, VMs, containers | 19 Blueprint Builder |
| 1.3 IPv4 addressing and subnetting | 1 Subnet Sprint |
| 1.4 IPv6 addressing, EUI-64 | 2 Hex Garden |
| 1.5 Wireless principles | 16 Airwaves |
| 1.6 Client connectivity (Win/macOS/Linux) | 11 Help Desk Hotline |
| 1.7 DHCPv4 client, server, relay | 11 Help Desk Hotline, 12 Packet Passport |
| 2.1 Switch-to-switch/router links, trunks, EtherChannel, SVIs | 6 Port Architect, 4 Frame Run |
| 2.2 Edge port attributes per device type | 6 Port Architect, 16 Airwaves |
| 2.3 CDP and LLDP | 7 Neighbor Detective |
| 2.4 Troubleshoot with show, ping, traceroute, captures | 4 Frame Run, 17 NOC Night Shift, Capstone |
| 2.5 Rapid PVST+ | 5 Root Wars |
| 3.1 Read the routing table | 8 Longest Match |
| 3.2 IPv4/IPv6 static routes | 8 Longest Match |
| 3.3 OSPFv2 and OSPFv3 | 9 Adjacency Quest |
| 3.4 HSRP and VRRP status | 10 Gateway Guardians |
| 4.1 Local users, AAA, TACACS+, RADIUS | 15 Locksmith |
| 4.2 SFTP and SCP file transfers | 15 Locksmith |
| 4.3 NAT and PAT | 12 Packet Passport |
| 4.4 DNS record problems | 11 Help Desk Hotline |
| 4.5 IPsec VPNs | 15 Locksmith |
| 4.6 IPv4 ACLs | 13 ACL Bouncer |
| 4.7 Layer 2 security features | 14 Port Defender |
| 5.1 Agentic AI in operations | 17 NOC Night Shift |
| 5.2 Choosing generative AI prompts | 17 NOC Night Shift |
| 5.3 Network management approaches | 17 NOC Night Shift |
| 5.4 SNMP | 17 NOC Night Shift |
| 5.5 Ansible | 18 Playbook Runner |
| 5.6 Syslog | 17 NOC Night Shift |

**v1.1-only topics:** TCP/UDP → 12; device roles, topologies, VRFs → 19; MAC learning → 4; WLC architecture, AP modes, WLAN GUI → 16; device management access → 15; NTP, QoS, TFTP/FTP → 20; SSH → 15; security concepts, programs, passwords, MFA → 15, 14; SDN (software-defined networking), controllers, AI/ML (machine learning) → 17; REST, JSON, Terraform → 18.

---

## 5. Suggested build order

Ordered by exam weight and by what later games depend on.

1. **Subnet Sprint** (needs only the question generator; most-used skill)
2. **Longest Match** (needs subnetting; starts the output faker)
3. **Frame Run** (starts the topology engine)
4. **Root Wars** (reuses topology engine)
5. **Port Architect** (builds the mini CLI)
6. **ACL Bouncer** (reuses subnetting + CLI)
7. **Adjacency Quest** (reuses CLI + output faker)
8. **Hex Garden**
9. **Help Desk Hotline**
10. **Packet Passport**
11. **Port Defender**
12. **Locksmith**
13. **Cable Doctor**, **Neighbor Detective**, **Gateway Guardians** (small, mostly output reading)
14. **Airwaves**
15. **NOC Night Shift**
16. **Playbook Runner**
17. **Blueprint Builder**
18. **Capstone: Outage**
19. v1.1 pack add-ons and **Rush Hour**, only if needed

---

## 6. Open decisions

- **Exam date:** sitting before 2 Feb 2027 means v1.1, and the v1.1 pack moves from optional to required.
- **One app or separate games:** one hub app with a shared review queue and progress map, or 19 standalone pages.
- **Platform:** phone browser (like the PLC site), iPad, or desktop. The CLI games are much nicer with a keyboard.
- **How deep the fake CLI goes:** a small command set is quick to build; a fuller one feels real but takes much longer. A middle path is to support only the commands each level needs.
- **Pairing with real labs:** each game could end with a short Packet Tracer or CML (Cisco Modeling Labs) task to try the same skill on real IOS.
