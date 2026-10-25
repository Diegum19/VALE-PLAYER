'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'media-adapter.js'), 'utf8');

function createHarness(failForMode) {
  const modes = [];
  const elements = [];

  class EventTarget {
    constructor() { this.listeners = new Map(); }
    addEventListener(type, listener) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type).add(listener);
    }
    removeEventListener(type, listener) {
      const set = this.listeners.get(type);
      if (set) set.delete(listener);
    }
    dispatchEvent(event) {
      for (const listener of [...(this.listeners.get(event.type) || [])]) listener(event);
      return true;
    }
  }

  class FakeElement extends EventTarget {
    constructor(tag = 'div') {
      super();
      this.tagName = tag.toUpperCase();
      this.id = '';
      this.className = '';
      this.classList = {
        add: (...names) => { this._classes = new Set([...(this._classes || []), ...names]); },
        remove: (...names) => { for (const name of names) (this._classes || new Set()).delete(name); },
        toggle: (name, force) => {
          this._classes ||= new Set();
          const on = force === undefined ? !this._classes.has(name) : !!force;
          if (on) this._classes.add(name); else this._classes.delete(name);
          return on;
        },
        contains: (name) => !!this._classes && this._classes.has(name),
      };
      this.style = { setProperty() {} };
      this.attributes = {};
      this.paused = true;
      this.ended = false;
      this.currentTime = 0;
      this.duration = 60;
      this.readyState = 0;
      this.networkState = 0;
      this.volume = 1;
      this.videoWidth = 640;
      this.videoHeight = 360;
      this.src = '';
      this.renderMode = '';
      this.rendererName = '';
    }
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      if (name === 'render-mode') {
        this.renderMode = String(value);
        this.rendererName = String(value);
        modes.push(String(value));
      }
      if (name === 'volume') this.volume = Number(value) / 100;
    }
    removeAttribute(name) {
      delete this.attributes[name];
      if (name === 'src') this.src = '';
    }
    querySelector() { return null; }
    insertBefore() {}
    remove() {}
    async destroy() {}
    async seek(seconds) { this.currentTime = seconds; }
    async setVolume(value) { this.volume = Number(value) / 100; }
    async play() { this.paused = false; this.dispatchEvent({ type: 'mpv-state', detail: { status: 'Playing', paused: false } }); }
    async pause() { this.paused = true; this.dispatchEvent({ type: 'mpv-state', detail: { status: 'Paused', paused: true } }); }
    async stop() { this.paused = true; }
    canPlayType() { return ''; }
    load() {}
    async open(url) {
      this.src = url;
      const message = failForMode ? failForMode(this.renderMode, url) : '';
      if (message) {
        queueMicrotask(() => this.dispatchEvent({ type: 'mpv-error', detail: message }));
        throw new Error(message);
      }
      this.currentTime = 0;
      this.readyState = 4;
      this.dispatchEvent({ type: 'mpv-event', detail: { type: 'file-loaded' } });
    }
  }

  const htmlVideo = new FakeElement('video');
  const frame = new FakeElement('div');
  frame.querySelector = () => null;
  const document = {
    getElementById(id) { return id === 'video' ? htmlVideo : id === 'player' ? frame : null; },
    createElement(tag) {
      const element = new FakeElement(tag);
      elements.push(element);
      return element;
    },
  };
  const window = {
    vela: { platform: 'desktop' },
    __velaMpvReady: Promise.resolve(true),
    _electronMpvVideo: {},
  };
  const customElements = { get: (name) => name === 'mpv-video' };
  const context = { window, document, customElements, console, setTimeout, clearTimeout, AbortController, DOMException, Event };
  vm.runInNewContext(source, context, { filename: 'renderer/media-adapter.js' });
  window.VelaMediaAdapter.setEngine('mpv');
  return { window, modes, elements };
}

(async () => {
  const fallback = createHarness((mode) => {
    if (mode === 'shared-texture') return 'shared-texture renderer initialization failed';
    if (mode === 'webgl') return 'WebGL renderer context lost';
    return '';
  });
  await fallback.window.VelaMediaAdapter.openNative('https://example.invalid/video.mkv');
  assert.deepEqual(fallback.modes, ['shared-texture', 'webgl', 'canvas2d']);
  assert.equal(fallback.window.VelaMediaAdapter.nativeRenderer, 'canvas2d');
  process.stdout.write('PASS media adapter: shared-texture -> WebGL -> Canvas 2D\n');

  const networkFailure = createHarness(() => 'HTTP timeout while opening media URL');
  await assert.rejects(
    networkFailure.window.VelaMediaAdapter.openNative('https://example.invalid/video.mkv'),
    /HTTP timeout/
  );
  assert.deepEqual(networkFailure.modes, ['shared-texture']);
  process.stdout.write('PASS media adapter: network failure does not masquerade as a renderer failure\n');
  const codecFailure = createHarness(() => 'Unsupported codec: no decoder found');
  await assert.rejects(
    codecFailure.window.VelaMediaAdapter.openNative('https://example.invalid/video.mkv'),
    /Unsupported codec/
  );
  assert.deepEqual(codecFailure.modes, ['shared-texture']);
  process.stdout.write('PASS media adapter: codec errors do not trigger renderer retries\n');

  const redaction = createHarness(() => '');
  await redaction.window.VelaMediaAdapter.openNative('https://example.invalid/video.mkv');
  redaction.elements[0].dispatchEvent({
    type: 'mpv-error',
    detail: 'HTTP 401 opening https://stream.example/live/customer/secret-password/123.m3u8?token=private-token',
  });
  const errorText = redaction.window.VelaMediaAdapter.nativeState.error.message;
  assert.match(errorText, /URL de mídia ocultada/);
  assert.doesNotMatch(errorText, /stream\.example|secret-password|private-token|customer/);
  process.stdout.write('PASS media adapter: native errors redact stream credentials and URLs\n');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
