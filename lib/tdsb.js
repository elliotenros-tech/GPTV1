const cheerio = require('cheerio');

const SOURCE_URL = 'https://www.tdsb.on.ca/sports/sportsresults/Mode/Schedule/ShowAll/1/EducationUnitId/5550';
const clean = text => text.replace(/\s+/g, ' ').trim();
const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function parseDate(text) {
  const match = clean(text).match(/^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) (\w+) (\d{1,2}), (\d{4})$/);
  if (!match) throw new Error('Unrecognized TDSB date');
  const month = months.indexOf(match[1]);
  const value = `${match[3]}-${String(month + 1).padStart(2,'0')}-${match[2].padStart(2,'0')}`;
  if (month < 0 || new Date(value + 'T12:00:00Z').toISOString().slice(0,10) !== value) throw new Error('Invalid TDSB date');
  return value;
}

function timeMinutes(text) {
  const match = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match || +match[1] < 1 || +match[1] > 12 || +match[2] > 59) return null;
  return (+match[1] % 12) * 60 + +match[2] + (match[3].toUpperCase() === 'PM' ? 720 : 0);
}

function parseSchedule(html) {
  const $ = cheerio.load(html);
  const games = [];
  let date, league;
  $('h2, h3.league, table.schedule').each((_, element) => {
    const node = $(element);
    if (element.tagName === 'h2') {
      if (/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) /.test(clean(node.text()))) date = parseDate(node.text());
      return;
    }
    if (element.tagName === 'h3') { league = clean(node.find('.leagueName').text()); return; }
    node.find('tr.scheduleRow').each((_, row) => {
      const cell = $(row).find('td.schools');
      const teams = cell.find('a.schoolslink').map((_, link) => {
        const id = new URL($(link).attr('href'), SOURCE_URL).searchParams.get('schno');
        const next = link.nextSibling;
        const score = next?.type === 'text' ? next.data.match(/^\s*\((\d+)\)\s*$/) : null;
        return { id, name: clean($(link).text()), score: score ? Number(score[1]) : null };
      }).get();
      const parkdale = teams.findIndex(team => team.id === '5550');
      if (parkdale === -1) return;
      if (!date || !league || teams.length !== 2) throw new Error('Incomplete TDSB game');
      const [sport, region, level, ...tiers] = league.split(/\s*\|\s*/);
      const time = clean($(row).find('.scheduleTime').text());
      const locationMarker = cell.find('.sportLocationSymbol');
      const location = clean(locationMarker.nextAll('a').first().text()) || 'Location not posted';
      const ours = teams[parkdale], other = teams[1 - parkdale];
      games.push({ date, time, timeMinutes: timeMinutes(time), sport, region, level,
        tier: tiers.join(' | '), parkdale: ours.name, opponent: other.name,
        parkdaleScore: ours.score, opponentScore: other.score, location,
        note: clean(cell.children('.specialName').not(':contains("Location:")').text()),
        hasScore: ours.score !== null && other.score !== null });
    });
  });
  // Do not silently treat a login page or changed markup as an empty schedule.
  if (!games.length && !/no (?:games|results|schedules|events) (?:found|available|scheduled)/i.test($('[id$="ViewSportsScoreboard_AllDiv"]').text())) {
    throw new Error('TDSB schedule markup was not recognized');
  }
  return games;
}

function torontoClock(now) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'America/Toronto', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).formatToParts(now);
  const p = Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return { date:`${p.year}-${p.month}-${p.day}`, minutes:Number(p.hour)*60+Number(p.minute) };
}
function shiftDay(date, count) {
  const value = new Date(date + 'T12:00:00Z');
  value.setUTCDate(value.getUTCDate() + count);
  return value.toISOString().slice(0,10);
}
function selectWindow(games, now = new Date()) {
  const today = torontoClock(now);
  const from = shiftDay(today.date, -14), through = shiftDay(today.date, 14);
  const byDate = (a,b) => a.date.localeCompare(b.date) || (a.timeMinutes ?? 0) - (b.timeMinutes ?? 0) || a.sport.localeCompare(b.sport);
  const past = game => game.date < today.date || (game.date === today.date && game.timeMinutes !== null && game.timeMinutes < today.minutes);
  return {
    today: today.date, from, through,
    scores: games.filter(g=>g.hasScore && g.date >= from && g.date <= today.date).sort((a,b)=>byDate(b,a)),
    upcoming: games.filter(g=>!g.hasScore && !past(g) && g.date >= today.date && g.date <= through).sort(byDate),
    unreportedCount: games.filter(g=>!g.hasScore && past(g) && g.date >= from).length
  };
}
module.exports = { SOURCE_URL, parseSchedule, selectWindow };
