const {readTdsbHtml}=require('../lib/tdsb-fetch');
const {parseSchedule,selectWindow,SOURCE_URL}=require('../lib/tdsb');
(async()=>{
 console.log('Checking the live TDSB connection from this computer…');
 console.log('Source: '+SOURCE_URL);
 let html;
 try{html=await readTdsbHtml();}catch(error){console.error(error.diagnostic.code+': '+error.diagnostic.message);process.exitCode=1;return;}
 let games;
 try{games=parseSchedule(html);}catch{console.error('PARSE_ERROR: TDSB responded, but the schedule format was not recognized.');process.exitCode=1;return;}
 const result=selectWindow(games);
 console.log(`LIVE CONNECTION WORKS: read ${games.length} Parkdale games from TDSB.`);
 console.log(`${result.scores.length} reported scores in the past 14 days; ${result.upcoming.length} games in the next 14 days (Toronto time).`);
 if(process.env.TDSB_MODE==='snapshot')console.log('Note: the app is in snapshot-only mode. Restart it without TDSB_MODE=snapshot to enable live updates.');
})().catch(()=>{console.error('The connection check failed unexpectedly.');process.exitCode=1;});
