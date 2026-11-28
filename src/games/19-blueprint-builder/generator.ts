/**
 * Blueprint Builder (v2.0: hypervisors, VMs and containers only).
 * Facts: a type 1 hypervisor runs on the bare hardware (VMware ESXi, Microsoft Hyper-V, Xen);
 * a type 2 hypervisor runs as an application on a host OS (VirtualBox, VMware Workstation).
 * A VM has its own guest OS and kernel; containers share the host OS kernel, are smaller and
 * start in seconds; container runtimes include Docker and containerd; Kubernetes orchestrates
 * containers. Sources: NIST SP 800-125 (full virtualization), NIST SP 800-190 (containers).
 */
import type { ChoiceQuestion } from '../../app/frame/choice'
import type { LabelsQuestion } from '../../app/frame/labels'
import type { MixedQuestion } from '../../app/frame/mixed'
import { type Rng, stepRng } from '../../core/rng'

export type BlueprintKind = 'vm-or-container' | 'hypervisor-type' | 'scenario'
export interface BlueprintParams {
  kinds: readonly BlueprintKind[]
}

const VM_OR_CONTAINER: { text: string; a: 'VM' | 'Container' | 'Both' }[] = [
  { text: 'Has its own full guest operating system and kernel', a: 'VM' },
  { text: 'Shares the host’s OS kernel', a: 'Container' },
  { text: 'Usually starts in seconds or less', a: 'Container' },
  { text: 'Can run Windows on a Linux host', a: 'VM' },
  { text: 'Image is often only tens of megabytes', a: 'Container' },
  { text: 'Runs on a hypervisor', a: 'VM' },
  { text: 'Runs on a container runtime such as Docker or containerd', a: 'Container' },
  { text: 'Kubernetes is the usual orchestrator', a: 'Container' },
  { text: 'Isolates workloads from each other on one physical server', a: 'Both' },
  { text: 'Gets a virtual network interface connected to a virtual switch or bridge', a: 'Both' },
]

const HYPERVISORS: { name: string; type: 'Type 1' | 'Type 2' }[] = [
  { name: 'VMware ESXi', type: 'Type 1' },
  { name: 'Microsoft Hyper-V', type: 'Type 1' },
  { name: 'Xen', type: 'Type 1' },
  { name: 'Oracle VirtualBox', type: 'Type 2' },
  { name: 'VMware Workstation', type: 'Type 2' },
  { name: 'Runs directly on the server hardware (bare metal)', type: 'Type 1' },
  { name: 'Installed as an app on your Windows or macOS laptop', type: 'Type 2' },
]

const SCENARIOS: { text: string; a: string; wrong: string[]; why: string }[] = [
  {
    text: 'A data centre wants to run 40 servers’ worth of Windows and Linux workloads on 4 physical hosts, with the best performance.',
    a: 'VMs on a type 1 hypervisor',
    wrong: ['VMs on a type 2 hypervisor', 'Containers only', 'One physical server per workload'],
    why: 'Mixed operating systems need VMs, and a bare-metal (type 1) hypervisor has no host OS in the way, so it performs best.',
  },
  {
    text: 'You want to try a Linux router image in VirtualBox on your Windows laptop for a CCNA lab.',
    a: 'A VM on a type 2 hypervisor',
    wrong: ['A VM on a type 1 hypervisor', 'A container on Kubernetes', 'A new physical server'],
    why: 'A type 2 hypervisor (like VirtualBox) runs as an app on your existing OS: ideal for a laptop lab.',
  },
  {
    text: 'A web shop splits its app into 30 small services that must scale up and down within seconds.',
    a: 'Containers with an orchestrator',
    wrong: ['VMs on a type 2 hypervisor', 'One big VM', 'Bare-metal servers'],
    why: 'Containers start in seconds and share the host kernel, so they scale quickly; an orchestrator like Kubernetes manages them.',
  },
  {
    text: 'An old app needs Windows Server 2012, but all your hosts run a modern Linux.',
    a: 'A VM',
    wrong: ['A container', 'A Python virtualenv', 'A VLAN'],
    why: 'Containers share the host’s kernel, so a Linux host can’t run a Windows container. A VM brings its own OS.',
  },
]

function vmOrContainer(rng: Rng): LabelsQuestion {
  const items = rng.shuffle(VM_OR_CONTAINER).slice(0, 5)
  return {
    prompt: 'VM, container, or both?',
    items: items.map((x, i) => ({ id: String(i), label: x.text })),
    options: ['VM', 'Container', 'Both'],
    display: 'bins',
    answers: Object.fromEntries(items.map((x, i) => [String(i), x.a])),
    explanation:
      'A VM virtualises the hardware and runs its own OS on a hypervisor. A container packages an app with its libraries and shares the host OS kernel, so it is lighter and faster to start.',
    hint: 'Own kernel → VM. Shared kernel → container.',
  }
}

function hypervisorType(rng: Rng): LabelsQuestion {
  const items = rng.shuffle(HYPERVISORS).slice(0, 5)
  return {
    prompt: 'Type 1 or type 2 hypervisor?',
    items: items.map((x, i) => ({ id: String(i), label: x.name })),
    options: ['Type 1', 'Type 2'],
    display: 'bins',
    answers: Object.fromEntries(items.map((x, i) => [String(i), x.type])),
    explanation:
      'Type 1 (bare metal) runs directly on the hardware: ESXi, Hyper-V, Xen. Type 2 (hosted) runs as an application on a normal OS: VirtualBox, VMware Workstation.',
  }
}

function scenario(rng: Rng): ChoiceQuestion {
  const s = rng.pick(SCENARIOS)
  return {
    prompt: 'What is the best fit?',
    facts: [{ label: 'Brief', value: s.text, prose: true }],
    choices: rng.shuffle([s.a, ...s.wrong]),
    answer: s.a,
    explanation: s.why,
  }
}

export function makeQuestion(params: BlueprintParams, seed: number, step: number): MixedQuestion {
  const rng = stepRng(seed, step)
  switch (rng.pick(params.kinds)) {
    case 'vm-or-container':
      return { kind: 'labels', q: vmOrContainer(rng) }
    case 'hypervisor-type':
      return { kind: 'labels', q: hypervisorType(rng) }
    case 'scenario':
      return { kind: 'choice', q: scenario(rng) }
  }
}
