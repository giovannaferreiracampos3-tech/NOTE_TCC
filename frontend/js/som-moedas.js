/* Notinha Runner — sons de moedas (ganhar e perder).
 * Gerados no navegador, sem arquivo de áudio. Respeitam o botão "Som".
 */
(function (NW) {
    'use strict';
    let ac = null;
  
    function ctx() {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ac = new AC();
      }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    }
    function mudo() { return NW.som && NW.som.estaMudo && NW.som.estaMudo(); }
  
    // o navegador só libera áudio depois de um toque/tecla
    function liberar() {
      ctx();
      document.removeEventListener('pointerdown', liberar);
      document.removeEventListener('keydown', liberar);
    }
    document.addEventListener('pointerdown', liberar);
    document.addEventListener('keydown', liberar);
  
    // "tin" metálico: dois parciais com queda rápida
    function tin(c, t, freq, dur, vol) {
      [[1, 1], [2.76, 0.35]].forEach(function (p) {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = freq * p[0];
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol * p[1], t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(c.destination);
        o.start(t); o.stop(t + dur + 0.02);
      });
    }
  
    // moedas caindo e quicando no chão (intervalos cada vez menores)
    function moedasCaindo() {
      if (mudo()) return;
      const c = ctx(); if (!c) return;
      const t0 = c.currentTime + 0.02;
      let t = t0, gap = 0.13;
      for (let i = 0; i < 9; i++) {
        tin(c, t, 1900 + Math.random() * 1700, 0.22, 0.16 * (1 - i * 0.07));
        t += gap; gap *= 0.8;
      }
    }
  
    // dinheiro entrando: clique + dois tons brilhantes + brilho de moedas
    function dinheiro() {
      if (mudo()) return;
      const c = ctx(); if (!c) return;
      const t = c.currentTime + 0.02;
      const n = c.createBufferSource(), buf = c.createBuffer(1, c.sampleRate * 0.05, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      n.buffer = buf;
      const gn = c.createGain(); gn.gain.value = 0.12;
      n.connect(gn); gn.connect(c.destination); n.start(t);
      tin(c, t + 0.05, 1568, 0.45, 0.22);
      tin(c, t + 0.14, 2093, 0.7, 0.22);
      for (let i = 0; i < 4; i++) tin(c, t + 0.22 + i * 0.06, 2600 + Math.random() * 1400, 0.18, 0.08);
    }
  
    NW.somMoedas = { moedasCaindo: moedasCaindo, dinheiro: dinheiro, liberar: liberar };
  })(window.NWRunner = window.NWRunner || {});