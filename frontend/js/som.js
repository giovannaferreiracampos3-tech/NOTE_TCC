/* Notinha Runner — efeitos sonoros simples (sintetizados, sem arquivos de áudio). */
(function (NW) {
  'use strict';

  const CHAVE_MUDO = 'nw_runner_mudo';   // preferência de interface, não é dado de conta
  let ctx = null;
  let mudo = false;
  try { mudo = localStorage.getItem(CHAVE_MUDO) === '1'; } catch (e) {}

  function ac() {
    if (!ctx) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (A) ctx = new A();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tom(freq, dur, tipo, vol, atraso, ate) {
    if (mudo) return;
    const c = ac(); if (!c) return;
    const t0 = c.currentTime + (atraso || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = tipo || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (ate) o.frequency.exponentialRampToValueAtTime(ate, t0 + dur);
    g.gain.setValueAtTime(vol || 0.06, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  NW.som = {
    pulo:  function () { tom(380, 0.14, 'triangle', 0.05, 0, 720); },
    moeda: function () { tom(988, 0.07, 'square', 0.03); tom(1480, 0.11, 'square', 0.03, 0.06); },
    certo: function () { [523, 659, 784].forEach(function (f, i) { tom(f, 0.16, 'triangle', 0.07, i * 0.08); }); },
    erro:  function () { tom(220, 0.28, 'sawtooth', 0.05, 0, 110); },
    fim:   function () { [523, 659, 784, 1047].forEach(function (f, i) { tom(f, 0.2, 'triangle', 0.07, i * 0.1); }); },
    estaMudo: function () { return mudo; },
    alternar: function () {
      mudo = !mudo;
      try { localStorage.setItem(CHAVE_MUDO, mudo ? '1' : '0'); } catch (e) {}
      return mudo;
    },
    liberar: function () { ac(); }   // chamar em um gesto do usuário (clique) para destravar o áudio
  };
})(window.NWRunner = window.NWRunner || {});