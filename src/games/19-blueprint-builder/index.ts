import { MixedView } from '../../app/frame/MixedView'
import { checkMixed, describeMixed } from '../../app/frame/mixed'
import { defineGame } from '../../app/frame/types'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

export const blueprintBuilder = defineGame({
  id: 'blueprint-builder',
  title: 'Blueprint Builder',
  tagline: 'VMs, containers and hypervisors',
  howToPlay: [
    'Decide whether a job needs a VM or a container, tell type 1 hypervisors from type 2, and pick the right platform for each job.',
  ],
  domainId: 'domain-1',
  levels: LEVELS,
  makeQuestion,
  check: checkMixed,
  describe: describeMixed,
  View: MixedView,
})
