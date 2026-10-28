'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','renderer','playback-recovery.js'),'utf8');
const window={};
vm.runInNewContext(source,{window},{filename:'renderer/playback-recovery.js'});
const R=window.VelaPlaybackRecovery;
assert.ok(R,'recovery policy is exposed');
assert.equal(R.recoveryPosition({currentTime:0,duration:3600,lastKnownTime:2100,started:true}),2100,
  'stale 0 after recovery failure must not replace 35-minute checkpoint');
assert.equal(R.recoveryPosition({currentTime:0,duration:3600,lastKnownTime:2000,startAt:1900,positionSeekPending:true,pendingSeekTarget:2100,started:false}),2100,
  'pending seek target wins during native startup');
assert.equal(R.recoveryPosition({currentTime:2150,duration:3600,lastKnownTime:2148,started:true}),2150,
  'current time is accepted when it is close to checkpoint');
assert.equal(R.recoveryPosition({currentTime:2100,duration:3600,lastKnownTime:2100,positionSeekPending:true,pendingSeekTarget:600,started:true}),600,
  'intentional seek target wins over previous playback time');
assert.equal(R.recoveryPosition({currentTime:800,duration:900,lastKnownTime:850,started:true}),800,
  'short ordinary fluctuations do not override a valid live clock');
assert.equal(R.recoveryPosition({currentTime:8000,duration:3600,lastKnownTime:3500,started:true}),3599.75,
  'recovery position is clamped to media duration');
assert.equal(R.recoveryPosition({currentTime:0,lastKnownTime:0,startAt:100,resumeTime:250,started:false}),100,
  'requested start point takes precedence over older resume fallback');
assert.equal(R.recoveryPosition({currentTime:0,lastKnownTime:0,startAt:0,resumeTime:250,started:false}),250,
  'saved resume point is used when there is no last-known point');
assert.equal(R.recoveryPosition({currentTime:0,lastKnownTime:0,startAt:0,resumeTime:0,started:false}),0,
  'zero is the final safe fallback');
assert.equal(R.shouldTrackPlaybackTime({currentTime:0,lastKnownTime:2100,started:true}),false,
  'zero emitted after a previously played session is treated as a reset');
assert.equal(R.shouldTrackPlaybackTime({currentTime:600,lastKnownTime:2100,positionSeekPending:true,pendingSeekTarget:600,started:true}),true,
  'intentional seek is accepted once the engine reaches its target');
assert.equal(R.shouldTrackPlaybackTime({currentTime:100,lastKnownTime:2100,positionSeekPending:true,pendingSeekTarget:600,started:true}),false,
  'stale timestamps are ignored while a seek is pending');
assert.equal(R.shouldTrackPlaybackTime({currentTime:100,lastKnownTime:2100,started:true}),false,
  'unexpected backward jumps are ignored');
assert.equal(R.shouldTrackPlaybackTime({currentTime:2150,lastKnownTime:2148,started:true}),true);
assert.equal(R.clampTime(999,100),99.75);
console.log('playback recovery: all regression tests passed (15 assertions)');
