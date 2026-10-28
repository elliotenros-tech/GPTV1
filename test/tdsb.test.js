const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {parseSchedule,selectWindow} = require('../lib/tdsb');
const {createScoresService} = require('../lib/scores-service');
const {connectionFailure} = require('../lib/tdsb-fetch');
const html = fs.readFileSync(path.join(__dirname,'fixtures/tdsb-schedule.html'),'utf8');

test('parses the uploaded TDSB schedule, scores, levels, venues and playoff notes',()=>{
 const games=parseSchedule(html);
 assert.equal(games.length,27);
 const basketball=games.find(g=>g.date==='2026-10-26'&&g.sport==='Girls Basketball');
 assert.equal(basketball.parkdaleScore,40);
 assert.equal(basketball.opponentScore,26);
 assert.equal(basketball.opponent,'Danforth C & TI');
 assert.equal(basketball.level,'Junior');
 assert.equal(basketball.location,'Parkdale CI');
 const soccer=games.find(g=>g.date==='2026-10-26'&&g.sport==='Boys Soccer');
 assert.equal(soccer.parkdaleScore,0);
 assert.equal(soccer.hasScore,true);
 const playoff=games.find(g=>g.date==='2026-11-02'&&g.sport==='Boys Soccer');
 assert.equal(playoff.location,'Central Technical School');
 assert.match(playoff.note,/Semi-Final/);
 assert.equal(playoff.hasScore,false);
 assert.equal(playoff.parkdaleScore,null);
});

test('filters past scores and future fixtures without treating unreported scores as zero',()=>{
 const result=selectWindow(parseSchedule(html),new Date('2026-10-27T12:00:00-04:00'));
 assert.equal(result.scores.length,12);
 assert.equal(result.upcoming.length,6);
 assert.equal(result.unreportedCount,4);
 assert.equal(result.scores[0].date,'2026-10-26');
 assert.equal(result.upcoming[0].date,'2026-10-27');
 assert(result.scores.every(g=>g.date>='2026-10-13'&&g.date<='2026-10-27'&&g.hasScore));
 assert(result.upcoming.every(g=>!g.hasScore&&g.date>='2026-10-27'&&g.date<='2026-11-10'));
 const evening=selectWindow(parseSchedule(html),new Date('2026-10-27T17:00:00-04:00'));
 assert.equal(evening.upcoming.length,5);
 assert.equal(evening.unreportedCount,5);
});

test('uses Toronto calendar days and includes the 14-day edges across daylight saving time',()=>{
 const game=(date,hasScore=true)=>({date,timeMinutes:930,hasScore,sport:'Soccer'});
 const result=selectWindow([game('2026-10-12'),game('2026-10-13'),game('2026-10-27'),game('2026-10-28'),game('2026-11-10',false),game('2026-11-11',false)],new Date('2026-10-28T01:00:00Z'));
 assert.equal(result.today,'2026-10-27');
 assert.deepEqual(result.scores.map(g=>g.date),['2026-10-27','2026-10-13']);
 assert.deepEqual(result.upcoming.map(g=>g.date),['2026-11-10']);
 const dst=selectWindow([],new Date('2026-11-02T04:30:00Z'));
 assert.equal(dst.today,'2026-11-01');
 assert.equal(dst.through,'2026-11-15');
});

test('rejects changed markup and excludes games involving other schools',()=>{
 assert.throws(()=>parseSchedule('<html>Access denied</html>'),/not recognized/);
 const others=html.replaceAll('schno=5550','schno=9999');
 assert.throws(()=>parseSchedule(others),/not recognized/);
 const empty='<div id="dnn_ctr8926_ViewSportsScoreboard_AllDiv">No games found</div>';
 assert.deepEqual(parseSchedule(empty),[]);
});

test('snapshot-only mode never requests the network',async()=>{
 const service=createScoresService({mode:'snapshot',loadLive:()=>{throw Error('Should not fetch');},now:()=>new Date('2026-10-27T12:00:00-04:00')});
 const result=await service();
 assert.equal(result.source,'snapshot');
 assert.equal(result.scores.length,12);
 assert.equal(result.fetchedAt,null);
});

test('failed live requests retain labeled snapshot data and are throttled',async()=>{
 let calls=0;
 const service=createScoresService({loadLive:async()=>{calls++;throw Error('Blocked');},now:()=>new Date('2026-10-27T12:00:00-04:00')});
 const first=await service();
 assert.equal(first.source,'snapshot');
 assert.match(first.warning,/could not be refreshed/);
 assert.equal(first.scores.length,12);
 await service();assert.equal(calls,1);
});

test('coalesces live requests, caches success, and retains previous data after refresh failure',async()=>{
 let now=new Date('2026-10-27T12:00:00-04:00'),calls=0;
 const service=createScoresService({now:()=>now,loadLive:async()=>{calls++;if(calls>1)throw Error('Offline');return html;}});
 const results=await Promise.all([service(),service()]);
 assert.equal(calls,1);assert.equal(results[0].source,'live');assert.equal(results[1].scores.length,12);
 assert.equal(results[0].fetchedAt,now.toISOString());
 now=new Date(now.getTime()+16*60*1000);
 const stale=await service();
 assert.equal(calls,2);assert.equal(stale.source,'live');assert.match(stale.warning,/could not be refreshed/);
 assert.equal(stale.fetchedAt,results[0].fetchedAt);
});

test('manual refresh bypasses the automatic cache after one minute, with a cooldown',async()=>{
 let clock=new Date('2026-10-27T12:00:00-04:00'),calls=0;
 const service=createScoresService({now:()=>clock,loadLive:async()=>{calls++;return html;}});
 await service();assert.equal(calls,1);
 const deferred=await service({force:true});assert.equal(calls,1);assert.equal(deferred.refresh.deferred,true);
 clock=new Date(clock.getTime()+61000);
 await service();assert.equal(calls,1);
 const refreshed=await service({force:true});assert.equal(calls,2);assert.equal(refreshed.refresh.deferred,false);
 assert.equal(refreshed.fetchedAt,clock.toISOString());
 assert.equal(refreshed.refresh.error,null);
});

test('connection and parsing failures return safe diagnostic categories',async()=>{
 assert.equal(connectionFailure({cause:{code:'ENOTFOUND'}}).code,'DNS_ERROR');
 assert.equal(connectionFailure({name:'TimeoutError'}).code,'TIMEOUT');
 assert.equal(connectionFailure({cause:{code:'UNABLE_TO_VERIFY_LEAF_SIGNATURE'}}).code,'TLS_ERROR');
 const failed=createScoresService({loadLive:async()=>{throw Object.assign(Error('Do not expose raw details'),{diagnostic:{code:'HTTP_403',message:'TDSB or the network proxy denied access (HTTP 403).'}});}});
 const response=await failed();assert.equal(response.refresh.error.code,'HTTP_403');assert(!JSON.stringify(response).includes('Do not expose'));
 const changed=createScoresService({loadLive:async()=>'<html>Changed page</html>'});
 assert.equal((await changed()).refresh.error.code,'PARSE_ERROR');
 const offline=createScoresService({mode:'snapshot'});
 const snapshot=await offline({force:true});assert.equal(snapshot.refresh.error.code,'SNAPSHOT_MODE');assert.equal(snapshot.refresh.lastAttemptAt,null);
});
