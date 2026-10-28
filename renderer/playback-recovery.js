'use strict';
(function(root){
  const finiteNonNegative=(value)=>Number.isFinite(Number(value))&&Number(value)>=0;
  function clampTime(time,duration){
    let result=finiteNonNegative(time)?Number(time):0;
    const d=Number(duration);
    if(Number.isFinite(d)&&d>0)result=Math.min(result,Math.max(0,d-0.25));
    return result;
  }
  function recoveryPosition(input={}){
    const duration=Number(input.duration)>0?Number(input.duration):0;
    if(input.positionSeekPending&&finiteNonNegative(input.pendingSeekTarget))
      return clampTime(input.pendingSeekTarget,duration);
    if(input.started!==true&&input.startAtExplicit===true&&Number(input.startAt)===0)
      return 0;
    const current=Number(input.currentTime);
    const last=Number(input.lastKnownTime);
    const hasCurrent=finiteNonNegative(current);
    const hasLast=finiteNonNegative(last);
    if(input.started===true&&hasCurrent&&!(hasLast&&last>current+3))
      return clampTime(current,duration);
    if(hasLast&&last>0)return clampTime(last,duration);
    const start=Number(input.startAt);
    if(finiteNonNegative(start)&&start>0)return clampTime(start,duration);
    const resume=Number(input.resumeTime);
    if(finiteNonNegative(resume)&&resume>0)return clampTime(resume,duration);
    if(input.started===true&&hasCurrent)return clampTime(current,duration);
    return 0;
  }
  function shouldTrackPlaybackTime(input={}){
    const current=Number(input.currentTime);
    if(input.started!==true||!finiteNonNegative(current))return false;
    if(input.positionSeekPending){
      const target=Number(input.pendingSeekTarget);
      if(!finiteNonNegative(target))return false;
      const tolerance=Math.max(2,Math.min(12,Math.abs(target)*0.005));
      return Math.abs(current-target)<=tolerance;
    }
    const last=Number(input.lastKnownTime);
    if(finiteNonNegative(last)&&last>current+3)return false;
    return true;
  }
  root.VelaPlaybackRecovery=Object.freeze({recoveryPosition,shouldTrackPlaybackTime,clampTime});
})(window);
