/**
 * Show commands. Each prints through a template in core/output, and every template follows a
 * real sample in reference/outputs/ (CLAUDE.md rule 3).
 *
 * Not here yet: show running-config. The real samples (reference/outputs/
 * show-running-config-switch.md) don't settle where voice VLAN, PoE, shutdown and channel-group
 * lines go inside an interface block, so it waits for a sample that does.
 */
import { showEtherchannelSummary } from '../output/etherchannel'
import { showIpInterfaceBrief } from '../output/ipbrief'
import { showInterfacesTrunk } from '../output/trunk'
import { showVlanBrief } from '../output/vlan'
import { type CommandDef, kw } from './grammar'

const SHOW_MODES = ['user', 'exec'] as const

export const SHOW_COMMANDS: readonly CommandDef[] = [
  {
    id: 'show.vlan-brief',
    modes: SHOW_MODES,
    pattern: [kw('show'), kw('vlan'), kw('brief')],
    help: 'VLANs and their access ports',
    run: (ctx) => ({ output: showVlanBrief(ctx.state) }),
  },
  {
    id: 'show.interfaces-trunk',
    modes: SHOW_MODES,
    pattern: [kw('show'), kw('interfaces'), kw('trunk')],
    help: 'Trunk ports and the VLANs they carry',
    run: (ctx) => ({ output: showInterfacesTrunk(ctx.state) }),
  },
  {
    id: 'show.ip-interface-brief',
    modes: SHOW_MODES,
    pattern: [kw('show'), kw('ip'), kw('interface'), kw('brief')],
    help: 'Every interface: IP address and up/down',
    run: (ctx) => ({ output: showIpInterfaceBrief(ctx.state) }),
  },
  {
    id: 'show.etherchannel-summary',
    modes: SHOW_MODES,
    pattern: [kw('show'), kw('etherchannel'), kw('summary')],
    help: 'EtherChannels and whether their ports bundled',
    run: (ctx) => ({ output: showEtherchannelSummary(ctx.state) }),
  },
]
