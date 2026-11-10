import { test } from 'node:test';
import assert from 'node:assert/strict';
import { potOdds, bluffThreshold, drills } from '../src/math';
test('pot odds denominator includes call exactly once',()=>{assert.equal(potOdds(60,20),.25);assert.equal(potOdds(100,100),.5);assert.equal(potOdds(100,0),0);});
test('bluff threshold makes EV zero',()=>{for(const [pot,bet] of [[100,50],[80,80],[40,100]]){const f=bluffThreshold(pot,bet);assert.ok(Math.abs(f*pot-(1-f)*bet)<1e-10);}});
test('reject invalid financial inputs',()=>{for(const fn of [potOdds,bluffThreshold])for(const [a,b] of [[0,0],[-1,20],[20,-1],[NaN,1],[Infinity,1]])assert.throws(()=>fn(a,b));});
test('drill choices and IDs are valid',()=>{assert.equal(new Set(drills.map(d=>d.id)).size,drills.length);for(const d of drills) assert.ok(d.answer>=0 && d.answer<d.choices.length && d.explanation.length>40);});
