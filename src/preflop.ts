import {Drill} from './math';
export const positions=['UTG','HJ','CO','BTN','SB'] as const;
export type Position=typeof positions[number];
const ranks='AKQJT98765432';
export const hands=Array.from({length:13},(_,r)=>Array.from({length:13},(_,c)=>r===c?ranks[r]+ranks[c]:r<c?ranks[r]+ranks[c]+'s':ranks[c]+ranks[r]+'o')).flat();
const base='AA KK QQ JJ TT 99 88 77 ATs AJs AQs AKs KJs KQs QJs JTs AQo AKo';
const additions=['','66 55 A9s A8s KTs QTs T9s AJo KQo','44 33 22 A7s A6s A5s A4s A3s A2s K9s Q9s J9s 98s 87s ATo KJo QJo','A9o A8o A7o A6o A5o KTo QTo JTo K8s K7s K6s K5s Q8s J8s T8s 97s 86s 76s 65s 54s',''];
export const ranges:Record<Position,Set<string>>=Object.fromEntries(positions.map((p,i)=>[p,new Set((base+' '+additions.slice(0,i+1).join(' ')).trim().split(/\s+/))])) as Record<Position,Set<string>>;
// SB deliberately shares the button list in this simplified model; it is not claimed optimal.
export const assumptions='Authored heuristic · 6-max cash · 100 BB effective · blinds 0.5/1 BB · no ante · unopened pot · no rake modeled. Raise-or-fold only. SB shares the button range for simplicity; BB gets a walk if everyone folds. This is not a solved or PTO-licensed chart.';
export function firstIn(position:Position,hand:string) {if(!positions.includes(position)||!hands.includes(hand))throw new Error('Unsupported position or hand');return ranges[position].has(hand)?'Raise':'Fold';}
export function preflopDrill(index:number):Drill {
 const position=positions[index%positions.length];const hand=hands[Math.floor(index/positions.length)%hands.length];const raise=firstIn(position,hand)==='Raise';
 return {id:`preflop-${position}-${hand}`,topic:`Preflop ${position}`,question:`${position} · ${hand} · 100 BB\nEveryone before you folds. Follow the displayed simplified first-in baseline.`,choices:['Raise','Fold'],answer:raise?0:1,explanation:`Educational heuristic: ${raise?'raise to '+(position==='SB'?'3':'2.5')+' BB':'fold'} ${hand} from ${position}. ${raise?'This hand is included in our authored baseline; favor hands with strength or playability.':'This hand is outside our authored baseline; avoid investing without a reason to deviate.'} The range is a teaching convention, not a mathematical solution. Loose callers behind can change the best sizing and selection; short stacks and facing raises require different plans.`};
}
