import {STORAGE_KEY,initialState,escapeHTML as e,uid,mentors,mentorFor,lessons,progress,recordAnswer,reviewAnswer,streak,dayKey,validateQuestions,validateBackup,safeEndpoint} from './core.js';
import config from './config.js';

const $=selector=>document.querySelector(selector);
let state=initialState(),storageWarning='';
try{const saved=localStorage.getItem(STORAGE_KEY);if(saved){const parsed=JSON.parse(saved);state=validateBackup(parsed);state.settings.endpoint=safeEndpoint(parsed.settings?.endpoint||'');}}catch{storageWarning='Không đọc được tiến độ đã lưu. Bạn có thể khôi phục bằng tệp sao lưu trong Cài đặt.';}
let selectedId=state.courses[0]?.id,quiz=null,flash=null,search='',filter='all',accessCode='',uploadPages=null,uploadName='',uploadToken=0,creating=false,toastTimer;
const icon=(name,size=20)=>{
 const shapes={board:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',book:'<path d="M12 6c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v15"/>',cards:'<rect x="7" y="7" width="14" height="14" rx="3"/><path d="M16 3H6a3 3 0 0 0-3 3v10M11 12h6m-6 4h4"/>',chart:'<path d="M4 3v17h17M8 15v-4m5 4V7m5 8V4"/>',settings:'<path d="m9 3-1 3-3 1v4l-2 2 2 3v3l4 1 2 2 3-2 4-1v-3l3-3-2-2V7l-4-1-1-3z"/><circle cx="12" cy="12" r="3"/>',arrow:'<path d="M4 12h15m-5-5 5 5-5 5"/>',plus:'<path d="M12 5v14M5 12h14"/>',upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/>',flame:'<path d="M13 3c1 5-3 5-2 9-2-1-3-2-3-4-4 4-4 8-1 11 3 3 8 2 10-1 3-5-1-10-4-15Z"/>',check:'<path d="m5 12 4 4L20 5"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',chevron:'<path d="m9 5 7 7-7 7"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',download:'<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',spark:'<path d="m12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3Zm7-1v4m-2-2h4"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',back:'<path d="M20 12H5m5-5-5 5 5 5"/>',leaf:'<path d="M4 20c0-10 6-16 16-16 0 10-6 16-16 16Zm0 0L16 8"/>'};
 return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name]||shapes.info}</svg>`;
};
const navItems=[['board','Bàn cờ','board'],['library','Thư viện','book'],['flashcards','Thẻ ghi nhớ','cards'],['progress','Hành trình','chart']];
const route=()=>location.hash.slice(1).split('/');
const courseBy=id=>state.courses.find(c=>c.id===id);
const activeCourse=()=>courseBy(selectedId)||state.courses[0];
const allQuestions=()=>state.courses.flatMap(c=>c.questions.map(q=>({...q,courseTitle:c.title,courseId:c.id})));
const dueQuestions=()=>allQuestions().filter(q=>!state.reviews[q.id]||state.reviews[q.id].due<=Date.now()).sort((a,b)=>(state.stats[b.id]?.wrong||0)-(state.stats[a.id]?.wrong||0));
const totalAnswers=()=>Object.values(state.stats).reduce((n,s)=>n+s.seen,0);
const accuracy=()=>totalAnswers()?Math.round(Object.values(state.stats).reduce((n,s)=>n+s.correct,0)/totalAnswers()*100):0;
const btn=(text,action,cls='primary',attrs='')=>`<button class="btn ${cls}" data-action="${action}" ${attrs}>${text}</button>`;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),6500);}
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}catch{toast('Bộ nhớ trình duyệt đã đầy hoặc bị chặn. Tiến độ hiện chỉ giữ trong phiên này. Hãy tải bản sao lưu.');return false;}}
function go(hash){if(location.hash===`#${hash}`)render();else location.hash=hash;}
function shell(content,page){
 const mentor=mentorFor(state.profile.elo),due=dueQuestions().length;
 return `<aside class="sidebar" id="sidebar"><a href="#board" class="brand"><span class="brand-piece">♞</span><span>Khai Cuộc<small>HỌC TỪNG NƯỚC MỘT</small></span></a>
 <div class="workspace-label">KHÔNG GIAN CỦA BẠN</div><nav aria-label="Điều hướng chính">${navItems.map(([id,label,ic])=>`<a href="#${id}" class="nav-item ${page===id?'active':''}" ${page===id?'aria-current="page"':''}>${icon(ic)}<span>${label}</span>${id==='flashcards'&&due?`<span class="nav-count">${due}</span>`:''}</a>`).join('')}</nav>
 <div class="sidebar-note"><span class="note-star">✦</span><p>Một nước nhỏ hôm nay.<br>Một bước xa ngày mai.</p><span>HỌC THEO NHỊP CỦA BẠN</span></div>
 <div class="sidebar-bottom"><a class="nav-item ${page==='settings'?'active':''}" href="#settings">${icon('settings')}<span>Cài đặt</span></a><a class="nav-item ${page==='about'?'active':''}" href="#about">${icon('info')}<span>Về Khai Cuộc</span></a><div class="profile"><span class="avatar">${mentor.piece}</span><div><strong>${e(state.profile.name)}</strong><small>${mentor.rank} · ${state.profile.elo.toLocaleString('vi-VN')} Elo</small></div><span class="online-dot" title="Lưu trên thiết bị này"></span></div></div></aside>
 <div class="main-wrap"><header class="topbar"><div class="breadcrumb"><button class="icon-btn mobile-menu" data-action="menu" aria-label="Mở menu">${icon('menu')}</button><span>Không gian học tập</span>${icon('chevron',13)}<strong>${({board:'Bàn cờ',library:'Thư viện',flashcards:'Thẻ ghi nhớ',progress:'Hành trình',settings:'Cài đặt',about:'Về Khai Cuộc'})[page]||'Buổi học'}</strong></div><div class="topbar-right"><span class="streak">${icon('flame',17)} ${streak(state)} ngày liên tiếp</span><span class="open-badge"><i></i> MIỄN PHÍ & MÃ NGUỒN MỞ</span></div></header>
 <main id="main" tabindex="-1">${content}</main><footer class="footer"><span>♞ Khai Cuộc <span class="muted">/</span> Mỗi ngày, một nước tiến.</span><span>Được làm để chia sẻ kiến thức.</span></footer></div>`;
}
function heading(kicker,title,desc,actions=''){return `<section class="page-heading"><div><p class="eyebrow">${kicker}</p><h1>${title}</h1><p class="subtitle">${desc}</p></div><div class="heading-actions">${actions}</div></section>`;}
function statsRow(){return `<div class="stats-row"><div class="stat"><span class="stat-icon">♜</span><div><small>ELO HIỆN TẠI</small><strong>${state.profile.elo.toLocaleString('vi-VN')} <em>${mentorFor(state.profile.elo).rank}</em></strong></div></div><div class="stat"><span class="stat-icon">${icon('check',24)}</span><div><small>CÂU ĐÃ LUYỆN</small><strong>${Object.keys(state.stats).length}<em>câu hỏi</em></strong></div></div><div class="stat"><span class="stat-icon">${icon('cards',24)}</span><div><small>ĐẾN LƯỢT ÔN</small><strong>${dueQuestions().length}<em>thẻ ghi nhớ</em></strong></div></div><div class="stat"><span class="stat-icon">${icon('flame',24)}</span><div><small>NHỊP HỌC CỦA BẠN</small><strong>${streak(state)}<em>ngày liên tiếp</em></strong></div></div></div>`;}
const pathSquares=[[7,0],[5,1],[4,3],[2,4],[0,5],[1,7],[3,6],[5,7]];
function board(course){
 const ls=lessons(course),done=course.completed.length,points=pathSquares.slice(0,ls.length).map(([r,c])=>`${c*100+50},${r*100+50}`).join(' ');
 return `<div class="chess-frame"><div class="rank-labels">${[8,7,6,5,4,3,2,1].map(x=>`<span>${x}</span>`).join('')}</div><div class="chess-board"><div class="squares" aria-hidden="true">${Array.from({length:64},(_,i)=>`<div class="square ${(Math.floor(i/8)+i%8)%2?'dark':''}"></div>`).join('')}</div><svg class="board-path" viewBox="0 0 800 800" aria-hidden="true"><polyline points="${points}"/></svg>${ls.map((lesson,i)=>{const [r,c]=pathSquares[i],complete=course.completed.includes(i),current=i===done,locked=i>done;return `<button class="board-node ${complete?'done':current?'current':'locked'}" style="--row:${r};--col:${c}" data-action="lesson" data-id="${e(course.id)}" data-index="${i}" aria-label="Bài ${i+1}: ${e(lesson.questions[0].topic)}, ${complete?'đã hoàn thành':locked?'chưa mở khóa':'sẵn sàng học'}" ${locked?'disabled':''}><span>${complete?'✓':current?'♞':icon('lock',17)}</span><small>${i+1}</small></button>`;}).join('')}</div><div class="file-labels">${'abcdefgh'.split('').map(x=>`<span>${x}</span>`).join('')}</div></div>`;
}
function boardPage(){
 const c=activeCourse(),m=mentorFor(state.profile.elo);
 return heading('CHÀO MỪNG TRỞ LẠI, '+e(state.profile.name.toLocaleUpperCase('vi-VN')),'Mỗi ngày, <em>một nước tiến.</em>','Ngồi xuống, mở một bài học. Hành trình của bạn lại đi xa thêm một chút.',btn(icon('plus',18)+' Tạo lộ trình','create'))+statsRow()+
 `<div class="dashboard-grid"><section class="panel board-panel"><div class="panel-heading"><div><span class="eyebrow">BÀN CỜ HỌC TẬP</span><h2>Nước đi tiếp theo</h2></div><span class="tag">${c?`${c.completed.length}/${lessons(c).length} bài`:'Chưa có bài'}</span></div>${c?`<div class="course-switch"><span class="book-tile">${icon('book',20)}</span><div><label class="sr-only" for="course-select">Chọn lộ trình</label><select id="course-select">${state.courses.map(item=>`<option value="${e(item.id)}" ${item.id===c.id?'selected':''}>${e(item.title)}</option>`).join('')}</select><small>${c.kind==='demo'?'BỘ HỌC MẪU':'QUIZ TẠO BỞI AI'} <span>·</span> ${c.questions.length} câu hỏi</small></div></div>${board(c)}<div class="board-legend"><span><i class="legend-dot complete"></i> Đã hoàn thành</span><span><i class="legend-dot current"></i> Đang học</span><span><i class="legend-dot locked"></i> Chưa mở</span></div>`:empty('Bàn cờ đang chờ bạn','Tải tài liệu hoặc mở bộ mẫu để bắt đầu.',btn('Tạo lộ trình đầu tiên','create'))}</section>
 <aside class="right-column"><section class="next-card"><span class="eyebrow">${c&&progress(c)===100?'LỘ TRÌNH ĐÃ HOÀN THÀNH':'TIẾP TỤC HÀNH TRÌNH'}</span>${c?`<div class="mini-chess">♞<span>✦</span></div><h2>${e(progress(c)===100?'Bạn đã đi trọn bàn cờ.':lessons(c)[c.completed.length]?.questions[0].topic||c.title)}</h2><p>${progress(c)===100?'Giữ kiến thức ở lại lâu hơn với một vòng ôn thẻ.':`Bài ${c.completed.length+1} · ${lessons(c)[c.completed.length]?.questions.length||3} câu hỏi · khoảng 3 phút`}</p><div class="progress-copy"><span>Tiến độ lộ trình</span><strong>${progress(c)}%</strong></div><div class="progress-track"><span style="width:${progress(c)}%"></span></div>${btn((progress(c)===100?'Ôn lại bằng thẻ':'Đi nước tiếp theo')+icon('arrow',18),progress(c)===100?'review':'continue','primary wide',`data-id="${e(c.id)}"`)}`:'<h2>Mọi hành trình đều có nước đầu.</h2>'+btn('Khám phá bộ mẫu','demo')}</section>
 <section class="mentor-card"><div class="mentor-top"><span class="mentor-piece">${m.piece}</span><div><strong>${m.name}</strong><small>NGƯỜI ĐỒNG HÀNH · ${m.rank.toLocaleUpperCase('vi-VN')}</small></div><span class="tiny-star">✦</span></div><blockquote>“${m.line}”</blockquote><button class="text-btn" data-action="mentors">Gặp những người đồng hành ${icon('arrow',15)}</button></section>
 <button class="review-nudge" data-action="review">${icon('cards',27)}<span><strong>Một vòng ôn, nhớ lâu hơn.</strong><small>${dueQuestions().length} thẻ sẵn sàng cho bạn</small></span>${icon('chevron',18)}</button></aside></div>
 <section class="lower-section"><div class="section-title"><h2>Thư viện của bạn <span>${state.courses.length.toString().padStart(2,'0')}</span></h2><a href="#library" class="text-btn">Xem tất cả ${icon('arrow',16)}</a></div><div class="course-grid">${state.courses.slice(0,2).map(courseCard).join('')}<button class="add-course" data-action="create"><span>${icon('plus',26)}</span><strong>Mở một hành trình mới</strong><small>Từ tài liệu của riêng bạn</small></button></div></section>`;
}
function courseCard(c){return `<article class="course-card"><div class="course-card-top"><span class="course-art">${c.kind==='demo'?'♞':'♜'}</span><span class="tag">${c.kind==='demo'?'Bộ mẫu':'AI'}</span></div><small class="eyebrow">${e(c.subject)}</small><h3><a href="#board/${e(c.id)}">${e(c.title)}</a></h3><p>${e(c.description)}</p><div class="course-card-bottom"><span>${c.questions.length} câu <b>·</b> ${lessons(c).length} bài</span><button class="icon-btn" data-action="open-course" data-id="${e(c.id)}" aria-label="Mở ${e(c.title)}">${icon('arrow',19)}</button></div><div class="progress-track"><span style="width:${progress(c)}%"></span></div></article>`;}
function empty(title,desc,action=''){return `<div class="empty"><span>♧</span><h2>${title}</h2><p>${desc}</p>${action}</div>`;}
function libraryPage(){
 const list=state.courses.filter(c=>(filter==='all'||(filter==='done'?progress(c)===100:progress(c)<100))&&(c.title+' '+c.subject).toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
 return heading('KIẾN THỨC, Ở CÙNG MỘT NƠI','Thư viện <em>của bạn.</em>','Từ một tài liệu nhỏ đến những điều bạn sẽ nhớ lâu.',btn(icon('plus',18)+' Tạo lộ trình','create'))+
 `<div class="library-toolbar"><div class="tabs" role="group" aria-label="Lọc lộ trình">${[['all','Tất cả'],['learning','Đang học'],['done','Hoàn thành']].map(([id,t])=>`<button data-action="filter" data-id="${id}" aria-pressed="${filter===id}" class="${filter===id?'selected':''}">${t}</button>`).join('')}</div><label class="search-field">${icon('search',18)}<input id="course-search" placeholder="Tìm lộ trình…" value="${e(search)}" aria-label="Tìm lộ trình"></label></div><div class="course-grid library-grid" id="course-list">${list.length?list.map(courseCard).join(''):empty('Chưa có lộ trình phù hợp','Thử một từ khóa khác hoặc tạo lộ trình mới.')}</div>`;
}
function progressPage(){
 const today=new Date(),m=mentorFor(state.profile.elo),next=mentors.find(x=>x.elo>state.profile.elo);
 const days=Array.from({length:28},(_,i)=>{const d=new Date(today);d.setDate(d.getDate()-27+i);return dayKey(d);});
 return heading('NHÌN LẠI NHỮNG NƯỚC ĐÃ ĐI','Bạn đã tiến <em>xa hơn.</em>','Không cần so với ai khác. Cứ nhìn lại mình của ngày hôm qua.')+statsRow()+
 `<div class="two-column"><section class="panel activity-panel"><span class="eyebrow">NHỊP HỌC TRONG 28 NGÀY</span><h2>Mỗi ô sáng, một ngày cố gắng.</h2><div class="activity-grid">${days.map(d=>`<div class="activity-day level-${Math.min(3,Math.ceil((state.activity[d]||0)/3))}" title="${d}: ${state.activity[d]||0} lượt luyện"><span>${Number(d.slice(-2))}</span></div>`).join('')}</div><div class="activity-legend">Ít <i></i><i></i><i></i><i></i> Nhiều</div><div class="activity-summary"><strong>${days.filter(d=>state.activity[d]).length}<small>ngày có học</small></strong><strong>${accuracy()}%<small>tỷ lệ trả lời đúng</small></strong><strong>${state.courses.filter(c=>progress(c)===100).length}<small>lộ trình hoàn thành</small></strong></div></section>
 <section class="panel rank-panel"><span class="rank-piece">${m.piece}</span><span class="eyebrow">CẤP ĐỘ HIỆN TẠI</span><h2>${m.rank} · ${state.profile.elo} Elo</h2><p>${next?`Còn ${next.elo-state.profile.elo} Elo để gặp ${next.name}, người đồng hành cấp ${next.rank}.`:'Bạn đã mở khóa tất cả người đồng hành.'}</p><div class="progress-track"><span style="width:${next?Math.min(100,(state.profile.elo-m.elo)/(next.elo-m.elo)*100):100}%"></span></div><small>Mỗi câu: đúng lần đầu +12 Elo, sai lần đầu −6 Elo. Ôn lại không cộng Elo.</small></section></div><section class="lower-section"><div class="section-title"><h2>Sáu người đồng hành</h2><span class="muted">Đi xa thêm, gặp thêm một người.</span></div>${mentorGrid()}</section>`;
}
function mentorGrid(){return `<div class="mentor-grid">${mentors.map(m=>`<button class="mentor-tile ${state.profile.elo>=m.elo?'unlocked':''}" data-action="mentor" data-index="${m.elo}"><span>${m.piece}</span><strong>${m.name}</strong><small>${m.elo} ELO · ${m.rank}</small><em>${state.profile.elo>=m.elo?'Đã mở khóa':icon('lock',13)+' Chưa mở'}</em></button>`).join('')}</div>`;}
function flashPage(){
 if(!flash){const due=dueQuestions();return heading('NHỚ LÂU HƠN, NHẸ NHÀNG HƠN','Một vòng <em>ôn lại.</em>','Lật thẻ, tự kiểm tra, rồi dành thêm thời gian cho phần chưa nhớ.')+`<section class="flash-intro panel"><div class="stack-art"><span></span><span></span><div>♞<small>KHAI CUỘC</small></div></div><span class="eyebrow">THẺ GHI NHỚ CỦA BẠN</span><h2>${due.length?`${due.length} thẻ đang đợi một nước đi.`:'Hôm nay bạn đã ôn đủ rồi.'}</h2><p>Thẻ khó sẽ trở lại sớm. Thẻ đã nhớ sẽ gặp lại sau 1, 2, 4 ngày…<br>Bắt đầu từ câu từng làm sai để ôn đúng chỗ cần.</p>${btn(icon('cards',18)+' Bắt đầu ôn','start-review','primary',due.length?'':'disabled')}${allQuestions().length?btn('Ôn tất cả '+allQuestions().length+' thẻ','review-all','secondary'):''}<small>Tiến độ ôn được lưu trên trình duyệt này.</small></section>`;}
 if(!flash.queue.length)return heading('THÊM MỘT CHÚT VỮNG VÀNG','Một vòng ôn <em>đã xong.</em>','Bạn vừa dành thời gian cho điều đáng nhớ.')+`<section class="panel result-card"><span class="result-piece">♜</span><h2>Kiến thức đang ở lại.</h2><p>Đã xem ${flash.seen} lượt thẻ · ${flash.known} lượt đánh dấu đã nhớ.</p><p class="muted">Thẻ chưa nhớ sẽ đến hạn sau 5 phút. Thẻ đã nhớ có lịch ôn cách quãng.</p>${btn('Về bàn cờ','exit-review')}${btn('Xem hành trình','progress','secondary')}</section>`;
 const q=flash.queue[0];return heading('MỘT THẺ MỖI LẦN','Chậm lại. <em>Nhớ sâu hơn.</em>',`${flash.queue.length} thẻ còn lại trong lượt ôn.`,btn('Kết thúc ôn','exit-review','ghost'))+
 `<div class="flash-session"><div class="flash-meta"><span>${e(q.courseTitle)}</span><span>${flash.flipped?'MẶT SAU':'MẶT TRƯỚC'}</span></div><button class="flashcard ${flash.flipped?'flipped':''}" data-action="flip" aria-label="${flash.flipped?'Lật về câu hỏi':'Lật xem đáp án'}"><span class="eyebrow">${flash.flipped?'ĐÁP ÁN':'THỬ NHỚ TRƯỚC KHI LẬT'}</span><h2>${e(flash.flipped?q.options[q.answerIndex]:q.prompt)}</h2>${flash.flipped?`<p>${e(q.explanation)}</p><small>Nguồn: trang ${q.sourcePage} · ${e(q.topic)}</small>`:`<span class="flip-hint">${icon('cards',18)} Nhấn vào thẻ để xem đáp án</span>`}</button>${flash.flipped?`<div class="flash-actions">${btn('Chưa nhớ · ôn sớm','remember-no','secondary')}${btn('Đã nhớ '+icon('check',18),'remember-yes')}</div>`:`<p class="muted centered">Thử trả lời trong đầu, rồi lật thẻ để đối chiếu.</p>`}</div>`;
}
function quizPage(id,index){
 const c=courseBy(id),li=Number(index);if(!c||!Number.isInteger(li)||li<0||li>=lessons(c).length||li>c.completed.length)return empty('Bài học chưa sẵn sàng','Quay về bàn cờ để chọn nước đi tiếp theo.',btn('Về bàn cờ','board'));
 if(!quiz||quiz.courseId!==id||quiz.lesson!==li)quiz={courseId:id,lesson:li,index:0,answers:[],selected:null,delta:0,finished:false};
 const list=lessons(c)[li].questions;
 if(quiz.finished){const correct=quiz.answers.filter(Boolean).length,passed=correct/list.length>=.6;return heading('VỪA THÊM MỘT NƯỚC ĐI',passed?'Một bước <em>vững hơn.</em>':'Mình thử lại <em>một lần nhé.</em>','Mỗi lần kiểm tra là một cơ hội hiểu rõ hơn.')+`<section class="panel result-card"><span class="result-piece">${passed?'♜':'♟'}</span><span class="tag">BÀI ${li+1} · ${e(c.title)}</span><h2>${correct}/${list.length} câu trả lời đúng</h2><div class="result-stats"><div><strong>${Math.round(correct/list.length*100)}%</strong><span>độ chính xác</span></div><div><strong>${quiz.delta>=0?'+':''}${quiz.delta}</strong><span>Elo thay đổi</span></div></div><p>${passed?'Bạn đã mở nước đi tiếp theo. Có thể tiếp tục hoặc ôn thẻ để nhớ chắc hơn.':'Cần đúng ít nhất 60% để mở bài tiếp theo. Xem lại trích dẫn và thử lại khi bạn sẵn sàng.'}</p><div class="button-row">${btn(passed?'Về bàn cờ':'Làm lại bài',passed?'board':'retry')}${btn('Ôn bằng thẻ','review','secondary')}</div></section>`;}
 const q=list[quiz.index],answered=quiz.selected!==null,correct=quiz.selected===q.answerIndex;
 return `<div class="quiz-heading"><button class="text-btn" data-action="leave-quiz">${icon('back',17)} Về bàn cờ</button><span class="tag">BÀI ${li+1} · ${e(c.title)}</span><span>Câu ${quiz.index+1}/${list.length}</span></div><div class="quiz-progress"><span style="width:${quiz.index/list.length*100}%"></span></div><div class="quiz-layout"><section class="quiz-main"><span class="eyebrow">${e(q.topic)} · TRẮC NGHIỆM</span><h1>${e(q.prompt)}</h1><div class="answer-list">${q.options.map((option,i)=>`<button class="answer ${answered?(i===q.answerIndex?'correct':i===quiz.selected?'incorrect':'muted-answer'):''}" data-action="answer" data-index="${i}" ${answered?'disabled':''}><span class="answer-letter">${String.fromCharCode(65+i)}</span><span>${e(option)}</span>${answered&&i===q.answerIndex?icon('check',21):answered&&i===quiz.selected?icon('close',21):''}</button>`).join('')}</div>${answered?`<div class="answer-feedback ${correct?'good':'bad'}" role="status"><strong>${correct?'Đúng rồi. Một nước đi đẹp!':'Chưa đúng, mình cùng xem lại.'}</strong><p>${e(q.explanation)}</p></div><details class="source-box"><summary>${icon('book',16)} Trích dẫn tài liệu · trang ${q.sourcePage}</summary><blockquote>${e(q.sourceQuote)}</blockquote></details>${btn((quiz.index===list.length-1?'Xem kết quả':'Câu tiếp theo')+icon('arrow',18),'next-question','primary quiz-next')}`:`<p class="muted quiz-hint">Chọn một đáp án. Không có đồng hồ đếm ngược, cứ theo nhịp của bạn.</p>`}</section><aside class="quiz-aside"><div class="mentor-card"><div class="mentor-top"><span class="mentor-piece">${mentorFor(state.profile.elo).piece}</span><div><strong>${mentorFor(state.profile.elo).name}</strong><small>ĐỒNG HÀNH CÙNG BẠN</small></div></div><blockquote>“${answered?(correct?'Bạn vừa nối thêm một mảnh kiến thức. Thử giải thích lại bằng lời của mình nhé.':'Một câu sai chỉ cho mình chỗ cần học lại. Mở trích dẫn để xem đúng phần đó nhé.'):mentorFor(state.profile.elo).line}”</blockquote></div><div class="quiz-elo"><span>♜</span><div><small>Elo hiện tại</small><strong>${state.profile.elo}</strong></div></div></aside></div>`;
}
function settingsPage(){return heading('THEO CÁCH CỦA BẠN','Góc nhỏ <em>cá nhân.</em>','Quản lý hồ sơ, kết nối AI và giữ một bản sao hành trình.')+
 `<div class="settings-grid"><section class="panel settings-card"><h2>Hồ sơ của bạn</h2><p>Tên hiển thị trên không gian học tập này.</p><form id="profile-form"><label for="profile-name">Tên của bạn</label><input id="profile-name" name="name" maxlength="40" required value="${e(state.profile.name)}">${btn('Lưu hồ sơ','submit-profile','primary','type="submit"')}</form></section><section class="panel settings-card"><h2>Kết nối AI</h2><p>Nhập URL API Khai Cuộc do bạn hoặc chủ web cung cấp. Khóa OpenAI được giữ trên máy chủ.</p><form id="api-form"><label for="api-url">URL API</label><input id="api-url" name="endpoint" type="url" placeholder="https://khai-cuoc-api.example.workers.dev/api/generate" value="${e(endpoint())}"><label for="access-code">Mã truy cập (nếu có)</label><input id="access-code" name="code" type="password" autocomplete="off" value="${e(accessCode)}" placeholder="Chỉ giữ trong phiên này">${btn('Lưu kết nối','submit-api','primary','type="submit"')}<small>Chỉ kết nối API bạn tin cậy. Nội dung tài liệu sẽ được gửi đến API này khi tạo câu hỏi.</small></form></section><section class="panel settings-card"><h2>Sao lưu & khôi phục</h2><p>Tiến độ lưu trên trình duyệt, chưa đồng bộ giữa các thiết bị. Tệp sao lưu có chứa nội dung quiz và trích dẫn tài liệu.</p><div class="button-row">${btn(icon('download',17)+' Tải sao lưu','export','secondary')}${btn(icon('upload',17)+' Khôi phục','import','secondary')}</div><input type="file" id="backup-file" accept=".json,application/json" hidden></section><section class="panel settings-card"><h2>Quản lý lộ trình</h2><p>Xóa một lộ trình cùng lịch ôn và kết quả trả lời của lộ trình đó.</p>${state.courses.map(c=>`<div class="delete-row"><span>${e(c.title)}</span><button class="text-btn danger" data-action="delete-course" data-id="${e(c.id)}">Xóa</button></div>`).join('')||'<p>Chưa có lộ trình.</p>'}${!courseBy('demo-learning')?btn('Thêm lại bộ học mẫu','demo','secondary'):''}</section></div>`;}
function endpoint(){return state.settings.endpoint||config.apiEndpoint||(['localhost','127.0.0.1'].includes(location.hostname)?location.origin+'/api/generate':'');}
function aboutPage(){return heading('TRI THỨC NÊN ĐƯỢC CHIA SẺ','Học từng nước. <em>Đi đường dài.</em>','Khai Cuộc là một dự án học tập mã nguồn mở, lấy cảm hứng từ hành trình trên bàn cờ.')+
 `<section class="about-hero"><span>♞</span><div><span class="eyebrow">MỘT KHÔNG GIAN CHO VIỆC TỰ HỌC</span><h2>Bạn mang tài liệu.<br>Chúng mình dựng đường đi.</h2><p>Từ tài liệu đến câu hỏi, từ câu hỏi đến trí nhớ. Một bài nhỏ mỗi lần, một cột mốc rõ ràng phía trước.</p>${btn('Bắt đầu với bộ mẫu','demo')}</div></section><div class="about-grid">${[['01','Dựng lộ trình','Tải PDF có văn bản, TXT, Markdown hoặc dán nội dung. AI tạo câu hỏi và trích dẫn để bạn kiểm chứng.'],['02','Đi từng nước','Hoàn thành từng bài trên bàn cờ. Đúng từ 60% để mở bài kế tiếp. Tăng Elo và mở khóa người đồng hành.'],['03','Giữ điều đã học','Ôn thẻ theo lịch cách quãng. Câu từng sai được ưu tiên trước; thẻ chưa nhớ sẽ quay lại sớm hơn.']].map(([n,t,d])=>`<article class="panel"><span>${n}</span><h3>${t}</h3><p>${d}</p></article>`).join('')}</div><section class="panel about-details"><h2>Miễn phí cho người học. Minh bạch với người xây.</h2><p>Giao diện và bộ mẫu dùng miễn phí. Dịch vụ AI cần chủ web cấu hình khóa API và chịu chi phí theo nhà cung cấp. Đây là bản triển khai độc lập, không thuộc Gambit Study.</p><p>Chúng mình không tạo bảng xếp hạng giả: Elo, lịch ôn và tiến độ trên trang đều là dữ liệu học của bạn trên thiết bị này. Người đồng hành hiện đưa ra lời nhắc theo ngữ cảnh, chưa phải chatbot AI.</p></section>`;}
function render(){
 const [r,id,index]=route(),page=['library','flashcards','progress','settings','about','quiz'].includes(r)?r:'board';
 if(page==='board'&&id&&courseBy(id))selectedId=id;
 if(page!=='flashcards')flash=null;
 const content=page==='board'?boardPage():page==='library'?libraryPage():page==='flashcards'?flashPage():page==='progress'?progressPage():page==='settings'?settingsPage():page==='about'?aboutPage():quizPage(id,index);
 $('#app').innerHTML=shell(content,page);
 document.title=`${page==='quiz'?'Buổi học':navItems.find(x=>x[0]===page)?.[1]|| (page==='settings'?'Cài đặt':'Về Khai Cuộc')} · Khai Cuộc`;
 if(storageWarning){toast(storageWarning);storageWarning='';}
}
function showModal(html){const dialog=$('#modal');dialog.innerHTML=html;dialog.showModal();}
const modalHead=(title,eyebrow='KHAI CUỘC')=>`<div class="modal-heading"><div><p class="eyebrow">${eyebrow}</p><h2 id="dialog-title">${title}</h2></div><button class="icon-btn" data-action="close-modal" aria-label="Đóng">${icon('close')}</button></div>`;
function createModal(){
 if(creating){toast('Một lộ trình đang được tạo. Hãy chờ kết quả trước khi tạo bài tiếp theo.');return;}
 uploadPages=null;uploadName='';uploadToken++;
 showModal(`${modalHead('Mở một hành trình mới.','TỪ TÀI LIỆU ĐẾN BÀN CỜ')}<p class="modal-desc">Mang một phần tài liệu bạn muốn hiểu sâu hơn. AI sẽ giúp bạn dựng những nước đi đầu tiên.</p><form id="create-form"><label for="course-title">Tên lộ trình</label><input id="course-title" name="title" maxlength="120" required placeholder="Ví dụ: Sinh học · Chương 4"><label class="drop-zone" id="drop-zone" for="source-file">${icon('upload',30)}<strong>Chọn tệp hoặc kéo thả vào đây</strong><span>PDF có văn bản, TXT, MD · tối đa 10 MB</span><input type="file" id="source-file" accept=".pdf,.txt,.md" aria-label="Chọn tài liệu"></label><div id="file-status" role="status"></div><div class="or-divider"><span>HOẶC DÁN NỘI DUNG</span></div><label class="sr-only" for="source-text">Nội dung tài liệu</label><textarea id="source-text" name="text" rows="5" minlength="150" maxlength="60000" placeholder="Dán nội dung tại đây (150–60.000 ký tự)…"></textarea><div class="form-row"><div><label for="question-count">Số câu hỏi</label><select name="count" id="question-count"><option value="6">6 câu · làm quen</option><option value="12" selected>12 câu · vừa đủ</option><option value="18">18 câu · đào sâu</option><option value="24">24 câu · thử thách</option></select></div><div><label for="subject">Chủ đề</label><input name="subject" id="subject" maxlength="100" placeholder="Ví dụ: Sinh học"></div></div>${!endpoint()?`<div class="inline-note">${icon('info',18)}<span>Chưa kết nối AI. Mở <a href="#settings" data-action="settings-from-modal">Cài đặt</a> để nhập URL API, hoặc trải nghiệm bộ mẫu trên bàn cờ.</span></div>`:''}<label class="consent"><input type="checkbox" name="consent" required><span>Tôi đồng ý gửi nội dung tài liệu đến API đã cấu hình và OpenAI để tạo quiz. Tôi sẽ kiểm tra đáp án và trích dẫn trước khi dùng.</span></label><p id="create-error" class="form-error" role="alert"></p><div class="modal-footer"><span>${icon('lock',14)} Khóa API luôn ở máy chủ</span><button class="btn primary" id="generate-button" type="submit" ${endpoint()?'':'disabled'}>${icon('spark',18)} Tạo lộ trình với AI</button></div></form>`);
}
async function readFile(file){
 const token=++uploadToken;uploadPages=null;uploadName='';const status=$('#file-status');
 if(!file)return;
 if($('#source-text'))$('#source-text').disabled=false;
 if(file.size>10*1024*1024){status.textContent='Tệp tối đa 10 MB.';return;}
 status.textContent='Đang đọc tài liệu…';
 try{
   let pages;
   if(/\.pdf$/i.test(file.name)){
     const pdfjs=await import('../vendor/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('../vendor/pdf.worker.min.mjs',import.meta.url).href;
     const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,useSystemFonts:true}).promise;
     try{
       if(pdf.numPages>100)throw Error('Tối đa 100 trang. Hãy tách tài liệu thành các phần nhỏ.');
       pages=[];
       for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),content=await page.getTextContent();pages.push({page:i,text:content.items.map(item=>item.str+(item.hasEOL?'\n':' ')).join('')});}
     }finally{await pdf.destroy();}
   }else if(/\.(txt|md)$/i.test(file.name)){pages=[{page:1,text:await file.text()}];}else throw Error('Chỉ hỗ trợ PDF, TXT hoặc MD.');
   if(token!==uploadToken)return;
   const length=pages.reduce((n,p)=>n+p.text.length,0);
   if(length<150)throw Error('Không đủ văn bản. PDF scan cần OCR trước; bạn cũng có thể dán nội dung.');
   if(length>60000)throw Error('Tài liệu vượt 60.000 ký tự. Hãy chia thành nhiều phần nhỏ.');
   uploadPages=pages;uploadName=file.name;status.textContent=`✓ ${file.name} · ${pages.length} trang · ${length.toLocaleString('vi-VN')} ký tự`;
   if(!$('#course-title').value)$('#course-title').value=file.name.replace(/\.[^.]+$/,'').slice(0,120);
   $('#source-text').value='';$('#source-text').disabled=true;$('#source-text').placeholder='Đang dùng nội dung từ tệp. Chọn nút bên dưới để dán nội dung khác.';
   const remove=document.createElement('button');remove.type='button';remove.className='text-btn';remove.dataset.action='remove-upload';remove.textContent='Bỏ tệp, dùng nội dung dán';status.append(document.createElement('br'),remove);
 }catch(error){if(token===uploadToken){status.textContent=error.name==='PasswordException'?'PDF có mật khẩu. Hãy mở khóa tệp trước khi tải.':error.message;$('#source-text').disabled=false;}}
}
async function createCourse(form){
 if(creating)return;
 const fd=new FormData(form),text=String(fd.get('text')||'').trim(),pages=uploadPages||[{page:1,text}],count=Number(fd.get('count')),title=String(fd.get('title')).trim();
 const errorEl=$('#create-error');
 if(!title){errorEl.textContent='Hãy đặt tên cho lộ trình.';return;}
 if(!pages.length||pages.reduce((n,p)=>n+p.text.length,0)<150){errorEl.textContent='Cần ít nhất 150 ký tự nội dung.';return;}
 if(!endpoint()){errorEl.textContent='Hãy kết nối API trong Cài đặt trước.';return;}
 if(state.courses.length>=50){errorEl.textContent='Tối đa 50 lộ trình. Hãy sao lưu rồi xóa bớt lộ trình cũ.';return;}
 creating=true;errorEl.textContent='';const button=$('#generate-button');button.disabled=true;button.innerHTML='<span class="spinner"></span> Đang soạn câu hỏi…';
 try{
   const response=await fetch(safeEndpoint(endpoint()),{method:'POST',headers:{'Content-Type':'application/json',...(accessCode?{'X-Access-Code':accessCode}:{})},body:JSON.stringify({title,pages,count}),signal:AbortSignal.timeout(110000)});
   let result;try{result=await response.json();}catch{throw Error('API không trả JSON. Hãy kiểm tra URL trong Cài đặt.');}
   if(!response.ok)throw Error(result.error||'Không thể tạo câu hỏi. Hãy thử lại.');
   const questions=validateQuestions(result,pages);if(questions.length>count)throw Error('API trả quá số câu yêu cầu.');
   const c={id:uid(),title,description:typeof result.description==='string'?result.description.slice(0,500):'',subject:String(fd.get('subject')||'Tài liệu của bạn').slice(0,100),kind:'ai',created:Date.now(),completed:[],questions};
   state.courses.unshift(c);selectedId=c.id;save();$('#modal').close();go('board/'+c.id);toast(`Đã tạo ${questions.length} câu có trích dẫn. Bạn có thể bắt đầu học.`);
 }catch(error){if($('#create-error'))$('#create-error').textContent=error.name==='TimeoutError'?'AI chưa trả lời kịp. Thử lại với ít câu hơn.':error instanceof TypeError?'Không kết nối được API. Kiểm tra URL, mạng và cấu hình CORS.':error.message;}
 finally{creating=false;if($('#generate-button')){button.disabled=false;button.innerHTML=icon('spark',18)+' Tạo lộ trình với AI';}}
}
function startLesson(id,index){const c=courseBy(id);if(!c)return;quiz=null;go(`quiz/${id}/${index}`);}
function startReview(all=false){const queue=all?allQuestions():dueQuestions();if(!queue.length){go('flashcards');return;}flash={queue:[...queue],seen:0,known:0,flipped:false};go('flashcards');}
function confirmDialog(title,desc,action,attrs=''){showModal(`${modalHead(title)}<p class="modal-desc">${desc}</p><div class="button-row">${btn('Hủy','close-modal','secondary')}${btn('Xác nhận',action,'primary',attrs)}</div>`);}
const actions={
 'menu':()=>$('#sidebar').classList.toggle('mobile-open'),
 'create':createModal,
 'close-modal':()=>{if(creating){toast('Đang tạo bài. Kết quả sẽ được lưu khi hoàn tất.');}$('#modal').close();},
 'settings-from-modal':()=>{$('#modal').close();go('settings');},
 'open-course':el=>{selectedId=el.dataset.id;go('board/'+selectedId);},
 'continue':el=>{const c=courseBy(el.dataset.id);if(c)startLesson(c.id,c.completed.length);},
 'lesson':el=>startLesson(el.dataset.id,Number(el.dataset.index)),
 'board':()=>{quiz=null;go('board');},
 'progress':()=>go('progress'),
 'filter':el=>{filter=el.dataset.id;render();},
 'answer':el=>{
   if(!quiz||quiz.selected!==null)return;
   const q=lessons(courseBy(quiz.courseId))[quiz.lesson].questions[quiz.index],choice=Number(el.dataset.index);if(!Number.isInteger(choice)||choice<0||choice>3)return;
   quiz.selected=choice;quiz.answers.push(choice===q.answerIndex);quiz.delta+=recordAnswer(state,q,choice===q.answerIndex);save();render();
 },
 'next-question':()=>{
   if(!quiz||quiz.selected===null)return;
   const c=courseBy(quiz.courseId),ls=lessons(c)[quiz.lesson];
   if(quiz.index===ls.questions.length-1){quiz.finished=true;if(quiz.answers.filter(Boolean).length/ls.questions.length>=.6&&!c.completed.includes(quiz.lesson)){c.completed.push(quiz.lesson);c.completed.sort((a,b)=>a-b);}save();}
   else{quiz.index++;quiz.selected=null;}render();window.scrollTo({top:0,behavior:'smooth'});
 },
 'retry':()=>{const{id,lesson}={id:quiz.courseId,lesson:quiz.lesson};quiz=null;startLesson(id,lesson);},
 'leave-quiz':()=>{if(quiz&&!quiz.finished&&quiz.answers.length)confirmDialog('Rời buổi học này?','Câu đã trả lời và Elo đã được lưu. Bạn cần làm lại bài để mở khóa nước tiếp theo.','confirm-leave');else{quiz=null;go('board');}},
 'confirm-leave':()=>{$('#modal').close();quiz=null;go('board');},
 'review':()=>{flash=null;go('flashcards');},
 'start-review':()=>startReview(),
 'review-all':()=>startReview(true),
 'exit-review':()=>{flash=null;go('flashcards');},
 'flip':()=>{if(flash?.queue.length){flash.flipped=!flash.flipped;render();}},
 'remember-no':()=>remember(false),
 'remember-yes':()=>remember(true),
 'mentors':()=>{showModal(`${modalHead('Gặp người đồng hành.')}<p class="modal-desc">Sáu cấp độ, sáu lời nhắc trên đường học. Mở khóa dần bằng Elo của bạn.</p>${mentorGrid()}`);},
 'mentor':el=>{const m=mentors.find(x=>x.elo===Number(el.dataset.index));if(m)toast(state.profile.elo>=m.elo?`${m.name}: ${m.line}`:`Cần ${m.elo} Elo để mở khóa ${m.name}.`);},
 'demo':async()=>{if(!courseBy('demo-learning')){const {makeDemo}=await import('./core.js');state.courses.push(makeDemo());save();}selectedId='demo-learning';go('board/demo-learning');},
 'export':()=>{const backup=structuredClone(state);backup.settings={endpoint:''};const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`khai-cuoc-${dayKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Đã tải bản sao lưu. Tệp có nội dung câu hỏi và trích dẫn của bạn.');},
 'import':()=>$('#backup-file').click(),
 'delete-course':el=>{const c=courseBy(el.dataset.id);if(c)confirmDialog('Xóa lộ trình này?',`“${e(c.title)}” và dữ liệu ôn tập liên quan sẽ bị xóa trên thiết bị này. Hãy sao lưu trước nếu bạn muốn giữ lại.`,'confirm-delete',`data-id="${e(c.id)}"`);},
 'confirm-delete':el=>{const c=courseBy(el.dataset.id);if(!c)return;c.questions.forEach(q=>{delete state.stats[q.id];delete state.reviews[q.id];});state.courses=state.courses.filter(x=>x.id!==c.id);selectedId=state.courses[0]?.id;save();$('#modal').close();render();toast('Đã xóa lộ trình.');},
 'remove-upload':()=>{uploadToken++;uploadPages=null;uploadName='';$('#source-file').value='';$('#file-status').textContent='';$('#source-text').disabled=false;$('#source-text').placeholder='Dán nội dung tại đây (150–60.000 ký tự)…';},
};
function remember(known){if(!flash?.queue.length||!flash.flipped)return;const q=flash.queue.shift();reviewAnswer(state,q.id,known);flash.seen++;if(known)flash.known++;flash.flipped=false;save();render();}
document.addEventListener('click',event=>{const el=event.target.closest('[data-action]');if(el){if(el.dataset.action!=='submit-profile'&&el.dataset.action!=='submit-api')event.preventDefault();actions[el.dataset.action]?.(el);}if(!event.target.closest('[data-action="menu"]')&&(!event.target.closest('#sidebar')||event.target.closest('#sidebar a')))$('#sidebar')?.classList.remove('mobile-open');});
document.addEventListener('submit',event=>{
 event.preventDefault();const form=event.target;
 if(form.id==='create-form')createCourse(form);
 if(form.id==='profile-form'){const name=new FormData(form).get('name').trim();if(!name)return;state.profile.name=name;save();render();toast('Đã lưu tên của bạn.');}
 if(form.id==='api-form'){try{const fd=new FormData(form);state.settings.endpoint=safeEndpoint(String(fd.get('endpoint')).trim());accessCode=String(fd.get('code'));save();toast('Đã lưu kết nối. Mã truy cập chỉ giữ trong phiên hiện tại.');}catch(error){toast(error.message);}}
});
document.addEventListener('change',async event=>{
 const el=event.target;
 if(el.id==='course-select'){selectedId=el.value;render();}
 if(el.id==='source-file')readFile(el.files[0]);
 if(el.id==='backup-file'&&el.files[0]){
   try{if(el.files[0].size>8*1024*1024)throw Error('Bản sao lưu tối đa 8 MB.');const restored=validateBackup(JSON.parse(await el.files[0].text()));
     showModal(`${modalHead('Khôi phục hành trình?')}<p class="modal-desc">Tệp có ${restored.courses.length} lộ trình và ${restored.profile.elo} Elo. Khôi phục sẽ thay thế tiến độ hiện tại trên trình duyệt này.</p><div class="button-row">${btn('Hủy','close-modal','secondary')}${btn('Khôi phục','confirm-import')}</div>`);
     actions['confirm-import']=()=>{const savedEndpoint=state.settings.endpoint;state=restored;state.settings.endpoint=savedEndpoint;selectedId=state.courses[0]?.id;quiz=null;flash=null;save();$('#modal').close();go('board');toast('Đã khôi phục hành trình.');delete actions['confirm-import'];};
   }catch(error){toast('Không thể khôi phục: '+error.message);}finally{el.value='';}
 }
});
document.addEventListener('input',event=>{if(event.target.id==='course-search'){search=event.target.value;const pos=event.target.selectionStart;render();const input=$('#course-search');input.focus();input.setSelectionRange(pos,pos);}});
document.addEventListener('dragover',event=>{if(event.target.closest('#drop-zone')){event.preventDefault();$('#drop-zone').classList.add('dragging');}});
document.addEventListener('dragleave',event=>{if(event.target.closest('#drop-zone'))$('#drop-zone')?.classList.remove('dragging');});
document.addEventListener('drop',event=>{if(event.target.closest('#drop-zone')){event.preventDefault();$('#drop-zone').classList.remove('dragging');readFile(event.dataTransfer.files[0]);}});
window.addEventListener('hashchange',()=>{render();window.scrollTo({top:0});$('#main')?.focus({preventScroll:true});});
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY)toast('Tiến độ vừa thay đổi ở tab khác. Tải lại trang trước khi học tiếp để tránh ghi đè.');});
render();
