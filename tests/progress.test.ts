import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeProgress, freshProgress, level, record } from '../src/progress';
test('fresh storage and round trip', () => { const p = freshProgress(); assert.deepEqual(decodeProgress(null), p); assert.deepEqual(decodeProgress(JSON.stringify(p)), p); });
test('corruption and future schemas are not silently erased', () => { for (const raw of ['{', '{"version":2}', '{"version":1,"xp":-1,"attempts":{}}']) assert.throws(() => decodeProgress(raw)); });
test('scoring is immutable and tracks errors', () => { const p = freshProgress(); const next = record(record(p, 'odds', true), 'odds', false); assert.equal(p.xp, 0); assert.equal(next.xp, 12); assert.deepEqual(next.attempts.odds, { correct: 1, total: 2 }); assert.equal(level(100), 2); });
test('legacy v1 progress migrates losslessly and current schema is canonical',()=>{const p=decodeProgress(JSON.stringify({version:1,xp:42,attempts:{Draws:{correct:1,total:3}}}));assert.equal(p.version,2);assert.equal(p.xp,42);assert.deepEqual(p.completed,[]);assert.equal(p.attempts.Draws.total,3);assert.deepEqual(decodeProgress(JSON.stringify(p)),p);assert.throws(()=>decodeProgress('{"version":2,"xp":0,"attempts":{}}'));assert.throws(()=>decodeProgress('{"version":2,"xp":0,"completed":[],"attempts":{"x":{"correct":0,"total":0}}}'));});
