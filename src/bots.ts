import {Action,Table,act,legal} from './table';import {best} from './poker';
export const botNames=['You','Loose','Tight','Passive','Aggressive','Calling station'];
/** Toy deterministic educational policies. Never use hidden cards or future deck. No calibrated live-player frequencies. */
export function botAction(s:Table):Action {const l=legal(s);const p=s.players[s.actor];const ranks=p.hole.map(c=>Math.floor(c/4)+2);const strong=s.board.length>=3?best([...p.hole,...s.board])[0]>=2:ranks[0]===ranks[1]||Math.min(...ranks)>=11;const sample=((s.seed*31+s.actions.length*17+s.actor*13)>>>0)%10;const type=s.actor;
 if(l.canRaise&&(strong||type===4&&sample<3))return {type:'raise',to:Math.min(l.maxTo,Math.max(l.minTo,s.bet+Math.max(2,Math.floor(s.players.reduce((n,p)=>n+p.total,0)/2))))};
 if(!l.call)return {type:'check'};
 if(type===5||strong||type===1&&l.call<=Math.max(2,p.stack/3)||type===3&&sample<5||type===4&&sample<6||type===2&&sample<2)return {type:'call'};
 return {type:'fold'};
}
export function toHero(state:Table):Table {let s=state;let count=0;while(!s.done&&s.actor!==0){if(++count>500)throw new Error('Bot action limit');s=act(s,botAction(s));}return s;}
