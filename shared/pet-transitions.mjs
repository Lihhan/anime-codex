export const interactionStates = ['idle','read','meal','gaming','office','sleep','walk','pet','attention'];
export const actionName = value => ({eat:'meal',working:'office',play:'gaming',restore:'meal'}[value] || (/^walk_/.test(value) ? 'walk' : value));
export function transitionPlan(clips, from, to) {
  from=actionName(from);to=actionName(to);
  if(from===to || from==='drag' || to==='drag')return [];
  const direct=`transition_${from}_${to}`;
  if(clips[direct])return [{key:direct,stage:'action'}];
  return [{key:`exit_${from}`,stage:'exit'},{key:`enter_${to}`,stage:'enter'}].filter(s=>clips[s.key]);
}
export function missingTransitions(clips) {
  return interactionStates.flatMap(from=>interactionStates.filter(to=>to!==from).flatMap(to=>{
    const direct=clips[`transition_${from}_${to}`];
    return direct || ((from==='idle'||clips[`exit_${from}`])&&(to==='idle'||clips[`enter_${to}`])) ? [] : [`${from}->${to}`];
  }));
}

// Give key poses time to read, especially the anticipation and landing poses.
export function transitionDurations(durations) {
  return durations.map((ms,i)=>Math.max(280,ms)+(i===0?60:0)+(i===durations.length-1?100:0));
}
