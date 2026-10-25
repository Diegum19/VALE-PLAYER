/* Lógica pura (sem interface), compartilhada entre PC e futuras versões de TV. */
(function (root) {
  'use strict';

  function normalizeHost(host) {
    host = String(host || '').trim();
    if (!host) throw new Error('Informe o endereço do servidor (host).');
    if (!/^https?:\/\//i.test(host)) host = 'http://' + host;
    let u;
    try { u = new URL(host); } catch { throw new Error('O host precisa ser um endereço HTTP ou HTTPS válido.'); }
    if (!u.hostname) throw new Error('O host precisa ser um endereço HTTP ou HTTPS válido.');
    let p = u.pathname.replace(/\/+$/, '');
    p = p.replace(/\/player_api\.php$/i, '').replace(/\/get\.php$/i, '');
    return u.origin + p;
  }

  function apiUrl(host, user, pass, action, params) {
    const q = new URLSearchParams({ username: user, password: pass });
    if (action) q.set('action', action);
    for (const [k, v] of Object.entries(params || {})) if (v !== undefined && v !== null && v !== '') q.set(k, v);
    return normalizeHost(host) + '/player_api.php?' + q.toString();
  }

  const isHttpUrl = (s) => { try { const u = new URL(String(s)); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; } };
  const enc = encodeURIComponent;

  // Retorna lista de URLs candidatas, da preferida para a reserva.
  function streamUrls(host, user, pass, kind, item, episode) {
    const base = normalizeHost(host);
    const U = enc(user), P = enc(pass);
    if (kind === 'live') {
      if (isHttpUrl(item.direct_source)) return [String(item.direct_source)];
      const id = enc(item.stream_id ?? item.id);
      return [`${base}/live/${U}/${P}/${id}.m3u8`, `${base}/live/${U}/${P}/${id}.ts`];
    }
    const src = kind === 'movie' ? item : (episode || item);
    if (isHttpUrl(src.direct_source)) return [String(src.direct_source)];
    const id = enc(src.id ?? src.stream_id);
    const ext = String(src.container_extension || 'mp4').replace(/^\./, '');
    return [`${base}/${kind === 'movie' ? 'movie' : 'series'}/${U}/${P}/${id}.${ext}`];
  }

  function itemId(item) { return String(item.stream_id ?? item.series_id ?? item.id ?? ''); }
  function itemName(item) { return String(item.name || item.title || 'Sem título'); }

  // Detecta o protocolo pela extensão do caminho, sem se confundir com query strings.
  function mediaMode(kind, url) {
    const pathname = String(url || '').split(/[?#]/, 1)[0].toLowerCase();
    if (/\.m3u8$/.test(pathname)) return 'hls';
    if (/\.mpd$/.test(pathname)) return 'dash';
    if (/\.flv$/.test(pathname)) return 'flv';
    if (/\.(?:ts|m2ts)$/.test(pathname)) return 'ts';
    return 'native';
  }

  // Fallback nativo limitado a erros potencialmente recuperáveis (sem repetir tentativas).
  const NATIVE_FALLBACK_REASONS = new Set([
    'codec', 'unsupported', 'video', 'network', 'timeout',
    'hls', 'dash', 'ts', 'nohls', 'nompegts',
  ]);
  function shouldUseNativeFallback(kind, reason, alreadyTried = false, blocked = false) {
    return ['live', 'movie', 'series'].includes(String(kind || '')) &&
      NATIVE_FALLBACK_REASONS.has(String(reason || '').toLowerCase()) &&
      alreadyTried !== true && blocked !== true;
  }

  function shouldUseNativeFallbackAfterRuntimeError(kind, reason, attempts = 0, alreadyTried = false, blocked = false) {
    if (!shouldUseNativeFallback(kind, reason, alreadyTried, blocked)) return false;
    const failure = String(reason || '').toLowerCase();
    if (failure !== 'network' && failure !== 'timeout') return true;
    const retryLimit = String(kind || '') === 'live' ? 3 : 2;
    return Math.max(0, Number(attempts) || 0) >= retryLimit;
  }
  function shouldDeferNativeFallbackForStartup(kind, reason, retries = 0) {
    const failure = String(reason || '').toLowerCase();
    if (failure !== 'network' && failure !== 'timeout') return false;
    const count = Math.max(0, Number(retries) || 0);
    if (String(kind || '') === 'live') return count < 3;
    // A fresh VOD start may use MPV immediately; defer only during an actual recovery cycle.
    return count > 0 && count < 2;
  }

  // Agrupa variantes pela resolução e mantém a variante de maior bitrate em cada resolução.
  function qualityChoices(levels) {
    const best = new Map();
    (Array.isArray(levels) ? levels : []).forEach((level, index) => {
      const height = Number(level && level.height) || 0;
      const width = Number(level && level.width) || 0;
      const bitrate = Number(level && (level.bitrate ?? level.bandwidth)) || 0;
      if (!height && !width) return;
      const key = height ? 'h:' + height : 'w:' + width;
      const previous = best.get(key);
      if (!previous || bitrate > previous.bitrate) {
        best.set(key, { index, height, width, bitrate });
      }
    });
    return [...best.values()]
      .sort((a, b) => b.height - a.height || b.width - a.width || b.bitrate - a.bitrate)
      .map((entry) => ({
        ...entry,
        label: (entry.height ? entry.height + 'p' : entry.width + 'w') +
          (entry.bitrate ? ' · ' + (entry.bitrate >= 1000000
            ? (entry.bitrate / 1000000).toFixed(1) + ' Mbps'
            : Math.round(entry.bitrate / 1000) + ' kbps') : ''),
      }));
  }
  function itemPosters(item, baseHost) {
    if (!item || typeof item !== 'object') return [];
    const fields = ['cover_big', 'movie_image', 'movie_cover', 'poster', 'poster_url', 'cover_url', 'cover', 'stream_icon', 'thumbnail', 'image', 'image_url', 'backdrop_path', 'backdrop', 'logo', 'icon'];
    const out = [];
    for (const key of fields) {
      let value = item[key];
      if (typeof value === 'string' && value.trim().startsWith('[')) {
        try { value = JSON.parse(value); } catch { /* mantém string original */ }
      }
      const values = Array.isArray(value) ? value : [value];
      for (const candidate of values) {
        let raw = '';
        if (typeof candidate === 'string') raw = candidate.trim();
        else if (candidate && typeof candidate === 'object') raw = String(candidate.url || candidate.file_path || candidate.src || '').trim();
        if (!raw || /^(?:data|javascript|file):/i.test(raw)) continue;
        let url = '';
        try {
          if (raw.startsWith('//')) url = 'https:' + raw;
          else if (isHttpUrl(raw)) url = raw;
          else if (baseHost) url = new URL(raw, normalizeHost(baseHost)).href;
        } catch { /* endereço de capa inválido */ }
        if (isHttpUrl(url) && !out.includes(url)) out.push(url);
      }
    }
    return out;
  }

  function itemPoster(item, baseHost) {
    return itemPosters(item, baseHost)[0] || '';
  }

  const ERRORS = {
    bad_url: 'O host precisa ser um endereço HTTP ou HTTPS válido.',
    timeout: 'O servidor demorou demais para responder. Tente novamente.',
    ssl: 'Falha na conexão HTTPS do servidor. Confira o endereço e o certificado.',
    network: 'Não foi possível conectar ao servidor. Confira o host e sua internet.',
    not_json: 'O servidor respondeu em um formato que não parece JSON da Xtream Codes API.',
  };
  function errorMessage(r) {
    if (r.error === 'http') return `O servidor respondeu com erro HTTP ${r.status}.`;
    return ERRORS[r.error] || 'Erro inesperado ao falar com o servidor.';
  }

  function checkLogin(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Resposta inesperada do servidor. Confirme se o host é compatível com Xtream Codes API.');
    const info = data.user_info || {};
    const auth = info.auth;
    if (auth !== undefined && auth !== null && !['1', 'true'].includes(String(auth).toLowerCase())) throw new Error('Acesso recusado. Confira o usuário, a senha e a validade da conta.');
    if ((auth === undefined || auth === null) && !('server_info' in data || 'user_info' in data)) throw new Error('O servidor não retornou os dados esperados da Xtream Codes API.');
    const status = String(info.status || '').toLowerCase();
    if (status && !['active', 'enabled'].includes(status)) throw new Error(`A conta não está ativa (status: ${status}).`);
    return data;
  }

  function normText(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function itemYear(item) {
    const explicit = String(item && (item.year ?? item.releaseYear) || '').trim();
    const date = String(item && (item.releaseDate || item.releasedate || item.release_date || item.first_air_date) || '').trim();
    const match = /(?:19|20)\d{2}/.exec(explicit) || /(?:19|20)\d{2}/.exec(date);
    return match ? match[0] : '';
  }

  function itemGenres(item) {
    if (!item || typeof item !== 'object') return [];
    const values = [];
    for (const entry of [item.genre, item.genres, item.genre_name, item.category_name]) {
      for (const value of (Array.isArray(entry) ? entry : [entry])) {
        if (!value || typeof value !== 'string') continue;
        String(value).split(/[,;|\/]/).map((x) => x.trim()).filter(Boolean).forEach((x) => {
          if (!values.some((g) => normText(g) === normText(x))) values.push(x);
        });
      }
    }
    return values;
  }

  function filterByMetadata(items, filters = {}) {
    const genre = normText(filters.genre || '').trim();
    const year = String(filters.year || '').trim();
    const minRating = Math.max(0, Number(filters.minRating) || 0);
    return (Array.isArray(items) ? items : []).filter((item) => {
      if (genre && !itemGenres(item).some((g) => normText(g) === genre)) return false;
      if (year && itemYear(item) !== year) return false;
      if (minRating > 0 && !(Number(item.rating ?? item.rating_5based ?? item.vote_average) >= minRating)) return false;
      return true;
    });
  }

  function filterItems(items, q) {
    const n = normText(q).trim();
    if (!n) return items;
    return items.filter((i) => {
      const searchable = [
        itemName(i), i && i.original_name, i && i.title, i && i.genre, i && i.genres,
        i && i.genre_name, i && i.category_name, i && i.plot, i && i.overview,
        i && i.description, i && i.cast, i && i.director, i && i.year, itemYear(i),
      ].filter(Boolean).join(' ');
      return normText(searchable).includes(n);
    });
  }

  function profileKey(host, user) { return normalizeHost(host).toLowerCase() + '|' + user; }

  // Agrupa episódios de get_series_info por temporada, em ordem numérica.
  function seasonsOf(info) {
    const eps = info && info.episodes;
    const out = [];
    if (!eps) return out;
    const entries = Array.isArray(eps) ? eps.map((e, i) => [String(i + 1), e]) : Object.entries(eps);
    for (const [num, list] of entries) {
      if (!Array.isArray(list)) continue;
      out.push({ season: Number(num), episodes: list.slice().sort((a, b) => Number(a.episode_num) - Number(b.episode_num)) });
    }
    return out.sort((a, b) => a.season - b.season);
  }


  function decodeB64(s) {
    if (!s) return '';
    try { const bin = atob(String(s)); const b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return new TextDecoder('utf-8').decode(b); }
    catch { return String(s); }
  }
  function ts(v, fallbackStr) {
    const n = Number(v); if (n > 0) return n;
    const d = Date.parse(String(fallbackStr || '').replace(' ', 'T')); return d ? Math.floor(d / 1000) : 0;
  }
  // Guia de programação (get_short_epg): títulos vêm em base64.
  function epgList(resp) {
    let l = resp && resp.epg_listings; if (!l) return [];
    if (!Array.isArray(l)) l = Object.values(l);
    return l.map((e) => ({ title: decodeB64(e.title), desc: decodeB64(e.description), start: ts(e.start_timestamp, e.start), stop: ts(e.stop_timestamp, e.end) }))
      .filter((e) => e.start && e.stop).sort((a, b) => a.start - b.start);
  }
  function epgNowNext(list, nowSec) {
    const i = list.findIndex((e) => nowSec >= e.start && nowSec < e.stop);
    return { now: i >= 0 ? list[i] : null, next: i >= 0 ? (list[i + 1] || null) : (list.find((e) => e.start > nowSec) || null) };
  }
  function sortItems(items, mode) {
    const a = items.slice();
    if (mode === 'az') a.sort((x, y) => itemName(x).localeCompare(itemName(y), 'pt-BR'));
    else if (mode === 'recent') a.sort((x, y) => (Number(y.added) || 0) - (Number(x.added) || 0));
    else if (mode === 'rating') a.sort((x, y) => (Number(y.rating ?? y.rating_5based) || 0) - (Number(x.rating ?? x.rating_5based) || 0));
    else if (mode === 'year') a.sort((x, y) => (Number(itemYear(y)) || 0) - (Number(itemYear(x)) || 0) || itemName(x).localeCompare(itemName(y), 'pt-BR'));
    return a;
  }
  const ADULT_RE = /\badult|\bxxx\b|\+\s?18|18\s?\+|porn|er[oó]tic|\bsexy\b|\bhentai\b/i;
  const isAdultName = (n) => ADULT_RE.test(String(n || ''));
  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(Number(sec) || 0));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const mm = h ? String(m).padStart(2, '0') : String(m);
    return (h ? h + ':' : '') + mm + ':' + String(s).padStart(2, '0');
  }
  function resumeKey(kind, item, ep) { return kind + ':' + itemId(item) + (ep ? ':' + (ep.id ?? ep.stream_id) : ''); }
  function hhmm(sec) { const d = new Date(sec * 1000); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

  const api = { itemPosters, decodeB64, epgList, epgNowNext, sortItems, isAdultName, fmtTime, resumeKey, hhmm, normalizeHost, apiUrl, streamUrls, itemId, itemName, itemPoster, errorMessage, checkLogin, filterItems, filterByMetadata, itemGenres, itemYear, profileKey, seasonsOf, isHttpUrl, mediaMode, shouldUseNativeFallback, shouldUseNativeFallbackAfterRuntimeError, shouldDeferNativeFallbackForStartup, qualityChoices };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VelaCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
