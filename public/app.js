const intramurals = [
 {sport:'Basketball',icon:'◉',day:'MON',date:'26',time:'11:45 AM – 12:25 PM',place:'Main gym',detail:'Open play · All grades',type:'Drop-in',color:'peach'},
 {sport:'Volleyball',icon:'◍',day:'WED',date:'28',time:'11:45 AM – 12:25 PM',place:'Main gym',detail:'6-on-6 · All grades',type:'Drop-in',color:'lavender'},
 {sport:'Badminton',icon:'⌁',day:'FRI',date:'30',time:'11:45 AM – 12:25 PM',place:'Upper gym',detail:'Doubles · All grades',type:'Drop-in',color:'green'}
];
const tryouts = [
 {sport:'Basketball',level:'Junior boys',day:'TUE',date:'27',time:'3:15 – 4:30 PM',place:'Main gym',teacher:'Ms. Chen',color:'peach',icon:'◉'},
 {sport:'Volleyball',level:'Senior girls',day:'WED',date:'28',time:'3:15 – 4:30 PM',place:'Main gym',teacher:'Mr. Williams',color:'lavender',icon:'◍'},
 {sport:'Soccer',level:'Junior boys',day:'THU',date:'29',time:'3:30 – 5:00 PM',place:'School field',teacher:'Ms. Patel',color:'green',icon:'◎'},
 {sport:'Basketball',level:'Senior boys',day:'FRI',date:'30',time:'3:15 – 4:30 PM',place:'Main gym',teacher:'Mr. Thompson',color:'peach',icon:'◉'}
];
let tab = 'intramurals'; let filter = 'All sports';
const content = document.querySelector('#content');
function render() {
 const titles = {intramurals:['A good way to spend your lunch.','Drop in, bring a friend, and get in the game. No tryouts needed.'],tryouts:['Your next team starts here.','Find your sport, meet your coach, and show us what you’ve got.'],scores:['The latest from the sidelines.','Big wins, close games, and Panther pride.']};
 content.innerHTML = `<div class="content-heading"><div><div class="eyebrow">${tab==='intramurals'?'PLAY FOR THE FUN OF IT':tab==='tryouts'?'MAKE YOUR MOVE':'THE FINAL WHISTLE'}</div><h2>${titles[tab][0]}</h2><p>${titles[tab][1]}</p></div>${tab!=='scores'?`<label class="filter"><span class="sr-only">Filter by sport</span><select id="sport-filter"><option>All sports</option>${[...new Set((tab==='intramurals'?intramurals:tryouts).map(x=>x.sport))].map(s=>`<option ${s===filter?'selected':''}>${s}</option>`).join('')}</select></label>`:''}</div><div class="sample-notice"><span>ⓘ</span> Sample information · Schedules, staff names, and results below are for demonstration.</div>`;
 if(tab==='scores') {
 content.innerHTML += `<div class="score-grid">${[{sport:'Senior boys soccer',date:'OCT 23',other:'Humberside',a:3,b:1},{sport:'Senior girls basketball',date:'OCT 22',other:'Bloor CI',a:48,b:42},{sport:'Junior boys soccer',date:'OCT 21',other:'West Toronto',a:1,b:2}].map(x=>`<article class="score-card"><div class="score-top">${x.sport}<span>FINAL · ${x.date}</span></div><div class="team"><span><b class="mini-p">P</b> Parkdale</span><strong>${x.a}</strong></div><div class="team opponent"><span><b class="other-mark">${x.other[0]}</b> ${x.other}</span><strong>${x.b}</strong></div><div class="score-result">${x.a>x.b?'Panthers take the win ↗':'A hard-fought game'}</div></article>`).join('')}</div>`;
 } else {
 const items=(tab==='intramurals'?intramurals:tryouts).filter(x=>filter==='All sports'||x.sport===filter);
 content.innerHTML+=`<div class="schedule-meta"><span>OCTOBER 26 – 30, 2026</span><span>${items.length} ${tab==='tryouts'?'tryouts':'sessions'} this week</span></div><div class="schedule">${items.map(x=>`<article class="schedule-row"><div class="date"><span>${x.day}</span><strong>${x.date}</strong></div><div class="sport-icon ${x.color}">${x.icon}</div><div class="sport-info"><h3>${x.sport}</h3><p>${x.detail||x.level}</p></div><div class="time"><span>◷</span><div>${x.time}<small>October ${x.date}, 2026</small></div></div><div class="place"><span>⌖</span><div>${x.place}${x.teacher?`<small>Teacher: ${x.teacher}</small>`:''}</div></div><span class="badge">${x.type||'Tryout'} <span>↗</span></span></article>`).join('')}</div><div class="schedule-foot"><span>◷ &nbsp; All times are local to Toronto.</span><span>${tab==='intramurals'?'Just bring indoor shoes and your school spirit.':'Check with the listed teacher before attending.'}</span></div>`;
 }
 document.querySelector('#sport-filter')?.addEventListener('change',e=>{filter=e.target.value;render()});
}
function setTab(next){tab=next;filter='All sports';document.querySelectorAll('[data-tab]').forEach(x=>{x.classList.toggle('active',x.dataset.tab===tab);if(x.hasAttribute('role'))x.setAttribute('aria-selected',String(x.dataset.tab===tab));});render();if(innerWidth<760){document.body.classList.remove('mobile-open');document.querySelector('#menu-toggle').setAttribute('aria-expanded','false');}}
document.querySelectorAll('[data-tab]').forEach(x=>x.addEventListener('click',()=>setTab(x.dataset.tab)));
document.querySelector('#hero-action').addEventListener('click',()=>{setTab('intramurals');content.scrollIntoView({behavior:'smooth',block:'start'})});
document.querySelector('#menu-toggle').addEventListener('click',e=>{const mobile=innerWidth<760;document.body.classList.toggle(mobile?'mobile-open':'sidebar-collapsed');e.currentTarget.setAttribute('aria-expanded',String(mobile?document.body.classList.contains('mobile-open'):!document.body.classList.contains('sidebar-collapsed')))});
document.querySelectorAll('[role="tab"]').forEach((el,i,all)=>el.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const next=all[(i+(e.key==='ArrowRight'?1:all.length-1))%all.length];next.focus();setTab(next.dataset.tab);}}));
render();
