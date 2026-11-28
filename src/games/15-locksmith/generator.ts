/**
 * Locksmith: device access (SSH, local users, AAA with TACACS+ and RADIUS), secure file
 * transfer, and IPsec VPNs.
 *
 * Facts and sources:
 * - SSH readiness: core/device/ssh.ts (Cisco IOS "Configuring Secure Shell").
 * - TACACS+: TCP port 49, encrypts the whole payload, separates authentication, authorization
 *   and accounting (RFC 8907). RADIUS: UDP 1812 (authentication) and 1813 (accounting),
 *   encrypts only the password, combines authentication and authorization (RFC 2865, 2866).
 * - SCP and SFTP run over SSH (TCP 22); TFTP is UDP 69 with no authentication or encryption
 *   (RFC 1350); FTP control is TCP 21 in clear text (RFC 959).
 * - IPsec: ESP gives confidentiality and integrity; AH gives integrity and authentication only
 *   (RFC 4303, RFC 4302). Tunnel mode wraps the whole original packet in a new IP header;
 *   transport mode keeps the original IP header (RFC 4301). IKE negotiates the keys and SAs
 *   (RFC 7296) on UDP 500, or 4500 with NAT traversal (RFC 3947).
 */
import type { ChoiceQuestion } from '../../app/frame/choice'
import type { LabelsQuestion } from '../../app/frame/labels'
import type { MixedQuestion } from '../../app/frame/mixed'
import { SSH_GAPS, type SshConfig, type SshGap, sshConfigLines, sshGaps } from '../../core/device'
import { type Rng, stepRng } from '../../core/rng'

export type LockKind =
  'ssh-needed' | 'ssh-order' | 'ssh-breakfix' | 'aaa-sort' | 'aaa-config' | 'files' | 'vpn'
export interface LockParams {
  kinds: readonly LockKind[]
}

// ---------- SSH ----------

const SSH_ITEMS: { cmd: string; needed: boolean; why: string }[] = [
  {
    cmd: 'hostname BRANCH-R1',
    needed: true,
    why: 'The RSA key is named after the hostname, and IOS won’t make keys with the default hostname.',
  },
  {
    cmd: 'ip domain-name corp.example',
    needed: true,
    why: 'The key name is hostname.domain, so a domain name is needed first.',
  },
  {
    cmd: 'crypto key generate rsa modulus 2048',
    needed: true,
    why: 'SSH needs an RSA key pair; this creates it.',
  },
  {
    cmd: 'username admin secret ********',
    needed: true,
    why: '"login local" checks this local user database.',
  },
  {
    cmd: 'line vty 0 4 → login local',
    needed: true,
    why: 'Remote logins on the VTY lines use the local usernames.',
  },
  {
    cmd: 'line vty 0 4 → transport input ssh',
    needed: true,
    why: 'Allows SSH (and only SSH) on the VTY lines.',
  },
  {
    cmd: 'line vty 0 4 → transport input telnet',
    needed: false,
    why: 'Telnet is not SSH; it sends passwords in clear text.',
  },
  {
    cmd: 'enable password cisco',
    needed: false,
    why: 'Not needed for SSH, and enable password is stored weakly; use enable secret.',
  },
  {
    cmd: 'ip http server',
    needed: false,
    why: 'Turns on the web server; it has nothing to do with SSH.',
  },
  {
    cmd: 'banner motd #Authorised users only#',
    needed: false,
    why: 'A good idea, but SSH works without a banner.',
  },
  {
    cmd: 'no ip domain-lookup',
    needed: false,
    why: 'Stops DNS lookups of mistyped commands; not related to SSH.',
  },
]

function sshNeeded(rng: Rng): LabelsQuestion {
  const picks = [
    ...rng.shuffle(SSH_ITEMS.filter((i) => i.needed)).slice(0, 4),
    ...rng.shuffle(SSH_ITEMS.filter((i) => !i.needed)).slice(0, 2),
  ]
  const items = rng.shuffle(picks)
  return {
    prompt:
      'You want admins to log in to this router with SSH and local usernames. Which commands are needed?',
    items: items.map((i, n) => ({ id: String(n), label: i.cmd })),
    options: ['Needed', 'Not needed'],
    display: 'bins',
    answers: Object.fromEntries(
      items.map((i, n) => [String(n), i.needed ? 'Needed' : 'Not needed']),
    ),
    explanation: items.map((i) => `${i.cmd}: ${i.why}`).join(' '),
    hint: 'SSH needs: hostname, domain name, RSA keys, a local user, and VTY lines set to login local and SSH.',
  }
}

function sshOrder(rng: Rng): ChoiceQuestion {
  const choices = [
    'crypto key generate rsa modulus 2048',
    'hostname BRANCH-R1',
    'ip domain-name corp.example',
    'username admin secret ********',
  ]
  return {
    prompt: 'Which of these has to come after setting the hostname and the domain name?',
    choices: rng.shuffle(choices),
    answer: 'crypto key generate rsa modulus 2048',
    whyWrong: {
      'hostname BRANCH-R1': 'The hostname is one of the two things the key needs first.',
      'ip domain-name corp.example':
        'The domain name is one of the two things the key needs first (hostname and domain can be set in either order).',
      'username admin secret ********': 'A local user can be created at any time.',
    },
    explanation:
      'The RSA key pair is named hostname.domain-name, so IOS needs a non-default hostname and a domain name before it will generate the keys. The hostname and domain name can be set in either order.',
    hint: 'What is the key named after?',
  }
}

function sshBreakfix(rng: Rng): ChoiceQuestion {
  const good: SshConfig = {
    hostname: rng.pick(['R1', 'BRANCH-R1', 'EDGE1']),
    domainName: rng.pick(['corp.example', 'lab.local', 'example.net']),
    rsaKeyBits: rng.pick([2048, 2048, 4096]),
    localUsers: 1,
    vtyLogin: 'local',
    vtyTransport: ['ssh'],
  }
  const gaps = Object.keys(SSH_GAPS) as SshGap[]
  for (;;) {
    const gap = rng.pick(gaps)
    let c: SshConfig = good
    if (gap === 'default-hostname') c = { ...c, hostname: 'Router', rsaKeyBits: null }
    if (gap === 'no-domain') c = { ...c, domainName: null, rsaKeyBits: null }
    if (gap === 'no-rsa-keys') c = { ...c, rsaKeyBits: null }
    if (gap === 'no-local-user') c = { ...c, localUsers: 0 }
    if (gap === 'vty-no-login-local') c = { ...c, vtyLogin: 'password' }
    if (gap === 'vty-no-ssh') c = { ...c, vtyTransport: ['telnet'] }
    const found = sshGaps(c)
    // The hostname and domain faults also stop key generation, so they show two gaps; the root
    // cause is the first one. Accept only setups whose first gap is the planted one.
    if (found[0] !== gap) continue
    const others = rng.shuffle(gaps.filter((g) => !found.includes(g))).slice(0, 3)
    return {
      prompt: 'SSH logins to this router fail. What is the root cause?',
      visuals: [{ kind: 'code', caption: 'Commands the admin entered', lines: sshConfigLines(c) }],
      choices: rng.shuffle([gap, ...others].map((g) => SSH_GAPS[g].label)),
      answer: SSH_GAPS[gap].label,
      whyWrong: Object.fromEntries(
        others.map((g) => [SSH_GAPS[g].label, 'That part is in the configuration.']),
      ),
      explanation: `${SSH_GAPS[gap].label}. Fix: ${SSH_GAPS[gap].fix}.${found.length > 1 ? ' Without it, the RSA keys could not be generated either.' : ''}`,
      hint: 'Check in order: hostname, domain name, keys, local user, VTY login and transport.',
    }
  }
}

// ---------- AAA ----------

const AAA_FACTS: { text: string; who: 'TACACS+' | 'RADIUS' | 'Both' }[] = [
  { text: 'Uses TCP port 49', who: 'TACACS+' },
  { text: 'Uses UDP ports 1812 and 1813', who: 'RADIUS' },
  { text: 'Encrypts the whole packet body', who: 'TACACS+' },
  { text: 'Encrypts only the password', who: 'RADIUS' },
  { text: 'Keeps authentication, authorization and accounting separate', who: 'TACACS+' },
  { text: 'Combines authentication and authorization', who: 'RADIUS' },
  { text: 'Common for per-command authorization of network admins', who: 'TACACS+' },
  { text: 'Used for 802.1X network access (users and devices joining the network)', who: 'RADIUS' },
  { text: 'A standards-track IETF protocol (RFC 2865) that many vendors build in', who: 'RADIUS' },
  { text: 'Lets a router check logins against a central server', who: 'Both' },
]

function aaaSort(rng: Rng): LabelsQuestion {
  const facts = rng.shuffle(AAA_FACTS).slice(0, 6)
  return {
    prompt: 'TACACS+ or RADIUS?',
    items: facts.map((f, i) => ({ id: String(i), label: f.text })),
    options: ['TACACS+', 'RADIUS', 'Both'],
    display: 'bins',
    answers: Object.fromEntries(facts.map((f, i) => [String(i), f.who])),
    explanation:
      'TACACS+: TCP 49, whole body encrypted, the three A’s separate (good for device admin). RADIUS: UDP 1812/1813, only the password encrypted, authentication and authorization combined (good for network access like 802.1X).',
    hint: 'TACACS+ = TCP, admins, fully encrypted. RADIUS = UDP, network access, password only.',
  }
}

function aaaConfig(rng: Rng): ChoiceQuestion {
  const server = rng.pick(['tacacs+', 'radius'])
  const answer = `aaa authentication login default group ${server} local`
  const other = server === 'tacacs+' ? 'radius' : 'tacacs+'
  const choices = [
    answer,
    `aaa authentication login default local group ${server}`,
    `aaa authentication login default group ${server}`,
    `aaa authentication login default group ${other} local`,
  ]
  return {
    prompt: `After "aaa new-model", which command checks logins against the ${server === 'tacacs+' ? 'TACACS+' : 'RADIUS'} servers first and falls back to local usernames if none answer?`,
    choices: rng.shuffle(choices),
    answer,
    whyWrong: {
      [choices[1] as string]: 'Methods are tried left to right: this tries local users first.',
      [choices[2] as string]: 'No fallback: if the servers are down, nobody can log in.',
      [choices[3] as string]: 'Wrong server group for this network.',
    },
    explanation: `The method list is tried left to right: group ${server} first; "local" is used only if no server answers (not if it rejects the password).`,
    mono: true,
  }
}

// ---------- files ----------

function filesQuestion(rng: Rng): MixedQuestion {
  if (rng.chance(0.5)) {
    const protos = [
      { p: 'SCP', secure: true },
      { p: 'SFTP', secure: true },
      { p: 'TFTP', secure: false },
      { p: 'FTP', secure: false },
    ]
    const q: LabelsQuestion = {
      prompt:
        'You copy a new IOS image to a router. Which of these protect the transfer with encryption?',
      items: rng.shuffle(protos).map((x) => ({ id: x.p, label: x.p })),
      options: ['Encrypted', 'Not encrypted'],
      display: 'bins',
      answers: Object.fromEntries(
        protos.map((x) => [x.p, x.secure ? 'Encrypted' : 'Not encrypted']),
      ),
      explanation:
        'SCP and SFTP run over SSH (TCP 22), so the login and data are encrypted. TFTP (UDP 69) has no login or encryption at all; FTP (TCP 21) sends the password and data in clear text.',
    }
    return { kind: 'labels', q }
  }
  const t = rng.int(0, 2)
  const qs: ChoiceQuestion[] = [
    {
      prompt: 'Which protocol and port do SCP and SFTP use underneath?',
      choices: ['SSH, TCP 22', 'TLS, TCP 443', 'TFTP, UDP 69', 'Telnet, TCP 23'],
      answer: 'SSH, TCP 22',
      explanation: 'Both SCP and SFTP run inside an SSH session on TCP port 22.',
    },
    {
      prompt: 'Which file transfer protocol has no username and password at all?',
      choices: ['TFTP', 'FTP', 'SFTP', 'SCP'],
      answer: 'TFTP',
      explanation:
        'TFTP (UDP 69) is "trivial": no authentication and no encryption. FTP at least asks for a login, but sends it in clear text.',
    },
    {
      prompt: 'Why choose SCP or SFTP over FTP to back up router configs?',
      choices: [
        'They encrypt the login and the file',
        'They are faster on slow links',
        'They do not need an IP address',
        'They work without a server',
      ],
      answer: 'They encrypt the login and the file',
      explanation:
        'Configs contain secrets. SCP and SFTP run over SSH, so the credentials and the file are encrypted in transit.',
    },
  ]
  const q = qs[t] as ChoiceQuestion
  return { kind: 'choice', q: { ...q, choices: rng.shuffle(q.choices) } }
}

// ---------- VPN ----------

const VPN_QS: ChoiceQuestion[] = [
  {
    prompt: 'Which IPsec mode keeps the original IP header and protects only the payload?',
    choices: ['Transport mode', 'Tunnel mode', 'Aggressive mode', 'Main mode'],
    answer: 'Transport mode',
    whyWrong: {
      'Tunnel mode':
        'Tunnel mode wraps the whole original packet, header included, inside a new IP header.',
      'Aggressive mode':
        'Aggressive and main mode are IKE (phase 1) exchange types, not IPsec modes.',
      'Main mode': 'Aggressive and main mode are IKE (phase 1) exchange types, not IPsec modes.',
    },
    explanation:
      'Transport mode keeps the original IP header (used host to host). Tunnel mode adds a new outer IP header (used between sites).',
  },
  {
    prompt:
      'Two offices connect their LANs over the Internet with IPsec between their routers. Which mode is used?',
    choices: ['Tunnel mode', 'Transport mode', 'Trunk mode', 'Promiscuous mode'],
    answer: 'Tunnel mode',
    explanation:
      'Site-to-site VPNs use tunnel mode: the whole packet between the LANs is encrypted and carried inside a new IP header between the two routers.',
  },
  {
    prompt: 'Which IPsec protocol encrypts the data?',
    choices: ['ESP', 'AH', 'IKE', 'GRE'],
    answer: 'ESP',
    whyWrong: {
      AH: 'AH authenticates and checks integrity but does not encrypt.',
      IKE: 'IKE negotiates keys and security associations; it does not carry the data.',
      GRE: 'GRE is a tunnel with no encryption of its own.',
    },
    explanation:
      'ESP (Encapsulating Security Payload) gives confidentiality (encryption) plus integrity. AH gives integrity and authentication only.',
  },
  {
    prompt: 'What does IKE do in an IPsec VPN?',
    choices: [
      'Negotiates the keys and security associations',
      'Encrypts each data packet',
      'Assigns IP addresses to clients',
      'Routes traffic between the sites',
    ],
    answer: 'Negotiates the keys and security associations',
    explanation:
      'IKE (Internet Key Exchange, UDP 500, or 4500 through NAT) authenticates the peers and agrees the keys and SAs; ESP then protects the data.',
  },
  {
    prompt:
      'A salesperson connects a laptop from a hotel to the company network. What kind of VPN is that?',
    choices: ['Remote-access VPN', 'Site-to-site VPN', 'GRE tunnel', 'MPLS VPN'],
    answer: 'Remote-access VPN',
    explanation:
      'Remote-access VPNs connect one user’s device (with VPN client software) to the company. Site-to-site VPNs join whole networks router to router.',
  },
]

function vpnQuestion(rng: Rng): ChoiceQuestion {
  const q = rng.pick(VPN_QS)
  return { ...q, choices: rng.shuffle(q.choices) }
}

export function makeQuestion(params: LockParams, seed: number, step: number): MixedQuestion {
  const rng = stepRng(seed, step)
  switch (rng.pick(params.kinds)) {
    case 'ssh-needed':
      return { kind: 'labels', q: sshNeeded(rng) }
    case 'ssh-order':
      return { kind: 'choice', q: sshOrder(rng) }
    case 'ssh-breakfix':
      return { kind: 'choice', q: sshBreakfix(rng) }
    case 'aaa-sort':
      return { kind: 'labels', q: aaaSort(rng) }
    case 'aaa-config':
      return { kind: 'choice', q: aaaConfig(rng) }
    case 'files':
      return filesQuestion(rng)
    case 'vpn':
      return { kind: 'choice', q: vpnQuestion(rng) }
  }
}
