// Injected before the app loads. Wraps Web Audio and canvas text so tests can see
// which notes play, how many overlap, and how loud the final mix gets.
(() => {
  const spy = (window.__spy = {
    contexts: 0,
    notes: [],      // one entry per note the app starts (oscillators it tracks with onended)
    alive: 0,
    maxAlive: 0,
    peak: 0,
    texts: [],
  });

  const Orig = window.AudioContext;
  const valueDesc = Object.getOwnPropertyDescriptor(AudioParam.prototype, 'value');
  let analyser = null, buf = null;

  window.AudioContext = class extends Orig {
    constructor(...args) {
      super(...args);
      spy.contexts++;
      spy.ctx = this;
      analyser = this.createAnalyser();
      analyser.fftSize = 2048;
      buf = new Float32Array(analyser.fftSize);
      setInterval(() => {
        analyser.getFloatTimeDomainData(buf);
        for (const s of buf) spy.peak = Math.max(spy.peak, Math.abs(s));
      }, 10);
    }
    createOscillator() {
      const osc = super.createOscillator();
      const rec = { freq: null, type: null, at: performance.now() };
      const first = v => { if (rec.freq === null) rec.freq = v; };
      Object.defineProperty(osc.frequency, 'value', {
        get() { return valueDesc.get.call(this); },
        set(v) { first(v); valueDesc.set.call(this, v); },
      });
      const svat = osc.frequency.setValueAtTime.bind(osc.frequency);
      osc.frequency.setValueAtTime = (v, t) => { first(v); return svat(v, t); };
      // The app calls track(node) on exactly one oscillator per note, which sets onended.
      Object.defineProperty(osc, 'onended', {
        set(fn) {
          rec.type = osc.type;
          spy.notes.push(rec);
          spy.alive++;
          spy.maxAlive = Math.max(spy.maxAlive, spy.alive);
          osc.addEventListener('ended', () => { spy.alive--; fn && fn(); });
        },
      });
      return osc;
    }
  };

  // Tap everything the app sends to the speakers into an analyser.
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (target, ...rest) {
    if (target === this.context.destination && analyser && this !== analyser) connect.call(this, analyser);
    return connect.call(this, target, ...rest);
  };

  const fillText = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (t, ...rest) {
    if (spy.texts[spy.texts.length - 1] !== t) spy.texts.push(t);
    return fillText.call(this, t, ...rest);
  };
})();
