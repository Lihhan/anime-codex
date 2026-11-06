import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stepMotion,sizeValue} from '../shared/pet-motion.mjs';
const bounds={left:8,right:800,top:8,bottom:500};
test('pet reflects at each desktop edge and travels inward on the next step',()=>{
 for(const [p,v,dir] of [[{x:799,y:100},{x:46,y:0},'left'],[{x:9,y:100},{x:-46,y:0},'right'],[{x:100,y:9},{x:0,y:-46},'down'],[{x:100,y:499},{x:0,y:46},'up']]){
  const hit=stepMotion(p,v,.1,bounds);assert.equal(hit.direction,dir);
  const after=stepMotion(hit.position,hit.velocity,.1,bounds);
  assert.ok(after.position.x>bounds.left&&after.position.x<bounds.right);
  assert.ok(after.position.y>bounds.top&&after.position.y<bounds.bottom);
 }
});
test('resized bounds and suspended frame cannot send pet off screen',()=>{
 const next=stepMotion({x:1000,y:700},{x:46,y:46},60,bounds);
 assert.deepEqual(next.position,{x:800,y:500});assert.deepEqual(next.velocity,{x:-46,y:-46});
});
test('size persistence validates corrupt storage and keeps supported endpoints',()=>{
 for(const value of [null,'garbage','Infinity','0','2'])assert.equal(sizeValue(value),.7);
 assert.equal(sizeValue('0.4'),.4);assert.equal(sizeValue('1.4'),1.4);
});
