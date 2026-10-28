const fs = require('node:fs');
const path = require('node:path');
const { SOURCE_URL, parseSchedule, selectWindow } = require('./tdsb');
const { readTdsbHtml, connectionFailure } = require('./tdsb-fetch');
const snapshot = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/tdsb-snapshot.json'), 'utf8'));

function createScoresService({ mode = process.env.TDSB_MODE || 'auto', loadLive, now = () => new Date() } = {}) {
  let current = { games:snapshot.games, source:'snapshot', importedAt:snapshot.importedAt, fetchedAt:null };
  let nextAttempt = 0, pending, warning = null, lastAttempt = null, lastError = null;
  const readLive = loadLive || readTdsbHtml;
  async function refresh() {
    lastAttempt = now().getTime();
    try {
      const html=await readLive();
      let games;
      try{games=parseSchedule(html);}catch{
        throw Object.assign(Error('Schedule format changed'),{diagnostic:{code:'PARSE_ERROR',message:'TDSB responded, but its game listings could not be read. The page format may have changed.'}});
      }
      current = { games, source:'live', fetchedAt:now().toISOString(), importedAt:null };
      warning = null;lastError=null;
      nextAttempt = now().getTime() + 15 * 60 * 1000;
    } catch(error) {
      lastError=error.diagnostic || connectionFailure(error);
      warning = 'TDSB could not be refreshed. Showing saved information; results and fixtures may have changed.';
      nextAttempt = now().getTime() + 5 * 60 * 1000;
    }
  }
  return async function getScores({force=false} = {}) {
    const requestedAt=now().getTime();
    const manualAllowed=lastAttempt===null||requestedAt-lastAttempt>=60000;
    const deferred=Boolean(force&&!manualAllowed&&!pending);
    if (mode !== 'snapshot' && (pending||requestedAt>=nextAttempt||(force&&manualAllowed))) {
      if (!pending) pending = refresh().finally(()=>{pending=null;});
      await pending;
    }
    return { ...selectWindow(current.games, now()), source:current.source, sourceUrl:SOURCE_URL,
      fetchedAt:current.fetchedAt, importedAt:current.importedAt, warning, timezone:'America/Toronto',
      refresh:{mode,lastAttemptAt:lastAttempt===null?null:new Date(lastAttempt).toISOString(),
        nextAutomaticCheckAt:mode==='snapshot'?null:new Date(nextAttempt).toISOString(),
        manualAvailableAt:lastAttempt===null?null:new Date(lastAttempt+60000).toISOString(),deferred,
        error:mode==='snapshot'?{code:'SNAPSHOT_MODE',message:'Live updates are disabled because TDSB_MODE is set to snapshot.'}:lastError} };
  };
}
module.exports = { createScoresService };
