'use strict';
(function () {
  const htmlVideo = document.getElementById('video');
  const playerFrame = document.getElementById('player');
  if (!htmlVideo || !playerFrame) return;

  let engine = 'chromium';
  let nativeVideo = null;
  let nativeRenderMode = 'shared-texture';
  let nativeDestroying = Promise.resolve();
  let sourceListeners = [];
  const state = {
    status: 'Idle', time: 0, duration: 0, width: 0, height: 0, codec: '-', fps: 0,
    source: '', sourceLoaded: false, paused: true, ended: false, buffering: false, error: null, volume: 100,
  };
  const emptyRanges = {
    length: 0,
    start() { throw new DOMException('IndexSizeError', 'IndexSizeError'); },
    end() { throw new DOMException('IndexSizeError', 'IndexSizeError'); },
  };

  htmlVideo.controls = false;
  htmlVideo.preload = 'auto';
  htmlVideo.playsInline = true;

  function isNativeActive() { return engine === 'mpv'; }
  function safeErrorMessage(message) {
    return String(message || 'Erro no motor nativo MPV')
      .replace(/https?:\/\/[^\s"'<>]+/gi, '[URL de mídia ocultada]')
      .replace(/\b(username|user|password|pass|token|authorization)\s*([=:])\s*([^\s&;,]+)/gi, '$1$2[oculto]')
      .replace(/([?&](?:username|user|password|pass|token|authorization|auth)=)[^&\s]+/gi, '$1[oculto]')
      .slice(0, 400);
  }
  function mediaError(message) {
    const original = String(message || 'Erro no motor nativo MPV');
    const code = /network|http|timeout|timed out|connection|download|demux/i.test(original) ? 2
      : /unsupported|not supported|unknown format|no decoder/i.test(original) ? 4 : 3;
    state.error = { code, message: safeErrorMessage(original) };
    return state.error;
  }
  function dispatchMedia(type) {
    const target = isNativeActive() ? nativeVideo : htmlVideo;
    if (target) target.dispatchEvent(new Event(type));
  }
  function callListener(listener, target, event) {
    if (typeof listener === 'function') listener.call(target, event);
    else if (listener && typeof listener.handleEvent === 'function') listener.handleEvent(event);
  }
  function attachRecord(record, target) {
    const isNative = target !== htmlVideo;
    const wrapper = (event) => {
      if (isNative !== isNativeActive() || (record.once && record.called)) return;
      if (record.once) {
        record.called = true;
        removeRecord(record);
      }
      callListener(record.listener, target, event);
    };
    if (isNative) record.onNative = wrapper;
    else record.onHtml = wrapper;
    target.addEventListener(record.type, wrapper, record.capture);
  }
  function removeRecord(record) {
    htmlVideo.removeEventListener(record.type, record.onHtml, record.capture);
    if (nativeVideo && record.onNative) nativeVideo.removeEventListener(record.type, record.onNative, record.capture);
    sourceListeners = sourceListeners.filter((item) => item !== record);
  }

  function resetNativeState() {
    state.status = 'Idle'; state.time = 0; state.duration = 0; state.width = 0; state.height = 0;
    state.codec = '-'; state.fps = 0; state.source = ''; state.sourceLoaded = false;
    state.paused = true; state.ended = false; state.buffering = false; state.error = null;
  }

  function onMpvEvent(event) {
    const data = event.detail || {};
    if (data.name === 'paused-for-cache') {
      const buffering=!!data.data;
      const changed=buffering!==state.buffering;
      state.buffering=buffering;
      if(changed&&buffering)dispatchMedia('waiting');
      else if(changed&&!buffering&&state.status==='Playing'&&!state.paused&&state.sourceLoaded)dispatchMedia('playing');
    } else if (data.name === 'cache-buffering-state') {
      state.bufferingPercent=Number(data.data)||0;
    } else if (data.type === 'file-loaded') {
      state.sourceLoaded = true;
      state.error = null;
      state.ended = false;
      dispatchMedia('loadedmetadata');
      dispatchMedia('durationchange');
      dispatchMedia('progress');
      dispatchMedia('canplay');
    } else if (data.type === 'end-file' && data.error) {
      mediaError(data.error);
      dispatchMedia('error');
    }
  }

  function onMpvState(event) {
    const detail = event.detail || {};
    const previous = state.status;
    const previousDuration = state.duration;
    const previousTime = state.time;
    state.status = String(detail.status || state.status);
    if (Number.isFinite(Number(detail.time))) state.time = Number(detail.time);
    if (Number.isFinite(Number(detail.duration))) state.duration = Number(detail.duration);
    if (Number.isFinite(Number(detail.width))) state.width = Number(detail.width);
    if (Number.isFinite(Number(detail.height))) state.height = Number(detail.height);
    if (detail.codec) state.codec = String(detail.codec);
    if (Number.isFinite(Number(detail.fps))) state.fps = Number(detail.fps);
    if (state.duration !== previousDuration) dispatchMedia('durationchange');
    if (state.time !== previousTime) dispatchMedia('timeupdate');
    if (state.status === 'Playing') {
      state.paused = false;
      state.ended = false;
      if (previous !== 'Playing') {
        dispatchMedia('play');
        if (state.sourceLoaded && !state.buffering) dispatchMedia('playing');
      }
    } else if (state.status === 'Paused') {
      state.paused = true;
      if (previous === 'Playing') {
        if(state.buffering)dispatchMedia('waiting');
        else dispatchMedia('pause');
      }
    } else if (state.status === 'Ended') {
      state.paused = true;
      state.ended = true;
      if (previous !== 'Ended') dispatchMedia('ended');
    }
  }

  function createNativeVideo(renderMode) {
    if (!customElements.get('mpv-video')) throw new Error('Componente nativo MPV ainda não foi carregado.');
    const element = document.createElement('mpv-video');
    element.id = 'nativeVideo';
    element.className = 'native-video' + (isNativeActive() ? '' : ' hidden');
    nativeRenderMode = renderMode || 'shared-texture';
    element.setAttribute('render-mode', nativeRenderMode);
    element.setAttribute('volume', String(state.volume));
    const vignette = playerFrame.querySelector('.player-vignette');
    playerFrame.insertBefore(element, vignette || null);
    nativeVideo = element;
    for (const record of sourceListeners) attachRecord(record, nativeVideo);
    nativeVideo.addEventListener('mpv-event', (event) => { if (nativeVideo === element) onMpvEvent(event); });
    nativeVideo.addEventListener('mpv-state', (event) => { if (nativeVideo === element) onMpvState(event); });
    nativeVideo.addEventListener('mpv-error', (event) => {
      if (nativeVideo !== element) return;
      const message = event.detail || 'Falha no motor nativo MPV';
      state.error = mediaError(message);
      if (state.sourceLoaded || state.status === 'Playing' || state.status === 'Paused') dispatchMedia('error');
    });
    return nativeVideo;
  }

  function destroyNativeVideo() {
    const old = nativeVideo;
    if (!old) return nativeDestroying;
    try { old.classList.add('hidden'); } catch {}
    nativeVideo = null;
    for (const record of sourceListeners) {
      if (record.onNative) old.removeEventListener(record.type, record.onNative, record.capture);
      record.onNative = null;
    }
    resetNativeState();
    nativeDestroying = nativeDestroying.catch(() => {}).then(async () => {
      try { await old.destroy(); } catch {}
      try { old.remove(); } catch {}
    });
    return nativeDestroying;
  }

  async function nativeAvailable() {
    try {
      if (!window.__velaMpvReady || !await window.__velaMpvReady) return false;
      return !!window._electronMpvVideo;
    } catch { return false; }
  }

  async function ensureNativeVideo(mode) {
    if (!await nativeAvailable()) throw new Error('O motor nativo MPV não está instalado nesta versão.');
    await nativeDestroying;
    const requestedMode = mode || nativeRenderMode || 'shared-texture';
    if (nativeVideo && nativeRenderMode !== requestedMode) {
      await destroyNativeVideo();
      await nativeDestroying;
    }
    if (!nativeVideo) createNativeVideo(requestedMode);
    return nativeVideo;
  }

  function waitForNativeLoad(element, timeoutMs = 30000, signal) {
    if (signal && signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
    if (state.sourceLoaded) return Promise.resolve();
    return new Promise((resolve, reject) => {
      let finished = false;
      const finish = (error) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        element.removeEventListener('mpv-event', onEvent);
        element.removeEventListener('mpv-error', onError);
        if (signal) signal.removeEventListener('abort', onAbort);
        if (error) reject(error);
        else resolve();
      };
      const onEvent = (event) => {
        const data = event.detail || {};
        if (data.type === 'file-loaded') finish();
        else if (data.error) finish(new Error(data.error));
      };
      const onError = (event) => finish(new Error(String(event.detail || 'Falha ao iniciar o motor nativo.')));
      const onAbort = () => finish(new DOMException('Aborted', 'AbortError'));
      const timer = setTimeout(() => finish(new Error('Tempo esgotado ao carregar o vídeo no motor nativo.')), timeoutMs);
      element.addEventListener('mpv-event', onEvent);
      element.addEventListener('mpv-error', onError);
      if (signal) signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  function waitForNativeDuration(element, signal, timeoutMs=1800) {
    if(Number(state.duration)>0)return Promise.resolve(Number(state.duration));
    if(signal&&signal.aborted)return Promise.reject(new DOMException('Aborted','AbortError'));
    return new Promise((resolve,reject)=>{
      let finished=false;
      const finish=(error)=>{
        if(finished)return;
        finished=true;clearTimeout(timer);
        element.removeEventListener('mpv-state',onState);
        if(signal)signal.removeEventListener('abort',onAbort);
        if(error)reject(error);else resolve(Number(state.duration)>0?Number(state.duration):0);
      };
      const onState=()=>{if(Number(state.duration)>0)finish();};
      const onAbort=()=>finish(new DOMException('Aborted','AbortError'));
      const timer=setTimeout(()=>finish(),timeoutMs);
      element.addEventListener('mpv-state',onState);
      if(signal)signal.addEventListener('abort',onAbort,{once:true});
    });
  }
  function waitForNativePosition(element,target,signal,timeoutMs=4500) {
    const expected=Number(target);
    const matches=()=>Number.isFinite(Number(state.time))&&Math.abs(Number(state.time)-expected)<=Math.max(2,Math.min(12,Math.abs(expected)*0.005));
    if(matches())return Promise.resolve();
    if(signal&&signal.aborted)return Promise.reject(new DOMException('Aborted','AbortError'));
    return new Promise((resolve,reject)=>{
      let finished=false;
      const finish=(error)=>{
        if(finished)return;
        finished=true;clearTimeout(timer);
        element.removeEventListener('mpv-state',onState);
        if(signal)signal.removeEventListener('abort',onAbort);
        if(error)reject(error);else resolve();
      };
      const onState=()=>{if(matches())finish();};
      const onAbort=()=>finish(new DOMException('Aborted','AbortError'));
      const timer=setTimeout(()=>finish(new Error('O motor MPV não confirmou a retomada na posição solicitada.')),timeoutMs);
      element.addEventListener('mpv-state',onState);
      if(signal)signal.addEventListener('abort',onAbort,{once:true});
    });
  }
  async function seekNativeWithConfirmation(element,target,signal) {
    let lastError=null;
    for(let attempt=0;attempt<2;attempt++){
      if(signal&&signal.aborted)throw new DOMException('Aborted','AbortError');
      try{
        await element.seek(target);
        await waitForNativePosition(element,target,signal,4500);
        return;
      }catch(error){
        lastError=error;
        if(signal&&signal.aborted)throw new DOMException('Aborted','AbortError');
        if(attempt===0)await new Promise(resolve=>setTimeout(resolve,200));
      }
    }
    throw lastError||new Error('O motor MPV não confirmou a retomada na posição solicitada.');
  }
  async function openNative(url, startAt = 0, signal) {
    // Fallbacks de renderização: GPU compartilhada -> WebGL -> Canvas 2D por software.
    const modes = ['shared-texture', 'webgl', 'canvas2d'];
    let lastError = null;
    for (const mode of modes) {
      if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
      const element = await ensureNativeVideo(mode);
      if (signal && signal.aborted) {
        await destroyNativeVideo();
        throw new DOMException('Aborted', 'AbortError');
      }
      try {
        state.error = null;
        state.source = url;
        state.sourceLoaded = false;
        state.status = 'Opening';
        state.time = 0;
        state.duration = 0;
        state.width = 0;
        state.height = 0;
        state.paused = true;
        state.ended = false;
        state.buffering = false;
        const loaded = waitForNativeLoad(element, 30000, signal);
        await Promise.all([element.open(url), loaded]);
        if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
        if (Number(startAt) > 5) {
          await waitForNativeDuration(element,signal,1800);
          const duration = Number(state.duration);
          const target = duration > 0 ? Math.min(Number(startAt), Math.max(0, duration - 0.25)) : Number(startAt);
          await seekNativeWithConfirmation(element,Math.max(0,target),signal);
        }
        if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const text = String(lastError.message || lastError);
        if ((signal && signal.aborted) || lastError.name === 'AbortError') {
          await destroyNativeVideo();
          throw new DOMException('Aborted', 'AbortError');
        }
        const rendererFailure = /webgpu|shared[\s_-]?texture|webgl(?:2)?|canvas[\s_-]?2d|2d[\s_-]?context|wgl|d3d11|opengl|graphics context|render target|context lost|failed to (?:initialize|create) (?:the )?(?:native )?(?:video )?(?:renderer|render context)|(?:renderer|render context).{0,40}(?:failed|error|unavailable|initializ|context)|(?:initializ|creat).{0,30}(?:renderer|render context)/i.test(text);
        const hasAnotherRenderer = modes.indexOf(mode) >= 0 && modes.indexOf(mode) < modes.length - 1;
        if (!rendererFailure || !hasAnotherRenderer) throw lastError;
        await destroyNativeVideo();
      }
    }
    throw lastError || new Error('O motor nativo não conseguiu iniciar o vídeo.');
  }

  function setEngine(next) {
    engine = next === 'mpv' ? 'mpv' : 'chromium';
    htmlVideo.classList.toggle('hidden', isNativeActive());
    if (nativeVideo) nativeVideo.classList.toggle('hidden', !isNativeActive());
  }

  function reset() {
    try { htmlVideo.pause(); htmlVideo.removeAttribute('src'); htmlVideo.load(); } catch {}
    // Destroy the previous native session instead of queueing stop/loadfile on the same handle.
    // The next open waits for this destruction to finish, so delayed events cannot stop the new episode.
    if (nativeVideo) void destroyNativeVideo();
    else resetNativeState();
  }

  const facade = {
    get engine() { return engine; },
    get currentTime() { return isNativeActive() ? state.time : htmlVideo.currentTime; },
    set currentTime(value) {
      const seconds = Math.max(0, Number(value) || 0);
      if (!isNativeActive()) { try { htmlVideo.currentTime = seconds; } catch {} return; }
      if (nativeVideo) nativeVideo.seek(seconds).catch((error) => {
        state.error = mediaError(error && error.message || error);
        dispatchMedia('error');
      });
    },
    get duration() { return isNativeActive() ? state.duration : htmlVideo.duration; },
    get paused() { return isNativeActive() ? state.paused : htmlVideo.paused; },
    get ended() { return isNativeActive() ? state.ended : htmlVideo.ended; },
    get currentSrc() { return isNativeActive() ? (nativeVideo && (nativeVideo.src || state.source)) || state.source : htmlVideo.currentSrc; },
    get src() { return isNativeActive() ? (nativeVideo && nativeVideo.src) || state.source : htmlVideo.src; },
    set src(value) {
      if (isNativeActive() && nativeVideo) { nativeVideo.src = value; state.source = value; }
      else htmlVideo.src = value;
    },
    get error() { return isNativeActive() ? state.error : htmlVideo.error; },
    get readyState() {
      if (!isNativeActive()) return htmlVideo.readyState;
      if (state.sourceLoaded && ['Playing', 'Paused', 'Ended', 'Loaded'].includes(state.status)) return 4;
      return state.sourceLoaded ? 2 : 0;
    },
    get networkState() { return isNativeActive() ? (state.source ? (state.sourceLoaded ? 1 : 2) : 0) : htmlVideo.networkState; },
    get buffered() { return isNativeActive() ? emptyRanges : htmlVideo.buffered; },
    get volume() { return isNativeActive() ? state.volume / 100 : htmlVideo.volume; },
    set volume(value) {
      const volume = Math.max(0, Math.min(1, Number(value) || 0));
      if (!isNativeActive()) { htmlVideo.volume = volume; return; }
      state.volume = volume * 100;
      if (nativeVideo) nativeVideo.setVolume(state.volume).catch((error) => { state.error = mediaError(error && error.message || error); });
    },
    get muted() { return isNativeActive() ? state.volume <= 0 : htmlVideo.muted; },
    set muted(value) {
      if (!isNativeActive()) { htmlVideo.muted = !!value; return; }
      if (value) { state.lastVolume = state.volume || 100; facade.volume = 0; }
      else facade.volume = (state.lastVolume || 100) / 100;
    },
    get videoWidth() { return isNativeActive() ? state.width : htmlVideo.videoWidth; },
    get videoHeight() { return isNativeActive() ? state.height : htmlVideo.videoHeight; },
    canPlayType(...args) { return htmlVideo.canPlayType(...args); },
    play() { return isNativeActive() && nativeVideo ? nativeVideo.play() : htmlVideo.play(); },
    pause() { if (isNativeActive() && nativeVideo) return nativeVideo.pause(); return htmlVideo.pause(); },
    load() { if (isNativeActive() && nativeVideo) return nativeVideo.stop(); return htmlVideo.load(); },
    removeAttribute(name) {
      if (isNativeActive() && nativeVideo) {
        nativeVideo.removeAttribute(name);
        if (name === 'src') { state.source = ''; state.sourceLoaded = false; }
      } else htmlVideo.removeAttribute(name);
    },
    addEventListener(type, listener, options) {
      const capture = typeof options === 'boolean' ? options : !!(options && options.capture);
      if (sourceListeners.some((record) => record.type === type && record.listener === listener && record.capture === capture)) return;
      const record = { type, listener, capture, once: !!(options && typeof options === 'object' && options.once), called: false, onHtml: null, onNative: null };
      sourceListeners.push(record);
      attachRecord(record, htmlVideo);
      if (nativeVideo) attachRecord(record, nativeVideo);
    },
    removeEventListener(type, listener, options) {
      const capture = typeof options === 'boolean' ? options : !!(options && options.capture);
      const record = sourceListeners.find((item) => item.type === type && item.listener === listener && item.capture === capture);
      if (record) removeRecord(record);
    },
    setEngine,
    reset,
    nativeAvailable,
    openNative,
    get nativeState() { return { ...state }; },
    get nativeRenderer() { return nativeVideo && nativeVideo.rendererName || '-'; },
  };

  window.VelaMediaAdapter = facade;
})();
