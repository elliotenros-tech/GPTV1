const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createScoresService } = require('./lib/scores-service');
const getScores = createScoresService();
const root = path.join(__dirname, 'public');
http.createServer(async (req,res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/api/games') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    try { return res.end(JSON.stringify(await getScores())); }
    catch { res.writeHead(503); return res.end(JSON.stringify({error:'Game information is temporarily unavailable.'})); }
  }
  const file = path.join(root, pathname === '/' ? 'index.html' : pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err,data) => {
    if(err) { res.writeHead(404); return res.end('Not found'); }
    res.setHeader('Content-Type', {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript'}[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
}).listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('Parkdale Athletics running on port ' + (process.env.PORT || 3000)));
