// Servidor Xtream Codes falso, só para testes locais.
const http = require('http'), fs = require('fs'), path = require('path');
const clip = path.join(__dirname, 'clip.webm');
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const j = (o, c = 200) => { res.writeHead(c, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (u.pathname === '/player_api.php') {
    const q = u.searchParams;
    if (q.get('username') !== 'joao' || q.get('password') !== 'segredo') return j({ user_info: { auth: 0 } });
    switch (q.get('action')) {
      case null: return j({ user_info: { auth: 1, status: 'Active' }, server_info: {} });
      case 'get_live_categories': case 'get_vod_categories': case 'get_series_categories':
        return j([{ category_id: '1', category_name: 'Esportes' }, { category_id: '2', category_name: 'Filmes' }, { category_id: '3', category_name: 'Adultos +18' }]);
      case 'get_live_streams': return j(Array.from({ length: 300 }, (_, i) => ({ stream_id: 1000 + i, name: 'Canal ' + (i + 1), category_id: i >= 290 ? '3' : '1' })));
      case 'get_vod_streams': return j([{ stream_id: 7, name: 'Filme Ação', container_extension: 'webm', category_id: '2', rating: '7.5', added: '100' }, { stream_id: 8, name: 'Outro Filme', container_extension: 'mkv', category_id: '2', rating: '9.1', added: '200' }]);
      case 'get_short_epg': { const n = Math.floor(Date.now() / 1000), b = (t) => Buffer.from(t).toString('base64');
        return j({ epg_listings: [{ title: b('Jornal Agora'), description: b('d'), start_timestamp: String(n - 600), stop_timestamp: String(n + 600) }, { title: b('Novela das Nove'), description: b(''), start_timestamp: String(n + 600), stop_timestamp: String(n + 4200) }] }); }
      case 'get_vod_info': return j({ info: { plot: 'Sinopse do filme.', cast: 'Ator Um', director: 'Diretora X', duration: '1h 40m' }, movie_data: { container_extension: q.get('vod_id') === '8' ? 'mkv' : 'webm' } });
      case 'get_series': return j([{ series_id: 3, name: 'Série Um', category_id: '2', plot: 'Uma série.' }]);
      case 'get_series_info': return j({ episodes: { 1: [{ id: '31', episode_num: 1, title: 'Piloto', container_extension: 'webm', info: { plot: 'Primeiro episódio de teste.' } }, { id: '32', episode_num: 2, title: 'Segundo', container_extension: 'webm', info: { plot: 'Segundo episódio de teste.' } }], 2: [{ id: '33', episode_num: 1, title: 'Volta', container_extension: 'webm', info: { plot: 'Primeiro episódio da segunda temporada.' } }] } });
    }
    return j([]);
  }
  if (/^\/(movie|series)\/joao\/segredo\/\d+\.webm$/.test(u.pathname)) {
    const size = fs.statSync(clip).size, r = req.headers.range;
    if (r) { const m = /bytes=(\d+)-(\d*)/.exec(r); const s = +m[1], e = m[2] ? +m[2] : size - 1;
      res.writeHead(206, { 'Content-Type': 'video/webm', 'Content-Range': `bytes ${s}-${e}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': e - s + 1 });
      return fs.createReadStream(clip, { start: s, end: e }).pipe(res); }
    res.writeHead(200, { 'Content-Type': 'video/webm', 'Accept-Ranges': 'bytes', 'Content-Length': size });
    return fs.createReadStream(clip).pipe(res);
  }
  res.writeHead(404); res.end();
}).listen(+process.env.PORT || 8099, () => console.log('mock on', process.env.PORT || 8099));
