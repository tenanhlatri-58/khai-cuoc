import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,makeDemo,recordAnswer,reviewAnswer,dayKey,streak,validateQuestions,validateBackup,safeEndpoint,escapeHTML,lessons,progress} from '../src/core.js';
test('new learner has honest initial progress and playable demo',()=>{
 const s=initialState();assert.equal(s.profile.elo,800);assert.deepEqual(s.stats,{});assert.equal(s.courses[0].questions.length,12);assert.equal(lessons(s.courses[0]).length,4);assert.equal(progress(s.courses[0]),0);assert.equal(streak(s),0);
});
test('first wrong is floored at 800 and repeats cannot farm Elo',()=>{
 const s=initialState(),q=s.courses[0].questions[0];
 assert.equal(recordAnswer(s,q,false),0);assert.equal(recordAnswer(s,q,true),12);assert.equal(recordAnswer(s,q,true),0);assert.equal(recordAnswer(s,q,false),0);assert.equal(s.profile.elo,812);
 assert.deepEqual([s.stats[q.id].seen,s.stats[q.id].correct,s.stats[q.id].wrong],[4,2,2]);
});
test('Elo penalty applies only once per question',()=>{const s=initialState();s.profile.elo=900;const q=s.courses[0].questions[0];assert.equal(recordAnswer(s,q,false),-6);assert.equal(recordAnswer(s,q,false),0);assert.equal(s.profile.elo,894);});
test('review schedule doubles to cap and resets for forgotten cards',()=>{
 const s=initialState(),now=Date.now();reviewAnswer(s,'demo-q0',true,now);assert.equal(s.reviews['demo-q0'].interval,1);reviewAnswer(s,'demo-q0',true,now);assert.equal(s.reviews['demo-q0'].interval,2);
 for(let i=0;i<10;i++)reviewAnswer(s,'demo-q0',true,now);assert.equal(s.reviews['demo-q0'].interval,30);
 reviewAnswer(s,'demo-q0',false,now);assert.equal(s.reviews['demo-q0'].interval,0);assert.equal(s.reviews['demo-q0'].due,now+300000);assert.equal(s.profile.elo,800);
});
test('streak tolerates today not yet studied and date boundaries',()=>{const s=initialState();s.activity={'2026-10-17':3,'2026-10-18':1};assert.equal(streak(s,new Date(2026,9,19,12)),2);assert.equal(streak(s,new Date(2026,9,20,12)),0);assert.equal(dayKey(new Date(2026,0,2)),'2026-01-02');});
test('AI quotes must belong to cited page, normalized for whitespace',()=>{
 const data={questions:makeDemo().questions.slice(0,3)};const pages=data.questions.map(q=>({page:q.sourcePage,text:q.sourceQuote}));pages[0].text=data.questions.filter(q=>q.sourcePage===1).map(q=>q.sourceQuote).join('  \n ');
 assert.equal(validateQuestions(data,pages).length,3);
 const bad=structuredClone(data);bad.questions[0].sourceQuote='Câu này không có trong tài liệu.';assert.throws(()=>validateQuestions(bad,pages),/trích dẫn/);
});
test('malformed answer indices, duplicates and questions rejected',()=>{
 const data={questions:makeDemo().questions};data.questions[0].answerIndex=4;assert.throws(()=>validateQuestions(data));data.questions[0].answerIndex=0;data.questions[1].prompt=data.questions[0].prompt;assert.throws(()=>validateQuestions(data),/trùng/);
});
test('backups round trip with progress and reject unsafe identities',()=>{
 const s=initialState();recordAnswer(s,s.courses[0].questions[0],true);reviewAnswer(s,'demo-q0',true);s.courses[0].completed=[0];s.settings.endpoint='https://example.org/api/generate';
 const restored=validateBackup(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored.profile,s.profile);assert.deepEqual(restored.stats,s.stats);assert.deepEqual(restored.courses[0].completed,[0]);assert.equal(restored.settings.endpoint,'');
 const bad=structuredClone(s);bad.courses[0].questions[0].id='constructor';assert.throws(()=>validateBackup(bad));
 bad.courses[0].questions[0].id='__proto__';assert.throws(()=>validateBackup(bad));
});
test('backup rejects forged statistics and non-sequential completion',()=>{const s=initialState();s.courses[0].completed=[2];assert.throws(()=>validateBackup(s));s.courses[0].completed=[];s.stats['demo-q0']={seen:1,correct:2,wrong:0};assert.throws(()=>validateBackup(s));});
test('endpoint requires HTTPS except localhost and forbids credentials',()=>{
 assert.equal(safeEndpoint('https://example.com/api/generate'),'https://example.com/api/generate');assert.ok(safeEndpoint('http://localhost:4173/api/generate'));
 for(const url of ['javascript:alert(1)','http://example.com','https://secret@example.com','https://example.com?key=secret'])assert.throws(()=>safeEndpoint(url));
});
test('HTML from sources is always escaped',()=>assert.equal(escapeHTML('<script>"x" & \'y\'</script>'),'&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;'));
