'use strict';
(function () {
  const C = window.VelaCore;
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const APP_VERSION = '0.3.1';

  // ---- Adaptador de plataforma: no PC usa o Electron; em outras plataformas (TV) usa a web ----
  const P = window.vela || {
    platform: 'web',
    api: async (url) => {
      try {
        const r = await fetch(url);
        if (!r.ok) return { ok: false, error: 'http', status: r.status };
        try { return { ok: true, json: await r.json() }; } catch { return { ok: false, error: 'not_json' }; }
      } catch { return { ok: false, error: 'network' }; }
    },
    storeGet: async (k) => { try { return JSON.parse(localStorage.getItem('vela:' + k)); } catch { return null; } },
    storeSet: async (k, v) => { try { localStorage.setItem('vela:' + k, JSON.stringify(v)); } catch {} return true; },
    credSave: async (o) => { try { localStorage.setItem('vela:cred', JSON.stringify(o)); return true; } catch { return false; } },
    credLoad: async () => { try { return JSON.parse(localStorage.getItem('vela:cred')); } catch { return null; } },
    credClear: async () => { try { localStorage.removeItem('vela:cred'); } catch {} return true; },
    fullscreen: async (on) => { try { if (on) await document.documentElement.requestFullscreen(); else if (document.fullscreenElement) await document.exitFullscreen(); } catch {} },
    mpvPlay: async () => ({ ok: false, error: 'missing' }),
    mpvAvailable: async () => false,
  };

  const S = {
    profiles: [], session: null, pkey: '', tab: 'home', cats: {}, all: {}, catId: '__all__', items: [], view: [], shown: 0,
    query: '', sort: '', favs: [], history: [], resume: {}, settings: { hideAdult: false, pin: '' }, loadSeq: 0, mpv: false,
  };
  const PAGE = 120;
  const LABEL = { live: 'canais', movie: 'filmes', series: 'séries', favs: 'favoritos', history: 'itens', search: 'resultados' };
  const ICON = { live: '📺', movie: '🎬', series: '🍿' };

  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 3200);
  }

  async function call(action, params) {
    const { host, user, pass } = S.session;
    const r = await P.api(C.apiUrl(host, user, pass, action, params));
    if (!r.ok) throw new Error(C.errorMessage(r));
    return r.json;
  }

  // ---- Diálogos simples (window.prompt não existe no Electron) ----
  function modal(build) {
    return new Promise((resolve) => {
      const body = $('modalBody'); body.innerHTML = '';
      const done = (v) => { $('modal').classList.add('hidden'); $('modal')._close = null; resolve(v); };
      $('modal')._close = () => done(null);
      build(body, done);
      $('modal').classList.remove('hidden');
      const f = body.querySelector('input,button'); if (f) f.focus();
    });
  }
  const buttons = (done, okLabel, okValue) => {
    const row = el('div', 'row');
    const cancel = el('button', 'ghost focusable', 'Cancelar'); cancel.onclick = () => done(null);
    const ok = el('button', 'primary focusable', okLabel); ok.onclick = () => done(okValue());
    row.append(cancel, ok); return row;
  };
  const askText = (title, text, type = 'text', okLabel = 'OK') => modal((b, done) => {
    b.append(el('h3', '', title)); if (text) b.append(el('p', 'muted', text));
    const i = el('input'); i.type = type; i.inputMode = type === 'password' ? 'numeric' : 'text'; i.maxLength = 40;
    i.onkeydown = (e) => { if (e.key === 'Enter') done(i.value); };
    b.append(i, buttons(done, okLabel, () => i.value));
  });
  const confirmDlg = (title, text, okLabel = 'Confirmar') => modal((b, done) => {
    b.append(el('h3', '', title), el('p', 'muted', text), buttons(done, okLabel, () => true));
  });

  async function hashPin(pin) {
    try {
      const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('vela:' + pin));
      return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, '0')).join('');
    } catch { return 'p:' + pin; }
  }
  async function checkPin(why) {
    if (!S.settings.pin) return true;
    const v = await askText('PIN de proteção', why, 'password');
    if (v === null) return false;
    if ((await hashPin(v)) === S.settings.pin) return true;
    toast('PIN incorreto'); return false;
  }
  const saveSettings = () => P.storeSet('settings', S.settings);

  // ---- Perfis e login ----
  async function loadProfiles() {
    let list = await P.credLoad();
    if (list && !Array.isArray(list)) list = list.host ? [list] : []; // migra formato antigo
    S.profiles = (list || []).filter((p) => p && p.host && p.user).map((p) => ({ ...p, id: C.profileKey(p.host, p.user) }));
  }
  const saveProfiles = () => (S.profiles.length ? P.credSave(S.profiles) : P.credClear());

  function showLogin(err) {
    stopPlayback(); S.session = null;
    $('app').classList.add('hidden'); $('login').classList.remove('hidden');
    $('loginErr').textContent = err || '';
    renderPicker();
  }
  function renderPicker() {
    const box = $('picker'); box.innerHTML = '';
    const has = S.profiles.length > 0;
    box.classList.toggle('hidden', !has);
    $('newFields').classList.toggle('hidden', has);
    if (!has) { $('host').focus(); return; }
    S.profiles.forEach((p) => {
      const row = el('div', 'prof');
      const go = el('button', 'go focusable'); go.append(document.createTextNode(p.user), el('small', '', p.host.replace(/^https?:\/\//, '')));
      go.onclick = () => doLogin(p.host, p.user, p.pass, true);
      const del = el('button', 'ghost focusable', '✕'); del.title = 'Remover perfil';
      del.onclick = async () => { if (await confirmDlg('Remover perfil', `Remover "${p.user}" deste computador? Favoritos e histórico locais são mantidos.`, 'Remover')) { S.profiles = S.profiles.filter((x) => x.id !== p.id); await saveProfiles(); renderPicker(); } };
      row.append(go, del); box.appendChild(row);
    });
    const add = el('button', 'ghost focusable', '＋ Novo perfil');
    add.onclick = () => { box.classList.add('hidden'); $('newFields').classList.remove('hidden'); $('host').focus(); };
    box.appendChild(add);
    const first = box.querySelector('.go'); if (first) first.focus();
  }

  async function doLogin(host, user, pass, remember) {
    $('loginErr').textContent = '';
    const btn = $('loginBtn'); btn.disabled = true; btn.textContent = 'Entrando…';
    try {
      host = C.normalizeHost(host); user = user.trim();
      if (!user || !pass) throw new Error('Informe o usuário e a senha.');
      S.session = { host, user, pass };
      const info = C.checkLogin(await call(null));
      S.pkey = C.profileKey(host, user);
      if (remember) {
        const rest = S.profiles.filter((p) => p.id !== S.pkey);
        S.profiles = [{ id: S.pkey, host, user, pass }, ...rest]; await saveProfiles();
      }
      await P.storeSet('lastProfile', remember ? S.pkey : null);
      await loadLocal();
      $('login').classList.add('hidden'); $('app').classList.remove('hidden');
      const ui = info.user_info || {};
      const exp = Number(ui.exp_date) > 0 ? ' · vence ' + new Date(Number(ui.exp_date) * 1000).toLocaleDateString('pt-BR') : '';
      $('acct').textContent = user + exp;
      S.mpv = await P.mpvAvailable(); S.cats = {}; S.all = {};
      selectTab('home');
    } catch (e) {
      S.session = null;
      $('loginErr').textContent = e.message || 'Não foi possível entrar.';
      if (S.profiles.length) renderPicker();
    } finally { btn.disabled = false; btn.textContent = 'Entrar'; }
  }

  async function loadLocal() {
    const per = async (k, def) => { const v = await P.storeGet(k); return (v && v[S.pkey]) || def; };
    S.favs = await per('favs', []); S.history = await per('history', []); S.resume = await per('resume', {});
    S.settings = { hideAdult: false, pin: '', ...((await P.storeGet('settings')) || {}) };
  }
  async function saveLocal(k, val) { const all = (await P.storeGet(k)) || {}; all[S.pkey] = val; await P.storeSet(k, all); }

  // ---- Conteúdo adulto ----
  function adultCats(kind) {
    const set = new Set();
    for (const c of S.cats[kind] || []) if (C.isAdultName(c.category_name)) set.add(String(c.category_id));
    return set;
  }
  function hidden(kind, item) {
    if (!S.settings.hideAdult) return false;
    if (C.isAdultName(C.itemName(item))) return true;
    return adultCats(kind).has(String(item.category_id));
  }

  // ---- Navegação ----
  const sidebarTabs = document.querySelectorAll('#nav button');
  async function ensureCats(kind) {
    if (!S.cats[kind]) {
      const list = await call({ live: 'get_live_categories', movie: 'get_vod_categories', series: 'get_series_categories' }[kind]);
      S.cats[kind] = Array.isArray(list) ? list : [];
    }
  }
  async function ensureAll(kind) {
    if (!S.all[kind]) {
      const list = await call({ live: 'get_live_streams', movie: 'get_vod_streams', series: 'get_series' }[kind]);
      S.all[kind] = Array.isArray(list) ? list : [];
    }
  }

  async function selectTab(tab) {
    S.tab = tab; S.catId = '__all__'; S.query = ''; S.sort = ''; $('search').value = ''; $('sort').value = '';
    const seq = ++S.loadSeq;
    sidebarTabs.forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    $('cats').innerHTML = ''; $('grid').innerHTML = ''; $('count').textContent = ''; setState('');
    $('home').classList.toggle('hidden', tab !== 'home'); $('grid').classList.toggle('hidden', tab === 'home');
    $('cats').classList.toggle('hidden', !['live', 'movie', 'series'].includes(tab));
    $('sort').classList.toggle('hidden', !['movie', 'series'].includes(tab));
    $('search').placeholder = tab === 'search' ? 'Buscar em canais, filmes e séries…' : 'Pesquisar nesta categoria…';
    $('search').parentElement.classList.toggle('hidden', tab === 'home');
    if (tab === 'home') return renderHome();
    if (tab === 'favs' || tab === 'history') {
      const src = tab === 'favs' ? S.favs : S.history;
      S.items = src.map((f) => ({ ...f.item, _kind: f.kind })).filter((i) => !hidden(i._kind, i));
      return renderGrid(true);
    }
    if (tab === 'search') { S.items = []; setState('Digite para buscar em todo o catálogo.'); $('search').focus(); return; }
    setState('Carregando categorias…');
    try {
      await ensureCats(tab);
      if (seq !== S.loadSeq) return;
      renderCats(); await loadItems(seq);
    } catch (e) { if (seq === S.loadSeq) setState(e.message); }
  }

  function renderCats() {
    const box = $('cats'); box.innerHTML = '';
    const add = (id, name) => {
      const b = el('button', 'focusable' + (S.catId === id ? ' on' : ''), name);
      b.onclick = () => { S.catId = id; renderCats(); loadItems(++S.loadSeq); };
      box.appendChild(b);
    };
    add('__all__', 'Todas');
    const hide = S.settings.hideAdult ? adultCats(S.tab) : new Set();
    for (const c of S.cats[S.tab]) if (!hide.has(String(c.category_id))) add(String(c.category_id), c.category_name || 'Sem nome');
  }

  async function loadItems(seq) {
    setState('Carregando…'); $('grid').innerHTML = '';
    const action = { live: 'get_live_streams', movie: 'get_vod_streams', series: 'get_series' }[S.tab];
    try {
      const list = await call(action, S.catId === '__all__' ? {} : { category_id: S.catId });
      if (seq !== S.loadSeq) return;
      S.items = (Array.isArray(list) ? list : []).filter((i) => !hidden(S.tab, i));
      renderGrid(true);
    } catch (e) { if (seq === S.loadSeq) setState(e.message); }
  }

  const setState = (m) => { $('state').textContent = m || ''; };
  const kindOf = (item) => item._kind || S.tab;

  function computeView() {
    let v = S.tab === 'search' ? S.items : C.filterItems(S.items, S.query);
    if (S.sort && (S.tab === 'movie' || S.tab === 'series')) v = C.sortItems(v, S.sort);
    S.view = v;
  }

  function renderGrid(reset) {
    if (reset) { computeView(); $('grid').innerHTML = ''; S.shown = 0; $('gridWrap').scrollTop = 0; }
    const list = S.view, end = Math.min(list.length, S.shown + PAGE);
    const frag = document.createDocumentFragment();
    for (let i = S.shown; i < end; i++) frag.appendChild(makeCard(list[i], i));
    $('grid').appendChild(frag); S.shown = end;
    $('count').textContent = `${list.length} ${LABEL[S.tab] || ''}`;
    if (S.tab === 'search' && !S.query.trim()) return;
    setState(list.length === 0 ? (S.tab === 'favs' ? 'Nenhum favorito ainda.' : S.tab === 'history' ? 'Nada assistido ainda.' : 'Nada encontrado.') : (end < list.length ? 'Role para carregar mais…' : ''));
  }

  function makeCard(item, idx, resumeEntry) {
    const kind = kindOf(item);
    const b = el('button', 'card focusable ' + (kind === 'live' ? 'live' : ''));
    const art = el('div', 'img');
    const fallback = el('span', 'poster-fallback', ICON[kind] || '▶');
    const posterImg = el('img', 'poster-image');
    posterImg.alt = '';
    posterImg.loading = 'lazy';
    posterImg.decoding = 'async';
    posterImg.draggable = false;
    posterImg.hidden = true;
    art.append(fallback, posterImg);

    const posterUrls = C.itemPosters(item, S.session && S.session.host);
    let posterIndex = 0;
    const loadNextPoster = () => {
      posterImg.classList.remove('is-loaded');
      posterImg.hidden = true;
      if (posterIndex >= posterUrls.length) return;
      posterImg.hidden = false;
      posterImg.src = posterUrls[posterIndex++];
    };
    posterImg.onload = () => {
      posterImg.classList.add('is-loaded');
      fallback.classList.add('hidden');
    };
    posterImg.onerror = () => {
      posterImg.hidden = true;
      posterImg.classList.remove('is-loaded');
      fallback.classList.remove('hidden');
      loadNextPoster();
    };
    if (posterUrls.length) loadNextPoster();

    b.append(art, el('div', 't', resumeEntry && resumeEntry.title ? resumeEntry.title : C.itemName(item)));
    const rating = Number(item.rating);
    if (kind !== 'live' && rating > 0) art.appendChild(el('span', 'badge', '★ ' + rating.toFixed(1)));
    const r = resumeEntry || S.resume[C.resumeKey(kind, item)];
    if (r && r.d) { const bar = el('div', 'bar'); const i = el('i'); i.style.width = Math.min(100, (r.t / r.d) * 100) + '%'; bar.appendChild(i); art.appendChild(bar); }
    if (kind === 'live' && S.tab === 'search') b.append(el('div', 'sub2', 'Canal'));
    b.onclick = () => {
      if (resumeEntry) return play(resumeEntry.kind, resumeEntry.item, resumeEntry.episode || null, resumeEntry.title);
      openItem(kind, item, idx);
    };
    return b;
  }

  $('gridWrap').addEventListener('scroll', () => {
    const w = $('gridWrap');
    if (S.tab !== 'home' && w.scrollTop + w.clientHeight > w.scrollHeight - 400 && S.shown < S.view.length) renderGrid(false);
  });

  let st;
  $('search').addEventListener('input', (e) => {
    clearTimeout(st);
    st = setTimeout(() => { S.query = e.target.value; if (S.tab === 'search') runGlobalSearch(); else renderGrid(true); }, 250);
  });
  $('sort').addEventListener('change', (e) => { S.sort = e.target.value; renderGrid(true); });
  sidebarTabs.forEach((b) => (b.onclick = () => selectTab(b.dataset.tab)));
  $('logout').onclick = async () => { await P.storeSet('lastProfile', null); showLogin(); };

  async function runGlobalSearch() {
    const q = S.query.trim(); const seq = ++S.loadSeq;
    if (q.length < 2) { S.items = []; renderGrid(true); setState('Digite ao menos 2 letras.'); return; }
    setState('Carregando catálogo (só na primeira busca)…');
    try {
      await Promise.all(['live', 'movie', 'series'].map(async (k) => { await ensureCats(k); await ensureAll(k); }));
    } catch (e) { if (seq === S.loadSeq) setState(e.message); return; }
    if (seq !== S.loadSeq) return;
    const out = [];
    for (const kind of ['movie', 'series', 'live']) {
      for (const it of C.filterItems(S.all[kind], q)) {
        if (hidden(kind, it)) continue;
        out.push(Object.assign({}, it, { _kind: kind }));
        if (out.length >= 400) break;
      }
    }
    S.items = out; renderGrid(true);
  }

  // ---- Início ----
  function renderHome() {
    const home = $('home');
    home.innerHTML = '';

    const hero = el('section', 'home-hero');
    hero.append(
      el('p', 'home-kicker', 'SUA CENTRAL DE ENTRETENIMENTO'),
      el('h2', 'home-title', 'O que vamos assistir hoje?'),
      el('p', 'home-subtitle', 'Entre em uma categoria para explorar seus canais, filmes e séries.')
    );
    const categories = el('div', 'home-categories');
    const choices = [
      { tab: 'live', cls: 'category-live', icon: '📺', title: 'TV ao vivo', desc: 'Seus canais, notícias, esportes e muito mais.' },
      { tab: 'movie', cls: 'category-movie', icon: '🎬', title: 'Filmes', desc: 'Descubra seu próximo filme por categoria.' },
      { tab: 'series', cls: 'category-series', icon: '🍿', title: 'Séries', desc: 'Temporadas e episódios em um só lugar.' },
    ];
    for (const item of choices) {
      const button = el('button', 'category-tile focusable ' + item.cls);
      button.type = 'button';
      const top = el('div', 'category-top');
      top.append(el('span', 'category-icon', item.icon), el('span', 'category-arrow', '↗'));
      const copy = el('div', 'category-copy');
      copy.append(el('h3', 'category-title', item.title), el('p', 'category-desc', item.desc));
      const cta = el('div', 'category-cta');
      cta.append(el('span', '', 'Explorar catálogo'), el('span', '', '→'));
      button.append(top, copy, cta);
      button.onclick = () => selectTab(item.tab);
      categories.appendChild(button);
    }
    home.append(hero, categories);

    const section = (title, nodes) => {
      if (!nodes.length) return;
      const sec = el('div', 'sec');
      sec.append(el('h3', '', title));
      const row = el('div', 'hrow');
      nodes.forEach((n) => row.appendChild(n));
      sec.appendChild(row);
      home.appendChild(sec);
    };
    const cont = Object.values(S.resume).filter((r) => r && r.item && r.d && !hidden(r.kind, r.item)).sort((a, b) => b.at - a.at).slice(0, 20);
    section('Continuar assistindo', cont.map((r) => makeCard({ ...r.item, _kind: r.kind }, 0, r)));
    const recentLive = S.history.filter((h) => h.kind === 'live' && !hidden('live', h.item)).slice(0, 15);
    section('Canais recentes', recentLive.map((h) => makeCard({ ...h.item, _kind: 'live' }, 0)));
    const recentVod = S.history.filter((h) => h.kind !== 'live' && !hidden(h.kind, h.item)).slice(0, 20);
    section('Assistidos recentemente', recentVod.map((h) => makeCard({ ...h.item, _kind: h.kind }, 0)));
    section('Favoritos', S.favs.filter((f) => !hidden(f.kind, f.item)).slice(0, 20).map((f) => makeCard({ ...f.item, _kind: f.kind }, 0)));
    if (!cont.length && !recentLive.length && !recentVod.length && !S.favs.length) {
      home.appendChild(el('p', 'home-empty-note', 'Quando você assistir a algum conteúdo ou marcar favoritos, eles aparecerão aqui.'));
    }
  }

  // ---- Favoritos / histórico ----
  const favIndex = (kind, item) => S.favs.findIndex((f) => f.kind === kind && C.itemId(f.item) === C.itemId(item));
  async function toggleFav(kind, item) {
    const i = favIndex(kind, item);
    if (i >= 0) S.favs.splice(i, 1); else S.favs.push({ kind, item: cleanItem(item) });
    S.favs.sort((a, b) => C.itemName(a.item).localeCompare(C.itemName(b.item), 'pt-BR'));
    await saveLocal('favs', S.favs); return i < 0;
  }
  // guarda só o essencial (mantém o arquivo local pequeno)
  function cleanItem(it) {
    const keep = ['stream_id', 'series_id', 'id', 'name', 'title', 'stream_icon', 'cover', 'cover_big', 'cover_url', 'movie_image', 'movie_cover', 'poster', 'poster_url', 'backdrop_path', 'backdrop', 'image', 'image_url', 'category_id', 'container_extension', 'direct_source', 'rating', 'plot', 'genre', 'releaseDate', 'added'];
    const o = {}; for (const k of keep) if (it[k] !== undefined) o[k] = it[k]; return o;
  }
  async function addHistory(kind, item) {
    S.history = S.history.filter((h) => !(h.kind === kind && C.itemId(h.item) === C.itemId(item)));
    S.history.unshift({ kind, item: cleanItem(item), at: Date.now() });
    S.history = S.history.slice(0, 300); await saveLocal('history', S.history);
  }

  // ---- Detalhe (filmes e séries) ----
  function setDetailPoster(item) {
    const img = $('dposter');
    const token = (Number(img.dataset.posterToken) || 0) + 1;
    img.dataset.posterToken = String(token);
    img.classList.remove('poster-missing');
    const urls = C.itemPosters(item, S.session && S.session.host);
    let index = 0;
    img.onload = () => {
      if (img.dataset.posterToken !== String(token)) return;
      img.classList.remove('poster-missing');
    };
    img.onerror = () => {
      if (img.dataset.posterToken !== String(token)) return;
      img.classList.add('poster-missing');
      if (index < urls.length) img.src = urls[index++];
      else img.removeAttribute('src');
    };
    if (!urls.length) {
      img.removeAttribute('src');
      img.classList.add('poster-missing');
      return;
    }
    img.src = urls[index++];
  }

  let cur = null;
  async function openItem(kind, item, idx) {
    if (kind === 'live') return play('live', item, null, C.itemName(item), { list: S.view.filter((x) => kindOf(x) === 'live'), item });
    cur = { kind, item, seasons: [] };
    $('dtitle').textContent = C.itemName(item);
    setDetailPoster(item);
    const meta = (it) => [it.genre, it.releaseDate || it.releasedate || it.release_date, it.duration, it.rating ? '★ ' + it.rating : ''].filter(Boolean).join(' · ');
    $('dmeta').textContent = meta(item); $('dplot').textContent = item.plot || ''; $('dcast').textContent = '';
    $('seasons').innerHTML = ''; $('episodes').textContent = kind === 'series' ? 'Carregando episódios…' : '';
    setPlayButton(); updateFavBtn();
    $('detail').classList.remove('hidden'); $('dplay').focus();
    const mine = cur;
    try {
      if (kind === 'movie') {
        const d = await call('get_vod_info', { vod_id: C.itemId(item) });
        if (cur !== mine) return;
        const i = d.info || {};
        $('dmeta').textContent = meta({ ...item, ...i, rating: i.rating || item.rating });
        $('dplot').textContent = i.plot || i.description || item.plot || '';
        $('dcast').textContent = [i.director && 'Direção: ' + i.director, i.cast && 'Elenco: ' + i.cast].filter(Boolean).join(' · ');
        setDetailPoster({ ...item, ...i, movie_image: i.movie_image || item.movie_image });
        mine.movieExt = d.movie_data && d.movie_data.container_extension;
      } else {
        const info = await call('get_series_info', { series_id: C.itemId(item) });
        if (cur !== mine) return;
        const i = info.info || {};
        setDetailPoster({ ...item, ...i });
        if (i.plot && !item.plot) $('dplot').textContent = i.plot;
        if (i.cast) $('dcast').textContent = 'Elenco: ' + i.cast;
        mine.seasons = C.seasonsOf(info);
        if (!mine.seasons.length) { $('episodes').textContent = 'Nenhum episódio disponível.'; return; }
        $('seasons').innerHTML = '';
        mine.seasons.forEach((s) => {
          const b = el('button', 'focusable', 'Temporada ' + s.season); b.dataset.s = s.season;
          b.onclick = () => showSeason(s); $('seasons').appendChild(b);
        });
        const last = lastSeriesResume(item);
        showSeason(mine.seasons.find((s) => last && s.season === Number(last.season)) || mine.seasons[0]);
        setPlayButton();
      }
    } catch (e) { if (cur === mine && kind === 'series') $('episodes').textContent = e.message; }
  }
  const lastSeriesResume = (item) => Object.values(S.resume).filter((r) => r.kind === 'series' && C.itemId(r.item) === C.itemId(item)).sort((a, b) => b.at - a.at)[0];

  function setPlayButton() {
    const b = $('dplay'); b.classList.remove('hidden');
    if (!cur) return;
    if (cur.kind === 'movie') {
      const r = S.resume[C.resumeKey('movie', cur.item)];
      b.textContent = r ? `▶ Continuar de ${C.fmtTime(r.t)}` : '▶ Assistir';
      b.onclick = () => { const it = cur.movieExt ? { ...cur.item, container_extension: cur.movieExt } : cur.item; const t = C.itemName(cur.item); closeDetail(); play('movie', it, null, t); };
    } else {
      const r = lastSeriesResume(cur.item);
      if (!r) { b.classList.add('hidden'); return; }
      b.textContent = `▶ Continuar ${r.title.split('—').pop().trim()} (${C.fmtTime(r.t)})`;
      b.onclick = () => { const x = r; closeDetail(); play('series', x.item, x.episode, x.title); };
    }
  }

  function showSeason(s) {
    document.querySelectorAll('#seasons button').forEach((b) => b.classList.toggle('on', Number(b.dataset.s) === s.season));
    const box = $('episodes'); box.innerHTML = ''; const item = cur.item;
    s.episodes.forEach((ep) => {
      const r = S.resume[C.resumeKey('series', item, ep)];
      const b = el('button', 'focusable', `E${ep.episode_num || '?'} — ${ep.title || 'Episódio'}` + (r ? `  ·  parou em ${C.fmtTime(r.t)}` : ''));
      b.onclick = () => { closeDetail(); play('series', item, ep, `${C.itemName(item)} — T${s.season}E${ep.episode_num}`); };
      box.appendChild(b);
    });
  }
  function updateFavBtn() { $('dfav').textContent = cur && favIndex(cur.kind, cur.item) >= 0 ? '★ Nos favoritos' : '☆ Favoritar'; }
  $('dfav').onclick = async () => { if (!cur) return; const on = await toggleFav(cur.kind, cur.item); updateFavBtn(); toast(on ? 'Adicionado aos favoritos' : 'Removido dos favoritos'); };
  function closeDetail() { $('detail').classList.add('hidden'); cur = null; if (S.tab === 'favs' || S.tab === 'home') selectTab(S.tab); }
  $('detailClose').onclick = closeDetail;

  // ---- Configurações ----
  $('settingsBtn').onclick = () => modal((b, done) => {
    b.append(el('h3', '', 'Configurações'));
    const lab = el('label', 'check'); const cb = el('input'); cb.type = 'checkbox'; cb.checked = S.settings.hideAdult;
    lab.append(cb, document.createTextNode(' Ocultar conteúdo adulto (protegido por PIN)'));
    cb.onchange = async () => {
      const want = cb.checked; cb.checked = !want;
      if (want) {
        if (!S.settings.pin) { const p = await askText('Criar PIN', 'Escolha um PIN de 4 dígitos para proteger esta opção.', 'password'); if (!p || !/^\d{4}$/.test(p)) { toast('O PIN precisa ter 4 dígitos.'); return; } S.settings.pin = await hashPin(p); }
        S.settings.hideAdult = true; cb.checked = true;
      } else {
        if (!(await checkPin('Digite o PIN para exibir conteúdo adulto.'))) { return; }
        S.settings.hideAdult = false; cb.checked = false;
      }
      await saveSettings(); toast(S.settings.hideAdult ? 'Conteúdo adulto oculto' : 'Conteúdo adulto visível');
    };
    b.append(lab);
    const act = (txt, fn) => { const x = el('button', 'ghost focusable', txt); x.style.cssText = 'display:block;width:100%;margin:6px 0;text-align:left'; x.onclick = fn; b.append(x); };
    act('Alterar PIN', async () => {
      if (!S.settings.pin) { toast('Ative a opção acima para criar um PIN.'); return; }
      if (!(await checkPin('Digite o PIN atual.'))) return;
      const p = await askText('Novo PIN', '4 dígitos.', 'password'); if (!p || !/^\d{4}$/.test(p)) { toast('O PIN precisa ter 4 dígitos.'); return; }
      S.settings.pin = await hashPin(p); await saveSettings(); toast('PIN alterado');
    });
    act('Limpar histórico', async () => { if (await confirmDlg('Limpar histórico', 'Apagar os itens assistidos recentemente?', 'Limpar')) { S.history = []; await saveLocal('history', []); toast('Histórico limpo'); } });
    act('Limpar "continuar assistindo"', async () => { if (await confirmDlg('Limpar', 'Apagar os pontos de retomada dos filmes e séries?', 'Limpar')) { S.resume = {}; await saveLocal('resume', {}); toast('Pontos de retomada apagados'); } });
    b.append(el('p', 'muted', `Vela Player ${APP_VERSION} · Player: hls.js e mpegts.js (Apache-2.0)${S.mpv ? ' · mpv (GPL)' : ''}. O Vela Player não fornece canais nem conteúdo.`));
    const row = el('div', 'row'); const close = el('button', 'primary focusable', 'Fechar'); close.onclick = () => { done(null); if (S.tab === 'home') renderHome(); else if (S.tab === 'live' || S.tab === 'movie' || S.tab === 'series') selectTab(S.tab); }; row.append(close); b.append(row);
  });

  // ---- Reprodutor embutido ----
  const V = $('video');
  let pl = null, hideTimer = null, epgTimer = null, numBuf = '', numTimer = null;

  function cleanup(p) {
    if (!p) return;
    try { p.hls && p.hls.destroy(); } catch {}
    try { if (p.ts) { p.ts.pause(); p.ts.unload(); p.ts.detachMediaElement(); p.ts.destroy(); } } catch {}
    p.hls = p.ts = null;
  }
  function resetVideo() { try { V.pause(); V.removeAttribute('src'); V.load(); } catch {} }

  function modeFor(kind, url) {
    if (/\.m3u8(\?|$)/i.test(url)) return 'hls';
    if (kind === 'live' && /\.ts(\?|$)/i.test(url)) return 'ts';
    return 'native';
  }

  // Tenta tocar uma URL; resolve quando começa a tocar, rejeita em erro ou após 20 s.
  function attempt(p, mode, url, startAt) {
    return new Promise((resolve, reject) => {
      let done = false;
      const fail = (m) => { if (!done) { done = true; clearTimeout(timer); V.removeEventListener('playing', ok); V.removeEventListener('error', onErr); reject(new Error(m)); } else if (!p.stopped) runtimeError(p); };
      const ok = () => { if (!done) { done = true; clearTimeout(timer); V.removeEventListener('error', onErr); resolve(); } };
      const onErr = () => fail('video');
      const timer = setTimeout(() => fail('timeout'), 20000);
      V.addEventListener('playing', ok, { once: true });
      V.addEventListener('error', onErr, { once: true });
      try {
        if (mode === 'hls') {
          if (!window.Hls || !window.Hls.isSupported()) return fail('nohls');
          p.hls = new window.Hls({ maxBufferLength: 30, enableWorker: true });
          p.hls.on(window.Hls.Events.ERROR, (_e, d) => { if (d && d.fatal) fail('hls'); });
          p.hls.loadSource(url); p.hls.attachMedia(V);
        } else if (mode === 'ts') {
          if (!window.mpegts || !window.mpegts.getFeatureList().mseLivePlayback) return fail('nots');
          p.ts = window.mpegts.createPlayer({ type: 'mpegts', isLive: true, url }, { enableStashBuffer: true, liveBufferLatencyChasing: false });
          p.ts.on(window.mpegts.Events.ERROR, () => fail('ts'));
          p.ts.attachMediaElement(V); p.ts.load();
        } else V.src = url;
        if (startAt > 5) V.addEventListener('loadedmetadata', () => { try { V.currentTime = startAt; } catch {} }, { once: true });
        const pr = V.play(); if (pr && pr.catch) pr.catch(() => {});
      } catch (e) { fail(String(e && e.message || e)); }
    });
  }

  // Queda no meio da transmissão ao vivo: reconecta sozinho (até 3 vezes).
  function runtimeError(p) {
    if (p !== pl || p.stopped || p.kind !== 'live' || p.reconnecting) return;
    if ((p.retries = (p.retries || 0) + 1) > 3) { $('pmsg').textContent = 'A transmissão caiu. Tente outro canal ou volte mais tarde.'; return; }
    p.reconnecting = true; $('pmsg').textContent = 'Reconectando…';
    setTimeout(() => { if (p === pl && !p.stopped) play(p.kind, p.item, p.episode, p.title, { list: p.list, idx: p.idx, retries: p.retries }); }, 1500);
  }
  V.addEventListener('error', () => { if (pl && pl.started) runtimeError(pl); });

  async function play(kind, item, episode, title, opts = {}) {
    stopPlayback();
    const urls = C.streamUrls(S.session.host, S.session.user, S.session.pass, kind, item, episode);
    const rkey = C.resumeKey(kind, item, episode);
    const list = opts.list || null;
    const idx = list ? list.findIndex((x) => C.itemId(x) === C.itemId(item)) : -1;
    const p = (pl = { kind, item, episode, title, urls, rkey, list, idx, started: false, retries: opts.retries || 0, hls: null, ts: null, stopped: false });
    $('player').classList.remove('hidden'); $('ptitle').textContent = title; $('pmpv').classList.toggle('hidden', !S.mpv);
    $('pmsg').textContent = 'Carregando…'; $('pback').focus(); updatePlayerFav();
    $('pinfo').classList.add('hidden');
    P.fullscreen(true);
    if (!opts.retries) addHistory(kind, item).catch(() => {});
    if (kind === 'live') startEpg(p);
    const startAt = kind === 'live' ? 0 : ((S.resume[rkey] || {}).t || 0);
    for (const url of urls) {
      if (p.stopped) return;
      cleanup(p); resetVideo();
      try { await attempt(p, modeFor(kind, url), url, startAt); if (!p.stopped) { p.started = true; $('pmsg').textContent = ''; bumpUi(); } return; }
      catch (e) { /* tenta a próxima */ }
    }
    if (p.stopped) return;
    cleanup(p); resetVideo();
    if (S.mpv && kind !== 'live') {
      $('pmsg').textContent = 'Abrindo no player avançado…';
      const r = await P.mpvPlay(urls[0], title);
      if (r.ok) { closePlayer(); return; }
    }
    $('pmsg').textContent = 'Não foi possível reproduzir. Pode ser um canal fora do ar, um formato não suportado ou conta sem acesso.' + (S.mpv ? ' Tente "Player avançado".' : '');
    $('ptop').classList.remove('idle');
  }

  // Guia (EPG): agora e a seguir
  function startEpg(p) {
    clearInterval(epgTimer);
    const load = async () => {
      try {
        const list = C.epgList(await call('get_short_epg', { stream_id: C.itemId(p.item), limit: 4 }));
        if (p !== pl) return; p.epg = list; renderEpg(p);
      } catch { /* sem guia para este canal */ }
    };
    load(); epgTimer = setInterval(() => { if (p === pl) { if (!p.epg || p.epg.length < 2) load(); else renderEpg(p); } }, 30000);
  }
  function renderEpg(p) {
    const box = $('pinfo'); const now = Math.floor(Date.now() / 1000);
    const { now: cur2, next } = C.epgNowNext(p.epg || [], now);
    if (!cur2 && !next) { box.classList.add('hidden'); return; }
    box.innerHTML = '';
    if (cur2) {
      box.append(el('div', '', `AGORA  ${C.hhmm(cur2.start)}–${C.hhmm(cur2.stop)}  ${cur2.title}`));
      const bar = el('div', 'p'); const i = el('i'); i.style.width = Math.min(100, Math.max(0, ((now - cur2.start) / (cur2.stop - cur2.start)) * 100)) + '%'; bar.append(i); box.append(bar);
    }
    if (next) box.append(el('div', 'muted', `A SEGUIR  ${C.hhmm(next.start)}  ${next.title}`));
    box.classList.remove('hidden');
  }

  function saveResume() {
    if (!pl || pl.kind === 'live' || !V.duration || !isFinite(V.duration)) return;
    const t = V.currentTime;
    if (t > 5 && t < V.duration - 30) {
      S.resume[pl.rkey] = { t: Math.floor(t), d: Math.floor(V.duration), kind: pl.kind, item: cleanItem(pl.item), episode: pl.episode ? { id: pl.episode.id, episode_num: pl.episode.episode_num, title: pl.episode.title, container_extension: pl.episode.container_extension, direct_source: pl.episode.direct_source } : null, title: pl.title, season: (/T(\d+)E/.exec(pl.title) || [])[1], at: Date.now() };
    } else delete S.resume[pl.rkey];
    saveLocal('resume', S.resume).catch(() => {});
  }
  setInterval(() => { if (pl && !V.paused) saveResume(); }, 15000);

  function stopPlayback() {
    clearInterval(epgTimer);
    if (!pl) return;
    saveResume(); pl.stopped = true; cleanup(pl); resetVideo(); pl = null;
  }
  function closePlayer() {
    stopPlayback(); $('player').classList.add('hidden'); $('pmsg').textContent = ''; P.fullscreen(false);
    if (S.tab === 'home' || S.tab === 'history') selectTab(S.tab);
  }
  $('pback').onclick = closePlayer;
  $('pmpv').onclick = async () => {
    if (!pl) return; const { urls, title } = pl;
    const r = await P.mpvPlay(urls[urls.length - 1], title);
    if (r.ok) closePlayer(); else toast('Player avançado indisponível.');
  };
  function updatePlayerFav() { $('pfav').textContent = pl && favIndex(pl.kind, pl.item) >= 0 ? '★' : '☆'; }
  $('pfav').onclick = async () => { if (!pl) return; const on = await toggleFav(pl.kind, pl.item); updatePlayerFav(); toast(on ? 'Adicionado aos favoritos' : 'Removido dos favoritos'); };

  function zap(delta) {
    if (!pl || pl.kind !== 'live' || !pl.list || pl.idx < 0 || !pl.list.length) return;
    const n = (pl.idx + delta + pl.list.length) % pl.list.length; const it = pl.list[n];
    play('live', it, null, C.itemName(it), { list: pl.list });
  }
  function typeNumber(d) {
    if (!pl || pl.kind !== 'live' || !pl.list) return;
    numBuf = (numBuf + d).slice(0, 4); $('pnum').textContent = numBuf; $('pnum').classList.remove('hidden');
    clearTimeout(numTimer);
    numTimer = setTimeout(() => {
      const n = parseInt(numBuf, 10); numBuf = ''; $('pnum').classList.add('hidden');
      if (n >= 1 && n <= pl.list.length) { const it = pl.list[n - 1]; play('live', it, null, C.itemName(it), { list: pl.list }); } else toast('Canal inexistente nesta lista');
    }, 1500);
  }

  function bumpUi() {
    $('ptop').classList.remove('idle'); $('pinfo').classList.remove('idle'); clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { if (!V.paused) { $('ptop').classList.add('idle'); $('pinfo').classList.add('idle'); } }, 3500);
  }
  $('player').addEventListener('mousemove', bumpUi);
  V.addEventListener('dblclick', () => P.fullscreen(!document.fullscreenElement));
  V.addEventListener('click', () => { V.paused ? V.play() : V.pause(); });
  V.addEventListener('waiting', () => { if (pl) $('pmsg').textContent = 'Carregando…'; });
  V.addEventListener('playing', () => { if (pl) $('pmsg').textContent = ''; });

  // ---- Teclado e controle remoto ----
  document.addEventListener('keydown', (e) => {
    const inPlayer = !$('player').classList.contains('hidden');
    const modalOpen = !$('modal').classList.contains('hidden');
    const typing = /INPUT|SELECT/.test(document.activeElement.tagName);
    if (e.key === 'Escape' || (e.key === 'Backspace' && !typing) || e.key === 'XF86Back') {
      if (modalOpen) { e.preventDefault(); if ($('modal')._close) $('modal')._close(); else $('modal').classList.add('hidden'); return; }
      if (inPlayer) { e.preventDefault(); closePlayer(); return; }
      if (!$('detail').classList.contains('hidden')) { e.preventDefault(); closeDetail(); return; }
    }
    if (inPlayer && !modalOpen) {
      bumpUi(); const live = pl && pl.kind === 'live';
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); V.paused ? V.play() : V.pause(); }
      else if (e.key === 'ArrowRight' && !live) { e.preventDefault(); V.currentTime += 10; }
      else if (e.key === 'ArrowLeft' && !live) { e.preventDefault(); V.currentTime -= 10; }
      else if (e.key === 'ArrowUp') { e.preventDefault(); live ? zap(-1) : (V.volume = Math.min(1, V.volume + 0.1)); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); live ? zap(1) : (V.volume = Math.max(0, V.volume - 0.1)); }
      else if (e.key === 'PageUp' || e.key === 'ChannelUp') { e.preventDefault(); zap(-1); }
      else if (e.key === 'PageDown' || e.key === 'ChannelDown') { e.preventDefault(); zap(1); }
      else if (/^\d$/.test(e.key)) typeNumber(e.key);
      else if (e.key === 'm') V.muted = !V.muted;
      else if (e.key === 'f') P.fullscreen(!document.fullscreenElement);
      return;
    }
    if (modalOpen && !/^Arrow/.test(e.key)) return;
    if (!/^Arrow(Up|Down|Left|Right)$/.test(e.key)) return;
    const a = document.activeElement;
    if (a && a.tagName === 'INPUT' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
    const scope = modalOpen ? $('modal') : !$('detail').classList.contains('hidden') ? $('detail') : document;
    const els = [...scope.querySelectorAll('.focusable, #modalBody input, #modalBody button')].filter((x) => x.offsetParent !== null);
    if (!els.length) return;
    if (!a || !els.includes(a)) { e.preventDefault(); els[0].focus(); return; }
    const r = a.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let best = null, bd = Infinity;
    for (const x of els) {
      if (x === a) continue;
      const q = x.getBoundingClientRect(), dx = q.left + q.width / 2 - cx, dy = q.top + q.height / 2 - cy;
      const okDir = e.key === 'ArrowRight' ? dx > 4 && Math.abs(dy) < Math.abs(dx) * 1.5 + r.height
        : e.key === 'ArrowLeft' ? dx < -4 && Math.abs(dy) < Math.abs(dx) * 1.5 + r.height
        : e.key === 'ArrowDown' ? dy > 4 && Math.abs(dx) < Math.abs(dy) * 1.5 + r.width
        : dy < -4 && Math.abs(dx) < Math.abs(dy) * 1.5 + r.width;
      if (!okDir) continue;
      const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = x; }
    }
    if (best) { e.preventDefault(); best.focus(); best.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  });

  // ---- Início ----
  $('loginForm').addEventListener('submit', (e) => { e.preventDefault(); doLogin($('host').value, $('user').value, $('pass').value, $('remember').checked); });
  (async () => {
    await loadProfiles();
    const last = await P.storeGet('lastProfile');
    const prof = S.profiles.find((p) => p.id === last);
    if (prof) { renderPicker(); doLogin(prof.host, prof.user, prof.pass, true); } else showLogin();
  })();
})();
