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
let gameFeed = null, gamesLoading = false, gamesError = false, gamesLoadedAt = 0;
const content = document.querySelector('#content');
const escapeText = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const gameDate = date => new Intl.DateTimeFormat('en-CA',{month:'short',day:'numeric',year:'numeric',timeZone:'America/Toronto'}).format(new Date(date+'T12:00:00Z'));
function renderGames() {
 const refresh = `<button id="refresh-games" class="refresh-games" ${gamesLoading?'disabled':''}>${gamesLoading?'Checking…':'Refresh games ↻'}</button>`;
 if (!gameFeed) return `<div class="feed-status"><p>${gamesError?'Game information couldn’t be loaded. Please try again.':'Loading Parkdale games…'}</p>${refresh}</div>`;
 const sourceDate = gameFeed.fetchedAt || gameFeed.importedAt;
 const label = gameFeed.source==='live' ? 'Retrieved from TDSB' : 'Saved TDSB snapshot · Not live';
 const dateLabel = sourceDate ? new Intl.DateTimeFormat('en-CA',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Toronto'}).format(new Date(sourceDate)) : '';
 const source = `<div class="feed-status"><div><strong>${label}</strong><p>${gameFeed.source==='live'?'Last checked':'Imported'} ${escapeText(dateLabel)} · Toronto time</p>${gameFeed.source==='snapshot'?'<p>Original page date unknown. Confirm updates with TDSB.</p>':''}<a href="https://www.tdsb.on.ca/sports/sportsresults/Mode/Schedule/ShowAll/1/EducationUnitId/5550" target="_blank" rel="noopener noreferrer">View official TDSB schedule ↗</a></div>${refresh}</div>`;
 const warning = gamesError ? 'The latest request failed. Previously loaded information is shown.' : gameFeed.warning;
 return source + (warning?`<div class="sample-notice" role="status">${escapeText(warning)}</div>`:'') +
 `<div class="games-section-heading"><h3>Recent scores</h3><span>${gameDate(gameFeed.from)} – ${gameDate(gameFeed.today)}</span></div><div class="score-grid">${gameFeed.scores.length?gameFeed.scores.map(game=>`<article class="score-card"><div class="score-top">${escapeText(game.level)} ${escapeText(game.sport)}<span>REPORTED SCORE · ${gameDate(game.date)}</span></div><div class="team"><span><b class="mini-p">P</b> Parkdale</span><strong>${game.parkdaleScore}</strong></div><div class="team opponent"><span><b class="other-mark">${escapeText(game.opponent[0])}</b> ${escapeText(game.opponent)}</span><strong>${game.opponentScore}</strong></div><div class="score-result">${game.parkdaleScore===game.opponentScore?'Tie':game.parkdaleScore>game.opponentScore?'Parkdale win':'Parkdale loss'}<p>${escapeText(game.location)} · ${escapeText(game.time)}</p></div></article>`).join(''):'<p class="games-empty">No reported scores in the past 14 days.</p>'}</div>` +
 (gameFeed.unreportedCount?`<p class="unreported">${gameFeed.unreportedCount} past ${gameFeed.unreportedCount===1?'game has':'games have'} no reported score.</p>`:'') +
 `<div class="games-section-heading"><h3>Upcoming games</h3><span>Through ${gameDate(gameFeed.through)}</span></div><div class="upcoming-games">${gameFeed.upcoming.length?gameFeed.upcoming.map(game=>`<article class="upcoming-game"><div class="upcoming-date">${gameDate(game.date)}<small>${escapeText(game.time || 'Time not posted')}</small></div><div class="upcoming-opponent"><h4>Parkdale <span>vs.</span> ${escapeText(game.opponent)}</h4><p>${escapeText(game.level)} ${escapeText(game.sport)} · ${escapeText(game.tier)}</p>${game.note?`<p>${escapeText(game.note)}</p>`:''}</div><div class="upcoming-location">⌖ ${escapeText(game.location)}</div></article>`).join(''):'<p class="games-empty">No upcoming games posted for the next 14 days.</p>'}</div><p class="unreported">Toronto time · Confirm fixture changes with your coach.</p>`;
}
async function loadGames(force = false) {
 if (gamesLoading || (!force && gameFeed && Date.now()-gamesLoadedAt<60000)) return;
 gamesLoading=true; gamesError=false; if(tab==='scores')render();
 try {
  const response=await fetch('/api/games',{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error('Games unavailable');
  const data=await response.json();
  if(!Array.isArray(data.scores)||!Array.isArray(data.upcoming))throw new Error('Invalid games');
  gameFeed=data;gamesLoadedAt=Date.now();
 } catch { gamesError=true; }
 finally { gamesLoading=false;if(tab==='scores')render(); }
}
function render() {
 const titles = {intramurals:'Intramurals',tryouts:'Tryouts',scores:'Scores & games'};
 content.innerHTML = `<div class="content-heading"><h2>${titles[tab]}</h2>${tab!=='scores'?`<label class="filter"><span class="sr-only">Filter by sport</span><select id="sport-filter"><option>All sports</option>${[...new Set((tab==='intramurals'?intramurals:tryouts).map(x=>x.sport))].map(s=>`<option ${s===filter?'selected':''}>${s}</option>`).join('')}</select></label>`:''}</div>${tab === 'scores' ? '' : '<div class="sample-notice"><span>ⓘ</span> Sample schedules and teacher names.</div>'}`;
 if(tab==='scores') {
 content.innerHTML += renderGames();
 } else {
 const items=(tab==='intramurals'?intramurals:tryouts).filter(x=>filter==='All sports'||x.sport===filter);
 content.innerHTML+=`<div class="schedule-meta"><span>OCTOBER 26 – 30, 2026</span><span>${items.length} ${tab==='tryouts'?'tryouts':'sessions'} this week</span></div><div class="schedule">${items.map(x=>`<article class="schedule-row"><div class="date"><span>${x.day}</span><strong>${x.date}</strong></div><div class="sport-icon ${x.color}">${x.icon}</div><div class="sport-info"><h3>${x.sport}</h3><p>${x.detail||x.level}</p></div><div class="time"><span>◷</span><div>${x.time}<small>October ${x.date}, 2026</small></div></div><div class="place"><span>⌖</span><div>${x.place}${x.teacher?`<small>Teacher: ${x.teacher}</small>`:''}</div></div><span class="badge">${x.type||'Tryout'} <span>↗</span></span></article>`).join('')}</div><div class="schedule-foot"><span>◷ &nbsp; All times are local to Toronto.</span></div>`;
 }
 document.querySelector('#refresh-games')?.addEventListener('click',()=>loadGames(true));
 document.querySelector('#sport-filter')?.addEventListener('change',e=>{filter=e.target.value;render()});
}
function setTab(next){tab=next;filter='All sports';document.querySelectorAll('[data-tab]').forEach(x=>{x.classList.toggle('active',x.dataset.tab===tab);if(x.hasAttribute('role'))x.setAttribute('aria-selected',String(x.dataset.tab===tab));});render();if(next==='scores')loadGames();if(innerWidth<760){document.body.classList.remove('mobile-open');document.querySelector('#menu-toggle').setAttribute('aria-expanded','false');}}
document.querySelectorAll('[data-tab]').forEach(x=>x.addEventListener('click',()=>setTab(x.dataset.tab)));
document.querySelector('#menu-toggle').addEventListener('click',e=>{const mobile=innerWidth<760;document.body.classList.toggle(mobile?'mobile-open':'sidebar-collapsed');e.currentTarget.setAttribute('aria-expanded',String(mobile?document.body.classList.contains('mobile-open'):!document.body.classList.contains('sidebar-collapsed')))});
document.querySelectorAll('[role="tab"]').forEach((el,i,all)=>el.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const next=all[(i+(e.key==='ArrowRight'?1:all.length-1))%all.length];next.focus();setTab(next.dataset.tab);}}));
render();
setInterval(()=>{if(tab==='scores')loadGames(true);},15*60*1000);
