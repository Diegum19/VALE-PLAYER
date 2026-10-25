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
assert.strictEqual(C.mediaMode('live', 'https://cdn.example/live/index.m3u8?token=abc'), 'hls');
assert.strictEqual(C.mediaMode('movie', 'https://cdn.example/movie/manifest.mpd?token=abc'), 'dash');
assert.strictEqual(C.mediaMode('movie', 'https://cdn.example/movie/file.flv?token=abc'), 'flv');
assert.strictEqual(C.mediaMode('movie', 'https://cdn.example/movie/file.ts?token=abc'), 'ts');
assert.strictEqual(C.mediaMode('live', 'https://cdn.example/live/file.m2ts'), 'ts');
assert.strictEqual(C.mediaMode('movie', 'https://cdn.example/movie/file.mkv'), 'native');
assert.strictEqual(C.shouldUseNativeFallback('live', 'network'), true);
assert.strictEqual(C.shouldUseNativeFallback('series', 'codec'), true);
assert.strictEqual(C.shouldUseNativeFallback('movie', 'timeout'), true);
assert.strictEqual(C.shouldUseNativeFallback('series', 'autoplay'), false);
assert.strictEqual(C.shouldUseNativeFallback('live', 'network', true, false), false);
assert.strictEqual(C.shouldUseNativeFallback('movie', 'codec', false, true), false);
assert.strictEqual(C.shouldUseNativeFallback('settings', 'network'), false);
assert.strictEqual(C.shouldUseNativeFallbackAfterRuntimeError('series', 'codec', 0), true);
assert.strictEqual(C.shouldUseNativeFallbackAfterRuntimeError('series', 'network', 0), false);
assert.strictEqual(C.shouldUseNativeFallbackAfterRuntimeError('series', 'network', 1), false);
assert.strictEqual(C.shouldUseNativeFallbackAfterRuntimeError('series', 'network', 2), true);
assert.strictEqual(C.shouldUseNativeFallbackAfterRuntimeError('live', 'timeout', 2), false);
assert.strictEqual(C.shouldUseNativeFallbackAfterRuntimeError('live', 'timeout', 3), true);
assert.strictEqual(C.shouldUseNativeFallbackAfterRuntimeError('live', 'codec', 0, true), false);
assert.strictEqual(C.shouldDeferNativeFallbackForStartup('series', 'network', 0), false);
assert.strictEqual(C.shouldDeferNativeFallbackForStartup('series', 'network', 1), true);
assert.strictEqual(C.shouldDeferNativeFallbackForStartup('series', 'network', 2), false);
assert.strictEqual(C.shouldDeferNativeFallbackForStartup('live', 'timeout', 0), true);
assert.strictEqual(C.shouldDeferNativeFallbackForStartup('live', 'timeout', 2), true);
assert.strictEqual(C.shouldDeferNativeFallbackForStartup('live', 'timeout', 3), false);
assert.strictEqual(C.shouldDeferNativeFallbackForStartup('series', 'codec', 0), false);
assert.deepStrictEqual(C.qualityChoices([{ height: 720, width: 1280, bitrate: 1800000 }, { height: 1080, width: 1920, bitrate: 5000000 }, { height: 720, width: 1280, bitrate: 2800000 }]).map(q => [q.index, q.label]), [[1, '1080p · 5.0 Mbps'], [2, '720p · 2.8 Mbps']]);
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
assert.deepStrictEqual(C.itemPosters({ stream_icon: 'https://img.example/movie.jpg', cover_big: 'https://img.example/big.jpg' }), ['https://img.example/big.jpg', 'https://img.example/movie.jpg']);
assert.deepStrictEqual(C.itemPosters({ backdrop_path: 'https://img.example/backdrop.jpg', movie_image: 'https://img.example/poster.jpg' }), ['https://img.example/poster.jpg', 'https://img.example/backdrop.jpg']);
assert.deepStrictEqual(C.itemPosters({ thumbnail: 'https://img.example/thumb.jpg' }), ['https://img.example/thumb.jpg']);
assert.deepStrictEqual(C.itemPosters({ backdrop_path: ['https://img.example/a.jpg', 'https://img.example/b.jpg'] }), ['https://img.example/a.jpg', 'https://img.example/b.jpg']);
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

const filterSamples = [
  {name:'Filme de Ação', genre:'Ação, Aventura', releaseDate:'2024-07-18', rating:'7.5', plot:'Uma perseguição em alta velocidade'},
  {name:'Drama de Inverno', genre:'Drama', releasedate:'2022-01-01', rating:'9.1', description:'Uma história familiar'},
  {name:'Mistério', genre:'Drama, Suspense', year:'2023', rating:'', plot:'Mistério na cidade'}
];
assert.deepStrictEqual(C.itemGenres(filterSamples[0]), ['Ação','Aventura']);
assert.strictEqual(C.itemYear(filterSamples[0]), '2024');
assert.strictEqual(C.itemYear({release_date:'2020-03-01'}), '2020');
assert.strictEqual(C.itemYear({year:'2019'}), '2019');
assert.strictEqual(C.itemYear({name:'Sem data'}), '');
assert.deepStrictEqual(C.filterByMetadata(filterSamples,{genre:'ação'}).map(x=>x.name), ['Filme de Ação']);
assert.deepStrictEqual(C.filterByMetadata(filterSamples,{year:'2022'}).map(x=>x.name), ['Drama de Inverno']);
assert.deepStrictEqual(C.filterByMetadata(filterSamples,{minRating:8}).map(x=>x.name), ['Drama de Inverno']);
assert.deepStrictEqual(C.filterByMetadata(filterSamples,{genre:'drama',year:'2023'}).map(x=>x.name), ['Mistério']);
assert.strictEqual(C.filterItems(filterSamples,'velocidade').length, 1);
assert.strictEqual(C.filterItems(filterSamples,'aventura').length, 1);
assert.strictEqual(C.filterItems(filterSamples,'2022').length, 1);
assert.deepStrictEqual(C.sortItems(filterSamples,'year').map(C.itemName), ['Filme de Ação','Mistério','Drama de Inverno']);
console.log('core: filtros, pesquisa por metadados e ordenação por ano ok');
