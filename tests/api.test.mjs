import test from 'node:test';
import assert from 'node:assert/strict';
import {generate,validateInput} from '../api/generate.mjs';
import {makeDemo} from '../src/core.js';
import worker from '../worker/index.js';
const questions=makeDemo().questions.slice(0,6),pages=[1,2,3].map(page=>({page,text:questions.filter(q=>q.sourcePage===page).map(q=>q.sourceQuote).join('\n')}));
const input={title:'Tài liệu kiểm thử',pages,count:6};
const result={title:'Kiểm thử',description:'Mô tả',questions};
const output=data=>new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(data)}]}]}));
test('API sends bounded structured prompt, no storage, and validates sources',async()=>{
 let called=false;
 const course=await generate(input,{OPENAI_API_KEY:'test-only'},async(url,options)=>{
  called=true;assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(options.body);assert.equal(body.store,false);assert.equal(body.text.format.strict,true);assert.ok(body.instructions.includes('KHÔNG ĐÁNG TIN'));assert.equal(options.headers.Authorization,'Bearer test-only');return output(result);
 });
 assert.ok(called);assert.equal(course.questions.length,6);assert.ok(course.questions[0].id);
});
test('API rejects invented citations, duplicate options, and incomplete responses',async()=>{
 const bad=structuredClone(result);bad.questions[0].sourcePage=99;
 await assert.rejects(()=>generate(input,{OPENAI_API_KEY:'test'},async()=>output(bad)),/trích dẫn/);
 bad.questions[0]=structuredClone(questions[0]);bad.questions[0].options[1]=bad.questions[0].options[0];
 await assert.rejects(()=>generate(input,{OPENAI_API_KEY:'test'},async()=>output(bad)),/Cấu trúc/);
 await assert.rejects(()=>generate(input,{OPENAI_API_KEY:'test'},async()=>Response.json({status:'incomplete'})),/chưa tạo xong/);
});
test('no key, invalid request, and upstream failure return safe actionable errors',async()=>{
 await assert.rejects(()=>generate(input,{}),/Chưa cấu hình/);
 assert.throws(()=>validateInput({...input,pages:[{page:1,text:'a'.repeat(60001)}]}),/60.000/);
 assert.throws(()=>validateInput({...input,count:100}));assert.throws(()=>validateInput({...input,pages:[{page:1,text:123}]}));
 await assert.rejects(()=>generate(input,{OPENAI_API_KEY:'secret'},async()=>new Response('private provider details',{status:401})),error=>error.status===503&&!error.message.includes('secret')&&!error.message.includes('private'));
});
test('Worker rejects foreign origins, wrong access code and missing limiter',async()=>{
 const request=(origin='https://user.github.io',code='')=>new Request('https://api.example.org/api/generate',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Access-Code':code},body:JSON.stringify(input)});
 const env={ALLOWED_ORIGINS:'https://user.github.io',ACCESS_CODE:'demo-code'};
 assert.equal((await worker.fetch(request('https://evil.org'),env)).status,403);
 assert.equal((await worker.fetch(request(),env)).status,401);
 assert.equal((await worker.fetch(request('https://user.github.io','demo-code'),env)).status,503);
 const preflight=await worker.fetch(new Request('https://api.example.org/api/generate',{method:'OPTIONS',headers:{Origin:'https://user.github.io'}}),env);
 assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),'https://user.github.io');
});
test('Worker rate limiting runs before AI generation',async()=>{
 const res=await worker.fetch(new Request('https://api.example.org/api/generate',{method:'POST',headers:{Origin:'https://user.github.io'},body:'{}'}),{ALLOWED_ORIGINS:'https://user.github.io',AI_LIMITER:{limit:async()=>({success:false})}});assert.equal(res.status,429);
});
