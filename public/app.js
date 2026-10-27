let schedules = null, schedulesError = false;
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
 const entries=schedules?.[tab] || [];
 content.innerHTML = `<div class="content-heading"><h2>${titles[tab]}</h2>${tab!=='scores'?`<label class="filter"><span class="sr-only">Filter by sport</span><select id="sport-filter"><option>All sports</option>${[...new Set(entries.map(x=>x.sport))].sort().map(s=>`<option ${s===filter?'selected':''}>${escapeText(s)}</option>`).join('')}</select></label>`:''}</div>`;
 if(tab!=='scores'&&schedules&&schedulesError)content.innerHTML+='<div class="sample-notice">Couldn’t refresh schedules. Showing the last loaded version.</div>';
 if(tab==='scores') {
  content.innerHTML += renderGames();
 } else if(!schedules) {
  content.innerHTML += `<div class="feed-status"><p>${schedulesError?'Schedules couldn’t be loaded.':'Loading schedules…'}</p>${schedulesError?'<button class="refresh-games" id="retry-schedules">Try again</button>':''}</div>`;
 } else {
  const items=entries.filter(x=>filter==='All sports'||x.sport===filter).sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));
  if(entries.some(x=>x.sample))content.innerHTML+=`<div class="sample-notice">${tab==='intramurals'?'Sample intramural sessions are marked below.':'Sample tryouts are marked below.'}</div>`;
  content.innerHTML+=`<div class="schedule-meta"><span>${items.length} ${tab==='tryouts'?'TRYOUTS':'SESSIONS'}</span><span>Toronto time</span></div>${items.length?`<div class="schedule">${items.map(x=>{
   const date=new Date(x.date+'T12:00:00Z');
   const day=new Intl.DateTimeFormat('en-CA',{weekday:'short',timeZone:'America/Toronto'}).format(date).toUpperCase();
   const colours={Basketball:['peach','◉'],Volleyball:['lavender','◍'],Badminton:['green','⌁'],Soccer:['green','◎']};
   const [colour,icon]=colours[x.sport]||['green','⚑'];
   return `<article class="schedule-row"><div class="date"><span>${day}</span><strong>${date.getUTCDate()}</strong></div><div class="sport-icon ${colour}" aria-hidden="true">${icon}</div><div class="sport-info"><h3>${escapeText(x.sport)}</h3><p>${escapeText(tab==='tryouts'?x.level:x.detail)}</p>${x.sample?'<small class="sample-tag">Sample</small>':''}</div><div class="time"><span aria-hidden="true">◷</span><div>${displayTime(x.start)} – ${displayTime(x.end)}<small>${gameDate(x.date)}</small></div></div><div class="place"><span aria-hidden="true">⌖</span><div>${escapeText(x.place)}${tab==='tryouts'&&x.teacher?`<small>Teacher: ${escapeText(x.teacher)}</small>`:''}</div></div><span class="badge">${tab==='tryouts'?'Tryout':'Intramural'}</span></article>`;
  }).join('')}</div>`:'<p class="games-empty">No '+(tab==='tryouts'?'tryouts':'intramurals')+' posted'+(filter!=='All sports'?' for this sport':'')+'.</p>'}`;
 }
 document.querySelector('#retry-schedules')?.addEventListener('click',loadSchedules);
 document.querySelector('#refresh-games')?.addEventListener('click',()=>loadGames(true));
 document.querySelector('#sport-filter')?.addEventListener('change',e=>{filter=e.target.value;render()});
}
function displayTime(time){const [hours,minutes]=time.split(':').map(Number);return `${hours%12||12}:${String(minutes).padStart(2,'0')} ${hours>=12?'PM':'AM'}`;}
async function loadSchedules(){
 try{const response=await fetch('/api/schedules',{cache:'no-store'});if(!response.ok)throw Error('Unavailable');schedules=await response.json();schedulesError=false;if(tab!=='scores'&&filter!=='All sports'&&!schedules[tab].some(x=>x.sport===filter))filter='All sports';}
 catch{schedulesError=true;}
 if(tab!=='scores')render();
}
function setTab(next){tab=next;filter='All sports';document.querySelectorAll('[data-tab]').forEach(x=>{x.classList.toggle('active',x.dataset.tab===tab);if(x.dataset.tab===tab)x.setAttribute('aria-current','true');else x.removeAttribute('aria-current');});render();if(next==='scores')loadGames();if(innerWidth<760){document.body.classList.remove('mobile-open');syncSidebar();document.querySelector('#menu-toggle').focus();}}
document.querySelectorAll('[data-tab]').forEach(x=>x.addEventListener('click',()=>setTab(x.dataset.tab)));
function syncSidebar(){const expanded=innerWidth<760?document.body.classList.contains('mobile-open'):!document.body.classList.contains('sidebar-collapsed');document.querySelector('#sidebar').inert=!expanded;document.querySelector('#menu-toggle').setAttribute('aria-expanded',String(expanded));}
document.querySelector('#menu-toggle').addEventListener('click',()=>{document.body.classList.toggle(innerWidth<760?'mobile-open':'sidebar-collapsed');syncSidebar();});
window.addEventListener('resize',syncSidebar);
syncSidebar();
render();
loadSchedules();
window.addEventListener('focus',loadSchedules);
setInterval(()=>{if(tab!=='scores')loadSchedules();},60000);
setInterval(()=>{if(tab==='scores')loadGames(true);},15*60*1000);
