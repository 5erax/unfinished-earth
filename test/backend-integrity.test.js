import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createGameServer } from '../src/server.js';
import { createWorker } from '../src/cloud-worker.js';
import { CloudStore } from '../src/cloud-store.js';
import { LocalD1 } from '../scripts/local-d1.js';

async function nodeFixture(run) {
  let now=10000;
  const game=createGameServer({clock:()=>now});
  game.server.listen(0,'127.0.0.1'); await once(game.server,'listening');
  const url=`http://127.0.0.1:${game.server.address().port}`;
  const call=async(path,data,cookie)=>{
    const r=await fetch(url+path,{method:data===undefined?'GET':'POST',headers:{...(data===undefined?{}:{'Content-Type':'application/json'}),...(cookie?{cookie}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});
    return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
  };
  try {await run({...game,call,time:n=>{now=n;}});} finally {await new Promise(r=>game.server.close(r));}
}

test('Node disk failure remains retryable with same command ID; successful retry is applied once',async()=>nodeFixture(async({store,call})=>{
 const joined=await call('/api/join',{}),id=joined.data.you;
 const w=structuredClone(store.world); w.players[id].x=6;w.players[id].z=20;store.save(w);
 const command={type:'gather',target:'home-wood',id:'retry-disk-0001'};
 const remaining=store.world.resources.find(r=>r.id==='home-wood').remaining;
 // Fail only a success receipt, so the old bug could incorrectly commit a 400 receipt.
 store.db.exec("CREATE TRIGGER fail_success BEFORE INSERT ON commands WHEN json_extract(NEW.result,'$.status')=200 BEGIN SELECT RAISE(ABORT,'injected disk failure'); END;");
 const failed=await call('/api/command',command,joined.cookie);
 assert.equal(failed.status,500);assert.equal(store.result(id,command.id),null);
 assert.equal(store.world.players[id].bag.wood,0);
 assert.equal(store.world.resources.find(r=>r.id==='home-wood').remaining,remaining);
 store.db.exec('DROP TRIGGER fail_success');
 const ok=await call('/api/command',command,joined.cookie);assert.equal(ok.status,200);
 const replay=await call('/api/command',command,joined.cookie);assert.equal(replay.data.replayed,true);
 assert.equal(replay.data.state.players[id].bag.wood,1);
}));

test('Node rejects non-object JSON, dangling sessions and new characters at capacity',async()=>nodeFixture(async({store,call,time})=>{
 for(const data of [null,[],true,'text']) assert.equal((await call('/api/join',data)).status,400);
 assert.equal(Object.keys(store.world.players).length,0);
 const joined=await call('/api/join',{}),id=joined.data.you;
 const w=structuredClone(store.world),p=w.players[id];delete w.players[id];store.save(w);
 assert.equal((await call('/api/state',undefined,joined.cookie)).status,401);
 w.players[id]=p;for(let i=1;i<100;i++)w.players['old-'+i]={...p,id:'old-'+i};store.save(w);
 time(70001);
 assert.equal((await call('/api/join',{})).status,409);
 assert.equal((await call('/api/state',undefined,joined.cookie)).status,200);
 assert.equal(Object.keys(store.world.players).length,100);
}));

test('Cloud failed receipt batch rolls back gameplay and retry remains exactly once',async()=>{
 const db=new LocalD1(':memory:'),worker=createWorker({},()=>10000),store=new CloudStore(db);
 const call=async(path,data,cookie)=>{
  const r=await worker.fetch(new Request('https://earth.test'+path,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(data)}),{DB:db});
  return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
 };
 try {
  const joined=await call('/api/join',{}),id=joined.data.you;
  await store.transact(10000,w=>{w.players[id].x=6;w.players[id].z=20;return {status:200,payload:{}};});
  db.db.exec("CREATE TRIGGER fail_receipt BEFORE INSERT ON cloud_receipts BEGIN SELECT RAISE(ABORT,'injected receipt failure'); END;");
  const command={type:'gather',target:'home-wood',id:'cloud-retry-0001'};
  assert.equal((await call('/api/command',command,joined.cookie)).status,500);
  assert.equal(await store.receipt(id,command.id),null);
  assert.equal((await store.read(10000)).players[id].bag.wood,0);
  db.db.exec("DROP TRIGGER fail_receipt");
  assert.equal((await call('/api/command',command,joined.cookie)).status,200);
  const replay=await call('/api/command',command,joined.cookie);
  assert.equal(replay.data.replayed,true);assert.equal(replay.data.state.players[id].bag.wood,1);
 }finally{db.close();}
});
