'use strict';
(function () {
  const C = window.VelaCore;
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const APP_VERSION = '0.4.0';

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
  };

  const S = {
    profiles: [], session: null, pkey: '', tab: 'home', cats: {}, all: {}, catId: '__all__', items: [], view: [], shown: 0,
    query: '', sort: '', favs: [], history: [], resume: {}, settings: { hideAdult: false, pin: '' }, loadSeq: 0,
    posterCache: {}, detailCache: {}, detailPending: {}, posterPending: {}, posterChecked: {}, posterRetryAt: {},
  };
  const PAGE = 120;
  const LABEL = { live: 'canais', movie: 'filmes', series: 'séries', favs: 'favoritos', history: 'itens', search: 'resultados' };

  const ICON = { live: 'tv', movie: 'film', series: 'clapperboard' };
  const ICON_PATHS = {
    home:'<path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/>',
    tv:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m8 2 4 3 4-3"/>',
    film:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4"/>',
    clapperboard:'<path d="m3 7 18-4-2-2-18 4z"/><path d="M3 7h18v14H3z"/><path d="m7 6 3-4M13 5l3-4M7 12h10M7 16h6"/>',
    search:'<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
    star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>',
    starFilled:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" fill="currentColor"/>',
    history:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/><path d="M3 5v4h4"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19 13.5a7 7 0 0 0 0-3l2-1.5-2-3.5-2.3.8a7 7 0 0 0-2.5-1.4L14 2h-4l-.4 2.9A7 7 0 0 0 7 6.3l-2.3-.8-2 3.5 2 1.5a7 7 0 0 0 0 3l-2 1.5 2 3.5 2.3-.8a7 7 0 0 0 2.5 1.4L10 22h4l.4-2.9a7 7 0 0 0 2.5-1.4l2.3.8 2-3.5z"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    close:'<path d="m18 6-12 12M6 6l12 12"/>',
    arrowRight:'<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowUpRight:'<path d="M7 17 17 7M7 7h10v10"/>',
    back:'<path d="m15 18-6-6 6-6"/><path d="M9 12h12"/>',
    play:'<path d="m8 5 12 7-12 7z" fill="currentColor" stroke="none"/>',
    pause:'<path d="M8 5h3v14H8zM15 5h3v14h-3z" fill="currentColor" stroke="none"/>',
    skipBack:'<path d="M5 5v14M19 6l-10 6 10 6z"/>',
    skipForward:'<path d="M19 5v14M5 6l10 6-10 6z"/>',
    volume:'<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15 9a5 5 0 0 1 0 6M18 6a9 9 0 0 1 0 12"/>',
    volumeMute:'<path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 5 6m0-6-5 6"/>',
    fullscreen:'<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>',
    sailboat:'<path d="M12 3v14M12 4l7 10h-7M10 9 5 16h5M3 19c2 2 4 2 6 0 2 2 4 2 6 0 2 2 4 2 6 0"/>',
    radio:'<circle cx="12" cy="12" r="2"/><path d="M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14M2 2a14 14 0 0 0 0 20M22 2a14 14 0 0 1 0 20"/>',
    quality:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'
  };
  function svgIcon(name,size=20){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width',String(size));svg.setAttribute('height',String(size));
    svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.8');
    svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');
    svg.innerHTML=ICON_PATHS[name]||ICON_PATHS.play;return svg;
  }
  function setIconLabel(button,iconName,label){
    const children=[svgIcon(iconName,18)];if(label)children.push(document.createTextNode(' '+label));button.replaceChildren(...children);
  }
  function hydrateIcons(root=document){
    root.querySelectorAll('[data-icon]').forEach(node=>{if(node.dataset.iconReady==='1')return;node.replaceChildren(svgIcon(node.dataset.icon,Number(node.dataset.iconSize)||19));node.dataset.iconReady='1';});
  }
  hydrateIcons();
  const posterQueue=[];let posterQueueActive=0;const POSTER_QUEUE_LIMIT=4;
  const posterKey=(kind,item)=>kind+':'+C.itemId(item);
  function posterCandidates(item,kind){
    const cached=S.posterCache[posterKey(kind,item)];
    const preferred=cached&&cached.poster_url?C.itemPosters({poster_url:cached.poster_url},S.session&&S.session.host):[];
    return [...new Set([...preferred,...C.itemPosters(item,S.session&&S.session.host)])];
  }
  function fetchDetails(kind,item){
    const id=C.itemId(item);if(!id||!S.session)return Promise.reject(new Error('Conteúdo sem identificador.'));
    const key=posterKey(kind,item);if(S.detailCache[key])return Promise.resolve(S.detailCache[key]);if(S.detailPending[key])return S.detailPending[key];
    const profileAtStart=S.pkey;const action=kind==='movie'?'get_vod_info':'get_series_info';const params=kind==='movie'?{vod_id:id}:{series_id:id};
    const request=call(action,params).then(data=>{if(S.pkey===profileAtStart)S.detailCache[key]=data;return data;}).finally(()=>{if(S.detailPending[key]===request)delete S.detailPending[key];});
    S.detailPending[key]=request;return request;
  }
  function extractDetailPosterUrls(kind,item,data){
    const info=data&&data.info&&typeof data.info==='object'?data.info:{};
    const content=kind==='movie'&&data&&data.movie_data&&typeof data.movie_data==='object'?data.movie_data:{};
    return C.itemPosters({...item,...content,...info},S.session&&S.session.host);
  }
  function persistPoster(kind,item,url){
    if(!url||!C.isHttpUrl(url))return;
    const key=posterKey(kind,item);S.posterCache[key]={poster_url:url};item.poster_url=url;
    document.querySelectorAll('.card[data-poster-key]').forEach(card=>{if(card.dataset.posterKey===key&&typeof card._setPosterUrls==='function')card._setPosterUrls([url]);});
    saveLocal('posterCache',S.posterCache).catch(()=>{});
  }
  function requestPosterMetadata(kind,item,excludeUrls,callback){
    if(!S.session||(kind!=='movie'&&kind!=='series'))return;
    const key=posterKey(kind,item);if(S.posterChecked[key])return;
    const retryAt=S.posterRetryAt[key]||0;if(retryAt>Date.now()){callback([]);return;}if(retryAt)delete S.posterRetryAt[key];
    const jobKey=S.pkey+'|'+key;let job=S.posterPending[jobKey];const cb={callback,exclude:new Set(excludeUrls||[])};
    if(job){job.callbacks.push(cb);return;}
    job={key,jobKey,kind,item,profile:S.pkey,callbacks:[cb]};S.posterPending[jobKey]=job;posterQueue.push(job);pumpPosterQueue();
  }
  function pumpPosterQueue(){
    while(posterQueueActive<POSTER_QUEUE_LIMIT&&posterQueue.length){
      const job=posterQueue.shift();posterQueueActive++;
      (async()=>{
        let data=null,failed=false;
        try{if(job.profile!==S.pkey)return;data=await fetchDetails(job.kind,job.item);if(job.profile!==S.pkey)return;}catch{failed=true;}
        try{
          if(job.profile!==S.pkey)return;
          const allUrls=data?extractDetailPosterUrls(job.kind,job.item,data):[];
          for(const c of job.callbacks){const urls=allUrls.filter(url=>!c.exclude.has(url));c.callback(urls);}
          if(failed)S.posterRetryAt[job.key]=Date.now()+90000;else{delete S.posterRetryAt[job.key];S.posterChecked[job.key]=true;}
        }finally{delete S.posterPending[job.jobKey];}
      })().catch(()=>{}).finally(()=>{posterQueueActive--;pumpPosterQueue();});
    }
  }
  const posterObserver=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
    for(const entry of entries){if(!entry.isIntersecting)continue;posterObserver.unobserve(entry.target);if(typeof entry.target._requestPosterMetadata==='function')entry.target._requestPosterMetadata();}
  },{root:$('gridWrap'),rootMargin:'220px 0px',threshold:0.01}):null;


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
      S.cats = {}; S.all = {};
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
    S.posterCache = await per('posterCache', {});
    S.detailCache = {}; S.detailPending = {}; S.posterPending = {}; S.posterChecked = {}; S.posterRetryAt = {};
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
    const kind=kindOf(item),b=el('button','card focusable '+(kind==='live'?'live':''));
    const key=posterKey(kind,item);b.dataset.posterKey=key;
    const art=el('div','img'),fallback=el('span','poster-fallback');fallback.appendChild(svgIcon(ICON[kind]||'play',38));
    const posterImg=el('img','poster-image');posterImg.alt='';posterImg.loading='lazy';posterImg.decoding='async';posterImg.referrerPolicy='no-referrer';posterImg.draggable=false;posterImg.hidden=true;
    art.append(fallback,posterImg);
    let posterUrls=posterCandidates(item,kind),posterIndex=0,enrichmentRequested=false;const attempted=new Set();
    const loadNextPoster=()=>{
      while(posterIndex<posterUrls.length&&attempted.has(posterUrls[posterIndex]))posterIndex++;
      if(posterIndex>=posterUrls.length){
        posterImg.hidden=true;posterImg.classList.remove('is-loaded');fallback.classList.remove('hidden');
        if(!enrichmentRequested&&kind!=='live'&&!S.posterChecked[key]){
          enrichmentRequested=true;requestPosterMetadata(kind,item,[...attempted],urls=>{if(!urls||!urls.length)return;posterUrls=urls;posterIndex=0;loadNextPoster();});
        }return;
      }
      const src=posterUrls[posterIndex++];attempted.add(src);posterImg.hidden=false;posterImg.classList.remove('is-loaded');posterImg.src=src;
    };
    b._setPosterUrls=urls=>{if(posterImg.classList.contains('is-loaded')&&posterImg.naturalWidth&&posterImg.naturalHeight&&posterImg.naturalWidth/posterImg.naturalHeight<=0.95)return;const usable=(urls||[]).filter(url=>!attempted.has(url));if(!usable.length)return;posterUrls=[...new Set([...usable,...posterUrls])];posterIndex=0;loadNextPoster();};
    b._requestPosterMetadata=()=>{
      if(kind==='live'||posterUrls.length||enrichmentRequested||S.posterChecked[key])return;
      enrichmentRequested=true;requestPosterMetadata(kind,item,[...attempted],urls=>{if(!urls||!urls.length)return;posterUrls=urls;posterIndex=0;loadNextPoster();});
    };
    posterImg.onload=()=>{const w=posterImg.naturalWidth,h=posterImg.naturalHeight,landscape=w&&h&&w/h>0.95;if(landscape&&posterIndex<posterUrls.length){posterImg.hidden=true;posterImg.classList.remove('is-loaded','poster-landscape');fallback.classList.remove('hidden');loadNextPoster();return;}if(landscape&&!enrichmentRequested&&kind!=='live'&&!S.posterChecked[key]){enrichmentRequested=true;posterImg.hidden=true;posterImg.classList.remove('is-loaded','poster-landscape');fallback.classList.remove('hidden');requestPosterMetadata(kind,item,[...attempted],urls=>{const extras=(urls||[]).filter(url=>!attempted.has(url));if(extras.length){posterUrls=[...new Set([...extras,...posterUrls])];posterIndex=0;loadNextPoster();}else{posterImg.hidden=false;posterImg.classList.add('poster-landscape','is-loaded');fallback.classList.add('hidden');}});return;}posterImg.classList.toggle('poster-landscape',!!landscape);posterImg.classList.add('is-loaded');fallback.classList.add('hidden');if(!landscape)persistPoster(kind,item,posterImg.currentSrc||posterImg.src);};
    posterImg.onerror=()=>{posterImg.hidden=true;posterImg.classList.remove('is-loaded');fallback.classList.remove('hidden');loadNextPoster();};
    if(posterUrls.length)loadNextPoster();else if(kind!=='live'){if(posterObserver)posterObserver.observe(b);else b._requestPosterMetadata();}
    b.append(art,el('div','t',resumeEntry&&resumeEntry.title?resumeEntry.title:C.itemName(item)));
    const rating=Number(item.rating);if(kind!=='live'&&rating>0)art.appendChild(el('span','badge','★ '+rating.toFixed(1)));
    const r=resumeEntry||S.resume[C.resumeKey(kind,item)];if(r&&r.d){const bar=el('div','bar'),i=el('i');i.style.width=Math.min(100,(r.t/r.d)*100)+'%';bar.appendChild(i);art.appendChild(bar);}
    if(kind==='live'&&S.tab==='search')b.append(el('div','sub2','Canal'));
    b.onclick=()=>{if(resumeEntry)return play(resumeEntry.kind,resumeEntry.item,resumeEntry.episode||null,resumeEntry.title);openItem(kind,item,idx);};
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

  // ---- Início em trilhos, com destaque cinematográfico ----
  function renderHome() {
    const home = $('home');
    home.innerHTML = '';

    const cont = Object.values(S.resume).filter((r) => r && r.item && r.d && !hidden(r.kind, r.item)).sort((a, b) => b.at - a.at).slice(0, 20);
    const recentLive = S.history.filter((h) => h.kind === 'live' && !hidden('live', h.item)).slice(0, 15);
    const recentVod = S.history.filter((h) => h.kind !== 'live' && !hidden(h.kind, h.item)).slice(0, 20);
    const favorites = S.favs.filter((f) => !hidden(f.kind, f.item)).slice(0, 20);
    const featuredResume = cont[0] || null;
    const featuredHistory = recentVod[0] || null;
    const featuredFavorite = favorites[0] || null;
    const featured = featuredResume || featuredHistory || featuredFavorite;

    const hero = el('section', 'home-hero ' + (featured ? 'home-hero-featured' : 'home-hero-welcome'));
    const artwork = el('img', 'home-hero-backdrop');
    artwork.alt = ''; artwork.draggable = false; artwork.decoding = 'async';
    const wash = el('div', 'home-hero-wash');
    const copy = el('div', 'home-hero-copy');
    copy.append(el('p', 'home-kicker', featured ? 'EM DESTAQUE PARA VOCÊ' : 'BEM-VINDO AO VELA'));
    copy.append(el('h2', 'home-title', featured ? C.itemName(featured.item) : 'Sua próxima história começa aqui'));
    const metaBits = featured ? [featured.kind === 'series' ? 'Série' : featured.kind === 'movie' ? 'Filme' : 'Ao vivo',
      featured.item && (featured.item.releaseDate || featured.item.releasedate || featured.item.release_date),
      featured.item && featured.item.rating ? '★ ' + featured.item.rating : ''].filter(Boolean) : ['Filmes', 'Séries', 'TV ao vivo'];
    copy.append(el('div', 'home-hero-meta', metaBits.join('  •  ')));
    const synopsis = featured ? (featured.item.plot || featured.item.overview || 'Retome de onde parou ou abra os detalhes para conhecer este conteúdo.') :
      'Explore seu catálogo, descubra séries e filmes e continue assistindo de onde parou.';
    const sub = el('p', 'home-subtitle', synopsis); copy.append(sub);
    const actions = el('div', 'home-hero-actions');
    const primary = el('button', 'home-hero-play focusable');
    primary.append(svgIcon('play', 19), document.createTextNode(featuredResume ? 'Continuar assistindo' : featured ? 'Ver detalhes' : 'Explorar filmes'));
    primary.onclick = () => {
      if (!featured) return selectTab('movie');
      if (featuredResume) {
        if (featured.kind === 'live') return play('live', featured.item, null, featured.title);
        return play(featured.kind, featured.item, featured.episode || null, featured.title);
      }
      openItem(featured.kind, featured.item, 0);
    };
    actions.append(primary);
    const secondary = el('button', 'home-hero-more focusable');
    secondary.append(svgIcon(featured ? 'info' : 'tv', 18), document.createTextNode(featured ? 'Mais informações' : 'TV ao vivo'));
    secondary.onclick = () => featured ? openItem(featured.kind, featured.item, 0) : selectTab('live');
    actions.append(secondary);
    copy.append(actions);
    hero.append(artwork, wash, copy);

    if (featured) {
      const candidates = [];
      const backdrop = featured.item && (featured.item.backdrop_path || featured.item.backdrop || featured.item.fanart || featured.item.movie_image);
      if (backdrop) { const url = C.itemPoster({ movie_image: backdrop }, S.session && S.session.host); if (url) candidates.push(url); }
      candidates.push(...posterCandidates(featured.item, featured.kind));
      const unique = [...new Set(candidates)].filter(C.isHttpUrl);
      if (unique.length) {
        let index = 0;
        artwork.onerror = () => { if (index < unique.length) artwork.src = unique[index++]; else artwork.classList.add('artwork-unavailable'); };
        artwork.onload = () => artwork.classList.add('is-ready');
        artwork.src = unique[index++];
      }
      if (!featured.item.plot && featured.kind !== 'live') {
        fetchDetails(featured.kind, featured.item).then((data) => {
          if (!hero.isConnected) return;
          const info = data && data.info || {};
          const plot = info.plot || info.description;
          if (plot) sub.textContent = plot;
          const d = info.backdrop_path || info.backdrop || info.movie_image;
          const url = d && C.itemPoster({movie_image:d}, S.session && S.session.host);
          if (url && !artwork.classList.contains('is-ready')) artwork.src = url;
        }).catch(()=>{});
      }
    }
    home.appendChild(hero);

    const shortcuts = el('div', 'home-shortcuts');
    for (const item of [
      {tab:'movie', icon:'film', label:'Filmes'},
      {tab:'series', icon:'clapperboard', label:'Séries'},
      {tab:'live', icon:'tv', label:'TV ao vivo'},
      {tab:'favs', icon:'star', label:'Minha lista'}
    ]) {
      const b = el('button', 'home-shortcut focusable');
      b.append(svgIcon(item.icon,18), el('span','',item.label), svgIcon('arrowRight',15));
      b.onclick = () => selectTab(item.tab);
      shortcuts.appendChild(b);
    }
    home.appendChild(shortcuts);

    const section = (title, nodes, extraClass='') => {
      if (!nodes.length) return;
      const sec = el('section', 'sec ' + extraClass);
      const heading = el('div','sec-heading');
      heading.append(el('h3','',title));
      const hint = el('span','sec-hint','Explorar'); hint.appendChild(svgIcon('arrowRight',14));
      heading.appendChild(hint); sec.appendChild(heading);
      const row = el('div', 'hrow');
      nodes.forEach((n) => row.appendChild(n));
      sec.appendChild(row); home.appendChild(sec);
    };
    if (cont.length) section('Continue assistindo', cont.map((r) => makeCard({ ...r.item, _kind: r.kind }, 0, r)), 'rail-resume');
    if (recentVod.length) section('Continue descobrindo', recentVod.map((h) => makeCard({ ...h.item, _kind: h.kind }, 0)), 'rail-recent');
    if (favorites.length) section('Minha lista', favorites.map((f) => makeCard({ ...f.item, _kind: f.kind }, 0)), 'rail-favorites');
    if (recentLive.length) section('Seus canais recentes', recentLive.map((h) => makeCard({ ...h.item, _kind: 'live' }, 0)), 'rail-live');
    if (!cont.length && !recentLive.length && !recentVod.length && !favorites.length) {
      const empty = el('div','home-empty-note');
      empty.append(svgIcon('sailboat',24), el('p','','Sua biblioteca vai ganhar vida conforme você explora.'));
      empty.append(el('span','','Abra Filmes, Séries ou TV ao vivo para começar.'));
      home.appendChild(empty);
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
    const keep = ['stream_id', 'series_id', 'id', 'name', 'title', 'stream_icon', 'cover', 'cover_big', 'cover_url', 'movie_image', 'movie_cover', 'poster', 'poster_url', 'backdrop_path', 'backdrop', 'image', 'image_url', 'thumbnail', 'category_id', 'container_extension', 'direct_source', 'rating', 'plot', 'genre', 'releaseDate', 'added'];
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
    const kind = cur && cur.kind ? cur.kind : S.tab;
    const itemKey = posterKey(kind, item);
    const ratio = img.naturalHeight ? img.naturalWidth / img.naturalHeight : 0;
    if (img.dataset.posterItemKey === itemKey && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0 && ratio <= 0.95) return;
    const token = (Number(img.dataset.posterToken) || 0) + 1;
    img.dataset.posterToken = String(token);
    img.dataset.posterItemKey = itemKey;
    img.classList.remove('poster-missing', 'poster-landscape');
    const urls = posterCandidates(item, kind);
    let index = 0;
    img.onload = () => {
      if (img.dataset.posterToken !== String(token)) return;
      const w = img.naturalWidth, h = img.naturalHeight, landscape = w && h && w / h > 0.95;
      if (landscape && index < urls.length) { img.src = urls[index++]; return; }
      img.classList.toggle('poster-landscape', !!landscape);
      img.classList.remove('poster-missing');
      if (!landscape && cur && cur.kind === kind) persistPoster(kind, cur.item, img.currentSrc || img.src);
    };
    img.onerror = () => {
      if (img.dataset.posterToken !== String(token)) return;
      if (index < urls.length) img.src = urls[index++];
      else { img.removeAttribute('src'); img.classList.add('poster-missing'); }
    };
    if (!urls.length) { img.removeAttribute('src'); img.classList.add('poster-missing'); return; }
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
        const d = await fetchDetails('movie', item);
        if (cur !== mine) return;
        const i = d.info || {};
        $('dmeta').textContent = meta({ ...item, ...i, rating: i.rating || item.rating });
        $('dplot').textContent = i.plot || i.description || item.plot || '';
        $('dcast').textContent = [i.director && 'Direção: ' + i.director, i.cast && 'Elenco: ' + i.cast].filter(Boolean).join(' · ');
        setDetailPoster({ ...item, ...i, movie_image: i.movie_image || item.movie_image });
        mine.movieExt = d.movie_data && d.movie_data.container_extension;
      } else {
        const info = await fetchDetails('series', item);
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
      b.onclick = () => { const it = cur.movieExt ? { ...cur.item, container_extension: cur.movieExt } : cur.item; const t = C.itemName(cur.item); $('detail').classList.add('hidden'); play('movie', it, null, t, { returnToDetail:true }); };
    } else {
      const r = lastSeriesResume(cur.item);
      if (!r) { b.classList.add('hidden'); return; }
      b.textContent = `▶ Continuar ${r.title.split('—').pop().trim()} (${C.fmtTime(r.t)})`;
      b.onclick = () => { const x = r; $('detail').classList.add('hidden'); play('series', x.item, x.episode, x.title, { returnToDetail:true, returnSeason:Number(x.season)||cur.selectedSeason, returnEpisodeId:C.itemId(x.episode) }); };
    }
  }

  function showSeason(s, focusEpisodeId = '') {
    if (!cur || !s) return;
    cur.selectedSeason = Number(s.season);
    document.querySelectorAll('#seasons button').forEach((b) => b.classList.toggle('on', Number(b.dataset.s) === s.season));
    const box = $('episodes'); box.innerHTML = ''; const item = cur.item;
    s.episodes.forEach((ep, index) => {
      const episodeId = C.itemId(ep);
      const resume = S.resume[C.resumeKey('series', item, ep)];
      const b = el('button', 'episode-card focusable' + (episodeId && episodeId === focusEpisodeId ? ' episode-current' : ''));
      b.dataset.episodeId = episodeId; b.type = 'button';
      const thumb = el('div','episode-thumb');
      const poster = C.itemPoster({movie_image: ep.info && (ep.info.movie_image || ep.info.cover), movie_cover: ep.movie_image || ep.cover || ep.stream_icon}, S.session && S.session.host);
      if (poster) { const image = el('img'); image.alt=''; image.loading='lazy'; image.decoding='async'; image.referrerPolicy='no-referrer'; image.src=poster; image.onerror=()=>image.remove(); thumb.appendChild(image); }
      thumb.append(el('span','episode-index',String(ep.episode_num || index + 1).padStart(2,'0')));
      thumb.appendChild(svgIcon('play',23));
      const content = el('div','episode-copy');
      content.append(el('strong','episode-title',ep.title || ('Episódio ' + (ep.episode_num || index + 1))));
      content.append(el('span','episode-meta','Episódio ' + (ep.episode_num || index + 1) + (ep.info && ep.info.duration ? ' · ' + ep.info.duration : '')));
      const desc = (ep.info && (ep.info.plot || ep.info.description)) || ep.plot || '';
      content.append(el('span','episode-description',desc || (resume ? 'Continue do ponto em que você parou.' : 'Selecione para assistir este episódio.')));
      if (resume && resume.d) { const progress = el('div','episode-progress'); const fill = el('i'); fill.style.width=Math.min(100,Math.max(0,resume.t/resume.d*100))+'%'; progress.appendChild(fill); content.append(progress); }
      b.append(thumb,content);
      b.onclick = () => {
        cur.selectedSeason = Number(s.season); cur.selectedEpisodeId = episodeId;
        $('detail').classList.add('hidden');
        play('series', item, ep, `${C.itemName(item)} — T${s.season}E${ep.episode_num}`, { returnToDetail:true, returnSeason:Number(s.season), returnEpisodeId:episodeId });
      };
      box.appendChild(b);
    });
  }
  function updateFavBtn(){const on=!!(cur&&favIndex(cur.kind,cur.item)>=0);setIconLabel($('dfav'),on?'starFilled':'star',on?'Nos favoritos':'Favoritar');}
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
    const videoDiagnostics=el('div','video-diagnostics hidden');
    act('Diagnóstico de vídeo', () => {
      if(!videoDiagnostics.childElementCount){
        const features=window.mpegts&&typeof window.mpegts.getFeatureList==='function'?window.mpegts.getFeatureList():{};
        const browser=/Chrome|Chromium/.test(navigator.userAgent)?'Chromium integrado':'navegador não identificado';
        const checks=[
          ['MP4 · H.264/AAC',V.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"')],
          ['MP4 · HEVC/H.265',V.canPlayType('video/mp4; codecs="hvc1.1.6.L93.B0"')],
          ['MP4 · AV1',V.canPlayType('video/mp4; codecs="av01.0.08M.08"')],
          ['WebM · VP9',V.canPlayType('video/webm; codecs="vp09.00.10.08"')],
          ['MPEG-TS ao vivo',features.mseLivePlayback?'Disponível':'Não disponível'],
          ['HEVC em MPEG-TS',features.mseH265Playback?'Disponível':'Não disponível'],
        ];
        videoDiagnostics.append(el('p','muted','Motor de vídeo: '+browser));
        videoDiagnostics.append(el('p','muted','A compatibilidade reportada não garante a reprodução de todos os arquivos.'));
        for(const [name,value] of checks)videoDiagnostics.append(el('p','diagnostic-row',name+': '+(value||'Não reportado')));
      }
      videoDiagnostics.classList.toggle('hidden');
    });
    b.append(videoDiagnostics);
    b.append(el('p', 'muted', `Vela Player ${APP_VERSION} · HLS.js, dash.js e mpegts.js. O Vela Player não fornece canais nem conteúdo.`));
    const row = el('div', 'row'); const close = el('button', 'primary focusable', 'Fechar'); close.onclick = () => { done(null); if (S.tab === 'home') renderHome(); else if (S.tab === 'live' || S.tab === 'movie' || S.tab === 'series') selectTab(S.tab); }; row.append(close); b.append(row);
  });

  // ---- Reprodutor embutido ----
  const V=$('video');V.controls=false;V.preload='auto';V.playsInline=true;let pl=null,hideTimer=null,epgTimer=null,numBuf='',numTimer=null,seekDragging=false,playerFullscreen=false;
  function togglePlayerFullscreen(force){playerFullscreen=typeof force==='boolean'?force:!playerFullscreen;P.fullscreen(playerFullscreen);}
  function refreshTimeline(){
    const live=!!(pl&&pl.kind==='live');$('seekArea').classList.toggle('hidden',live);$('liveLabel').classList.toggle('hidden',!live);$('skipBack').classList.toggle('hidden',live);$('skipForward').classList.toggle('hidden',live);
    const duration=Number(V.duration),valid=Number.isFinite(duration)&&duration>0,actual=Number(V.currentTime)||0,shown=seekDragging&&valid?(Number($('seek').value)/1000)*duration:actual;
    if(valid&&!live){$('seek').disabled=false;if(!seekDragging)$('seek').value=String(Math.round(actual/duration*1000));$('elapsedTime').textContent=C.fmtTime(shown);$('durationTime').textContent=C.fmtTime(duration);$('seek').style.setProperty('--played',Math.min(100,Math.max(0,shown/duration*100))+'%');let bufferedEnd=actual;try{for(let i=0;i<V.buffered.length;i++){if(V.buffered.start(i)<=actual&&V.buffered.end(i)>=actual){bufferedEnd=V.buffered.end(i);break;}if(V.buffered.end(i)>bufferedEnd)bufferedEnd=V.buffered.end(i);}}catch{}$('seek').style.setProperty('--buffered',Math.min(100,Math.max(0,bufferedEnd/duration*100))+'%');}
    else{$('seek').disabled=true;$('seek').style.setProperty('--played','0%');$('seek').style.setProperty('--buffered','100%');$('elapsedTime').textContent=live?'AO VIVO':C.fmtTime(actual);$('durationTime').textContent=live?'':'--:--';}
  }
  function updatePlayPauseIcon(){const paused=V.paused;setIconLabel($('playPause'),paused?'play':'pause','');$('playPause').setAttribute('aria-label',paused?'Reproduzir':'Pausar');$('playPause').title=paused?'Reproduzir (espaço)':'Pausar (espaço)';}
  function updateVolumeUI(){const volume=V.muted?0:V.volume;$('volume').value=String(volume);$('volume').style.setProperty('--volume-level',Math.round(volume*100)+'%');$('volume').previousElementSibling.replaceChildren(svgIcon(volume<=0?'volumeMute':'volume',19));}
  function updatePlayerUI(){refreshTimeline();updatePlayPauseIcon();updateVolumeUI();}
  function populateQualityOptions(p){
    const wrap=$('qualityWrap'),select=$('quality');
    let source=[];
    if(p&&p.hls)source=p.hls.levels||[];
    else if(p&&p.dash&&typeof p.dash.getRepresentationsByType==='function'){try{source=p.dash.getRepresentationsByType('video').map(r=>({height:r.height,width:r.width,bitrate:r.bandwidth}));}catch{source=[];}}
    const choices=C.qualityChoices(source);
    select.replaceChildren(new Option('Automática','-1'));
    for(const item of choices)select.appendChild(new Option(item.label,String(item.index)));
    wrap.classList.toggle('hidden',choices.length<2);select.value='-1';
  }
  $('quality').addEventListener('change',()=>{
    if(!pl)return;const value=Number($('quality').value);
    if(pl.hls)pl.hls.currentLevel=value;
    if(pl.dash){pl.dash.updateSettings({streaming:{abr:{autoSwitchBitrate:{video:value<0}}}});if(value>=0)pl.dash.setRepresentationForTypeByIndex('video',value,true);}
    bumpUi();
  });
  $('seek').addEventListener('input',()=>{seekDragging=true;refreshTimeline();bumpUi();});
  $('seek').addEventListener('change',()=>{if(pl&&pl.kind!=='live'&&Number.isFinite(V.duration)&&V.duration>0)V.currentTime=(Number($('seek').value)/1000)*V.duration;seekDragging=false;refreshTimeline();bumpUi();});
  $('playPause').addEventListener('click',()=>{if(V.paused)V.play().catch(()=>{});else V.pause();bumpUi();});
  $('skipBack').addEventListener('click',()=>{if(pl&&pl.kind!=='live'&&Number.isFinite(V.duration))V.currentTime=Math.max(0,V.currentTime-10);bumpUi();});
  $('skipForward').addEventListener('click',()=>{if(pl&&pl.kind!=='live'&&Number.isFinite(V.duration))V.currentTime=Math.min(V.duration,V.currentTime+10);bumpUi();});
  $('volume').addEventListener('input',()=>{V.volume=Number($('volume').value);V.muted=V.volume===0;updateVolumeUI();bumpUi();});
  $('pFullscreen').addEventListener('click',()=>togglePlayerFullscreen());
  for(const event of ['timeupdate','durationchange','loadedmetadata','progress','seeked'])V.addEventListener(event,refreshTimeline);
  V.addEventListener('play',updatePlayPauseIcon);V.addEventListener('pause',updatePlayPauseIcon);V.addEventListener('volumechange',updateVolumeUI);updatePlayerUI();

  function cleanup(p) {
    if (!p) return;
    try { p.hls && p.hls.destroy(); } catch {}
    try { if (p.ts) { p.ts.pause(); p.ts.unload(); p.ts.detachMediaElement(); p.ts.destroy(); } } catch {}
    try { p.dash && p.dash.reset(); } catch {}
    p.hls = p.ts = p.dash = null;
  }
  function resetVideo() { try { V.pause(); V.removeAttribute('src'); V.load(); } catch {} }

  function modeFor(kind, url) { return C.mediaMode(kind, url); }

  function playbackErrorMessage(code) {
    const reason={nohls:'Este sistema não conseguiu reproduzir HLS.',nompegts:'O navegador não oferece suporte ao motor MPEG-TS para este fluxo.',nodash:'O motor MPEG-DASH não está disponível.',codec:'O fluxo usa um codec que este sistema não consegue decodificar.',network:'Falha de rede ao carregar o vídeo.',timeout:'O servidor demorou demais para iniciar a reprodução.',hls:'O manifesto HLS falhou ou contém um formato incompatível.',dash:'O manifesto DASH falhou ou contém um formato incompatível.',ts:'O fluxo MPEG-TS/FLV não pôde ser interpretado.',video:'O navegador não conseguiu decodificar este arquivo.'};
    return 'Não foi possível reproduzir este conteúdo. '+(reason[code]||'A reprodução foi interrompida ou não pôde iniciar.')+' Confira a conexão, o acesso à conta ou a compatibilidade do codec.';
  }

  // Tenta tocar uma URL; resolve quando começa a tocar, rejeita em erro ou após 20 s.
  function attempt(p, mode, url, startAt) {
    return new Promise((resolve, reject) => {
      let done = false;
      const fail = (m) => { p.lastPlaybackError=m; if (!done) { done = true; clearTimeout(timer); V.removeEventListener('playing', ok); V.removeEventListener('error', onErr); reject(new Error(m)); } else if (!p.stopped) { if (p.kind === 'live') runtimeError(p); else { $('pmsg').textContent = playbackErrorMessage(m); $('ptop').classList.remove('idle'); $('playerControls').classList.remove('idle'); } } };
      const ok = () => { if (!done) { done = true; clearTimeout(timer); V.removeEventListener('error', onErr); resolve(); } };
      const onErr = () => fail('video');
      const timer = setTimeout(() => fail('timeout'), 20000);
      V.addEventListener('playing', ok, { once: true });
      V.addEventListener('error', onErr, { once: true });
      try {
        if (mode === 'hls') {
          if (!window.Hls || !window.Hls.isSupported()) {
            if (V.canPlayType('application/vnd.apple.mpegurl')) V.src=url;
            else return fail('nohls');
          } else {
            p.hls = new window.Hls({ maxBufferLength: 30, maxMaxBufferLength: 60, backBufferLength: 90, capLevelToPlayerSize: false, startLevel: -1, enableWorker: true, enableWorkerForMSE: true });
            p.hls.on(window.Hls.Events.MANIFEST_PARSED,()=>{if(p===pl&&!p.stopped)populateQualityOptions(p);});
            p.hls.on(window.Hls.Events.ERROR, (_e, d) => { if (d && d.fatal) { const m=d.type===window.Hls.ErrorTypes.MEDIA_ERROR?'codec':d.type===window.Hls.ErrorTypes.NETWORK_ERROR?'network':'hls'; fail(m); } });
            p.hls.loadSource(url); p.hls.attachMedia(V);
          }
        } else if (mode === 'ts' || mode === 'flv') {
          if (!window.mpegts || !window.mpegts.isSupported()) return fail('nompegts');
          const features=window.mpegts.getFeatureList();
          if(kind==='live'&&!features.mseLivePlayback) return fail('nompegts');
          p.ts = window.mpegts.createPlayer({ type: mode==='flv'?'flv':'mpegts', isLive: kind==='live', url }, { enableWorker: true, enableWorkerForMSE: true, enableStashBuffer: kind==='live', stashInitialSize: 384*1024, liveBufferLatencyChasing: kind==='live' });
          p.ts.on(window.mpegts.Events.ERROR, (type, detail) => { const m=detail==='MediaCodecUnsupported'?'codec':/NETWORK/i.test(String(type))?'network':'ts'; fail(m); });
          p.ts.attachMediaElement(V); p.ts.load();
        } else if (mode === 'dash') {
          if(!window.dashjs||!window.dashjs.MediaPlayer)return fail('nodash');
          p.dash=window.dashjs.MediaPlayer().create();
          p.dash.on(window.dashjs.MediaPlayer.events.STREAM_INITIALIZED,()=>{if(p===pl&&!p.stopped)populateQualityOptions(p);});
          p.dash.on(window.dashjs.MediaPlayer.events.ERROR,()=>{if(!p.stopped)fail('dash');});
          p.dash.initialize(V,url,false);
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
  V.addEventListener('error', () => {
    if (!pl || !pl.started || pl.stopped) return;
    if (pl.kind === 'live') { runtimeError(pl); return; }
    const code = V.error && V.error.code;
    const reason = code === 2 ? 'network' : code === 3 ? 'codec' : 'video';
    pl.lastPlaybackError = reason;
    $('pmsg').textContent = playbackErrorMessage(reason);
    $('ptop').classList.remove('idle'); $('playerControls').classList.remove('idle');
  });

  async function play(kind, item, episode, title, opts = {}) {
    stopPlayback();
    const urls = C.streamUrls(S.session.host, S.session.user, S.session.pass, kind, item, episode);
    const rkey = C.resumeKey(kind, item, episode);
    const list = opts.list || null;
    const idx = list ? list.findIndex((x) => C.itemId(x) === C.itemId(item)) : -1;
    const p = (pl = { kind, item, episode, title, urls, rkey, list, idx, started: false, retries: opts.retries || 0, hls: null, ts: null, dash: null, stopped: false, lastPlaybackError: '', returnToDetail:!!opts.returnToDetail, returnSeason:opts.returnSeason||null, returnEpisodeId:opts.returnEpisodeId||'' });
    $('player').classList.remove('hidden'); $('ptitle').textContent = title;
    $('pmsg').textContent = 'Carregando…'; $('pback').focus(); updatePlayerFav(); seekDragging=false;$('seek').value='0';$('qualityWrap').classList.add('hidden');$('quality').replaceChildren(new Option('Automática','-1'));updatePlayerUI();$('playerControls').classList.remove('idle');$('ptop').classList.remove('idle');
    $('pinfo').classList.add('hidden');
    togglePlayerFullscreen(true);
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
    $('pmsg').textContent = playbackErrorMessage(p.lastPlaybackError);
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
    const keepTail = Math.min(30, Math.max(5, V.duration * 0.05));
    if (t > 5 && t < V.duration - keepTail) {
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
    const returnToDetail = !!(pl && pl.returnToDetail && cur);
    const returnSeason = pl && pl.returnSeason || (cur && cur.selectedSeason);
    const returnEpisodeId = pl && pl.returnEpisodeId || (cur && cur.selectedEpisodeId);
    stopPlayback(); $('player').classList.add('hidden'); $('pmsg').textContent = ''; togglePlayerFullscreen(false);
    if (returnToDetail && cur) {
      $('detail').classList.remove('hidden');
      if (cur.kind === 'series' && Array.isArray(cur.seasons)) {
        const season = cur.seasons.find((item) => Number(item.season) === Number(returnSeason)) || cur.seasons.find((item) => Number(item.season) === Number(cur.selectedSeason));
        if (season) showSeason(season, returnEpisodeId || '');
      } else if (cur.kind === 'movie') {
        setPlayButton();
      }
      requestAnimationFrame(() => {
        const buttons = [...$('episodes').querySelectorAll('button')];
        const target = cur.kind === 'series' ? buttons.find((b) => b.dataset.episodeId === returnEpisodeId) : null;
        const focus = target || $('dplay');
        focus.focus(); focus.scrollIntoView({block:'nearest',inline:'nearest'});
      });
      return;
    }
    if (S.tab === 'home' || S.tab === 'history') selectTab(S.tab);
  }
  $('pback').onclick = closePlayer;
  function updatePlayerFav(){const on=!!(pl&&favIndex(pl.kind,pl.item)>=0);$('pfav').replaceChildren(svgIcon(on?'starFilled':'star',19));$('pfav').setAttribute('aria-label',on?'Remover dos favoritos':'Adicionar aos favoritos');$('pfav').title=on?'Remover dos favoritos':'Adicionar aos favoritos';}
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

  function bumpUi(){ $('ptop').classList.remove('idle');$('playerControls').classList.remove('idle');$('pinfo').classList.remove('idle');clearTimeout(hideTimer);hideTimer=setTimeout(()=>{if(!V.paused){$('ptop').classList.add('idle');$('playerControls').classList.add('idle');$('pinfo').classList.add('idle');}},3500);}
  $('player').addEventListener('mousemove', bumpUi);
  V.addEventListener('dblclick', () => togglePlayerFullscreen());
  V.addEventListener('click', () => { V.paused ? V.play() : V.pause(); });
  V.addEventListener('waiting', () => { if (pl) $('pmsg').textContent = 'Carregando…'; });
  V.addEventListener('playing', () => { if (pl) $('pmsg').textContent = ''; updatePlayerUI(); });

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
      if(e.target&&e.target.matches&&e.target.matches('input[type=range]')&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
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
      else if (e.key === 'f') togglePlayerFullscreen();
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
