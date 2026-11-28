import { MixedView } from '../../app/frame/MixedView'
import { checkMixed, describeMixed } from '../../app/frame/mixed'
import { defineGame } from '../../app/frame/types'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

export const aclBouncer = defineGame({
  id: 'acl-bouncer',
  title: 'ACL Bouncer',
  tagline: 'Decide which packets get in',
  howToPlay: [
    'You are the ACL at the door. For each packet, read the access list from the top and decide whether it is permitted or denied.',
    'Later levels cover wildcard masks, picking the ACL for a policy, where to apply it, and finding the bad line.',
    'Tap a choice, or type a wildcard or range on the keypad.',
  ],
  domainId: 'domain-4',
  levels: LEVELS,
  makeQuestion,
  check: checkMixed,
  describe: describeMixed,
  View: MixedView,
})
