import {best,compare,deck} from './poker';
export type Player={stack:number;street:number;total:number;folded:boolean;hole:number[]};
export type Action={type:'fold'}|{type:'call'}|{type:'check'}|{type:'raise';to:number};
export type Table={players:Player[];button:number;actor:number;stage:number;board:number[];pack:number[];bet:number;minRaise:number;pending:boolean[];actedAt:(number|null)[];done:boolean;log:string[];actions:Action[];seed:number;initial:number[];awards:number[]};
const copy=(s:Table):Table=>JSON.parse(JSON.stringify(s));
function next(from:number,predicate:(i:number)=>boolean) {for(let k=1;k<=6;k++){const i=(from+k)%6;if(predicate(i))return i;}return -1;}
export function shuffled(seed:number) {if(!Number.isInteger(seed))throw new Error('Integer seed required');const cards=deck();let x=seed>>>0;for(let i=51;i>0;i--){x=(Math.imul(x,1664525)+1013904223)>>>0;const j=Math.floor((x/4294967296)*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}return cards;}
export function createTable(seed=1,stacks=Array(6).fill(200),button=0):Table {
 if(stacks.length!==6||stacks.some(x=>!Number.isSafeInteger(x)||x<0)||stacks.filter(x=>x>0).length<2||!Number.isInteger(button)||button<0||button>5||stacks[button]===0)throw new Error('Need 2–6 funded seats and a funded button');
 const s:Table={players:stacks.map(stack=>({stack,street:0,total:0,folded:stack===0,hole:[]})),button,actor:0,stage:0,board:[],pack:shuffled(seed),bet:2,minRaise:2,pending:stacks.map(x=>x>0),actedAt:Array(6).fill(null),done:false,log:[],actions:[],seed,initial:[...stacks],awards:Array(6).fill(0)};
 const active=(i:number)=>stacks[i]>0;let cursor=button;
 for(let round=0;round<2;round++)for(let j=0;j<stacks.filter(x=>x>0).length;j++){cursor=next(cursor,active);s.players[cursor].hole.push(s.pack.pop()!);}
 const sb=stacks.filter(x=>x>0).length===2?button:next(button,active);const bb=next(sb,active);
 pay(s,sb,Math.min(1,s.players[sb].stack));pay(s,bb,Math.min(2,s.players[bb].stack));s.log.push(`Blinds: seat ${sb+1} posts ${s.players[sb].street}, seat ${bb+1} posts ${s.players[bb].street}.`);
 s.pending=s.players.map(p=>!p.folded&&p.stack>0);s.actor=next(bb,i=>s.pending[i]);advance(s,bb);return s;
}
function pay(s:Table,i:number,n:number) {const p=s.players[i];p.stack-=n;p.street+=n;p.total+=n;}
export function legal(s:Table) {if(s.done||s.actor<0) return {call:0,minTo:0,maxTo:0,canRaise:false};const p=s.players[s.actor];const maxTo=p.street+p.stack;const call=Math.min(p.stack,Math.max(0,s.bet-p.street));const reopened=s.actedAt[s.actor]===null||s.bet-s.actedAt[s.actor]!>=s.minRaise;return {call,minTo:s.bet+s.minRaise,maxTo,canRaise:reopened&&maxTo>s.bet&&s.players.some((v,i)=>i!==s.actor&&!v.folded&&v.stack>0)};}
export function act(state:Table,action:Action):Table {
 if(state.done)throw new Error('Hand complete');const s=copy(state);const i=s.actor;const p=s.players[i];if(i<0||p.folded||!p.stack)throw new Error('No acting player');const l=legal(s);
 if(action.type==='fold'){if(l.call===0)throw new Error('Check is free');p.folded=true;}
 else if(action.type==='check'){if(l.call)throw new Error('Must face the bet');}
 else if(action.type==='call'){if(!l.call)throw new Error('Nothing to call');pay(s,i,l.call);}
 else {if(!l.canRaise||!Number.isSafeInteger(action.to)||action.to>l.maxTo||action.to<=s.bet||(action.to<l.minTo&&action.to!==l.maxTo))throw new Error('Illegal raise');const increase=action.to-s.bet;pay(s,i,action.to-p.street);s.bet=action.to;if(increase>=s.minRaise){s.minRaise=increase;s.pending=s.players.map((v,j)=>j!==i&&!v.folded&&v.stack>0);}else s.pending=s.pending.map((v,j)=>v||(!s.players[j].folded&&s.players[j].stack>0&&s.players[j].street<s.bet));}
 s.pending[i]=false;s.actedAt[i]=s.bet;s.actions.push(action);s.log.push(`Seat ${i+1}: ${action.type}${action.type==='raise'?' to '+action.to:action.type==='call'?' '+l.call:''}.`);advance(s,i);return s;
}
function draw(s:Table,n:number){s.pack.pop();for(let i=0;i<n;i++)s.board.push(s.pack.pop()!);}
function advance(s:Table,from:number) {
 const live=s.players.filter(p=>!p.folded);if(live.length===1){const i=s.players.findIndex(p=>!p.folded);s.awards[i]=s.players.reduce((n,p)=>n+p.total,0);finish(s);return;}
 s.pending=s.pending.map((v,i)=>v&&!s.players[i].folded&&s.players[i].stack>0);
 const able=s.players.map((p,i)=>!p.folded&&p.stack>0?i:-1).filter(i=>i>=0);
 // A lone funded player need only respond to an outstanding price, never bet into dry side pots.
 if(able.length===1&&s.players[able[0]].street>=s.bet)s.pending[able[0]]=false;
 if(s.pending.some(Boolean)){s.actor=next(from,i=>s.pending[i]);return;}
 if(s.stage===3){s.awards=settle(s.players,s.board,s.button);finish(s);return;}
 s.stage++;draw(s,s.stage===1?3:1);s.log.push(['','Flop','Turn','River'][s.stage]+'.');s.players.forEach(p=>p.street=0);s.bet=0;s.minRaise=2;s.actedAt=Array(6).fill(null);s.pending=s.players.map(p=>!p.folded&&p.stack>0);
 if(able.length<2)s.pending=Array(6).fill(false);
 if(!s.pending.some(Boolean)){advance(s,s.button);return;}s.actor=next(s.button,i=>s.pending[i]);
}
function finish(s:Table){s.players.forEach((p,i)=>{p.stack+=s.awards[i];p.total=0;p.street=0;});s.done=true;s.actor=-1;s.pending=Array(6).fill(false);s.log.push('Hand complete. Awards: '+s.awards.map((n,i)=>n?`seat ${i+1} ${n}`:'').filter(Boolean).join(', '));}
/** Tiered pots include folded contributions; uncalled excess is returned. Odd chips go clockwise after button. */
export function settle(players:Player[],board:number[],button:number):number[] {
 const awards=Array(players.length).fill(0);const tiers=[...new Set(players.map(p=>p.total).filter(n=>n>0))].sort((a,b)=>a-b);let previous=0;
 for(const tier of tiers){const contributors=players.map((p,i)=>p.total>=tier?i:-1).filter(i=>i>=0);const amount=(tier-previous)*contributors.length;previous=tier;
 if(contributors.length===1){awards[contributors[0]]+=amount;continue;}
 const eligible=contributors.filter(i=>!players[i].folded);if(!eligible.length)throw new Error('Pot has no eligible player');let winners=[eligible[0]];let score=best([...players[eligible[0]].hole,...board]);for(const i of eligible.slice(1)){const b=best([...players[i].hole,...board]);const c=compare(b,score);if(c>0){winners=[i];score=b;}else if(c===0)winners.push(i);}
 const each=Math.floor(amount/winners.length);for(const i of winners)awards[i]+=each;let odd=amount%winners.length;for(let k=1;k<=players.length&&odd;k++){const i=(button+k)%players.length;if(winners.includes(i)){awards[i]++;odd--;}}
 }return awards;
}
export function nextHand(s:Table) {if(!s.done)throw new Error('Finish current hand');const stacks=s.players.map(p=>p.stack);const button=next(s.button,i=>stacks[i]>0);return createTable(s.seed+1,stacks,button);}
export function replay(seed:number,stacks:number[],button:number,actions:Action[]) {return actions.reduce((s,a)=>act(s,a),createTable(seed,stacks,button));}
export function cardName(card:number) {return '23456789TJQKA'[Math.floor(card/4)]+['♣','♦','♥','♠'][card%4];}
