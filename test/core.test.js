const assert = require('assert');
const C = require('../renderer/core.js');

assert.strictEqual(C.normalizeHost('servidor.com:8080'), 'http://servidor.com:8080');
assert.strictEqual(C.normalizeHost(' https://x.com/player_api.php '), 'https://x.com');
assert.strictEqual(C.normalizeHost('http://x.com/sub/get.php?a=1'), 'http://x.com/sub');
assert.strictEqual(C.normalizeHost('http://x.com/'), 'http://x.com');
assert.throws(() => C.normalizeHost(''));
assert.throws(() => C.normalizeHost('http://'));

assert.strictEqual(C.apiUrl('h.com', 'u', 'p w', 'get_series_info', { series_id: 7, vazio: '' }),
  'http://h.com/player_api.php?username=u&password=p+w&action=get_series_info&series_id=7');

const live = C.streamUrls('h.com', 'us er', 'p@ss', 'live', { stream_id: 12 });
assert.deepStrictEqual(live, ['http://h.com/live/us%20er/p%40ss/12.m3u8', 'http://h.com/live/us%20er/p%40ss/12.ts']);
assert.deepStrictEqual(C.streamUrls('h.com', 'u', 'p', 'movie', { stream_id: 5, container_extension: 'mkv' }), ['http://h.com/movie/u/p/5.mkv']);
assert.deepStrictEqual(C.streamUrls('h.com', 'u', 'p', 'series', { series_id: 1 }, { id: '99', container_extension: 'mp4' }), ['http://h.com/series/u/p/99.mp4']);
assert.deepStrictEqual(C.streamUrls('h.com', 'u', 'p', 'live', { stream_id: 1, direct_source: 'http://cdn/a.m3u8' }), ['http://cdn/a.m3u8']);
assert.deepStrictEqual(C.streamUrls('h.com', 'u', 'p', 'live', { stream_id: 1, direct_source: 'javascript:alert(1)' })[0].startsWith('http://h.com/live/'), true);

assert.ok(C.checkLogin({ user_info: { auth: 1, status: 'Active' }, server_info: {} }));
assert.throws(() => C.checkLogin({ user_info: { auth: 0 } }), /Acesso recusado/);
assert.throws(() => C.checkLogin({ user_info: { auth: 1, status: 'Expired' } }), /não está ativa/);
assert.throws(() => C.checkLogin([]), /Resposta inesperada/);

const items = [{ name: 'Ação Total' }, { name: 'Comédia' }];
assert.strictEqual(C.filterItems(items, 'acao').length, 1);
assert.strictEqual(C.filterItems(items, '').length, 2);

const s = C.seasonsOf({ episodes: { 2: [{ episode_num: 1 }], 1: [{ episode_num: 2 }, { episode_num: 1 }] } });
assert.deepStrictEqual(s.map((x) => x.season), [1, 2]);
assert.deepStrictEqual(s[0].episodes.map((e) => e.episode_num), [1, 2]);

assert.strictEqual(C.itemPoster({ cover: 'file:///etc/passwd' }), '');
assert.deepStrictEqual(C.itemPosters({ stream_icon: 'https://img.example/movie.jpg', cover_big: 'https://img.example/big.jpg' }), ['https://img.example/movie.jpg', 'https://img.example/big.jpg']);
assert.strictEqual(C.itemPoster({ movie_image: '/posters/movie.jpg' }, 'https://server.example:8080'), 'https://server.example:8080/posters/movie.jpg');
assert.strictEqual(C.itemPoster({ backdrop_path: '//img.example/backdrop.jpg' }), 'https://img.example/backdrop.jpg');
assert.deepStrictEqual(C.itemPosters({ stream_icon: 'javascript:alert(1)', cover: 'file:///etc/passwd' }), []);
assert.strictEqual(C.errorMessage({ error: 'http', status: 503 }), 'O servidor respondeu com erro HTTP 503.');
console.log('core: todos os testes passaram');

// ---- novos recursos ----
const b64 = (t) => Buffer.from(t, 'utf8').toString('base64');
assert.strictEqual(C.decodeB64(b64('Jornal da Noite – Ação')), 'Jornal da Noite – Ação');
const epg = C.epgList({ epg_listings: [
  { title: b64('Depois'), description: b64(''), start_timestamp: '2000', stop_timestamp: '3000' },
  { title: b64('Agora'), description: b64('Desc'), start_timestamp: '1000', stop_timestamp: '2000' }] });
assert.deepStrictEqual(epg.map((e) => e.title), ['Agora', 'Depois']);
let nn = C.epgNowNext(epg, 1500); assert.strictEqual(nn.now.title, 'Agora'); assert.strictEqual(nn.next.title, 'Depois');
nn = C.epgNowNext(epg, 500); assert.strictEqual(nn.now, null); assert.strictEqual(nn.next.title, 'Agora');
assert.deepStrictEqual(C.epgList({}), []);
assert.deepStrictEqual(C.sortItems([{ name: 'b', added: 1 }, { name: 'a', added: 5 }], 'az').map((x) => x.name), ['a', 'b']);
assert.deepStrictEqual(C.sortItems([{ name: 'b', added: 1 }, { name: 'a', added: 5 }], 'recent').map((x) => x.name), ['a', 'b']);
assert.ok(C.isAdultName('Canais Adultos +18')); assert.ok(C.isAdultName('XXX Movies')); assert.ok(!C.isAdultName('Esportes'));
assert.strictEqual(C.fmtTime(75), '1:15'); assert.strictEqual(C.fmtTime(3725), '1:02:05');
assert.strictEqual(C.resumeKey('series', { series_id: 3 }, { id: '31' }), 'series:3:31');
console.log('core: novos recursos ok');
