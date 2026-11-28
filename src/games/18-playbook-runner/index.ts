import { MixedView } from '../../app/frame/MixedView'
import { checkMixed, describeMixed } from '../../app/frame/mixed'
import { defineGame } from '../../app/frame/types'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

export const playbookRunner = defineGame({
  id: 'playbook-runner',
  title: 'Playbook Runner',
  tagline: 'Read and fix Ansible playbooks',
  howToPlay: [
    'Choose the right Ansible module, fill the blanks in a playbook, read an inventory, and find the line that breaks the YAML.',
    'Playbooks are shown as code. Tabs are shown as arrows.',
  ],
  domainId: 'domain-5',
  levels: LEVELS,
  makeQuestion,
  check: checkMixed,
  describe: describeMixed,
  View: MixedView,
})
