import { handOf, SUITS } from '@/lib/cards'
import { RANKS } from '@/lib/hands'
import type { Decision, HandState } from '@/lib/handSim'
import { isPosition, positionsFor } from '@/lib/positions'
import { isScenario } from '@/lib/scenarios'
import type { PackedDecision, PackedHand, SourceRecord } from './types'

export function packDecision(d: Decision): PackedDecision {
  return {scenario:d.scenario,position:d.position,...(d.villain?{villain:d.villain}:{}),entryId:d.entry.id,actions:[...d.actions],weights:{...d.weights}}
}
export function unpackDecision(d: PackedDecision, source: SourceRecord): Decision {
  if (source.kind !== 'ranges') throw Error('Reference source is not a range set')
  const entry = source.payload.find(e=>e.id===d.entryId)
  if (!entry) throw Error('Original chart is unavailable')
  if(!isScenario(d.scenario)||!isPosition(d.position)||d.villain&&!isPosition(d.villain)||!Array.isArray(d.actions)||d.actions.length<1||d.actions.length>3||new Set(d.actions).size!==d.actions.length||d.actions.some(a=>!['raise','call','fold'].includes(a))||!d.weights||['raise','call','fold'].some(a=>!Number.isFinite(d.weights[a as keyof typeof d.weights])||d.weights[a as keyof typeof d.weights]<0||d.weights[a as keyof typeof d.weights]>1)) throw Error('Invalid saved decision')
  return {scenario:d.scenario,position:d.position,...(d.villain?{villain:d.villain}:{}),entry,actions:[...d.actions],weights:{...d.weights}}
}
export function packHand(hand: HandState, rangesId: string): PackedHand {
  return {rangesId,hero:hand.hero,toAct:hand.toAct,raises:hand.raises,...(hand.aggressor?{aggressor:hand.aggressor}:{}),...(hand.responder?{responder:hand.responder}:{}),acted:[...hand.acted],ended:hand.ended?{...hand.ended}:null,
    seats:hand.seats.map(s=>({position:s.position,cards:structuredClone(s.cards),folded:s.folded,committed:s.committed,...(s.lastAction?{lastAction:s.lastAction}:{}),...(s.lastDecision?{lastDecision:packDecision(s.lastDecision)}:{})}))}
}
export function unpackHand(p: PackedHand, source: SourceRecord): HandState {
  if (!p || p.rangesId!==source.id || source.kind!=='ranges') throw Error('Original range version is unavailable')
  if(!Array.isArray(p.seats)||![6,8,9].includes(p.seats.length)||!isPosition(p.hero)||!p.seats.some(s=>s.position===p.hero)||!Number.isSafeInteger(p.raises)||p.raises<0||p.raises>4||p.toAct!==null&&(!Number.isSafeInteger(p.toAct)||p.toAct< -1||p.toAct>=p.seats.length)||!Array.isArray(p.acted)||new Set(p.acted).size!==p.acted.length||p.acted.some(s=>!isPosition(s))) throw Error('Invalid saved hand')
  const order=positionsFor(p.seats.length as 6|8|9)
  const seen=new Set<string>()
  const seats=p.seats.map((s,i)=>{
    if(s.position!==order[i]||!Array.isArray(s.cards)||s.cards.length!==2||typeof s.folded!=='boolean'||!Number.isFinite(s.committed)||s.committed<0||s.lastAction!==undefined&&(typeof s.lastAction!=='string'||s.lastAction.length>300))throw Error('Invalid saved seat')
    for(const c of s.cards){if(!c||!RANKS.includes(c.rank)||!SUITS.includes(c.suit)||seen.has(c.rank+c.suit))throw Error('Invalid or duplicate saved card');seen.add(c.rank+c.suit)}
    return {position:s.position,cards:structuredClone(s.cards),hand:handOf(s.cards),folded:s.folded,committed:s.committed,...(s.lastAction?{lastAction:s.lastAction}:{}),...(s.lastDecision?{lastDecision:unpackDecision(s.lastDecision,source)}:{})}
  })
  if(p.aggressor&&!order.includes(p.aggressor)||p.responder&&!order.includes(p.responder)||p.ended&&(!['walk','uncontested','flop','all-in','hero-folded'].includes(p.ended.kind)||typeof p.ended.message!=='string'||p.ended.message.length>1000))throw Error('Invalid saved hand context')
  return {hero:p.hero,toAct:p.toAct,raises:p.raises,...(p.aggressor?{aggressor:p.aggressor}:{}),...(p.responder?{responder:p.responder}:{}),acted:[...p.acted],ended:p.ended?{...p.ended}:null,seats}
}
