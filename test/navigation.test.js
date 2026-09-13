import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,join,applyCommand,freeSegment,findRoute} from '../src/world.js';
function verify(w,start,goal,radius=0) {
 const route=findRoute(w,start,goal,radius); assert.ok(route);
 let p=start; for(const [x,z] of route) {const next={x,z};assert.ok(freeSegment(w,p,next));p=next;}
 assert.ok(Math.hypot(p.x-goal.x,p.z-goal.z)<=radius+1e-7); return route;
}
test('fractional targets route deterministically, cross only repaired bridge, and avoid corners',()=>{
 const w=createWorld(1000),start={x:7.234,z:22.156},goal={x:24.43,z:12.18};
 assert.equal(findRoute(w,start,goal),null);
 w.bridge=true;
 const route=verify(w,start,goal); assert.deepEqual(findRoute(w,start,goal),route);
 assert.ok(route.some(([x,z])=>z>16.72 && z<17.28));
 assert.equal(freeSegment(w,start,goal),false);
 w.buildings=[{x:10,z:22}];
 verify(w,start,{x:12.13,z:22.22});
 assert.equal(freeSegment(w,{x:9,z:22},{x:11,z:22}),false);
 assert.equal(findRoute(w,start,{x:10,z:22}),null);
 verify(w,start,{x:10,z:22},2);
 assert.equal(findRoute(w,start,{x:NaN,z:22}),null);
});
test('continuous movement accepts fractional paths with server speed budget and no tunneling',()=>{
 const w=createWorld(1000);join(w,'a',1000);const p=w.players.a;
 p.lastMove=1000;
 const steps=Array.from({length:10},(_,i)=>({x:7+(i+1)*.1,z:22+(i+1)*.1}));
 applyCommand(w,'a',{type:'glide',steps},1100);
 assert.equal(p.moveSeq,3);assert.equal(p.x,7.3);
 const before=structuredClone(p);
 assert.throws(()=>applyCommand(w,'a',{type:'glide',steps:[{x:25,z:25}]},10000));
 assert.deepEqual(p,before);
 applyCommand(w,'a',{type:'glide',steps:steps.slice(3)},1400);
 assert.equal(p.x,8); assert.equal(p.z,23);
 p.x=14.2;p.z=12;
 assert.throws(()=>applyCommand(w,'a',{type:'glide',steps:[{x:14.4,z:12}]},2000));
 assert.equal(p.x,14.2);
});
import { Motion } from '../public/motion.js';
test('650ms acknowledgement cycles preserve continuous prediction and fit request size limit',()=>{
 const w=createWorld(1000);join(w,'a',1000);w.you='a';w.players.a.lastMove=1000;
 const m=new Motion();m.continuous=true;
 let now=1000;
 for(let cycle=0;cycle<5;cycle++) {
  for(let frame=0;frame<40;frame++) {
   const p=m.target('a',w.players.a,'a');
   assert.ok(m.enqueueContinuous(w,p.x,p.z-.08,freeSegment));
   m.frame(w,.016);
  }
  now+=650;
  const steps=m.pending.slice(0,64),before=w.players.a.moveSeq||0;
  assert.ok(JSON.stringify({type:'glide',id:'a'.repeat(32),steps}).length<4096);
  applyCommand(w,'a',{type:'glide',steps},now);
  m.acknowledge(true,w.players.a.moveSeq-before);
  assert.equal(m.pending.length,0);
 }
 assert.ok(Math.abs(w.players.a.z-6)<1e-8);
});
