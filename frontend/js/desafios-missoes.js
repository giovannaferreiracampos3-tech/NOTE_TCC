/* Notinha Runner — missões musicais dos desafios diários.
 *
 * Cada desafio do dia tem UMA missão própria (11 no total, uma por tipo de desafio):
 * uma mini-aula interativa (aprenda → pratique → resultado) com som de verdade (Web Audio),
 * piano clicável, pauta em SVG, ditado rítmico etc.
 *
 * Ligações com o resto da NoteWave (mesmas chaves do perfil.js):
 *   noteWave_diasEstudo     → sequência de estudos (concluir uma prática registra o dia de hoje)
 *   noteWave_missoesFeitas  → missões concluídas ("dia|id"); o perfil.js usa para o progresso geral
 *
 * Expõe: NW.estudo (sequência/progresso) e NW.missoes (abrir, definicao, feita).
 * Carregue DEPOIS de desafios.js e ANTES de desafios-ui.js.
 */
(function (NW) {
    'use strict';
  
    /* =====================================================================
     * ESTUDO: sequência e progresso
     * ===================================================================== */
    const CHAVE_DIAS = 'noteWave_diasEstudo';
    const CHAVE_MISSOES = 'noteWave_missoesFeitas';
    const META_MISSOES = 15;   // 15 missões concluídas = parte "Desafios" do progresso geral completa
  
    function dataLocal(d) {
      d = d || new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function ler(chave) {
      try { const v = JSON.parse(localStorage.getItem(chave)); return Array.isArray(v) ? v : []; }
      catch (e) { return []; }
    }
    function gravar(chave, v) { try { localStorage.setItem(chave, JSON.stringify(v)); } catch (e) { /* sem espaço/privado */ } }
  
    const estudo = {
      META: META_MISSOES,
      registrarHoje: function () {
        const dias = ler(CHAVE_DIAS), hoje = dataLocal();
        if (dias.indexOf(hoje) < 0) { dias.push(hoje); gravar(CHAVE_DIAS, dias.slice(-120)); }
      },
      sequencia: function () {
        const set = new Set(ler(CHAVE_DIAS)), d = new Date();
        let n = 0;
        while (set.has(dataLocal(d))) { n++; d.setDate(d.getDate() - 1); }
        return n;
      },
      total: function () { return ler(CHAVE_MISSOES).length; },
      feita: function (dia, id) { return ler(CHAVE_MISSOES).indexOf(dia + '|' + id) >= 0; },
      marcar: function (dia, id) {          // true se for a primeira vez
        const l = ler(CHAVE_MISSOES), k = dia + '|' + id;
        if (l.indexOf(k) >= 0) return false;
        l.push(k); gravar(CHAVE_MISSOES, l.slice(-400));
        return true;
      }
    };
    NW.estudo = estudo;
  
    /* =====================================================================
     * UTILIDADES
     * ===================================================================== */
    const NOMES = ['Dó', 'Dó♯', 'Ré', 'Ré♯', 'Mi', 'Fá', 'Fá♯', 'Sol', 'Sol♯', 'Lá', 'Lá♯', 'Si'];
    const NAT = ['Dó', 'Ré', 'Mi', 'Fá', 'Sol', 'Lá', 'Si'];
    const SEMI_NAT = [0, 2, 4, 5, 7, 9, 11];
    const PRETA = { 1: 1, 3: 1, 6: 1, 8: 1, 10: 1 };
  
    function nome(m) { return NOMES[m % 12]; }
    function $e(tag, cls, html) {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (html != null) e.innerHTML = html;
      return e;
    }
    function sorteio(a) { return a[Math.floor(Math.random() * a.length)]; }
    function embaralhar(a) {
      a = a.slice();
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
      return a;
    }
    function botao(rotulo, onclick, suave) {
      const b = $e('button', 'nwr-btn' + (suave ? ' nwr-btn--suave nwr-btn--mini' : ''), rotulo);
      b.type = 'button';
      b.addEventListener('click', onclick);
      return b;
    }
  
    /* ---------- áudio (Web Audio, sem arquivos) ---------- */
    let ac = null;
    function contexto() {
      if (!ac) {
        const A = window.AudioContext || window.webkitAudioContext;
        if (!A) return null;
        try { ac = new A(); } catch (e) { return null; }
      }
      if (ac.state === 'suspended' && ac.resume) ac.resume();
      return ac;
    }
    function somLigado() { return !(NW.som && typeof NW.som.estaMudo === 'function' && NW.som.estaMudo()); }
  
    function nota(midi, atraso, dur, vol) {
      const a = contexto();
      if (!a || !somLigado()) return;
      const t = a.currentTime + (atraso || 0), d = dur || 0.6;
      const g = a.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.28, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      g.connect(a.destination);
      const f = 440 * Math.pow(2, (midi - 69) / 12);
      const o = a.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const o2 = a.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2;
      const g2 = a.createGain(); g2.gain.value = 0.25;
      o.connect(g); o2.connect(g2); g2.connect(g);
      o.start(t); o2.start(t); o.stop(t + d + 0.05); o2.stop(t + d + 0.05);
    }
    function clique(atraso, forte) {
      const a = contexto();
      if (!a || !somLigado()) return;
      const t = a.currentTime + Math.max(0, atraso || 0);
      const o = a.createOscillator(), g = a.createGain();
      o.type = 'square'; o.frequency.value = forte ? 1300 : 850;
      g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.08);
    }
    function acorde(midis, atraso, dur) { midis.forEach(function (m) { nota(m, atraso, dur || 1.1, 0.17); }); }
  
    /* ---------- teclado de piano clicável ---------- */
    function teclado(de, ate, aoTocar, rotular) {
      const raiz = $e('div', 'nwm-teclado');
      raiz.setAttribute('role', 'group');
      raiz.setAttribute('aria-label', 'Teclado de piano');
      const brancas = [], teclas = {};
      for (let m = de; m <= ate; m++) if (!PRETA[m % 12]) brancas.push(m);
      const w = 100 / brancas.length;
      brancas.forEach(function (m, i) {
        const b = $e('button', 'nwm-tecla', rotular ? '<span>' + nome(m) + '</span>' : '');
        b.type = 'button'; b.dataset.midi = m;
        b.style.left = (i * w) + '%'; b.style.width = w + '%';
        b.setAttribute('aria-label', nome(m));
        raiz.appendChild(b); teclas[m] = b;
      });
      for (let m = de; m <= ate; m++) {
        if (!PRETA[m % 12]) continue;
        const n = brancas.filter(function (x) { return x < m; }).length;
        if (n < 1) continue;
        const b = $e('button', 'nwm-tecla nwm-tecla--preta');
        b.type = 'button'; b.dataset.midi = m;
        b.style.left = (n * w - w * 0.3) + '%'; b.style.width = (w * 0.6) + '%';
        b.setAttribute('aria-label', nome(m));
        raiz.appendChild(b); teclas[m] = b;
      }
      function tocou(b) { const m = +b.dataset.midi; nota(m); aoTocar(m, b); }
      raiz.addEventListener('pointerdown', function (e) {
        const b = e.target.closest('.nwm-tecla'); if (!b) return;
        e.preventDefault(); tocou(b);
      });
      raiz.addEventListener('click', function (e) {       // teclado físico (Enter/Espaço no botão focado)
        if (e.detail !== 0) return;
        const b = e.target.closest('.nwm-tecla'); if (b) tocou(b);
      });
      return {
        el: raiz, teclas: teclas,
        marcar: function (m, cls, ms) {                   // ms = 0 → fica marcada
          const b = teclas[m]; if (!b) return;
          b.classList.add(cls);
          if (ms !== 0) setTimeout(function () { b.classList.remove(cls); }, ms || 450);
        },
        limpar: function (cls) { Object.keys(teclas).forEach(function (k) { teclas[k].classList.remove(cls); }); }
      };
    }
  
    /* ---------- pauta em SVG (reaproveita as claves das medalhas) ---------- */
    const PATH_SOL = 'M54.5,9 C50.1,9 46.2,16.5 45.1,25.4 C38.3,29.8 33.2,36.5 33.2,46.1 C33.2,58.3 42.1,65.2 50.5,65.2 C59.2,65.2 65.5,58.1 65.5,48.5 C65.5,41.3 61.2,35.4 55.3,32.3 C53.2,23.1 55.4,12.5 58.1,9.8 C56.8,9.2 55.7,9 54.5,9 Z M51.5,59.5 C46.2,59.5 40.8,55.1 40.8,47.2 C40.8,40.5 45.1,34.9 51.2,32.8 C53.2,41.2 57.1,51.8 59.2,56.8 C57.2,58.7 54.5,59.5 51.5,59.5 Z M53.5,67 C48.5,67 44,70.5 44,75.5 C44,80.5 48.5,84.5 53.5,84.5 C58.5,84.5 62.5,80.5 62.5,75.5 C62.5,70.5 58.5,67 53.5,67 Z';
    const PATH_FA = 'M35,25 C45,20 62,24 62,42 C62,56 50,66 42,75 L36,75 C44,65 54,55 54,43 C54,34 43,30 36,33 L35,25 Z M70,33 A 4 4 0 1 1 70,32.9 Z M70,47 A 4 4 0 1 1 70,46.9 Z';
  
    // dia = posição diatônica absoluta (oitava*7 + índice da nota). Sol: 1ª linha = Mi4 (30). Fá: 1ª linha = Sol2 (18).
    function pautaSVG(dia, clave) {
      const base = clave === 'fa' ? 18 : 30, pos = dia - base, cx = 118, y = 90 - pos * 5;
      let s = '<svg viewBox="0 0 180 130" class="nwm-pauta" role="img" aria-label="Nota escrita na pauta, clave de ' + (clave === 'fa' ? 'Fá' : 'Sol') + '">';
      for (let i = 0; i < 5; i++) s += '<line class="nwm-pl" x1="8" x2="172" y1="' + (50 + i * 10) + '" y2="' + (50 + i * 10) + '"/>';
      s += clave === 'fa'
        ? '<svg x="2" y="32" width="70" height="70" viewBox="0 0 100 100" overflow="visible"><path fill="currentColor" d="' + PATH_FA + '"/></svg>'
        : '<svg x="-9" y="36" width="90" height="90" viewBox="0 0 100 100" overflow="visible"><path fill="currentColor" d="' + PATH_SOL + '"/></svg>';
      for (let p = -2; p >= pos; p -= 2) s += '<line class="nwm-pl" x1="' + (cx - 15) + '" x2="' + (cx + 15) + '" y1="' + (90 - p * 5) + '" y2="' + (90 - p * 5) + '"/>';
      for (let p = 10; p <= pos; p += 2) s += '<line class="nwm-pl" x1="' + (cx - 15) + '" x2="' + (cx + 15) + '" y1="' + (90 - p * 5) + '" y2="' + (90 - p * 5) + '"/>';
      s += pos < 4
        ? '<line class="nwm-haste" x1="' + (cx + 7.6) + '" x2="' + (cx + 7.6) + '" y1="' + y + '" y2="' + (y - 35) + '"/>'
        : '<line class="nwm-haste" x1="' + (cx - 7.6) + '" x2="' + (cx - 7.6) + '" y1="' + y + '" y2="' + (y + 35) + '"/>';
      s += '<ellipse cx="' + cx + '" cy="' + y + '" rx="8.5" ry="6" transform="rotate(-20 ' + cx + ' ' + y + ')" fill="currentColor"/></svg>';
      return s;
    }
    function onde(pos) {
      if (pos < 0) return pos % 2 === 0 ? 'numa linha suplementar abaixo da pauta' : 'logo abaixo da 1ª linha';
      if (pos > 8) return pos % 2 === 0 ? 'numa linha suplementar acima da pauta' : 'logo acima da 5ª linha';
      const n = Math.floor(pos / 2) + 1;
      return pos % 2 === 0 ? 'na ' + n + 'ª linha' : 'no ' + n + 'º espaço';
    }
  
    /* ---------- figuras rítmicas em SVG ---------- */
    function figSVG(tipo) {
      const oca = tipo === 'semibreve' || tipo === 'minima';
      let s = '<svg viewBox="0 0 44 62" class="nwm-fig" role="img" aria-label="' + tipo + '">';
      s += '<ellipse cx="16" cy="50" rx="9" ry="6.2" transform="rotate(-20 16 50)" ' +
        (oca ? 'fill="none" stroke="currentColor" stroke-width="3"' : 'fill="currentColor"') + '/>';
      if (tipo !== 'semibreve') s += '<line x1="24.2" y1="47" x2="24.2" y2="8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>';
      if (tipo === 'colcheia' || tipo === 'semicolcheia') s += '<path d="M24,8 C24,22 40,24 36,40" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>';
      if (tipo === 'semicolcheia') s += '<path d="M24,19 C24,31 40,33 36,48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>';
      return s + '</svg>';
    }
    const SILABA = { S: 'ta', M: 'ta-a', CC: 'ti-ti' };
    function ritmoSVG(tokens) {
      let x = 6, s = '';
      function cab(cx, oca) {
        return '<ellipse cx="' + cx + '" cy="50" rx="9" ry="6.2" transform="rotate(-20 ' + cx + ' 50)" ' +
          (oca ? 'fill="none" stroke="currentColor" stroke-width="3"' : 'fill="currentColor"') + '/>';
      }
      function has(hx) { return '<line x1="' + hx + '" y1="47" x2="' + hx + '" y2="9" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'; }
      tokens.forEach(function (t) {
        if (t === 'CC') {
          s += cab(x + 10, false) + has(x + 18.2) + cab(x + 34, false) + has(x + 42.2) +
            '<line x1="' + (x + 18.2) + '" y1="10" x2="' + (x + 42.2) + '" y2="10" stroke="currentColor" stroke-width="6"/>';
          x += 62;
        } else {
          s += cab(x + 10, t === 'M') + has(x + 18.2);
          x += t === 'M' ? 58 : 40;
        }
      });
      const rotulo = tokens.map(function (t) { return SILABA[t]; }).join(' ');
      return '<svg viewBox="0 0 ' + (x + 4) + ' 62" class="nwm-ritmo" role="img" aria-label="Ritmo: ' + rotulo + '">' + s + '</svg>';
    }
  
    /* ---------- componentes de tela ---------- */
    function pontosHtml(total, marcas, atual) {
      let h = '<div class="nwm-pontos" aria-hidden="true">';
      for (let k = 0; k < total; k++) h += '<i class="' + (k < marcas.length ? (marcas[k] ? 'ok' : 'x') : (k === atual ? 'at' : '')) + '"></i>';
      return h + '</div>';
    }
    function cabeca(area, total, marcas, i, enun, sub) {
      area.insertAdjacentHTML('beforeend', pontosHtml(total, marcas, i));
      area.appendChild($e('p', 'nwm-contagem', sub || ('Rodada ' + (i + 1) + ' de ' + total)));
      area.appendChild($e('h3', 'nwm-enun', enun));
    }
    function novoFb() {
      const fb = $e('p', 'nwm-fb');
      fb.setAttribute('role', 'status'); fb.setAttribute('aria-live', 'polite');
      return fb;
    }
    function botaoProx(i, total, onclick) { return botao(i + 1 < total ? 'Próxima' : 'Ver resultado', onclick); }
    function botaoSom(rotulo, fn) { return botao('🔊 ' + rotulo, function () { contexto(); fn(); }, true); }
  
    /* Quiz genérico: itens = [{enunciado, visual, som, opcoes[], rotulos[], certa, explica}] */
    function quiz(area, itens, fim) {
      let i = 0, acertos = 0;
      const marcas = [];
      function mostrar() {
        const it = itens[i];
        area.innerHTML = '';
        cabeca(area, itens.length, marcas, i, it.enunciado, 'Pergunta ' + (i + 1) + ' de ' + itens.length);
        if (it.visual) area.appendChild($e('div', 'nwm-visual', it.visual));
        if (it.som) {
          area.appendChild(botaoSom('Ouvir', it.som));
          setTimeout(function () { if (area.isConnected && !fb.textContent) it.som(); }, 350);
        }
        const grade = $e('div', 'nwm-opcoes'), btns = [];
        it.opcoes.forEach(function (t, k) {
          const b = $e('button', 'nwm-op', t); b.type = 'button';
          if (it.rotulos) b.setAttribute('aria-label', it.rotulos[k]);
          b.addEventListener('click', function () { responder(k); });
          grade.appendChild(b); btns.push(b);
        });
        area.appendChild(grade);
        const fb = novoFb(); area.appendChild(fb);
        let respondida = false;
        function responder(k) {
          if (respondida) return; respondida = true;
          const ok = k === it.certa;
          marcas.push(ok); if (ok) acertos++;
          btns.forEach(function (b, j) {
            b.disabled = true;
            if (j === it.certa) b.classList.add('is-certa'); else if (j === k) b.classList.add('is-errada');
          });
          fb.className = 'nwm-fb ' + (ok ? 'ok' : 'x');
          fb.innerHTML = (ok ? '✅ Isso mesmo! ' : '❌ Quase! ') + (it.explica || '');
          area.appendChild(botaoProx(i, itens.length, function () {
            i++;
            if (i < itens.length) mostrar(); else fim({ acertos: acertos, total: itens.length });
          })).focus();
        }
      }
      mostrar();
    }
  
    /* Leitura de notas na pauta (usada nas missões de Sol e de Fá) */
    function itensLeitura(clave, dias, n) {
      const base = clave === 'fa' ? 18 : 30;
      return embaralhar(dias).slice(0, n).map(function (d) {
        const certo = d % 7;
        const outros = embaralhar([0, 1, 2, 3, 4, 5, 6].filter(function (x) { return x !== certo; })).slice(0, 3);
        const ops = embaralhar([certo].concat(outros));
        return {
          enunciado: 'Qual é o nome desta nota?',
          visual: pautaSVG(d, clave),
          opcoes: ops.map(function (x) { return NAT[x]; }),
          certa: ops.indexOf(certo),
          explica: 'É o <b>' + NAT[certo] + '</b>, ' + onde(d - base) + '.'
        };
      });
    }
  
    /* =====================================================================
     * AS 11 MISSÕES (chave = id do desafio: tipo-nivel)
     * ===================================================================== */
    const INTERV = [
      { s: 2, t: '2ª (grau conjunto)' }, { s: 4, t: '3ª' }, { s: 5, t: '4ª' }, { s: 7, t: '5ª' }, { s: 12, t: '8ª (oitava)' }
    ];
    const ESCALAS = [{ n: 'Dó maior', t: 60 }, { n: 'Sol maior', t: 67 }, { n: 'Fá maior', t: 65 }];
    const PASSOS_MAIOR = [2, 2, 1, 2, 2, 2, 1];
    const PADROES = [
      ['S', 'S', 'S', 'S'], ['M', 'S', 'S'], ['S', 'S', 'M'], ['S', 'CC', 'S', 'S'], ['CC', 'S', 'CC', 'S'],
      ['M', 'CC', 'S'], ['S', 'CC', 'M'], ['CC', 'CC', 'M'], ['S', 'M', 'S'], ['M', 'M'], ['CC', 'S', 'S', 'S'], ['S', 'S', 'CC', 'S']
    ];
    const ODE = [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62];   // Ode à Alegria (Beethoven, domínio público)
  
    function tocarRitmo(tokens, bpm) {
      const b = 60 / (bpm || 96); let t = 0;
      tokens.forEach(function (k) {
        if (k === 'S') { nota(72, t, 0.4); t += b; }
        else if (k === 'M') { nota(72, t, 1.1); t += 2 * b; }
        else { nota(72, t, 0.25); nota(72, t + b / 2, 0.25); t += b; }
      });
    }
    function tocarSequencia(midis, passo) { midis.forEach(function (m, k) { nota(m, k * passo, passo * 1.5); }); }
  
    const MISSOES = {
  
      /* ---------- FÁCIL ---------- */
  
      'partidas-facil': {
        icone: '🎹', titulo: 'Aquecimento no Piano', minimo: 0.6,
        ensino:
          '<p>Toda a música usa só <b>7 nomes de nota</b>: <b>Dó, Ré, Mi, Fá, Sol, Lá, Si</b>. Depois do Si, tudo recomeça no Dó, só que mais agudo.</p>' +
          '<p>Olhe as teclas pretas: elas vêm em grupos de <b>2</b> e de <b>3</b>. O <b>Dó</b> é a tecla branca logo à esquerda do grupo de 2 pretas. Ache o grupo e você acha todas as outras!</p>' +
          '<p>Toque no teclado abaixo para ouvir cada nota.</p>',
        demo: function (box) {
          const t = teclado(60, 71, function (m) { t.marcar(m, 'is-certa', 350); }, true);
          box.appendChild(t.el);
        },
        jogar: function (area, fim) {
          const total = 5, marcas = []; let i = 0, acertos = 0, anterior = -1;
          function rodada() {
            let alvo; do { alvo = 60 + sorteio(SEMI_NAT); } while (alvo === anterior);
            anterior = alvo;
            let tent = 0, travado = false;
            area.innerHTML = '';
            cabeca(area, total, marcas, i, 'Toque a nota <b>' + nome(alvo) + '</b>');
            const fb = novoFb();
            function encerrar() {
              area.appendChild(botaoProx(i, total, function () { i++; if (i < total) rodada(); else fim({ acertos: acertos, total: total }); })).focus();
            }
            const tec = teclado(60, 71, function (m) {
              if (travado) return;
              if (m === alvo) {
                travado = true; tec.marcar(m, 'is-certa', 0);
                const ok = tent === 0; marcas.push(ok); if (ok) acertos++;
                fb.className = 'nwm-fb ' + (ok ? 'ok' : 'x');
                fb.textContent = ok ? '✅ Isso mesmo!' : '✅ Achou! Na próxima, de primeira.';
                encerrar();
              } else {
                tent++; tec.marcar(m, 'is-errada', 500);
                if (tent >= 2) {
                  travado = true; marcas.push(false); tec.marcar(alvo, 'is-certa', 0);
                  fb.className = 'nwm-fb x';
                  fb.textContent = '❌ O ' + nome(alvo) + ' é a tecla destacada. Repare onde ela fica em relação às pretas.';
                  encerrar();
                } else {
                  fb.className = 'nwm-fb x'; fb.textContent = '❌ Essa é o ' + nome(m) + '. Tente de novo!';
                }
              }
            }, false);
            area.appendChild(tec.el); area.appendChild(fb);
          }
          rodada();
        }
      },
  
      'moedas-facil': {
        icone: '🎼', titulo: 'Caça-Notas na Pauta (Clave de Sol)', minimo: 0.6,
        ensino:
          '<p>A <b>pauta</b> tem 5 linhas e 4 espaços. A <b>clave de Sol</b> “abraça” a 2ª linha: é ali que mora o <b>Sol</b>.</p>' +
          '<p>Contando de baixo para cima, as <b>linhas</b> são <b>Mi, Sol, Si, Ré, Fá</b> e os <b>espaços</b> formam a palavra <b>Fá-Lá-Dó-Mi</b>.</p>' +
          '<p>Exemplo: esta nota está na 2ª linha, a linha da clave. É o Sol.</p>',
        demo: function (box) { box.appendChild($e('div', 'nwm-visual', pautaSVG(32, 'sol'))); },
        jogar: function (area, fim) {
          const dias = []; for (let d = 28; d <= 38; d++) dias.push(d);
          quiz(area, itensLeitura('sol', dias, 5), fim);
        }
      },
  
      'acertos-facil': {
        icone: '🥁', titulo: 'Siga o Pulso', minimo: 0.6,
        ensino:
          '<p>Toda música tem um <b>pulso</b>: a batidinha constante que faz você balançar o pé. Pense no coração, sempre no mesmo ritmo.</p>' +
          '<p>Agrupamos os pulsos em <b>compassos</b>. No compasso <b>4/4</b> contamos <b>1-2-3-4, 1-2-3-4</b>, e o “1” é o tempo mais forte.</p>' +
          '<p>Ouça o pulso e depois você vai bater junto com ele.</p>',
        exemplo: { rotulo: 'Ouvir o pulso', tocar: function () { for (let k = 0; k < 8; k++) clique(0.1 + k * 0.5, k % 4 === 0); } },
        jogar: function (area, fim) {
          const BPM = 80, passo = 60000 / BPM, CONT = 4, TOT = 8;
          area.innerHTML = '';
          area.appendChild($e('h3', 'nwm-enun', 'Bata no ritmo!'));
          area.appendChild($e('p', 'nwm-contagem', 'Ouça 4 batidas de contagem e depois bata junto nas 8 batidas seguintes. Use o botão, a tecla Espaço ou toque na tela.'));
          const bolas = $e('div', 'nwm-bolas'); bolas.setAttribute('aria-hidden', 'true');
          for (let k = 0; k < CONT + TOT; k++) bolas.appendChild($e('i', k < CONT ? 'cont' : ''));
          area.appendChild(bolas);
          const bumbo = $e('button', 'nwm-bumbo', '<span class="nwm-bumbo__ico" aria-hidden="true">🥁</span><span class="nwm-bumbo__txt">Começar</span>');
          bumbo.type = 'button';
          area.appendChild(bumbo);
          const fb = novoFb(); area.appendChild(fb);
          let estado = 'parado', t0 = 0; const taps = [];
  
          function iniciar() {
            estado = 'rodando'; contexto();
            t0 = performance.now() + 600;
            bumbo.querySelector('.nwm-bumbo__txt').textContent = 'Bata!';
            fb.className = 'nwm-fb'; fb.textContent = 'Contando… prepare-se!';
            for (let k = 0; k < CONT + TOT; k++) clique((t0 + k * passo - performance.now()) / 1000, k % 4 === 0);
            const fimT = t0 + (CONT + TOT) * passo + 350;
            (function quadro() {
              if (!area.isConnected) return;
              const agora = performance.now(), k = Math.floor((agora - t0) / passo);
              for (let b = 0; b < bolas.children.length; b++) bolas.children[b].classList.toggle('on', agora >= t0 && b === k);
              if (k >= CONT && fb.textContent !== 'Agora!') fb.textContent = 'Agora!';
              if (agora >= fimT) { encerrar(); return; }
              requestAnimationFrame(quadro);
            })();
          }
          function bater() {
            if (estado === 'parado') { iniciar(); return; }
            if (estado !== 'rodando') return;
            taps.push(performance.now());
            nota(55, 0, 0.12, 0.2);
            bumbo.classList.add('bateu'); setTimeout(function () { bumbo.classList.remove('bateu'); }, 90);
          }
          function encerrar() {
            estado = 'fim'; bumbo.disabled = true;
            const usados = {}; let acertos = 0, soma = 0;
            for (let b = CONT; b < CONT + TOT; b++) {
              const alvo = t0 + b * passo; let melhor = -1, dist = 1e9;
              taps.forEach(function (tp, j) { if (usados[j]) return; const d = Math.abs(tp - alvo); if (d < dist) { dist = d; melhor = j; } });
              const ok = melhor >= 0 && dist <= 200;
              if (ok) { usados[melhor] = 1; acertos++; soma += dist; }
              bolas.children[b].classList.remove('on'); bolas.children[b].classList.add(ok ? 'ok' : 'x');
            }
            fb.className = 'nwm-fb ' + (acertos >= 5 ? 'ok' : 'x');
            fb.textContent = 'Você acertou ' + acertos + ' de ' + TOT + ' batidas' + (acertos ? ' (erro médio de ' + Math.round(soma / acertos) + ' ms)' : '') + '.';
            area.appendChild(botao('Ver resultado', function () { fim({ acertos: acertos, total: TOT }); })).focus();
          }
          bumbo.addEventListener('pointerdown', function (e) { e.preventDefault(); bater(); });
          bumbo.addEventListener('keydown', function (e) {
            if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (!e.repeat) bater(); }
          });
          bumbo.addEventListener('keyup', function (e) { if (e.code === 'Space' || e.code === 'Enter') e.preventDefault(); });
          bumbo.focus();
        }
      },
  
      /* ---------- MÉDIO ---------- */
  
      'acertos-medio': {
        icone: '👂', titulo: 'Detetive de Intervalos', minimo: 0.6,
        ensino:
          '<p>Um <b>intervalo</b> é a distância entre duas notas. Quanto maior a distância, mais “aberto” o som.</p>' +
          '<p>Dicas para reconhecer de ouvido: a <b>2ª</b> é um passinho, como em “Ode à Alegria”. A <b>4ª</b> abre a Marcha Nupcial. A <b>5ª</b> abre “Brilha, brilha, estrelinha”. E a <b>8ª</b> é a mesma nota, só que mais aguda.</p>' +
          '<p>Ouça um exemplo de 5ª (Dó → Sol):</p>',
        exemplo: { rotulo: 'Ouvir uma 5ª', tocar: function () { nota(60, 0, 0.7); nota(67, 0.6, 0.9); } },
        jogar: function (area, fim) {
          const itens = embaralhar(INTERV).map(function (iv) {
            const base = sorteio([60, 62, 64, 65, 67]);
            const ops = embaralhar([iv].concat(embaralhar(INTERV.filter(function (x) { return x !== iv; })).slice(0, 3)));
            return {
              enunciado: 'Que intervalo você ouviu?',
              visual: '<p class="nwm-dica">Duas notas, uma depois da outra.</p>',
              som: function () { nota(base, 0, 0.7); nota(base + iv.s, 0.6, 0.9); },
              opcoes: ops.map(function (x) { return x.t; }), certa: ops.indexOf(iv),
              explica: 'Foram <b>' + nome(base) + '</b> e <b>' + nome(base + iv.s) + '</b>: ' + iv.s + ' semitons de distância, uma ' + iv.t + '.'
            };
          });
          quiz(area, itens, fim);
        }
      },
  
      'pontos-medio': {
        icone: '🪜', titulo: 'Monte a Escala', minimo: 0.6,
        ensino:
          '<p>Uma <b>escala maior</b> é uma “escada” de 8 notas. Entre uma nota e a seguinte há um <b>tom</b> (pula uma tecla) ou um <b>semitom</b> (tecla vizinha).</p>' +
          '<p>A receita é sempre a mesma: <b>tom, tom, semitom, tom, tom, tom, semitom</b>. Comece em qualquer nota, siga a receita e a escala sai maior!</p>' +
          '<p>Ouça a escala de Dó maior:</p>',
        exemplo: { rotulo: 'Ouvir Dó maior', tocar: function () { let m = 60; nota(m, 0, 0.4); PASSOS_MAIOR.forEach(function (p, k) { m += p; nota(m, (k + 1) * 0.22, 0.4); }); } },
        jogar: function (area, fim) {
          const total = ESCALAS.length, marcas = []; let i = 0, acertos = 0;
          function alvosDe(t) { const a = [t]; PASSOS_MAIOR.forEach(function (p) { a.push(a[a.length - 1] + p); }); return a; }
          function rodada() {
            const e = ESCALAS[i], alvos = alvosDe(e.t); let prox = 0, erros = 0, fechada = false;
            area.innerHTML = '';
            cabeca(area, total, marcas, i, 'Monte a escala de <b>' + e.n + '</b>');
            area.appendChild($e('p', 'nwm-dica', 'Comece no <b>' + nome(e.t) + '</b> e siga: tom, tom, <b>semitom</b>, tom, tom, tom, <b>semitom</b>.'));
            const prog = $e('p', 'nwm-contagem', 'Notas certas: 0 de 8');
            const fb = novoFb();
            const tec = teclado(60, 79, function (m) {
              if (fechada) return;
              if (m === alvos[prox]) {
                tec.marcar(m, 'is-certa', 0); prox++;
                prog.textContent = 'Notas certas: ' + prox + ' de 8'; fb.className = 'nwm-fb'; fb.textContent = '';
                if (prox === 8) {
                  fechada = true; const ok = erros <= 2; marcas.push(ok); if (ok) acertos++;
                  fb.className = 'nwm-fb ' + (ok ? 'ok' : 'x');
                  fb.textContent = (ok ? '✅ Escala completa! ' : '⚠️ Completou, mas com muitos tropeços. ') + 'Ouça como ficou.';
                  setTimeout(function () { if (area.isConnected) alvos.forEach(function (n, k) { nota(n, k * 0.22, 0.4); }); }, 300);
                  area.appendChild(botaoProx(i, total, function () { i++; if (i < total) rodada(); else fim({ acertos: acertos, total: total }); })).focus();
                }
              } else {
                erros++; tec.marcar(m, 'is-errada', 450); fb.className = 'nwm-fb x';
                fb.textContent = prox === 0
                  ? '❌ A escala começa no ' + nome(e.t) + '.'
                  : '❌ Depois do ' + nome(alvos[prox - 1]) + ' vem ' + (PASSOS_MAIOR[prox - 1] === 2 ? 'um tom (pule uma tecla, preta ou branca).' : 'um semitom (a tecla vizinha).');
              }
            }, false);
            area.appendChild(prog); area.appendChild(tec.el); area.appendChild(fb);
          }
          rodada();
        }
      },
  
      'sequencia-medio': {
        icone: '⏱️', titulo: 'Figuras e Tempos', minimo: 0.6,
        ensino:
          '<p>Cada figura musical dura um tempo diferente. No compasso 4/4, a <b>semínima</b> vale <b>1 tempo</b> e vira a nossa medida:</p>' +
          '<p><b>Semibreve</b> = 4 tempos · <b>Mínima</b> = 2 · <b>Semínima</b> = 1 · <b>Colcheia</b> = 1/2 · <b>Semicolcheia</b> = 1/4.</p>' +
          '<p>Um compasso 4/4 sempre soma <b>4 tempos</b>. Se faltar um pedaço, é só fazer a conta!</p>',
        demo: function (box) {
          const g = $e('div', 'nwm-figuras');
          [['semibreve', '4'], ['minima', '2'], ['seminima', '1'], ['colcheia', '1/2'], ['semicolcheia', '1/4']].forEach(function (f) {
            g.appendChild($e('div', 'nwm-figuras__item', figSVG(f[0]) + '<span>' + f[1] + '</span>'));
          });
          box.appendChild(g);
        },
        jogar: function (area, fim) {
          const FIG = [
            { t: 'semibreve', v: 4 }, { t: 'minima', v: 2 }, { t: 'seminima', v: 1 }, { t: 'colcheia', v: 0.5 }, { t: 'semicolcheia', v: 0.25 }
          ];
          const ROT = { 4: '4 tempos', 2: '2 tempos', 1: '1 tempo', 0.5: '1/2 tempo', 0.25: '1/4 de tempo', 3: '3 tempos' };
          function opcoesDe(certa, lista) {
            const ops = embaralhar(lista.filter(function (v) { return v !== certa; })).slice(0, 3).concat([certa]);
            ops.sort(function (a, b) { return b - a; });
            return ops;
          }
          const valores = embaralhar(FIG).slice(0, 3).map(function (f) {
            const ops = opcoesDe(f.v, [4, 2, 1, 0.5, 0.25]);
            return {
              enunciado: 'Quantos tempos vale esta figura?', visual: figSVG(f.t),
              opcoes: ops.map(function (v) { return ROT[v]; }), certa: ops.indexOf(f.v),
              explica: 'A ' + f.t + ' vale <b>' + ROT[f.v] + '</b> no compasso 4/4.'
            };
          });
          const MODELOS = [[2, 1], [1, 1], [2], [1, 2], [1, 1, 1], [2, 0.5, 0.5]];
          const NOME_V = { 2: 'minima', 1: 'seminima', 0.5: 'colcheia' };
          const compassos = embaralhar(MODELOS).slice(0, 2).map(function (m) {
            const soma = m.reduce(function (a, b) { return a + b; }, 0), falta = 4 - soma;
            const ops = opcoesDe(falta, [3, 2, 1, 0.5]);
            let vis = '<div class="nwm-compasso">';
            m.forEach(function (v) { vis += figSVG(NOME_V[v]); });
            vis += '<span class="nwm-lacuna" aria-label="lacuna">?</span></div>';
            return {
              enunciado: 'Complete o compasso 4/4: quanto falta?', visual: vis,
              opcoes: ops.map(function (v) { return ROT[v]; }), certa: ops.indexOf(falta),
              explica: 'Já temos ' + soma + ' tempo(s). 4 − ' + soma + ' = <b>' + ROT[falta] + '</b>.'
            };
          });
          quiz(area, valores.concat(compassos), fim);
        }
      },
  
      'estrelas-medio': {
        icone: '🎭', titulo: 'Maior ou Menor?', minimo: 0.6,
        ensino:
          '<p>Um <b>acorde</b> é um grupo de notas tocadas juntas. O mais simples, a <b>tríade</b>, tem 3 notas. O que muda o “humor” dele é a nota do meio:</p>' +
          '<p><b>Acorde maior</b> (3ª maior: 4 semitons + 3) soa <b>alegre e brilhante</b>. <b>Acorde menor</b> (3 semitons + 4) soa <b>triste ou misterioso</b>.</p>' +
          '<p>Compare os dois, ambos começando no Dó:</p>',
        demo: function (box) {
          const l = $e('div', 'nwm-linha');
          l.appendChild(botaoSom('Dó maior 😀', function () { acorde([60, 64, 67]); }));
          l.appendChild(botaoSom('Dó menor 😢', function () { acorde([60, 63, 67]); }));
          box.appendChild(l);
        },
        jogar: function (area, fim) {
          const tipos = embaralhar(['maior', 'maior', 'maior', 'menor', 'menor']);
          const itens = tipos.map(function (tp) {
            const raiz = sorteio([60, 62, 64, 65, 67, 69]), terca = tp === 'maior' ? 4 : 3;
            const notas = [raiz, raiz + terca, raiz + 7];
            return {
              enunciado: 'Este acorde é maior ou menor?',
              visual: '<p class="nwm-dica">Ouça com atenção ao “humor” do acorde.</p>',
              som: function () { notas.forEach(function (n, k) { nota(n, k * 0.3, 0.5, 0.2); }); acorde(notas, 1.1, 1.2); },
              opcoes: ['Maior 😀 (alegre)', 'Menor 😢 (triste)'], certa: tp === 'maior' ? 0 : 1,
              explica: 'Era um acorde de <b>' + nome(raiz) + ' ' + tp + '</b>: ' + (tp === 'maior' ? '4 + 3' : '3 + 4') + ' semitons.'
            };
          });
          quiz(area, itens, fim);
        }
      },
  
      /* ---------- DIFÍCIL ---------- */
  
      'estrelas-dificil': {
        icone: '🧠', titulo: 'Maestro da Memória', minimo: 0.6,
        ensino:
          '<p>Músicos treinam o <b>ouvido</b> e a <b>memória musical</b> repetindo melodias que acabaram de ouvir. É o “eco melódico”.</p>' +
          '<p>Truque dos profissionais: não decore nota por nota. Ouça o <b>desenho</b> da melodia (sobe, desce, repete) e então encontre as teclas.</p>' +
          '<p>Você terá 3 rodadas, cada uma com uma melodia maior que a anterior.</p>',
        jogar: function (area, fim) {
          const TAMS = [3, 4, 5], total = TAMS.length, marcas = [];
          const POOL = [60, 62, 64, 65, 67, 69, 71, 72];
          let i = 0, acertos = 0;
          function rodada() {
            const seq = []; for (let k = 0; k < TAMS[i]; k++) seq.push(sorteio(POOL));
            let pos = 0, travado = true, fechada = false;
            area.innerHTML = '';
            cabeca(area, total, marcas, i, 'Repita a melodia de <b>' + seq.length + ' notas</b>');
            const fb = novoFb();
            const tec = teclado(60, 72, function (m) {
              if (travado || fechada) return;
              pos++;
              if (m === seq[pos - 1]) {
                tec.marcar(m, 'is-certa', 350);
                if (pos === seq.length) {
                  fechada = true; marcas.push(true); acertos++;
                  fb.className = 'nwm-fb ok'; fb.textContent = '✅ Memória de maestro!'; seguir();
                }
              } else {
                fechada = true; marcas.push(false); tec.marcar(m, 'is-errada', 500);
                fb.className = 'nwm-fb x';
                fb.innerHTML = '❌ A melodia era: <b>' + seq.map(nome).join(' – ') + '</b>.'; seguir();
              }
            }, false);
            const ouvirBtn = botaoSom('Ouvir de novo', function () { if (pos === 0 && !fechada) ouvir(); });
            function seguir() {
              ouvirBtn.disabled = true;
              area.appendChild(botaoProx(i, total, function () { i++; if (i < total) rodada(); else fim({ acertos: acertos, total: total }); })).focus();
            }
            function ouvir() {
              travado = true; fb.className = 'nwm-fb'; fb.textContent = 'Ouça…';
              seq.forEach(function (m, k) {
                setTimeout(function () { if (!area.isConnected) return; nota(m, 0, 0.55); tec.marcar(m, 'is-guia', 420); }, k * 650 + 250);
              });
              setTimeout(function () { if (!area.isConnected) return; travado = false; fb.textContent = 'Sua vez!'; }, seq.length * 650 + 300);
            }
            area.appendChild(ouvirBtn); area.appendChild(tec.el); area.appendChild(fb);
            ouvir();
          }
          rodada();
        }
      },
  
      'semErros-dificil': {
        icone: '🎻', titulo: 'Clave de Fá', minimo: 0.8,
        ensino:
          '<p>A <b>clave de Fá</b> é a clave dos sons graves: mão esquerda do piano, violoncelo, baixo, tuba. Os dois pontinhos ficam em volta da <b>4ª linha</b>, onde mora o <b>Fá</b>.</p>' +
          '<p>Na clave de Fá, as <b>linhas</b>, de baixo para cima, são <b>Sol, Si, Ré, Fá, Lá</b>. Os <b>espaços</b> são <b>Lá, Dó, Mi, Sol</b>.</p>' +
          '<p>Atenção: as mesmas posições têm nomes diferentes da clave de Sol! Para passar, você precisa acertar pelo menos 4 de 5.</p>',
        demo: function (box) { box.appendChild($e('div', 'nwm-visual', pautaSVG(24, 'fa'))); },
        jogar: function (area, fim) {
          const dias = []; for (let d = 17; d <= 27; d++) dias.push(d);
          const itens = itensLeitura('fa', dias, 5);
          itens.forEach(function (it) { it.enunciado = 'Qual é o nome desta nota na clave de Fá?'; });
          quiz(area, itens, fim);
        }
      },
  
      'sequencia-dificil': {
        icone: '🎧', titulo: 'Ditado Rítmico', minimo: 0.6,
        ensino:
          '<p>Um <b>ditado rítmico</b> é ouvir um ritmo e descobrir como ele se escreve. Músicos usam sílabas para ler ritmos:</p>' +
          '<p><b>ta</b> = semínima (1 tempo) · <b>ti-ti</b> = duas colcheias (1 tempo dividido ao meio) · <b>ta-a</b> = mínima (2 tempos).</p>' +
          '<p>Ouça e leia este ritmo: <b>ta ta ti-ti ta</b>.</p>',
        demo: function (box) { box.appendChild($e('div', 'nwm-visual', ritmoSVG(['S', 'S', 'CC', 'S']))); },
        exemplo: { rotulo: 'Ouvir “ta ta ti-ti ta”', tocar: function () { tocarRitmo(['S', 'S', 'CC', 'S']); } },
        jogar: function (area, fim) {
          const itens = embaralhar(PADROES).slice(0, 5).map(function (certo) {
            const outros = embaralhar(PADROES.filter(function (p) { return p !== certo; })).slice(0, 2);
            const ops = embaralhar([certo].concat(outros));
            const fala = function (p) { return p.map(function (t) { return SILABA[t]; }).join(' '); };
            return {
              enunciado: 'Qual ritmo você ouviu?',
              visual: '<p class="nwm-dica">Cada ritmo dura 4 tempos.</p>',
              som: function () { tocarRitmo(certo); },
              opcoes: ops.map(ritmoSVG), rotulos: ops.map(fala), certa: ops.indexOf(certo),
              explica: 'Você ouviu: <b>' + fala(certo) + '</b>.'
            };
          });
          quiz(area, itens, fim);
        }
      },
  
      'partidas-dificil': {
        icone: '🎶', titulo: 'Concerto Completo: Ode à Alegria', minimo: 0.6,
        ensino:
          '<p>Uma <b>melodia</b> é uma sequência de notas que forma uma “frase”. Hoje você vai tocar o tema de <b>Ode à Alegria</b>, de Beethoven, um dos mais famosos do mundo.</p>' +
          '<p>Ele anda quase sempre por <b>graus conjuntos</b> (notas vizinhas): Mi Mi Fá Sol, Sol Fá Mi Ré, Dó Dó Ré Mi, Mi Ré Ré.</p>' +
          '<p>Dividimos em <b>3 trechos</b>: no 1º a tecla acende, no 2º só os nomes aparecem, no 3º você toca de memória.</p>',
        exemplo: { rotulo: 'Ouvir a melodia', tocar: function () { tocarSequencia(ODE, 0.45); } },
        jogar: function (area, fim) {
          const segs = [ODE.slice(0, 5), ODE.slice(5, 10), ODE.slice(10, 15)], modos = ['guia', 'nomes', 'memoria'];
          const total = 3, marcas = []; let i = 0, acertos = 0;
          function rodada() {
            const notas = segs[i], modo = modos[i]; let pos = 0, erros = 0, travado = true, fechada = false;
            area.innerHTML = '';
            cabeca(area, total, marcas, i,
              modo === 'guia' ? 'Siga a tecla que acende' : modo === 'nomes' ? 'Siga os nomes das notas' : 'Toque de memória',
              'Trecho ' + (i + 1) + ' de ' + total);
            if (modo === 'nomes') area.appendChild($e('p', 'nwm-nomes', notas.map(nome).join(' · ')));
            const fb = novoFb();
            const tec = teclado(60, 71, function (m) {
              if (travado || fechada) return;
              if (m === notas[pos]) {
                tec.marcar(m, 'is-certa', 400); pos++;
                if (modo === 'guia') { tec.limpar('is-guia'); if (pos < notas.length) tec.marcar(notas[pos], 'is-guia', 0); }
                if (pos === notas.length) {
                  fechada = true; const ok = erros <= 1; marcas.push(ok); if (ok) acertos++;
                  fb.className = 'nwm-fb ' + (ok ? 'ok' : 'x');
                  fb.textContent = ok ? '✅ Trecho completo!' : '⚠️ Completou, mas com muitos tropeços.';
                  ouvirBtn.disabled = true;
                  area.appendChild(botaoProx(i, total, function () { i++; if (i < total) rodada(); else fim({ acertos: acertos, total: total }); })).focus();
                }
              } else {
                erros++; tec.marcar(m, 'is-errada', 400); fb.className = 'nwm-fb x';
                fb.textContent = '❌ Essa foi o ' + nome(m) + '. Escute o trecho de novo se precisar.';
              }
            }, false);
            const ouvirBtn = botaoSom('Ouvir o trecho', function () { if (pos === 0 && !fechada) ouvir(); });
            function ouvir() {
              travado = true; tec.limpar('is-guia'); fb.className = 'nwm-fb'; fb.textContent = 'Ouça…';
              notas.forEach(function (m, k) {
                setTimeout(function () { if (!area.isConnected) return; nota(m, 0, 0.5); tec.marcar(m, 'is-guia', 380); }, k * 520 + 250);
              });
              setTimeout(function () {
                if (!area.isConnected) return;
                travado = false; fb.textContent = 'Sua vez!';
                if (modo === 'guia') tec.marcar(notas[0], 'is-guia', 0);
              }, notas.length * 520 + 300);
            }
            area.appendChild(ouvirBtn); area.appendChild(tec.el); area.appendChild(fb);
            ouvir();
          }
          rodada();
        }
      }
    };
  
    /* =====================================================================
     * JANELA DA MISSÃO (aprenda → pratique → resultado)
     * ===================================================================== */
    const NIVEIS = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };
  
    function abrir(ch, opc) {
      opc = opc || {};
      const def = MISSOES[ch.id];
      if (!def) return false;
  
      const raiz = document.getElementById('nw-runner') || document.body;
      const anterior = document.activeElement;
      const overflowAntes = document.body.style.overflow;
  
      const fundo = $e('div', 'nwm');
      const caixa = $e('div', 'nwm__caixa');
      caixa.setAttribute('role', 'dialog'); caixa.setAttribute('aria-modal', 'true');
      caixa.setAttribute('aria-labelledby', 'nwm-titulo'); caixa.tabIndex = -1;
  
      const topo = $e('div', 'nwm__topo');
      const tit = $e('div', 'nwm__tit');
      const etapa = $e('p', 'nwm__etapa');
      const h2 = $e('h2'); h2.id = 'nwm-titulo'; h2.textContent = def.icone + ' ' + def.titulo;
      tit.appendChild(etapa); tit.appendChild(h2);
      const x = $e('button', 'nwm__fechar', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Fechar missão');
      topo.appendChild(tit); topo.appendChild(x);
      const corpo = $e('div', 'nwm__corpo');
      caixa.appendChild(topo); caixa.appendChild(corpo);
      fundo.appendChild(caixa); raiz.appendChild(fundo);
      document.body.style.overflow = 'hidden';
  
      function fechar() {
        document.removeEventListener('keydown', teclas, true);
        fundo.remove();
        document.body.style.overflow = overflowAntes;
        if (anterior && anterior.focus) anterior.focus({ preventScroll: true });
      }
      function teclas(e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(); return; }
        if (e.key !== 'Tab') return;
        const f = Array.prototype.filter.call(caixa.querySelectorAll('button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])'),
          function (n) { return n.offsetParent !== null; });
        if (!f.length) { e.preventDefault(); return; }
        const a = f[0], z = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === a || document.activeElement === caixa)) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
      document.addEventListener('keydown', teclas, true);
      x.addEventListener('click', fechar);
      fundo.addEventListener('pointerdown', function (e) { if (e.target === fundo) fechar(); });
  
      function passo(txt) { etapa.textContent = txt; }
  
      /* Passo 1: aprender */
      function mostrarEnsino() {
        passo('Passo 1 de 3: aprenda');
        corpo.innerHTML = '';
        corpo.appendChild($e('p', 'nwm-desafio', '<span class="nwm-nivel nwm-nivel--' + ch.tier + '">' + (NIVEIS[ch.tier] || '') + '</span> Desafio do dia: <b>' + ch.titulo + '</b>'));
        corpo.appendChild($e('div', 'nwm-ensino', def.ensino));
        if (def.demo) { const d = $e('div', 'nwm-demo'); def.demo(d); corpo.appendChild(d); }
        if (!somLigado()) corpo.appendChild($e('p', 'nwm-aviso', '🔇 O som do jogo está desligado. Ligue em “Som”, na aba Jogar, para ouvir as notas.'));
        const acoes = $e('div', 'nwm-acoes');
        if (def.exemplo) acoes.appendChild(botaoSom(def.exemplo.rotulo, def.exemplo.tocar));
        acoes.appendChild(botao('Começar a prática', function () { contexto(); mostrarPratica(); }));
        corpo.appendChild(acoes);
        caixa.focus({ preventScroll: true });
      }
  
      /* Passo 2: praticar */
      function mostrarPratica() {
        passo('Passo 2 de 3: pratique');
        corpo.innerHTML = '';
        const area = $e('div', 'nwm-area');
        corpo.appendChild(area);
        def.jogar(area, function (res) { if (area.isConnected) finalizar(res); });
      }
  
      /* Passo 3: resultado */
      function finalizar(res) {
        const razao = res.acertos / res.total;
        const passou = razao >= def.minimo - 1e-9;
        const estrelas = razao >= 1 ? 3 : razao >= 0.8 ? 2 : passou ? 1 : 0;
        let novo = false;
        estudo.registrarHoje();                                   // praticar já conta como dia de estudo
        if (passou) novo = estudo.marcar(opc.dia || dataLocal(), ch.id);
        mostrarResultado(res, passou, estrelas, novo);
        if (passou && opc.aoConcluir) opc.aoConcluir({ id: ch.id, novo: novo, estrelas: estrelas });
      }
  
      function mostrarResultado(res, passou, estrelas, novo) {
        passo('Passo 3 de 3: resultado');
        corpo.innerHTML = '';
        const r = $e('div', 'nwm-res');
        r.appendChild($e('p', 'nwm-res__estrelas', '<span aria-label="' + estrelas + ' de 3 estrelas">' + '★'.repeat(estrelas) + '<i>' + '★'.repeat(3 - estrelas) + '</i></span>'));
        r.appendChild($e('h3', 'nwm-res__titulo',
          !passou ? 'Quase lá!' : estrelas === 3 ? 'Perfeito!' : estrelas === 2 ? 'Muito bem!' : 'Missão cumprida!'));
        r.appendChild($e('p', 'nwm-res__nota', 'Você acertou <b>' + res.acertos + ' de ' + res.total + '</b>.' +
          (passou ? '' : ' Releia a dica e tente de novo: você precisa de pelo menos ' + Math.ceil(def.minimo * res.total - 1e-9) + '.')));
        if (passou) {
          const seq = estudo.sequencia(), tot = estudo.total();
          r.appendChild($e('ul', 'nwm-res__lista',
            '<li>🔥 Sequência de estudos: <b>' + seq + (seq === 1 ? ' dia' : ' dias') + '</b></li>' +
            '<li>📈 ' + (novo ? 'Missão nova no seu progresso geral' : 'Você já tinha concluído esta missão hoje') +
            ': <b>' + Math.min(tot, estudo.META) + ' de ' + estudo.META + '</b> missões</li>'));
        }
        const acoes = $e('div', 'nwm-acoes');
        if (passou && def.exemplo) acoes.appendChild(botaoSom(def.exemplo.rotulo, def.exemplo.tocar));
        acoes.appendChild(botao(passou ? 'Praticar de novo' : 'Tentar de novo', mostrarPratica, passou));
        if (!passou) acoes.appendChild(botao('Rever a dica', mostrarEnsino, true));
        acoes.appendChild(botao(passou ? 'Concluir' : 'Fechar', fechar, !passou));
        r.appendChild(acoes);
        corpo.appendChild(r);
        caixa.focus({ preventScroll: true });
      }
  
      mostrarEnsino();
      return true;
    }
  
    NW.missoes = {
      abrir: abrir,
      definicao: function (id) { const d = MISSOES[id]; return d ? { titulo: d.titulo, icone: d.icone } : null; },
      feita: function (dia, id) { return estudo.feita(dia, id); }
    };
  })(window.NWRunner = window.NWRunner || {});