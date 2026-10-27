const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createScheduleStore } = require('./lib/schedules');
const schedules = createScheduleStore();
const editorCode = process.env.ATHLETICS_EDITOR_CODE || crypto.randomBytes(12).toString('base64url');
if(editorCode.length<12)throw Error('ATHLETICS_EDITOR_CODE must be at least 12 characters.');
function isEditor(req) {
  const provided=Buffer.from(req.headers.authorization || '');
  const expected=Buffer.from('Bearer '+editorCode);
  return provided.length===expected.length && crypto.timingSafeEqual(provided,expected);
}
function json(res,status,data) {
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(data));
}
async function readBody(req) {
  let body='';
  for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>20000)throw Object.assign(Error('Request too large.'),{status:413});}
  try{return JSON.parse(body);}catch{throw Object.assign(Error('Invalid form data.'),{status:400});}
}
const { createScoresService } = require('./lib/scores-service');
const getScores = createScoresService();
const root = path.join(__dirname, 'public');
http.createServer(async (req,res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if(pathname==='/api/editor/session'){
    if(req.method!=='POST')return json(res,405,{error:'Method not allowed.'});
    return isEditor(req)?json(res,200,{ok:true}):json(res,401,{error:'Incorrect editor code. Check the code in Terminal.'});
  }
  if(pathname==='/api/schedules'){
    try{
      if(req.method==='GET')return json(res,200,schedules.read());
      if(req.method!=='POST')return json(res,405,{error:'Method not allowed.'});
      if(!isEditor(req))return json(res,401,{error:'Editor access expired. Unlock with the current code from Terminal.'});
      const body=await readBody(req);
      if(!body||typeof body!=='object')return json(res,400,{error:'Invalid form data.'});
      return json(res,200,schedules.change(body));
    }catch(error){return json(res,error.status||500,{error:error.status?error.message:'Schedules could not be saved or loaded. Please try again.'});}
  }
  if (pathname === '/api/games') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    try { return res.end(JSON.stringify(await getScores())); }
    catch { res.writeHead(503); return res.end(JSON.stringify({error:'Game information is temporarily unavailable.'})); }
  }
  const file = path.join(root, pathname === '/' ? 'index.html' : pathname === '/manage' ? 'manage.html' : pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err,data) => {
    if(err) { res.writeHead(404); return res.end('Not found'); }
    res.setHeader('Content-Type', {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript'}[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
}).listen(process.env.PORT || 3000, '0.0.0.0', () => {
  console.log('Parkdale Athletics running on port ' + (process.env.PORT || 3000));
  console.log('Editor access code: ' + editorCode);
});
