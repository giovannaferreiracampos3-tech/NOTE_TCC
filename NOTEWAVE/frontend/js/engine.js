/* Notinha Runner — motor do jogo (canvas 2D).
 * Responsabilidades: loop, física do pulo, moedas, colisões, rodadas, pontuação e desenho.
 * NÃO mexe no DOM da interface: avisa a UI por callbacks (aoHud, aoPergunta, aoFim).
 */
(function (NW) {
  'use strict';

  // Coordenadas lógicas: o canvas é desenhado em 960x540 e escalado para a tela.
  const L = { W: 960, H: 540, CHAO: 450, PX: 190 };

  const C = {
    VEL: 340,                 // px/s (corrida automática)
    SALTO_ALT: 190,           // altura fixa do pulo
    SALTO_DUR: 0.72,          // duração fixa do pulo (s)
    TAM_ROD: 1750,            // distância entre uma rodada e a próxima
    LARGADA: 1100,            // distância até a 1ª rodada
    CARTA_H: 112,
    CARTA_MIN_W: 128,
    CARTA_MAX_W: 250,
    CARTA_FOLGA: 280,         // espaço mínimo entre as duas alternativas
    PERSONAGEM_H: 168,           // altura com que o quadro do Notinha é desenhado
    CX_ESQ: 32, CX_DIR: 108,  // caixa de colisão do Notinha (relativa ao desenho)
    CX_TOPO: 118, CX_BASE: 8,
    MOEDA_R: 16,
    FIM_EXTRA: 520
  };

  // Sprite: tira horizontal com 16 quadros transparentes (290x251 cada).
// CORPO_X = centro do corpo no quadro; CHAO_Y = linha do chão no quadro.
const FRAME_W = 290, FRAME_H = 251, FRAMES = 16;
  const CORPO_X = 144, CHAO_Y = 244;
  const QUADROS_CORRIDA = 15;   // quadros 0–14 = ciclo de corrida
  const QUADRO_PULO = 15;       // quadro 15 = no ar
  const FONTE = 'Fredoka, "Baloo 2", Nunito, "Segoe UI", system-ui, sans-serif';

  const REGRAS = {
    ACERTO: 2,
    ERRO: -2,
    // Pontuação sempre par: 16–20 → 3★, 10–14 → 2★, 2–8 → 1★, 0 ou menos → 0★
    estrelas: function (p) { return p >= 16 ? 3 : p >= 10 ? 2 : p >= 2 ? 1 : 0; }
  };

  const PALETAS = {
    claro: {
      ceuTopo: '#bfe2ff', ceuBase: '#eef8ff', nuvem: 'rgba(255,255,255,.85)',
      longe: '#b3d0f1', perto: '#93b7e6', janela: 'rgba(60,100,170,.35)',
      chao: '#16306b', chaoArco: '#10265a', borda: '#35d3ff', nota: 'rgba(40,120,220,.28)',
      cartaFundo: '#ffffff', cartaBorda: '#8fd8ff', cartaTexto: '#0b2459', cartaIcone: '#1b5fd0',
      estrelas: false, textoFlut: '#0b2459'
    },
    escuro: {
      ceuTopo: '#061030', ceuBase: '#14337f', nuvem: 'rgba(120,160,255,.14)',
      longe: '#122b66', perto: '#1b3f8f', janela: 'rgba(90,200,255,.35)',
      chao: '#081a47', chaoArco: '#06143a', borda: '#2ad0ff', nota: 'rgba(90,200,255,.30)',
      cartaFundo: '#12307a', cartaBorda: '#3cc9ff', cartaTexto: '#f2f8ff', cartaIcone: '#7fe0ff',
      estrelas: true, textoFlut: '#ffffff'
    }
  };

  // ---------- utilidades ----------
  function semente(s) { return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  function gerarSilhuetas(seed, periodo, hMin, hMax) {
    const r = semente(seed), lista = [];
    let x = r() * 60;
    while (x < periodo - 140) {
      const w = 70 + r() * 80, h = hMin + r() * (hMax - hMin), t = r();
      lista.push({ x: x, w: w, h: h, tipo: t < 0.4 ? 'torre' : t < 0.75 ? 'castelo' : 'cupula' });
      x += w + 30 + r() * 110;
    }
    return lista;
  }
  const SIL_LONGE = gerarSilhuetas(7, 1920, 120, 220);
  const SIL_PERTO = gerarSilhuetas(21, 1600, 70, 150);

  const NOTAS_DECOR = (function () {
    const r = semente(99), a = [];
    for (let i = 0; i < 9; i++) a.push({ x: r() * 1800, y: 90 + r() * 240, s: 26 + r() * 18, c: r() < 0.5 ? '\u266A' : '\u266B', f: r() * 6 });
    return a;
  })();
  const ESTRELAS_CEU = (function () {
    const r = semente(5), a = [];
    for (let i = 0; i < 46; i++) a.push({ x: r() * L.W, y: r() * 300, r: 0.8 + r() * 1.6, f: r() * 6 });
    return a;
  })();

  function retArred(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function carregarSprite(src) {
    return new Promise(function (ok) {
      const img = new Image();
      img.onload = function () { ok(img); };
      img.onerror = function () { ok(null); };   // o jogo roda com um desenho simples se faltar a imagem
      img.src = src;
    });
  }

  // ---------- fábrica do jogo ----------
  function criar(opc) {
    const canvas = opc.canvas, sprite = opc.sprite || null;
    const som = opc.som || NW.som;
    const aoHud = opc.aoHud || function () {};
    const aoPergunta = opc.aoPergunta || function () {};
    const aoFim = opc.aoFim || function () {};

    const ctx = canvas.getContext('2d');
    let escala = 1, temaAtual = PALETAS[opc.tema] ? opc.tema : 'claro', paleta = PALETAS[temaAtual];

    // ----- visual escolhido na loja (acessórios, efeito, cenário) -----
    let visual = { acessorios: {}, efeito: null, cenario: 'castelo' }, camadas = [], parts = [], efT = 0;
    function montarPaleta() {
      const cen = NW.loja ? NW.loja.cenario(visual.cenario) : null;
      paleta = Object.assign({}, PALETAS[temaAtual], (cen && cen[temaAtual]) || {});
    }
    function imagemDe(uri) { if (!uri) return null; const im = new Image(); im.src = uri; return im; }
    function definirVisual(v) {
      visual = { acessorios: Object.assign({}, v && v.acessorios), efeito: (v && v.efeito) || null, cenario: (v && v.cenario) || 'castelo' };
      camadas = [];
      if (NW.loja) {
        NW.loja.SLOTS.forEach(function (sl) {
          const it = NW.loja.item(visual.acessorios[sl.id]);
          if (it) camadas.push({ tras: imagemDe(NW.loja.svgCamada(it, 'tras', 520)), frente: imagemDe(NW.loja.svgCamada(it, 'frente', 520)) });
        });
      }
      parts = [];
      montarPaleta();
    }

    let modo = 'vitrine';       // vitrine | jogando | pausado | fim
    let modoAntesPausa = 'jogando';
    let cam = 0, relogio = 0, tempoJogo = 0, ultimo = 0, rafId = 0;
    let rodadas = [], moedas = [], textos = [];
    let idxAtual = 0, pontos = 0, moedasColetadas = 0, acertos = 0, erros = 0, semResposta = 0;
    let respostas = [], fimT = 0, fimEnviado = false, velAtual = C.VEL;
    const p = { desl: 0, pulando: false, t: 0, pouso: 0, festa: 0 };

    // ----- tamanho -----
    function redimensionar() {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(2, Math.round(r.width * dpr));
      canvas.height = Math.max(2, Math.round(r.height * dpr));
      escala = canvas.width / L.W;
    }
    if (window.ResizeObserver) new ResizeObserver(redimensionar).observe(canvas);
    window.addEventListener('resize', redimensionar);
    redimensionar();

    // ----- construção da partida -----
    function medirCarta(texto) {
      ctx.save();
      let fs = 32;
      ctx.font = '700 ' + fs + 'px ' + FONTE;
      while (ctx.measureText(texto).width > C.CARTA_MAX_W - 36 && fs > 18) {
        fs -= 2; ctx.font = '700 ' + fs + 'px ' + FONTE;
      }
      const w = Math.min(C.CARTA_MAX_W, Math.max(C.CARTA_MIN_W, ctx.measureText(texto).width + 36));
      ctx.restore();
      return { w: w, fs: fs };
    }

    function montarRodadas(perguntas) {
      rodadas = perguntas.map(function (q, i) {
        const xA = C.LARGADA + i * C.TAM_ROD;
        const ladoCerto = Math.random() < 0.5 ? 0 : 1;      // 0 = alternativa da esquerda
        const textos2 = [ladoCerto === 0 ? q.opcoes[0] : q.opcoes[1], ladoCerto === 0 ? q.opcoes[1] : q.opcoes[0]];
        const medA = medirCarta(textos2[0]), medB = medirCarta(textos2[1]);
        const xB = xA + Math.max(400, medA.w + C.CARTA_FOLGA);
        const cartas = [
          { lado: 0, x: xA, w: medA.w, fs: medA.fs, texto: textos2[0], correta: ladoCerto === 0 },
          { lado: 1, x: xB, w: medB.w, fs: medB.fs, texto: textos2[1], correta: ladoCerto === 1 }
        ].map(function (c) {
          c.h = 120 + Math.random() * 45;      // altura da base da carta em relação ao chão
          c.estado = 'ativa';                  // ativa | certa | errada | bloqueada
          c.t = 0;
          return c;
        });
        return { q: q, cartas: cartas, resolvida: false, tResolvida: 0, fimX: xB + medB.w };
      });
    }

    function montarMoedas() {
      moedas = [];
      rodadas.forEach(function (rd, i) {
        const ini = i === 0 ? 260 : rodadas[i - 1].fimX + 170;
        const fim = rd.cartas[0].x - 230;
        const grupos = 2 + Math.floor(Math.random() * 3);          // 2 a 4 grupos
        const usados = [];
        for (let g = 0; g < grupos; g++) {
          const qtd = 2 + Math.floor(Math.random() * 3);           // 2 a 4 moedas por grupo
          const larg = (qtd - 1) * 50;
          for (let tent = 0; tent < 12; tent++) {
            const x0 = ini + Math.random() * Math.max(10, fim - ini - larg);
            const livre = usados.every(function (u) { return x0 > u[1] + 60 || x0 + larg < u[0] - 60; });
            if (livre) {
              usados.push([x0, x0 + larg]);
              for (let k = 0; k < qtd; k++) moedas.push({ x: x0 + k * 50, pega: false, f: Math.random() * 6 });
              break;
            }
          }
        }
      });
    }

    function emitirHud() {
      aoHud({
        rodada: Math.min(idxAtual + 1, rodadas.length), total: rodadas.length,
        pontos: pontos, moedas: moedasColetadas, estrelas: REGRAS.estrelas(pontos)
      });
    }

    function iniciar(perguntas) {
      montarRodadas(perguntas);
      montarMoedas();
      cam = 0; relogio = 0; tempoJogo = 0; idxAtual = 0;
      pontos = 0; moedasColetadas = 0; acertos = 0; erros = 0; semResposta = 0;
      respostas = []; textos = []; parts = []; fimT = 0; fimEnviado = false; velAtual = C.VEL;
      p.desl = 0; p.pulando = false; p.t = 0; p.pouso = 0; p.festa = 0;
      modo = 'jogando';
      emitirHud();
      aoPergunta(rodadas[0].q, 1, rodadas.length);
    }

    // ----- controles -----
    function pular() {
      if (modo !== 'jogando' || p.pulando) return false;   // só pula depois de aterrissar
      p.pulando = true; p.t = 0; p.pouso = 0;
      som.pulo();
      return true;
    }
    function pausar() { if (modo === 'jogando') { modo = 'pausado'; modoAntesPausa = 'jogando'; } }
    function continuar() { if (modo === 'pausado') { modo = modoAntesPausa; ultimo = 0; } }
    function parar() { modo = 'vitrine'; rodadas = []; moedas = []; textos = []; parts = []; p.pulando = false; p.desl = 0; }

    // ----- lógica -----
    function flutuar(x, y, txt, cor) { textos.push({ x: x, y: y, txt: txt, cor: cor, t: 0 }); }

    function resolverRodada(rd, carta) {
      rd.resolvida = true; rd.tResolvida = relogio;
      let ganho = 0;
      if (carta) {
        carta.t = 0;
        rd.cartas.forEach(function (c) { if (c !== carta) c.estado = 'bloqueada'; });  // uma resposta por rodada
        if (carta.correta) { carta.estado = 'certa'; ganho = REGRAS.ACERTO; acertos++; som.certo(); }
        else { carta.estado = 'errada'; ganho = REGRAS.ERRO; erros++; som.erro(); }
        pontos += ganho;
        const sx = L.PX + (carta.x - cam) + carta.w / 2;
        flutuar(sx, L.CHAO - carta.h - C.CARTA_H - 10, (ganho > 0 ? '+' : '\u2212') + Math.abs(ganho), ganho > 0 ? '#1fbf6a' : '#ff4d63');
      } else {
        semResposta++;
      }
      respostas.push({
        pergunta_id: rd.q.id,
        escolhida: carta ? carta.texto : null,
        correta: carta ? carta.correta : null,
        pontos: ganho
      });
      emitirHud();
    }

    function emitirEfeito(dt) {
      if (!visual.efeito || visual.efeito === 'aura') return;
      efT += dt;
      const cx = L.PX + (C.CX_ESQ + C.CX_DIR) / 2, base = L.CHAO - p.desl, r = Math.random;
      if (visual.efeito === 'rastro-notas') {
        while (efT > 0.17) {
          efT -= 0.17;
          parts.push({ k: 'nota', x: cx - 34, y: base - 30 - r() * 80, vx: -110 - r() * 60, vy: -24 - r() * 30, t: 0, vida: 1.2, c: r() < 0.5 ? '\u266A' : '\u266B', s: 22 + r() * 12 });
        }
      } else if (visual.efeito === 'brilhos') {
        while (efT > 0.05) {
          efT -= 0.05;
          parts.push({ k: 'brilho', x: cx - 70 + r() * 110, y: base - 14 - r() * 150, vx: -130 - r() * 90, vy: -12 + r() * 24, t: 0, vida: 0.7, s: 5 + r() * 7 });
        }
      }
      parts.forEach(function (q) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; });
      parts = parts.filter(function (q) { return q.t < q.vida; });
    }

    function atualizar(dt) {
      relogio += dt;
      emitirEfeito(dt);

      // pulo (altura e duração fixas; segurar o botão não muda nada)
      if (p.pulando) {
        p.t += dt;
        const u = p.t / C.SALTO_DUR;
        if (u >= 1) { p.pulando = false; p.desl = 0; p.pouso = 0.14; }
        else p.desl = 4 * C.SALTO_ALT * u * (1 - u);
      } else if (p.pouso > 0) p.pouso -= dt;

      if (modo === 'fim') {
        fimT += dt;
        velAtual = Math.max(0, C.VEL * (1 - fimT / 0.9));
        cam += velAtual * dt;
        if (!p.pulando && fimT < 1.0) { p.pulando = true; p.t = 0; }   // comemoração
        if (fimT > 1.15 && !fimEnviado) { fimEnviado = true; aoFim(resultado()); }
        return;
      }

      tempoJogo += dt;
      cam += C.VEL * dt;

      const hbL = cam + C.CX_ESQ, hbR = cam + C.CX_DIR;
      const hbTopo = L.CHAO - p.desl - C.CX_TOPO, hbBase = L.CHAO - p.desl - C.CX_BASE;

      // moedas: basta passar por cima, sem pular
      for (let i = 0; i < moedas.length; i++) {
        const m = moedas[i];
        if (m.pega || m.x < cam - 80 || m.x > cam + 400) continue;
        const cy = L.CHAO - 32;
        const px = Math.max(hbL, Math.min(m.x, hbR)), py = Math.max(hbTopo, Math.min(cy, hbBase));
        if ((px - m.x) * (px - m.x) + (py - cy) * (py - cy) <= C.MOEDA_R * C.MOEDA_R) {
          m.pega = true; moedasColetadas++; som.moeda();
          emitirHud();
        }
      }

      // alternativas: colisão individual; cada rodada só registra UM resultado
      for (let r = 0; r < rodadas.length; r++) {
        const rd = rodadas[r];
        if (rd.resolvida) continue;
        if (cam + 200 < rd.cartas[0].x) break;                       // ainda longe
        for (let k = 0; k < rd.cartas.length; k++) {
          const c = rd.cartas[k];
          if (c.estado !== 'ativa') continue;
          const cTopo = L.CHAO - c.h - C.CARTA_H, cBase = L.CHAO - c.h;
          if (hbR > c.x && hbL < c.x + c.w && hbBase > cTopo && hbTopo < cBase) { resolverRodada(rd, c); break; }
        }
        if (!rd.resolvida && cam + C.CX_ESQ > rd.fimX) resolverRodada(rd, null);   // passou sem tocar
      }

      // pergunta exibida no topo
      while (idxAtual < rodadas.length - 1) {
        const rd = rodadas[idxAtual];
        if (rd.resolvida && relogio - rd.tResolvida > 0.9) {
          idxAtual++;
          aoPergunta(rodadas[idxAtual].q, idxAtual + 1, rodadas.length);
          emitirHud();
        } else break;
      }

      // fim da partida
      const ultima = rodadas[rodadas.length - 1];
      if (ultima.resolvida && cam > ultima.fimX + C.FIM_EXTRA * 0.4) { modo = 'fim'; fimT = 0; som.fim(); }
    }

    function resultado() {
      return {
        pontos: pontos, moedas: moedasColetadas, acertos: acertos, erros: erros,
        semResposta: semResposta, estrelas: REGRAS.estrelas(pontos),
        duracao_ms: Math.round(tempoJogo * 1000), respostas: respostas.slice()
      };
    }

    // ----- desenho -----
    function mod(a, b) { return ((a % b) + b) % b; }

    function desenharSilhueta(s, sx, cor, janela) {
      const base = L.CHAO + 4, topo = base - s.h;
      ctx.fillStyle = cor;
      if (s.tipo === 'torre') {
        const w = s.w * 0.55, x = sx + (s.w - w) / 2;
        ctx.fillRect(x, topo, w, s.h);
        ctx.beginPath(); ctx.moveTo(x - 6, topo); ctx.lineTo(x + w / 2, topo - w * 0.9); ctx.lineTo(x + w + 6, topo); ctx.closePath(); ctx.fill();
        ctx.fillStyle = janela; ctx.fillRect(x + w / 2 - 4, topo + 22, 8, 16);
      } else if (s.tipo === 'castelo') {
        ctx.fillRect(sx, topo, s.w, s.h);
        for (let cx = sx; cx < sx + s.w - 8; cx += 18) ctx.fillRect(cx, topo - 9, 10, 9);
        ctx.fillStyle = janela;
        ctx.fillRect(sx + s.w * 0.25, topo + 26, 8, 15);
        ctx.fillRect(sx + s.w * 0.65, topo + 26, 8, 15);
      } else {
        ctx.fillRect(sx, topo + 26, s.w, s.h - 26);
        ctx.beginPath(); ctx.ellipse(sx + s.w / 2, topo + 26, s.w / 2, 30, 0, Math.PI, 0); ctx.fill();
        ctx.fillRect(sx + s.w / 2 - 2, topo - 12, 4, 14);
        ctx.fillStyle = janela; ctx.fillRect(sx + s.w / 2 - 4, topo + 44, 8, 16);
      }
    }

    function desenharFundo() {
      const P = paleta;
      const g = ctx.createLinearGradient(0, 0, 0, L.CHAO);
      g.addColorStop(0, P.ceuTopo); g.addColorStop(1, P.ceuBase);
      ctx.fillStyle = g; ctx.fillRect(0, 0, L.W, L.H);

      if (P.estrelas) {
        ctx.fillStyle = '#cfe6ff';
        ESTRELAS_CEU.forEach(function (e) {
          ctx.globalAlpha = 0.45 + 0.45 * Math.sin(relogio * 1.6 + e.f);
          ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 6.283); ctx.fill();
        });
        ctx.globalAlpha = 1;
      }

      // nuvens
      ctx.fillStyle = P.nuvem;
      for (let i = 0; i < 4; i++) {
        const x = mod(i * 340 - cam * 0.06, L.W + 240) - 120, y = 70 + (i % 2) * 70 + i * 6;
        ctx.beginPath(); ctx.ellipse(x, y, 62, 18, 0, 0, 6.283); ctx.ellipse(x + 36, y - 12, 40, 18, 0, 0, 6.283); ctx.ellipse(x - 34, y - 6, 32, 14, 0, 0, 6.283); ctx.fill();
      }

      SIL_LONGE.forEach(function (s) {
        const sx = mod(s.x - cam * 0.12, 1920);
        desenharSilhueta(s, sx, P.longe, P.janela);
        desenharSilhueta(s, sx - 1920, P.longe, P.janela);
      });
      SIL_PERTO.forEach(function (s) {
        const sx = mod(s.x - cam * 0.3, 1600);
        desenharSilhueta(s, sx, P.perto, P.janela);
        desenharSilhueta(s, sx - 1600, P.perto, P.janela);
      });

      // notas musicais flutuando ao fundo
      ctx.fillStyle = P.nota; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      NOTAS_DECOR.forEach(function (n) {
        const x = mod(n.x - cam * 0.2, 1800) - 100, y = n.y + Math.sin(relogio * 1.3 + n.f) * 6;
        ctx.font = '700 ' + n.s + 'px ' + FONTE; ctx.fillText(n.c, x, y);
      });

      // chão
      ctx.fillStyle = P.chao; ctx.fillRect(0, L.CHAO, L.W, L.H - L.CHAO);
      ctx.fillStyle = P.chaoArco;
      for (let i = -1; i < 7; i++) {
        const x = i * 160 - mod(cam, 160) + 80;
        ctx.beginPath(); ctx.arc(x, L.H + 10, 62, Math.PI, 0); ctx.fill();
      }
      ctx.save();
      ctx.shadowColor = P.borda; ctx.shadowBlur = 14;
      ctx.fillStyle = P.borda; ctx.fillRect(0, L.CHAO - 2, L.W, 4);
      ctx.restore();
    }

    function desenharMoeda(x, y, f) {
      const r = C.MOEDA_R, e = Math.abs(Math.cos(relogio * 3 + f)) * 0.55 + 0.45;   // giro
      ctx.save();
      ctx.translate(x, y); ctx.scale(e, 1);
      ctx.fillStyle = '#ffc928'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();
      ctx.strokeStyle = '#d79a00'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#e8a800'; ctx.font = '700 ' + Math.round(r * 1.1) + 'px ' + FONTE; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('\u266A', 0, 1);
      ctx.restore();
    }

    function desenharCarta(c) {
      const P = paleta;
      const sx = L.PX + (c.x - cam);
      if (sx > L.W + 60 || sx < -c.w - 60) return;
      const flutua = c.estado === 'ativa' ? Math.sin(relogio * 2.2 + c.lado * 1.7) * 4 : 0;
      const y = L.CHAO - c.h - C.CARTA_H + flutua;
      let fundo = P.cartaFundo, borda = P.cartaBorda, texto = P.cartaTexto, brilho = P.cartaBorda, alfa = 1;
      if (c.estado === 'certa')  { fundo = '#d6fbe6'; borda = '#1fbf6a'; texto = '#0a5a30'; brilho = '#1fbf6a'; }
      if (c.estado === 'errada') { fundo = '#ffe0e4'; borda = '#ff4d63'; texto = '#7a1020'; brilho = '#ff4d63'; }
      if (c.estado === 'bloqueada') alfa = 0.4;
      const pop = (c.estado === 'certa' || c.estado === 'errada') ? 1 + 0.14 * Math.max(0, 1 - c.t * 4) : 1;

      ctx.save();
      ctx.globalAlpha = alfa;
      ctx.translate(sx + c.w / 2, y + C.CARTA_H / 2); ctx.scale(pop, pop); ctx.translate(-c.w / 2, -C.CARTA_H / 2);
      ctx.shadowColor = brilho; ctx.shadowBlur = c.estado === 'ativa' ? 14 : 22;
      retArred(ctx, 0, 0, c.w, C.CARTA_H, 22);
      ctx.fillStyle = fundo; ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 4; ctx.strokeStyle = borda; ctx.stroke();
      // setinha apontando para baixo
      ctx.beginPath(); ctx.moveTo(c.w / 2 - 12, C.CARTA_H - 1); ctx.lineTo(c.w / 2, C.CARTA_H + 13); ctx.lineTo(c.w / 2 + 12, C.CARTA_H - 1); ctx.closePath();
      ctx.fillStyle = borda; ctx.fill();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = c.estado === 'ativa' ? P.cartaIcone : texto;
      ctx.font = '700 36px ' + FONTE; ctx.fillText('\u266B', c.w / 2, 34);
      ctx.fillStyle = texto;
      ctx.font = '700 ' + c.fs + 'px ' + FONTE; ctx.fillText(c.texto, c.w / 2, 77);
      ctx.restore();
    }

    function desenharEfeito() {
      if (!visual.efeito) return;
      if (visual.efeito === 'aura') {
        const cx = L.PX + (C.CX_ESQ + C.CX_DIR) / 2, cy = L.CHAO - p.desl - 80, pulso = 0.8 + 0.2 * Math.sin(relogio * 4);
        const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 130 * pulso);
        g.addColorStop(0, 'rgba(60,210,255,.55)'); g.addColorStop(1, 'rgba(60,210,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 130 * pulso, 0, 6.283); ctx.fill();
        return;
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      parts.forEach(function (q) {
        const k = q.t / q.vida;
        ctx.globalAlpha = Math.max(0, 1 - k * k);
        if (q.k === 'nota') {
          ctx.fillStyle = '#27c3ff'; ctx.font = '700 ' + q.s + 'px ' + FONTE; ctx.fillText(q.c, q.x, q.y);
        } else {
          const r = q.s * (1 - k * 0.4);
          ctx.fillStyle = '#ffd84a';
          ctx.beginPath();
          ctx.moveTo(q.x, q.y - r); ctx.lineTo(q.x + r * 0.28, q.y - r * 0.28); ctx.lineTo(q.x + r, q.y);
          ctx.lineTo(q.x + r * 0.28, q.y + r * 0.28); ctx.lineTo(q.x, q.y + r); ctx.lineTo(q.x - r * 0.28, q.y + r * 0.28);
          ctx.lineTo(q.x - r, q.y); ctx.lineTo(q.x - r * 0.28, q.y - r * 0.28); ctx.closePath(); ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
    }

    function desenharPersonagem() {
      const alt = L.CHAO - p.desl;
      const h = C.PERSONAGEM_H, k = h / FRAME_H, w = FRAME_W * k;
      const cx = L.PX + (C.CX_ESQ + C.CX_DIR) / 2;   // o corpo fica sempre no centro da caixa de colisão
      // sombra
      const s = 1 - Math.min(0.5, p.desl / 400);
      ctx.fillStyle = 'rgba(5,20,60,.28)';
      ctx.beginPath(); ctx.ellipse(cx, L.CHAO + 4, 50 * s, 8 * s, 0, 0, 6.283); ctx.fill();

      ctx.save();
      ctx.translate(cx, alt + 4);
      let sx = 1, sy = 1, rot = 0, frame;
      if (p.pulando) {
        frame = QUADRO_PULO;
        const u = p.t / C.SALTO_DUR;
        rot = (u < 0.5 ? -0.10 : 0.12) * (modo === 'fim' ? 0 : 1);
        sy = u < 0.15 ? 1.08 : 1; sx = u < 0.15 ? 0.94 : 1;
      } else {
        frame = Math.floor(relogio * 18) % QUADROS_CORRIDA;
        if (p.pouso > 0) { sy = 0.9 + 0.1 * (1 - p.pouso / 0.14); sx = 1.06 - 0.06 * (1 - p.pouso / 0.14); }
      }
      ctx.rotate(rot); ctx.scale(sx, sy);
      if (sprite) {
        if (paleta.estrelas) { ctx.shadowColor = 'rgba(110,215,255,.95)'; ctx.shadowBlur = 16; }   // destaque no tema escuro
        // acessórios: centro da cabeça deste quadro (a camada "tras" fica atrás do Notinha, a "frente" por cima)
        const ce = NW.loja ? NW.loja.centro(frame) : null;
        const desenharCamada = function (nome) {
          if (!ce) return;
          const t = 3.6 * ce.R * k, bx = (ce.x - CORPO_X) * k, by = (ce.y - CHAO_Y) * k;
          camadas.forEach(function (c2) {
            const im = c2[nome];
            if (im && im.complete && im.naturalWidth) ctx.drawImage(im, bx - t / 2, by - t / 2, t, t);
          });
        };
        desenharCamada('tras');
        ctx.drawImage(sprite, frame * FRAME_W, 0, FRAME_W, FRAME_H, -CORPO_X * k, -CHAO_Y * k, w, h);
        desenharCamada('frente');
      } else {   // plano B se a imagem não carregar
        ctx.fillStyle = '#0b2a78'; ctx.beginPath(); ctx.arc(0, -h * 0.4, h * 0.3, 0, 6.283); ctx.fill();
        ctx.fillRect(h * 0.1, -h * 0.9, 8, h * 0.45);
      }
      ctx.restore();
    }

    function desenharTextos(dt) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      textos = textos.filter(function (t) { return t.t < 1.0; });
      textos.forEach(function (t) {
        t.t += dt;
        const k = t.t / 1.0;
        ctx.globalAlpha = 1 - k * k;
        ctx.font = '700 ' + (t.txt.length > 2 ? 34 : 30) + 'px ' + FONTE;
        ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.strokeText(t.txt, t.x, t.y - k * 46);
        ctx.fillStyle = t.cor; ctx.fillText(t.txt, t.x, t.y - k * 46);
      });
      ctx.globalAlpha = 1;
    }

    function quadro(dt) {
      ctx.setTransform(escala, 0, 0, escala, 0, 0);
      desenharFundo();
      if (modo !== 'vitrine') {
        moedas.forEach(function (m) {
          if (m.pega) return;
          const sx = L.PX + (m.x - cam);
          if (sx > -30 && sx < L.W + 30) desenharMoeda(sx, L.CHAO - 32, m.f);
        });
        rodadas.forEach(function (rd) {
          rd.cartas.forEach(function (c) { c.t += (modo === 'pausado' ? 0 : dt); desenharCarta(c); });
        });
        desenharEfeito();
        desenharPersonagem();
        desenharTextos(modo === 'pausado' ? 0 : dt);
      }
    }

    function loop(ts) {
      rafId = requestAnimationFrame(loop);
      const dt = ultimo ? Math.min((ts - ultimo) / 1000, 0.05) : 0;
      ultimo = ts;
      if (modo === 'vitrine') { cam += 60 * dt; relogio += dt; }
      else if (modo === 'jogando' || modo === 'fim') atualizar(dt);
      quadro(dt);
    }
    rafId = requestAnimationFrame(loop);

    return {
      iniciar: iniciar, pular: pular, pausar: pausar, continuar: continuar, parar: parar,
      estado: function () { return modo; },
      definirTema: function (t) { temaAtual = PALETAS[t] ? t : 'claro'; montarPaleta(); },
      definirVisual: definirVisual,
      destruir: function () { cancelAnimationFrame(rafId); }
    };
  }

  NW.Engine = { criar: criar, carregarSprite: carregarSprite, REGRAS: REGRAS, CONST: C, FRAMES: { W: FRAME_W, H: FRAME_H, N: FRAMES } };
})(window.NWRunner = window.NWRunner || {});