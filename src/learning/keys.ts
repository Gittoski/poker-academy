import { handOf } from '@/lib/cards'
import type { LearningConfig, PackedHand, SavedPrompt } from './types'
import { contentHash } from './identity'

/** Fixed-seat preference controls eligibility; it does not make an identical position a different question. */
export function configKey(config:LearningConfig):string {
  return contentHash({mode:config.mode,format:config.format,stack:config.stack,rangeType:config.rangeType,openSize:config.openSize,players:config.players,rangesId:config.rangesId})
}
export function decisionKey(config:LearningConfig,hand:PackedHand,prompt:SavedPrompt,scriptId:string|null,play:{streetIndex:number;nodeIndex:number}|null):string {
  const hero=hand.seats.find(s=>s.position===hand.hero)
  if(!hero)throw Error('No hero in checkpoint')
  const position={hero:hand.hero,handClass:handOf(hero.cards).label}
  const node=prompt.street==='preflop'?{raises:hand.raises,aggressor:hand.aggressor,responder:hand.responder,toAct:hand.toAct,acted:hand.acted,seats:hand.seats.map(s=>({position:s.position,folded:s.folded,committed:s.committed}))}:{scriptId,play}
  return contentHash({config:configKey(config),position,street:prompt.street,node})
}
export function decisionId(handId:string,ordinal:number):string {
  if(!Number.isSafeInteger(ordinal)||ordinal<0)throw Error('Invalid decision ordinal')
  return `${handId}:decision:${ordinal}`
}
