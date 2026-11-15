import {best,compare,deck} from './evaluator'
export const cardId=(s:string)=>{
 if(!/^[2-9TJQKA][cdhs]$/.test(s))throw Error('Invalid card')
 return '23456789TJQKA'.indexOf(s[0])*4+'cdhs'.indexOf(s[1])
}
export const cards=(s:string)=>s.trim().split(/\s+/).map(cardId)
export const cardText=(id:number)=>'23456789TJQKA'[Math.floor(id/4)]+'cdhs'[id%4]
function validate(xs:number[]){if(xs.some(x=>!Number.isInteger(x)||x<0||x>51)||new Set(xs).size!==xs.length)throw Error('Invalid or duplicate cards')}
export interface WeightedCombo {cards:[number,number];weight:number}
/** Exact enumeration on the river or turn. Weights are PER combination; blocked combinations are removed and the remaining weights normalized. */
export function exactEquity(hero:[number,number],board:number[],range:WeightedCombo[]){
 if(hero.length!==2||![4,5].includes(board.length)||!range.length||range.length>1326)throw Error('Use a turn/river board and explicit weighted combinations')
 validate([...hero,...board]);const known=new Set([...hero,...board]),seen=new Set<string>()
 let weight=0,share=0,blocked=0,runouts=0,wins=0,ties=0,losses=0
 for(const combo of range){
  if(combo.cards.length!==2||!Number.isFinite(combo.weight)||combo.weight<0)throw Error('Invalid combination weight')
  validate(combo.cards);const key=[...combo.cards].sort((a,b)=>a-b).join(',');if(seen.has(key))throw Error('Duplicate range combination');seen.add(key)
  if(combo.cards.some(c=>known.has(c))){blocked++;continue}if(combo.weight===0)continue
  const rivers=board.length===5?[null]:deck().filter(c=>!known.has(c)&&!combo.cards.includes(c))
  let potShares=0
  for(const river of rivers){const shown=river===null?board:[...board,river];const result=compare(best([...hero,...shown]),best([...combo.cards,...shown]));potShares+=result>0?1:result===0?.5:0;runouts++;if(result>0)wins++;else if(result===0)ties++;else losses++}
  share+=combo.weight*potShares/rivers.length;weight+=combo.weight
 }
 if(weight<=0)throw Error('No positive unblocked range weight')
 return {equity:share/weight,blocked,runouts,wins,ties,losses,eligibleWeight:weight}
}
