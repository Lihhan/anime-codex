import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {interactionStates,transitionPlan,missingTransitions,transitionDurations} from '../shared/pet-transitions.mjs';
const require=createRequire(import.meta.url), appearances=require('../shared/pet-appearances.json'),{makePack,sheets}=require('../shared/pet-production.cjs');
for(const [name,clips] of [['Furina',appearances.furina.sticker.clips],['generated',makePack(Object.fromEntries(sheets.map(s=>[s.id,s.id+'.png']))).clips]]){
 test(name+' covers every directed activity pair with actual exit and entry clips',()=>{
  assert.deepEqual(missingTransitions(clips),[]);
  let count=0;
  for(const from of interactionStates)for(const to of interactionStates){
   if(from===to)continue;
   const plan=transitionPlan(clips,from,to);assert.ok(plan.length);count++;
   if(plan[0].stage!=='action'){
    if(from!=='idle')assert.equal(plan[0].key,'exit_'+from);
    if(to!=='idle')assert.equal(plan.at(-1).key,'enter_'+to);
   }
   for(const step of plan){assert.ok(clips[step.key].durations.length>=4);assert.ok(clips[step.key].src);}
  }
  assert.equal(count,72);
 });
}
test('aliases route through their physical activity and pickup remains immediate',()=>{
 const c=appearances.furina.sticker.clips;
 assert.deepEqual(transitionPlan(c,'eat','working'),transitionPlan(c,'meal','office'));
 assert.deepEqual(transitionPlan(c,'read','drag'),[]);
 assert.deepEqual(transitionPlan(c,'read','read'),[]);
});

test('transition pacing preserves long poses and adds readable anticipation and landing',()=>{
 assert.deepEqual(transitionDurations([150,180,180,150]),[340,280,280,380]);
 assert.deepEqual(transitionDurations([600,900]),[660,1000]);
});
