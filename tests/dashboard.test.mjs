import test from 'node:test';
import assert from 'node:assert/strict';
import dashboard from '../worker/dashboard-worker.mjs';
import source from '../worker/index.js';
const origin='https://tenanhlatri-58.github.io';
const request=method=>new Request('https://example.workers.dev/api/generate',{method,headers:{Origin:origin,'Content-Type':'application/json'},...(method==='POST'?{body:'{}'}:{})});
test('dashboard bundle preserves source CORS and missing binding behavior',async()=>{
 for(const method of ['OPTIONS','POST']){
  const env={ALLOWED_ORIGINS:origin};
  const a=await source.fetch(request(method),env),b=await dashboard.fetch(request(method),env);
  assert.equal(a.status,b.status);assert.equal(await a.text(),await b.text());assert.equal(a.headers.get('Access-Control-Allow-Origin'),b.headers.get('Access-Control-Allow-Origin'));
 }
});
test('dashboard bundle rejects calls when configured limiter is exhausted',async()=>{
 const response=await dashboard.fetch(request('POST'),{ALLOWED_ORIGINS:origin,AI_LIMITER:{limit:async()=>({success:false})}});
 assert.equal(response.status,429);
});
test('dashboard bundle preserves shared access-code check',async()=>{
 const response=await dashboard.fetch(request('POST'),{ALLOWED_ORIGINS:origin,ACCESS_CODE:'test-only'});
 assert.equal(response.status,401);
});
