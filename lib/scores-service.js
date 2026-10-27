const fs = require('node:fs');
const path = require('node:path');
const { fetch, EnvHttpProxyAgent } = require('undici');
const { SOURCE_URL, parseSchedule, selectWindow } = require('./tdsb');
const snapshot = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/tdsb-snapshot.json'), 'utf8'));

function createScoresService({ mode = process.env.TDSB_MODE || 'auto', loadLive, now = () => new Date() } = {}) {
  let current = { games:snapshot.games, source:'snapshot', importedAt:snapshot.importedAt, fetchedAt:null };
  let nextAttempt = 0, pending, warning = null;
  let dispatcher;
  const readLive = loadLive || (async () => {
    dispatcher ||= new EnvHttpProxyAgent();
    const response = await fetch(SOURCE_URL, { dispatcher, signal:AbortSignal.timeout(12000),
      headers:{'User-Agent':'ParkdaleAthletics/1.0 (school sports schedule viewer)', Accept:'text/html'} });
    if (!response.ok) throw new Error('TDSB request failed');
    const html = await response.text();
    if (html.length > 5_000_000) throw new Error('TDSB response too large');
    return html;
  });
  async function refresh() {
    try {
      const games = parseSchedule(await readLive());
      current = { games, source:'live', fetchedAt:now().toISOString(), importedAt:null };
      warning = null;
      nextAttempt = now().getTime() + 15 * 60 * 1000;
    } catch {
      warning = 'TDSB could not be refreshed. Showing saved information; results and fixtures may have changed.';
      nextAttempt = now().getTime() + 5 * 60 * 1000;
    }
  }
  return async function getScores() {
    if (mode !== 'snapshot' && now().getTime() >= nextAttempt) {
      if (!pending) pending = refresh().finally(()=>{pending=null;});
      await pending;
    }
    return { ...selectWindow(current.games, now()), source:current.source, sourceUrl:SOURCE_URL,
      fetchedAt:current.fetchedAt, importedAt:current.importedAt, warning, timezone:'America/Toronto' };
  };
}
module.exports = { createScoresService };
