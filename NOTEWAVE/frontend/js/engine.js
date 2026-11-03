/* Notinha Runner — motor do jogo (canvas 2D).
 * Responsabilidades: loop, física do pulo, moedas, colisões, rodadas, pontuação e desenho.
 * NÃO mexe no DOM da interface: avisa a UI por callbacks (aoHud, aoPergunta, aoFim).
 *
 * Efeitos da loja: o motor lê a descrição do efeito no catálogo (NW.loja.efeito) —
 *   tipo 'aura'       → brilho colorido em volta do Notinha
 *   tipo 'particulas' → símbolos que ficam para trás ('tras'), sobem ('sobe') ou caem ('cai')
 */
(function (NW) {
  'use strict';

  // Coordenadas lógicas: o jogo é desenhado em 960x540 e escalado de forma uniforme para o canvas.
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
    PERSONAGEM_H: 168,        // altura com que o quadro do Notinha é desenhado
    CX_ESQ: 32, CX_DIR: 108,  // caixa de colisão do Notinha (relativa ao desenho)
    CX_TOPO: 118, CX_BASE: 8,
    MOEDA_R: 16,
    FIM_EXTRA: 520,
    MOEDAS_ACERTO: 5,         // moedas ganhas ao acertar
    MOEDAS_ERRO: 5            // moedas perdidas ao errar
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

    // sprite do Notinha mergulhador (cenário "Fundo do Mar"): fica na mesma pasta do sprite normal
    // (../imagem/mergulhador.png). Se faltar, o cenário usa o Notinha normal.
    const MERG_W = 270, MERG_H = 200, MERG_CX = 135, MERG_CY = 100, MERG_ALT = 105, MERG_ESC = 1.2;
    let spriteMar = null;
    // o sprite normal pode vir embutido (data:), então o caminho sai do data-sprite do HTML
    const trocaNome = function (u) { return u ? String(u).replace(/[^\/?#]*([?#].*)?$/, 'mergulhador.png') : null; };
    const raizHtml = document.getElementById('nw-runner');
    let srcMar = opc.spriteMar || null;
        // sprite do Notinha no barquinho (cenário "Barquinho de Partitura"): ../imagem/barquinho.png, 24 quadros
        const BARCO_W = 240, BARCO_H = 211, BARCO_N = 24, BARCO_CX = 119, BARCO_BASE = 203;
        const BARCO_LARG = 215;   // largura do barquinho na tela
        const BARCO_PULO = 8;     // quadro de comemoração, usado no pulo
        let spriteBarco = null;
        (function () {
          let src = null;
          const troca = function (u) { return u ? String(u).replace(/[^\/?#]*([?#].*)?$/, 'barquinho.png') : null; };
          try { if (raizHtml && raizHtml.dataset.sprite) src = new URL(troca(raizHtml.dataset.sprite), document.baseURI).href; } catch (e) { src = null; }
          if (!src && sprite && sprite.src && sprite.src.indexOf('data:') !== 0) src = troca(sprite.src);
          if (!src) return;
          carregarSprite(src).then(function (im) {
            if (im && im.naturalWidth >= BARCO_W * BARCO_N) spriteBarco = im;
            else console.warn('[Notinha Runner] não achei o barquinho em: ' + src + ' (coloque barquinho.png ao lado do feliz.png)');
          });
        })();
    if (!srcMar && raizHtml && raizHtml.dataset.sprite) {
      try { srcMar = new URL(trocaNome(raizHtml.dataset.sprite), document.baseURI).href; } catch (e) { srcMar = null; }
    }
    if (!srcMar && sprite && sprite.src && sprite.src.indexOf('data:') !== 0) srcMar = trocaNome(sprite.src);
    if (srcMar) carregarSprite(srcMar).then(function (im) {
      if (im && im.naturalWidth >= MERG_W * 16) spriteMar = im;
      else console.warn('[Notinha Runner] não achei o mergulhador em: ' + srcMar + ' (coloque mergulhador.png ao lado do feliz.png)');
    });
    else console.warn('[Notinha Runner] sem caminho para o mergulhador.png');
    const som = opc.som || NW.som;
    const aoHud = opc.aoHud || function () {};
    const aoPergunta = opc.aoPergunta || function () {};
    const aoMoedas = opc.aoMoedas || function () {};
    const aoFim = opc.aoFim || function () {};

    const ctx = canvas.getContext('2d');
    let escala = 1, offX = 0, offY = 0;
    let temaAtual = PALETAS[opc.tema] ? opc.tema : 'claro', paleta = PALETAS[temaAtual];

    // ----- visual escolhido na loja (acessórios, efeito, cenário) -----
    let visual = { acessorios: {}, efeito: null, cenario: 'castelo' };
    let camadas = [], parts = [], efT = 0, efIdx = 0, fxCfg = null;

    function montarPaleta() {
      const cen = NW.loja && NW.loja.cenario ? NW.loja.cenario(visual.cenario) : null;
      paleta = Object.assign({}, PALETAS[temaAtual], (cen && cen[temaAtual]) || {});
    }
    function imagemDe(uri) { if (!uri) return null; const im = new Image(); im.src = uri; return im; }
    function definirVisual(v) {
      visual = {
        acessorios: Object.assign({}, v && v.acessorios),
        efeito: (v && v.efeito) || null,
        cenario: (v && v.cenario) || 'castelo'
      };
      camadas = [];
      if (NW.loja) {
        NW.loja.SLOTS.forEach(function (sl) {
          const it = NW.loja.item(visual.acessorios[sl.id]);
          if (it) camadas.push({
            slot: sl.id,
            tras: imagemDe(NW.loja.svgCamada(it, 'tras', 520)),
            frente: imagemDe(NW.loja.svgCamada(it, 'frente', 520))
          });
        });
      }
      fxCfg = (NW.loja && NW.loja.efeito && visual.efeito) ? NW.loja.efeito(visual.efeito) : null;
      parts = []; efT = 0; efIdx = 0;
      montarPaleta();
    }

    let modo = 'vitrine';       // vitrine | jogando | pausado | fim
    let modoAntesPausa = 'jogando';
    let cam = 0, relogio = 0, tempoJogo = 0, ultimo = 0, rafId = 0;
    let rodadas = [], moedas = [], textos = [];
    let idxAtual = 0, pontos = 0, moedasColetadas = 0, acertos = 0, erros = 0, semResposta = 0;
    let respostas = [], fimT = 0, fimEnviado = false, velAtual = C.VEL;
    const p = { desl: 0, pulando: false, t: 0, pouso: 0, festa: 0 };

    // ----- tamanho do canvas (escala uniforme, centralizada) -----
    function redimensionar() {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(2, Math.round(r.width * dpr));
      canvas.height = Math.max(2, Math.round(r.height * dpr));
      escala = Math.min(canvas.width / L.W, canvas.height / L.H);
      offX = (canvas.width - L.W * escala) / 2;
      offY = (canvas.height - L.H * escala) / 2;
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
      respostas = []; textos = []; parts = []; efT = 0; efIdx = 0; fimT = 0; fimEnviado = false; velAtual = C.VEL;
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
      let ganho = 0, deltaMoedas = 0;
      if (carta) {
        carta.t = 0;
        rd.cartas.forEach(function (c) { if (c !== carta) c.estado = 'bloqueada'; });  // uma resposta por rodada
        if (carta.correta) {
          carta.estado = 'certa'; ganho = REGRAS.ACERTO; acertos++; som.certo();
          deltaMoedas = C.MOEDAS_ACERTO;
        } else {
          carta.estado = 'errada'; ganho = REGRAS.ERRO; erros++; som.erro();
          deltaMoedas = -Math.min(C.MOEDAS_ERRO, moedasColetadas);   // só perde o que tem
        }
        pontos += ganho;
        moedasColetadas += deltaMoedas;
        const sx = L.PX + (carta.x - cam) + carta.w / 2;
        flutuar(sx, L.CHAO - carta.h - C.CARTA_H - 10, (ganho > 0 ? '+' : '\u2212') + Math.abs(ganho), ganho > 0 ? '#1fbf6a' : '#ff4d63');
        if (deltaMoedas) aoMoedas({ delta: deltaMoedas, x: sx, y: L.CHAO - carta.h - C.CARTA_H / 2 });
      } else {
        // passou sem responder: 0 ponto, mas perde moedas
        semResposta++;
        deltaMoedas = -Math.min(C.MOEDAS_ERRO, moedasColetadas);
        moedasColetadas += deltaMoedas;
        if (deltaMoedas) {
          const px = L.PX + (C.CX_ESQ + C.CX_DIR) / 2;
          flutuar(px, L.CHAO - 210, 'Sem resposta!', '#ff4d63');
          aoMoedas({ delta: deltaMoedas, x: px, y: L.CHAO - 100 });
        }
      }
      respostas.push({
        pergunta_id: rd.q.id,
        escolhida: carta ? carta.texto : null,
        correta: carta ? carta.correta : null,
        pontos: ganho,
        moedas: deltaMoedas
      });
      emitirHud();
    }
    // Partículas do efeito equipado (descrição vem de NW.loja.efeito):
    //   'tras' → ficam para trás, na altura do corpo
    //   'sobe' → nascem perto dos pés e sobem balançando
    //   'cai'  → caem do alto da tela, levadas pelo "vento" da corrida
    function emitirEfeito(dt) {
      const fx = fxCfg;
      if (fx && fx.tipo === 'particulas') {
        efT += dt;
        const cx = L.PX + (C.CX_ESQ + C.CX_DIR) / 2, base = L.CHAO - p.desl, r = Math.random;
        const intervalo = fx.mov === 'tras' ? Math.max(0.05, fx.dur * 0.07)
                        : fx.mov === 'sobe' ? 0.12
                        : Math.max(0.04, fx.dur * 0.03);
        let guarda = 0;
        while (efT > intervalo && guarda++ < 6) {
          efT -= intervalo;
          if (parts.length > 140) break;
          const i = efIdx++;
          const q = {
            t: 0, mov: fx.mov,
            s: (fx.tam || 20) * (0.8 + r() * 0.5),
            c: fx.glifos[i % fx.glifos.length],
            cor: fx.cores ? fx.cores[i % fx.cores.length] : fx.cor,
            rot: (r() - 0.5) * 0.6,
            vr: (r() - 0.5) * (fx.mov === 'cai' ? 4 : 1.2),
            w: r() * 6
          };
          if (fx.mov === 'tras') {
            q.x = cx - 50 + r() * 70; q.y = base - 20 - r() * 120;
            q.vx = -120 - r() * 80;   q.vy = -30 + r() * 40;
            q.vida = Math.max(0.5, fx.dur * 0.55);
          } else if (fx.mov === 'sobe') {
            q.x = cx - 60 + r() * 130; q.y = base - 10 - r() * 40;
            q.vx = -50 - r() * 40;     q.vy = -70 - r() * 60;
            q.vida = 1.6;
          } else {
            q.x = cx - 140 + r() * 420; q.y = -14 - r() * 30;
            q.vx = -70 - r() * 40;      q.vy = 120 + r() * 90;
            q.vida = (L.CHAO + 6 - q.y) / q.vy;
          }
          parts.push(q);
        }
        if (efT > intervalo) efT = 0;   // não acumula atraso depois de uma pausa
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

    // ===== CENÁRIO MELHORADO =====
// Usa as mesmas variáveis globais do seu código: ctx, L (W, CHAO), cam, relogio.
// Substitua desenharSilhueta, bola e linhaOnda pelas versões abaixo e adicione os helpers novos.

function mod(a, b) { return ((a % b) + b) % b; }

// ---------- helpers ----------
function janelaLuz(x, y, w, h, cor) {
  // janela em arco com brilho
  ctx.save();
  ctx.shadowColor = cor; ctx.shadowBlur = 12;
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + w / 2);
  ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(x + w, y + h);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function bandeira(x, y, cor) {
  // mastro + bandeirinha ondulando
  ctx.fillRect(x - 1, y - 22, 2, 22);
  ctx.save();
  ctx.fillStyle = cor;
  const o = Math.sin(relogio * 4 + x * 0.1) * 3;
  ctx.beginPath();
  ctx.moveTo(x + 1, y - 22);
  ctx.quadraticCurveTo(x + 8, y - 22 + o, x + 16, y - 18 + o * 0.6);
  ctx.quadraticCurveTo(x + 8, y - 15 + o, x + 1, y - 12);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function sombraLateral(x, y, w, h) {
  // dá volume: faixa escura no lado direito do corpo
  ctx.fillStyle = 'rgba(0,0,0,0.20)';
  ctx.fillRect(x + w * 0.68, y, w * 0.32, h);
}

// ---------- silhuetas ----------
function desenharSilhueta(s, sx, cor, janela) {
  const base = L.CHAO + 4, topo = base - s.h;
  ctx.fillStyle = cor;

  if (s.tipo === 'torre') {
    const w = s.w * 0.55, x = sx + (s.w - w) / 2;
    // corpo levemente afunilado
    ctx.beginPath();
    ctx.moveTo(x, base); ctx.lineTo(x + 2, topo);
    ctx.lineTo(x + w - 2, topo); ctx.lineTo(x + w, base);
    ctx.closePath(); ctx.fill();
    sombraLateral(x, topo, w, s.h);
    // balcão com ameias
    ctx.fillStyle = cor;
    ctx.fillRect(x - 4, topo - 4, w + 8, 6);
    for (let cx = x - 4; cx < x + w; cx += 9) ctx.fillRect(cx, topo - 10, 5, 7);
    // telhado em espiral côncavo
    const y0 = topo - 10, ponta = y0 - w * 1.15;
    ctx.beginPath();
    ctx.moveTo(x - 3, y0);
    ctx.quadraticCurveTo(x + w * 0.38, y0 - w * 0.30, x + w / 2, ponta);
    ctx.quadraticCurveTo(x + w * 0.62, y0 - w * 0.30, x + w + 3, y0);
    ctx.closePath(); ctx.fill();
    bandeira(x + w / 2, ponta, janela);
    // janelas
    janelaLuz(x + w / 2 - 4, topo + 22, 8, 16, janela);
    if (s.h > 110) janelaLuz(x + w / 2 - 4, topo + 68, 8, 16, janela);

  } else if (s.tipo === 'castelo') {
    ctx.fillRect(sx, topo, s.w, s.h);
    sombraLateral(sx, topo, s.w, s.h);
    ctx.fillStyle = cor;
    // ameias
    for (let cx = sx; cx < sx + s.w - 8; cx += 18) ctx.fillRect(cx, topo - 9, 10, 9);
    // torreões laterais mais altos com telhadinho
    [sx - 6, sx + s.w - 12].forEach(tx => {
      ctx.fillRect(tx, topo - 26, 18, s.h * 0.35 + 26);
      ctx.beginPath();
      ctx.moveTo(tx - 3, topo - 26); ctx.lineTo(tx + 9, topo - 48); ctx.lineTo(tx + 21, topo - 26);
      ctx.closePath(); ctx.fill();
    });
    // portão em arco
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    const gw = Math.min(26, s.w * 0.22), gx = sx + s.w / 2 - gw / 2;
    ctx.beginPath();
    ctx.moveTo(gx, base); ctx.lineTo(gx, base - 24);
    ctx.arc(gx + gw / 2, base - 24, gw / 2, Math.PI, 0);
    ctx.lineTo(gx + gw, base); ctx.closePath(); ctx.fill();
    ctx.restore();
    janelaLuz(sx + s.w * 0.25, topo + 26, 8, 15, janela);
    janelaLuz(sx + s.w * 0.65, topo + 26, 8, 15, janela);

  } else { // cúpula
    ctx.fillStyle = cor;
    ctx.fillRect(sx, topo + 26, s.w, s.h - 26);
    sombraLateral(sx, topo + 26, s.w, s.h - 26);
    ctx.fillStyle = cor;
    // cúpula principal em formato de bulbo
    const cx = sx + s.w / 2, cy = topo + 26;
    ctx.beginPath();
    ctx.moveTo(sx - 3, cy);
    ctx.bezierCurveTo(sx - 6, cy - 34, cx - 6, cy - 30, cx, cy - 46);
    ctx.bezierCurveTo(cx + 6, cy - 30, sx + s.w + 6, cy - 34, sx + s.w + 3, cy);
    ctx.closePath(); ctx.fill();
    // cúpulas pequenas nas pontas
    [sx + 6, sx + s.w - 6].forEach(px => {
      ctx.beginPath(); ctx.ellipse(px, cy, 9, 14, 0, Math.PI, 0); ctx.fill();
      ctx.fillRect(px - 1, cy - 22, 2, 10);
    });
    // pináculo com bolinha
    ctx.fillRect(cx - 1.5, cy - 66, 3, 22);
    ctx.beginPath(); ctx.arc(cx, cy - 68, 4, 0, 6.283); ctx.fill();
    janelaLuz(cx - 4, topo + 44, 8, 16, janela);
  }
}

// ---------- cenários temáticos ----------
const CENAS = {};

function bola(x, y, r) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.283); }

// onda com preenchimento degradê embaixo (muito mais bonita que só a linha)
function linhaOnda(y, amp, comp, vel, cor, larg, preenche) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let x = -10; x <= L.W + 10; x += 10) {
    const yy = y + Math.sin((x + cam * vel) / comp + relogio * 1.4) * amp
                 + Math.sin((x + cam * vel) / (comp * 0.47) + relogio * 2.1) * amp * 0.35;
    if (x === -10) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
  }
  if (preenche) {
    ctx.lineTo(L.W + 10, L.CHAO + 10); ctx.lineTo(-10, L.CHAO + 10); ctx.closePath();
    const g = ctx.createLinearGradient(0, y - amp, 0, y + 80);
    g.addColorStop(0, cor); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fill();
  } else {
    ctx.strokeStyle = cor; ctx.lineWidth = larg || 3; ctx.stroke();
  }
}

// céu em degradê
function ceu(topoCor, meioCor, horizCor) {
  const g = ctx.createLinearGradient(0, 0, 0, L.CHAO);
  g.addColorStop(0, topoCor); g.addColorStop(0.6, meioCor); g.addColorStop(1, horizCor);
  ctx.fillStyle = g; ctx.fillRect(0, 0, L.W, L.CHAO + 4);
}

// estrelas cintilando, com parallax leve
function estrelas(qtd, cor) {
  ctx.fillStyle = cor || '#fff';
  for (let i = 0; i < qtd; i++) {
    const px = mod(i * 97.3 + 31 - cam * 0.02, L.W);
    const py = mod(i * 53.7 + 11, L.CHAO * 0.65);
    const t = 0.4 + 0.6 * Math.abs(Math.sin(relogio * (0.8 + (i % 5) * 0.3) + i));
    ctx.globalAlpha = t * 0.9;
    const r = (i % 7 === 0) ? 1.8 : 1;
    ctx.fillRect(px, py, r, r);
  }
  ctx.globalAlpha = 1;
}

// sol ou lua com halo suave
function astro(x, y, r, cor, halo) {
  const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 4);
  g.addColorStop(0, halo || 'rgba(255,240,200,0.45)');
  g.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, 6.283); ctx.fill();
  ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
}

// nuvens fofas, andando devagar
function nuvens(qtd, y, cor, vel) {
  ctx.fillStyle = cor;
  for (let i = 0; i < qtd; i++) {
    const w = L.W + 240;
    const x = mod(i * (w / qtd) + 40 - cam * vel - relogio * 6, w) - 120;
    const yy = y + Math.sin(i * 2.3) * 28, e = 0.8 + (i % 3) * 0.3;
    ctx.beginPath();
    bola(x, yy, 16 * e); bola(x + 18 * e, yy - 8 * e, 20 * e);
    bola(x + 40 * e, yy - 2 * e, 17 * e); bola(x + 58 * e, yy + 3 * e, 12 * e);
    ctx.fill();
  }
}

// camada de montanhas/colinas com parallax
function montanhas(yBase, alt, comp, vel, cor) {
  ctx.fillStyle = cor;
  ctx.beginPath(); ctx.moveTo(-10, L.CHAO + 4);
  for (let x = -10; x <= L.W + 10; x += 12) {
    const t = (x + cam * vel) / comp;
    const yy = yBase - alt * (0.55 + 0.30 * Math.sin(t) + 0.15 * Math.sin(t * 2.7 + 1.3));
    ctx.lineTo(x, yy);
  }
  ctx.lineTo(L.W + 10, L.CHAO + 4); ctx.closePath(); ctx.fill();
}

// vagalumes / partículas flutuando
function vagalumes(qtd, cor) {
  for (let i = 0; i < qtd; i++) {
    const x = mod(i * 131.7 - cam * 0.35 + Math.sin(relogio * 0.7 + i) * 30, L.W);
    const y = L.CHAO - 30 - mod(i * 47.9, 160) + Math.cos(relogio * 0.9 + i * 1.7) * 14;
    const a = 0.35 + 0.65 * Math.abs(Math.sin(relogio * 1.6 + i * 2.1));
    ctx.save();
    ctx.globalAlpha = a; ctx.shadowColor = cor; ctx.shadowBlur = 10; ctx.fillStyle = cor;
    ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 6.283); ctx.fill();
    ctx.restore();
  }
}

// ---------- exemplos de cenas (ajuste os nomes/cores à sua paleta) ----------
CENAS.noite = function (p) {
  ceu('#0b1030', '#2a2a6a', '#6a4a8a');
  estrelas(70, '#fff');
  astro(L.W * 0.78, 90, 26, '#fff6d8', 'rgba(255,246,216,0.35)');
  nuvens(4, 120, 'rgba(255,255,255,0.08)', 0.05);
  montanhas(L.CHAO - 20, 150, 180, 0.08, '#2b2252');
  montanhas(L.CHAO - 10, 110, 130, 0.16, '#1d1840');
  vagalumes(18, '#ffe9a0');
};

CENAS.dia = function (p) {
  ceu('#4aa8e8', '#9ad6f5', '#ffe9c4');
  astro(L.W * 0.2, 80, 30, '#fff3b0', 'rgba(255,230,140,0.5)');
  nuvens(6, 110, 'rgba(255,255,255,0.85)', 0.06);
  montanhas(L.CHAO - 20, 140, 200, 0.08, '#8fb8d8');
  montanhas(L.CHAO - 8, 100, 140, 0.18, '#6ea07a');
};

CENAS.oceano = function (p) {
  ceu('#ff9a6a', '#ffcf8a', '#fff0c8');
  astro(L.W * 0.5, L.CHAO - 70, 34, '#fff8e0', 'rgba(255,200,120,0.55)');
  nuvens(4, 100, 'rgba(255,255,255,0.35)', 0.04);
  linhaOnda(L.CHAO - 40, 4, 60, 0.10, 'rgba(60,140,190,0.9)', 0, true);
  linhaOnda(L.CHAO - 26, 6, 80, 0.20, 'rgba(30,100,160,0.9)', 0, true);
  linhaOnda(L.CHAO - 12, 8, 100, 0.35, 'rgba(15,70,130,1)', 0, true);
};

    function palmeira(x, base, h, tronco, folha) {
      const tx = x + 14, ty = base - h;
      ctx.strokeStyle = tronco; ctx.lineWidth = 11; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x + 22, base - h * 0.55, tx, ty); ctx.stroke();
      ctx.fillStyle = folha;
      [0.35, -0.1, -0.6, -1.1].forEach(function (a, i) {
        [1, -1].forEach(function (s) {
          ctx.save(); ctx.translate(tx, ty); ctx.scale(s, 1); ctx.rotate(a + Math.sin(relogio * 1.6 + i) * 0.05);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(34, -30, 78, 10); ctx.quadraticCurveTo(38, -6, 0, 0); ctx.fill();
          ctx.restore();
        });
      });
    }

    function guardaSol(x, base, c1, c2) {
      ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, base - 92); ctx.stroke();
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 ? c2 : c1;
        ctx.beginPath(); ctx.moveTo(x, base - 92);
        ctx.arc(x, base - 92, 50, Math.PI + i * Math.PI / 4, Math.PI + (i + 1) * Math.PI / 4); ctx.closePath(); ctx.fill();
      }
    }

    function arvore(x, base, h, tronco, copa) {
      ctx.fillStyle = tronco; ctx.fillRect(x - h * 0.05, base - h * 0.6, h * 0.1, h * 0.6);
      ctx.fillStyle = copa; ctx.beginPath();
      bola(x, base - h * 0.72, h * 0.3); bola(x - h * 0.22, base - h * 0.52, h * 0.22); bola(x + h * 0.22, base - h * 0.52, h * 0.22);
      ctx.fill();
    }

    function alga(x, base, h, cor) {
      ctx.strokeStyle = cor; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(x, base);
      for (let y = 10; y <= h; y += 10) ctx.lineTo(x + Math.sin(y * 0.05 + relogio * 2 + x) * 10, base - y);
      ctx.stroke();
    }

    function coral(x, base, h, cor) {
      ctx.strokeStyle = cor; ctx.lineWidth = 13; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, base); ctx.lineTo(x, base - h);
      ctx.moveTo(x, base - h * 0.4); ctx.lineTo(x - h * 0.28, base - h * 0.72);
      ctx.moveTo(x, base - h * 0.55); ctx.lineTo(x + h * 0.3, base - h * 0.85);
      ctx.stroke();
    }

    function peixe(x, y, s, cor) {
      ctx.fillStyle = cor;
      ctx.beginPath(); ctx.ellipse(x, y, 20 * s, 11 * s, 0, 0, 6.283); ctx.fill();
      const b = Math.sin(relogio * 9 + x) * 3 * s;
      ctx.beginPath(); ctx.moveTo(x + 16 * s, y); ctx.lineTo(x + 32 * s, y - 11 * s + b); ctx.lineTo(x + 32 * s, y + 11 * s + b); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 10 * s, y - 3 * s, 3.2 * s, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#0b2459'; ctx.beginPath(); ctx.arc(x - 11 * s, y - 3 * s, 1.5 * s, 0, 6.283); ctx.fill();
    }

    function bandeirinhas() {
      const cores = ['#1fbf6a', '#ffd84a', '#2a6ee0', '#ffffff'], v = 0.5, k0 = Math.floor(cam * v / 60) - 1;
      const yDe = function (wx) { return 8 + 20 * Math.sin(Math.PI * mod(wx, 480) / 480); };
      ctx.strokeStyle = 'rgba(40,40,60,.55)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let k = k0; k < k0 + 18; k++) { const x = k * 60 - cam * v, y = yDe(k * 60); if (k === k0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();
      for (let k = k0; k < k0 + 18; k++) {
        const x = k * 60 - cam * v, y = yDe(k * 60);
        ctx.fillStyle = cores[mod(k, 4)];
        ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.lineTo(x + 12, y); ctx.lineTo(x, y + 30); ctx.closePath(); ctx.fill();
      }
    }

   // ---- PRAIA BRASILEIRA ----
// Depende dos helpers do seu jogo: ctx, L, mod, cam, relogio, linhaOnda, guardaSol.
// Funções novas ficam isoladas com prefixo "fp".
(function () {
  const TAU = 6.283;

  function fpEl(x, y, rx, ry, rot, cor) {
    ctx.fillStyle = cor; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); ctx.fill();
  }
  // posição com parallax e repetição
  function fpX(x0, par, off, W) { return mod(x0 - cam * par + off, W) - off; }

  // ---------- elementos ----------
  function fpMorro(x, y, w, h, cor) {                             // morro/ilha distante
    ctx.fillStyle = cor; ctx.beginPath(); ctx.moveTo(x - w / 2, y);
    ctx.bezierCurveTo(x - w * 0.3, y - h * 0.15, x - w * 0.22, y - h, x - w * 0.02, y - h * 0.95);
    ctx.bezierCurveTo(x + w * 0.15, y - h * 0.9, x + w * 0.2, y - h * 0.3, x + w / 2, y);
    ctx.closePath(); ctx.fill();
  }

  function fpCoqueiro(x, yb, h, tronco, folha, fase) {
    const sw = Math.sin(relogio * 0.9 + fase) * 5;
    ctx.strokeStyle = tronco; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, yb); ctx.quadraticCurveTo(x + 22, yb - h * 0.5, x + 10 + sw * 0.5, yb - h); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2;        // anéis do tronco
    for (let i = 1; i < 9; i++) {
      const tt = i / 9, px = x + 22 * 2 * tt * (1 - tt) + (10 + sw * 0.5) * tt * tt, py = yb - h * (tt * (1 - tt) + tt * tt);
      ctx.beginPath(); ctx.moveTo(px - 4, py); ctx.lineTo(px + 4, py + 1); ctx.stroke();
    }
    const tx = x + 10 + sw * 0.5, ty = yb - h;
    ctx.strokeStyle = folha; ctx.lineWidth = 4;
    for (let k = -4; k <= 4; k++) {
      const ex = tx + k * 19, ey = ty + 20 + Math.abs(k) * 8 + Math.sin(relogio * 1.6 + k + fase) * 4;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + k * 10, ty - 22 + Math.abs(k), ex, ey); ctx.stroke();
      ctx.lineWidth = 1.5;                                          // folíolos
      for (let j = 1; j <= 4; j++) {
        const f = j / 5, mx = tx + (ex - tx) * f, my = ty - 10 + (ey - ty + 10) * f;
        ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx - 3, my + 9); ctx.moveTo(mx, my); ctx.lineTo(mx + 3, my + 9); ctx.stroke();
      }
      ctx.lineWidth = 4;
    }
    ctx.fillStyle = '#5a7a1c';                                      // cocos verdes
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(tx - 5 + (i % 2) * 8, ty + 6 + (i >> 1) * 7, 5, 0, TAU); ctx.fill(); }
  }

  function fpJangada(x, y, s, t, vela) {                          // jangada nordestina
    ctx.save(); ctx.translate(x, y + Math.sin(t * 1.4) * 2.5); ctx.scale(s, s); ctx.rotate(Math.sin(t * 1.1) * 0.03);
    ctx.fillStyle = '#7a5230';                                      // toras
    ctx.beginPath(); ctx.moveTo(-50, -4); ctx.quadraticCurveTo(0, -8, 54, -10); ctx.lineTo(48, 6); ctx.quadraticCurveTo(0, 8, -44, 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4e3218'; ctx.lineWidth = 1.5;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-46, i * 3 + 1); ctx.lineTo(50, i * 3 - 2); ctx.stroke(); }
    ctx.strokeStyle = '#4e3218'; ctx.lineWidth = 3;                // mastro e retranca
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, -76); ctx.moveTo(0, -14); ctx.lineTo(-40, -12); ctx.stroke();
    ctx.save();                                                     // vela colorida
    ctx.beginPath(); ctx.moveTo(2, -74); ctx.lineTo(2, -16); ctx.lineTo(48, -14); ctx.closePath(); ctx.clip();
    ctx.fillStyle = vela[0]; ctx.fillRect(0, -78, 60, 70);
    ctx.fillStyle = vela[1]; ctx.fillRect(0, -62, 60, 10); ctx.fillRect(0, -38, 60, 10);
    ctx.restore();
    ctx.fillStyle = '#3a2412'; ctx.beginPath(); ctx.arc(-26, -18, 4, 0, TAU); ctx.fill();            // pescador
    ctx.fillRect(-29, -15, 6, 10);
    ctx.fillStyle = '#e8cf8a'; ctx.beginPath(); ctx.moveTo(-34, -20); ctx.lineTo(-26, -29); ctx.lineTo(-18, -20); ctx.closePath(); ctx.fill();   // chapéu de palha
    ctx.restore();
  }

  function fpSurfista(x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(140,220,230,.85)';                        // onda
    ctx.beginPath(); ctx.moveTo(-70, 18); ctx.bezierCurveTo(-50, 18, -34, -30, 4, -34);
    ctx.bezierCurveTo(26, -34, 40, -14, 36, 4); ctx.quadraticCurveTo(10, -14, -4, 8); ctx.lineTo(70, 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.moveTo(-6, -33); ctx.quadraticCurveTo(22, -38, 36, -6); ctx.quadraticCurveTo(24, -24, -6, -30); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(-12, -8); ctx.rotate(-0.35 + Math.sin(t * 2) * 0.05);
    ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.ellipse(0, 6, 22, 3.4, 0, 0, TAU); ctx.fill();   // prancha
    ctx.fillStyle = '#ff6b3c'; ctx.fillRect(-2, -10, 5, 14);                                          // tronco
    ctx.fillStyle = '#7a3f22'; ctx.beginPath(); ctx.arc(-1, -14, 4, 0, TAU); ctx.fill();               // cabeça
    ctx.strokeStyle = '#7a3f22'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(-12, -4); ctx.moveTo(1, -8); ctx.lineTo(14, -10); ctx.stroke();
    ctx.restore(); ctx.restore();
  }

  function fpGaivota(x, y, t, s) {
    const a = Math.sin(t) * 9;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#fafafa'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-18, 6 + a); ctx.quadraticCurveTo(-9, -6, 0, 0); ctx.quadraticCurveTo(9, -6, 18, 6 + a); ctx.stroke();
    ctx.fillStyle = '#f2f2f2'; ctx.beginPath(); ctx.ellipse(0, 1, 5, 2.4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffb000'; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(9, 1); ctx.lineTo(4, 2); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function fpPipa(x, y, t, cor, ancX, ancY) {                     // pipa (papagaio) com rabiola
    const r = Math.sin(t * 1.3 + x * 0.01) * 0.2;
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y + 18); ctx.quadraticCurveTo((x + ancX) / 2 + 20, (y + ancY) / 2, ancX, ancY); ctx.stroke();
    ctx.save(); ctx.translate(x, y); ctx.rotate(r);
    ctx.fillStyle = cor; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(14, 0); ctx.lineTo(0, 20); ctx.lineTo(-14, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(14, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = cor; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 20);
    for (let i = 1; i <= 8; i++) ctx.lineTo(Math.sin(t * 4 + i) * 6, 20 + i * 8);
    ctx.stroke();
    ctx.fillStyle = '#ff6b6b';
    for (let i = 2; i <= 8; i += 2) { ctx.beginPath(); ctx.arc(Math.sin(t * 4 + i) * 6, 20 + i * 8, 3, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  function fpPessoa(x, y, s, cor, shorts, pose) {                 // pessoa estilizada
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round';
    ctx.strokeStyle = '#a0613a'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-3, -24); ctx.lineTo(-4, 0);                                      // perna de apoio
    ctx.moveTo(3, -24); ctx.lineTo(3 + pose * 16, -8 - Math.abs(pose) * 10); ctx.stroke();       // perna que chuta
    ctx.fillStyle = shorts; ctx.fillRect(-8, -32, 16, 10);
    ctx.fillStyle = cor; ctx.fillRect(-7, -50, 14, 19);
    ctx.strokeStyle = '#a0613a'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-7, -48); ctx.lineTo(-14, -36 - pose * 4); ctx.moveTo(7, -48); ctx.lineTo(14, -36 + pose * 4); ctx.stroke();
    ctx.fillStyle = '#a0613a'; ctx.beginPath(); ctx.arc(0, -57, 6.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.arc(0, -59, 6.8, Math.PI, TAU); ctx.fill();
    ctx.restore();
  }

  function fpFutevolei(gx, yb) {
    // rede
    ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(gx - 3, yb); ctx.lineTo(gx - 3, yb - 78); ctx.moveTo(gx + 3, yb); ctx.lineTo(gx + 3, yb - 78); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(gx - 3, yb - 78 + i * 7); ctx.lineTo(gx + 3, yb - 78 + i * 7); ctx.stroke(); }
    ctx.fillStyle = '#fff'; ctx.fillRect(gx - 4, yb - 80, 8, 3);
    // jogadores e bola
    const ph = mod(relogio / 1.4, 2), dirD = ph < 1, u = ph % 1;
    const ax = gx - 90, bx = gx + 90;
    const ballX = dirD ? ax + 10 + (bx - ax - 20) * u : bx - 10 - (bx - ax - 20) * u;
    const ballY = yb - 10 - Math.sin(Math.PI * u) * 110;
    const chutaA = (dirD ? u < 0.18 : u > 0.82) ? 1 : 0, chutaB = (dirD ? u > 0.82 : u < 0.18) ? -1 : 0;
    fpPessoa(ax, yb, 0.85, '#2fa7e8', '#ffd84a', chutaA);
    fpPessoa(bx, yb, 0.85, '#2fb86a', '#ffffff', chutaB);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ballX, ballY, 7, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2f6bd6'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ballX, ballY, 7, 0.2, 2.2); ctx.stroke();
    ctx.strokeStyle = '#ffd84a'; ctx.beginPath(); ctx.arc(ballX, ballY, 7, 3.4, 5.4); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.beginPath(); ctx.ellipse(ballX, yb + 2, 6 - (yb - ballY) * 0.02, 2, 0, 0, TAU); ctx.fill();
  }

  function fpQuiosque(x, yb, P) {
    ctx.fillStyle = '#5b3a1e';                                      // pilares
    ctx.fillRect(x - 70, yb - 80, 6, 80); ctx.fillRect(x + 64, yb - 80, 6, 80);
    ctx.fillStyle = '#3a2412'; ctx.fillRect(x - 70, yb - 42, 140, 6);                         // balcão
    ctx.fillStyle = '#ffe9b8'; ctx.fillRect(x - 66, yb - 36, 132, 36);
    ctx.fillStyle = '#e66a3a'; for (let i = 0; i < 6; i++) ctx.fillRect(x - 66 + i * 22, yb - 36, 11, 36);   // listras
    ctx.fillStyle = '#b8873a';                                      // teto de palha
    ctx.beginPath(); ctx.moveTo(x - 95, yb - 78); ctx.lineTo(x, yb - 130); ctx.lineTo(x + 95, yb - 78); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8a6228'; ctx.lineWidth = 2;
    for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(x + i * 4, yb - 126 + Math.abs(i) * 2); ctx.lineTo(x + i * 12, yb - 78); ctx.stroke(); }
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1;                    // fio com lâmpadas
    ctx.beginPath(); ctx.moveTo(x - 88, yb - 78); ctx.quadraticCurveTo(x, yb - 62, x + 88, yb - 78); ctx.stroke();
    const luz = ['#ffd84a', '#ff6b6b', '#7ce6ff', '#7cff9a'];
    for (let i = 0; i < 9; i++) {
      const f = i / 8, lx = x - 88 + 176 * f, ly = yb - 78 + Math.sin(f * Math.PI) * 16;
      ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(relogio * 2 + i)); ctx.fillStyle = luz[i % 4];
      ctx.beginPath(); ctx.arc(lx, ly + 3, 3, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    fpEl(x - 100, yb - 30, 10, 12, 0, '#5a7a1c');                   // cocos de beber
    fpEl(x + 100, yb - 30, 10, 12, 0, '#5a7a1c');
    ctx.fillStyle = '#e66a3a'; ctx.fillRect(x - 118, yb - 10, 28, 4); ctx.fillRect(x - 112, yb - 6, 4, 6); ctx.fillRect(x - 100, yb - 6, 4, 6);   // mesinha
    ctx.fillStyle = '#2fa7e8'; ctx.fillRect(x + 90, yb - 10, 28, 4); ctx.fillRect(x + 96, yb - 6, 4, 6); ctx.fillRect(x + 108, yb - 6, 4, 6);
    // bandeirinhas
    for (let i = 0; i < 10; i++) {
      const bx = x - 94 + i * 19, by = yb - 98 + Math.sin(i * 0.8 + relogio * 2) * 2;
      ctx.fillStyle = ['#ff6b6b', '#ffd84a', '#2fb86a', '#2fa7e8'][i % 4];
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 12, by); ctx.lineTo(bx + 6, by + 12); ctx.closePath(); ctx.fill();
    }
  }

  function fpCaranguejo(x, y, s, t, dir) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const m = Math.sin(t * 9) * 3;
    ctx.strokeStyle = '#c23a1e'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(-8, 0 + i * 2); ctx.lineTo(-18 - i, 6 + m * (i % 2 ? 1 : -1)); ctx.moveTo(8, 0 + i * 2); ctx.lineTo(18 + i, 6 - m * (i % 2 ? 1 : -1)); ctx.stroke();
    }
    fpEl(0, -2, 11, 7, 0, '#e24a2a');
    ctx.strokeStyle = '#e24a2a'; ctx.lineWidth = 3;                 // braços e garras
    const g = Math.sin(t * 5) * 0.4 * dir;
    ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(-16, -12 + g * 4); ctx.moveTo(9, -4); ctx.lineTo(16, -12 - g * 4); ctx.stroke();
    fpEl(-17, -15 + g * 4, 5, 4, 0, '#e24a2a'); fpEl(17, -15 - g * 4, 5, 4, 0, '#e24a2a');
    ctx.strokeStyle = '#e24a2a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-3, -8); ctx.lineTo(-3, -13); ctx.moveTo(3, -8); ctx.lineTo(3, -13); ctx.stroke();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-3, -14, 1.6, 0, TAU); ctx.arc(3, -14, 1.6, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ---------- cena ----------
  CENAS.praia = {
    fundo: function (P) {
      // sol com halo
      const g = ctx.createRadialGradient(780, 96, 10, 780, 96, 110);
      g.addColorStop(0, P.sol); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = 0.5; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(780, 96, 110, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = P.sol; ctx.beginPath(); ctx.arc(780, 96, 38, 0, TAU); ctx.fill();

      // morros distantes no horizonte
      ctx.globalAlpha = 0.5;
      fpMorro(fpX(260, 0.03, 300, L.W + 600), 282, 220, 70, '#5b8aa6');
      fpMorro(fpX(560, 0.03, 300, L.W + 600), 282, 120, 100, '#4f7d9a');   // estilo pão de açúcar
      fpMorro(fpX(1100, 0.03, 300, L.W + 600), 282, 260, 55, '#6b97b0');
      ctx.globalAlpha = 1;

      // mar
      const m = ctx.createLinearGradient(0, 280, 0, L.CHAO); m.addColorStop(0, P.mar); m.addColorStop(1, P.mar2);
      ctx.fillStyle = m; ctx.fillRect(0, 280, L.W, L.CHAO - 280);

      // brilho do sol na água
      ctx.strokeStyle = 'rgba(255,250,210,.7)'; ctx.lineCap = 'round';
      for (let i = 0; i < 16; i++) {
        const y = 284 + i * 10, w = 8 + i * 2.2, x = 780 + Math.sin(relogio * 1.6 + i * 1.3) * (6 + i * 1.5);
        ctx.globalAlpha = 0.25 + 0.55 * Math.abs(Math.sin(relogio * 1.2 + i));
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x + w, y); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // veleiros bem longe (original)
      for (let i = 0; i < 2; i++) {
        const x = mod(i * 520 + 160 - cam * 0.04, L.W + 200) - 100, y = 284;
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x, y - 46); ctx.lineTo(x + 26, y - 4); ctx.lineTo(x, y - 4); ctx.fill();
        ctx.fillStyle = '#f2548c'; ctx.beginPath(); ctx.moveTo(x - 20, y - 4); ctx.lineTo(x + 30, y - 4); ctx.lineTo(x + 22, y + 6); ctx.lineTo(x - 12, y + 6); ctx.fill();
      }

      // jangadas pescando
      fpJangada(fpX(0, 0.06, 150, L.W + 300) + 120, 322, 0.55, relogio, ['#fff3d6', '#e63946']);
      fpJangada(mod(relogio * 6 - cam * 0.1 + 300, L.W + 300) - 150, 352, 0.9, relogio + 1, ['#fff8e6', '#2a6fd6']);

      linhaOnda(305, 3, 40, 0.15, 'rgba(255,255,255,.45)', 3);
      linhaOnda(345, 4, 55, 0.25, 'rgba(255,255,255,.35)', 3);

      // surfista pegando onda
      const sx = mod(relogio * 24 - cam * 0.15 + 200, L.W + 300) - 150;
      fpSurfista(sx, 395, 0.9, relogio);

      linhaOnda(390, 5, 70, 0.35, 'rgba(255,255,255,.30)', 4);
      linhaOnda(430, 5, 90, 0.5, 'rgba(255,255,255,.55)', 5);   // espuma na beira

      // espuma festonada na beira d'água
      ctx.fillStyle = 'rgba(255,255,255,.65)';
      for (let x = -mod(cam * 0.9, 22) - 22; x < L.W + 22; x += 22) {
        const k = Math.round((x + cam * 0.9) / 22);
        ctx.beginPath(); ctx.arc(x, L.CHAO - 3 + Math.sin(relogio * 1.5 + k * 0.7) * 4, 9, 0, TAU); ctx.fill();
      }

      // gaivotas
      for (let i = 0; i < 4; i++) {
        fpGaivota(mod(i * 310 + relogio * 40 - cam * 0.1, L.W + 200) - 100, 90 + i * 34 + Math.sin(relogio * 0.9 + i) * 14, relogio * 5 + i * 2, 0.9 + (i % 2) * 0.3);
      }

      // coqueiros
      [120, 560, 980, 1330].forEach(function (px, i) {
        fpCoqueiro(fpX(px, 0.35, 100, 1500), L.CHAO + 2, 170 + (i % 2) * 40, P.tronco, P.folha, i * 1.3);
      });

      // pipas no céu
      fpPipa(fpX(420, 0.3, 100, 1500), 130 + Math.sin(relogio * 0.8) * 10, relogio, '#ff6b6b', fpX(380, 0.3, 100, 1500), L.CHAO + 10);
      fpPipa(fpX(900, 0.3, 100, 1500), 170 + Math.sin(relogio * 0.7 + 2) * 12, relogio + 1, '#ffd84a', fpX(860, 0.3, 100, 1500), L.CHAO + 10);

      // quiosque e futevôlei
      fpQuiosque(fpX(1480, 0.45, 220, 1900), L.CHAO + 4, P);
      fpFutevolei(fpX(700, 0.5, 220, 1900), L.CHAO + 6);

      // guarda-sóis nas cores do Brasil
      guardaSol(mod(300 - cam * 0.5 + 150, 1700) - 150, L.CHAO + 2, '#ff6b6b', '#ffffff');
      guardaSol(mod(1100 - cam * 0.5 + 150, 1700) - 150, L.CHAO + 2, '#ffd84a', '#ffffff');
      guardaSol(mod(1250 - cam * 0.5 + 150, 1700) - 150, L.CHAO + 2, '#2fb86a', '#ffd84a');
      guardaSol(mod(60 - cam * 0.5 + 150, 1700) - 150, L.CHAO + 2, '#2fa7e8', '#ffffff');
    },

    chao: function (P) {
      ctx.fillStyle = P.chao; ctx.fillRect(0, L.CHAO, L.W, L.H - L.CHAO);
      // faixa de areia molhada
      ctx.fillStyle = 'rgba(80,60,30,.12)'; ctx.fillRect(0, L.CHAO, L.W, 10);
      ctx.fillStyle = P.chaoArco;
      for (let i = 0; i < 16; i++) {
        const x = mod(i * 71 - cam, L.W + 40) - 20, y = L.CHAO + 14 + (i * 37) % 64;
        ctx.beginPath(); ctx.ellipse(x, y, 5 + (i % 3) * 2, 2.5, 0, 0, TAU); ctx.fill();
      }
      // toalhas listradas
      [[260, 36, '#ff6b6b'], [830, 44, '#2fa7e8'], [1220, 34, '#ffd84a']].forEach(function (tw) {
        const x = mod(tw[0] - cam, L.W + 200) - 100, y = L.CHAO + tw[1];
        ctx.fillStyle = tw[2]; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 70, y); ctx.lineTo(x + 78, y + 18); ctx.lineTo(x - 8, y + 18); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + 8 + k * 18, y); ctx.lineTo(x + 14 + k * 18, y); ctx.lineTo(x + 12 + k * 18 + 2, y + 18); ctx.lineTo(x + 6 + k * 18, y + 18); ctx.closePath(); ctx.fill(); }
      });
      // castelinho de areia
      const cx = mod(560 - cam, L.W + 200) - 100, cy = L.CHAO + 58;
      ctx.fillStyle = 'rgba(150,110,50,.35)'; ctx.beginPath(); ctx.moveTo(cx - 24, cy); ctx.lineTo(cx - 18, cy - 20); ctx.lineTo(cx + 18, cy - 20); ctx.lineTo(cx + 24, cy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(150,110,50,.45)'; ctx.fillRect(cx - 7, cy - 38, 14, 18);
      ctx.fillStyle = 'rgba(255,240,200,.35)'; ctx.fillRect(cx - 24, cy - 22, 48, 3);
      ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, cy - 38); ctx.lineTo(cx, cy - 52); ctx.stroke();
      ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.moveTo(cx, cy - 52); ctx.lineTo(cx + 12, cy - 48); ctx.lineTo(cx, cy - 44); ctx.closePath(); ctx.fill();
      // pegadas
      ctx.fillStyle = 'rgba(120,90,40,.22)';
      for (let i = 0; i < 12; i++) {
        const x = mod(i * 58 + 40 - cam, L.W + 40) - 20, y = L.CHAO + 70 + (i % 2) * 7;
        ctx.beginPath(); ctx.ellipse(x, y, 6, 3, 0, 0, TAU); ctx.fill();
      }
      // conchas e estrela-do-mar
      for (let i = 0; i < 7; i++) {
        const x = mod(i * 197 + 90 - cam, L.W + 40) - 20, y = L.CHAO + 22 + (i * 43) % 60;
        ctx.fillStyle = i % 2 ? '#f6e2c2' : '#f4b6a6'; ctx.beginPath(); ctx.ellipse(x, y, 7, 5, 0, Math.PI, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(150,100,70,.6)'; ctx.lineWidth = 1;
        for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + k * 5, y - 5); ctx.stroke(); }
      }
      // coco caído
      const cc = mod(1000 - cam, L.W + 80) - 40;
      fpEl(cc, L.CHAO + 28, 11, 8, 0.3, '#6b8a2a'); fpEl(cc - 3, L.CHAO + 25, 5, 3, 0.3, 'rgba(255,255,255,.25)');
      // caranguejos andando de lado
      fpCaranguejo(mod(150 + Math.sin(relogio * 0.5) * 70 - cam, L.W + 80) - 40, L.CHAO + 48, 1, relogio, Math.cos(relogio * 0.5) > 0 ? 1 : -1);
      fpCaranguejo(mod(900 + Math.sin(relogio * 0.4 + 2) * 60 - cam, L.W + 80) - 40, L.CHAO + 66, 0.75, relogio + 1.5, Math.cos(relogio * 0.4 + 2) > 0 ? 1 : -1);
    }
  };
})();

    // ---- FUNDO DO MAR (costa brasileira) ----
// Depende dos helpers do seu jogo: ctx, L, mod, cam, relogio, coral, alga, peixe.
// Funções novas ficam isoladas com prefixo "fm".
(function () {
  const TAU = 6.283;

  function fmEl(x, y, rx, ry, rot, cor) {
    ctx.fillStyle = cor; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); ctx.fill();
  }
  function fmIni(x, y, s, dir) { ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s); }

  // ---------- animais (todos "olham" para a direita; dir = -1 espelha) ----------

  // Baleia-jubarte (Abrolhos)
  function fmBaleia(x, y, s, dir, t, alfa) {
    fmIni(x, y, s, dir); ctx.globalAlpha = alfa;
    const b = Math.sin(t * 0.8) * 16;
    ctx.fillStyle = '#2b4866';
    ctx.beginPath(); ctx.moveTo(98, 4);
    ctx.bezierCurveTo(90, -34, 20, -36, -40, -20);
    ctx.quadraticCurveTo(-90, -8, -128, b);
    ctx.lineTo(-128, b + 6);
    ctx.quadraticCurveTo(-90, 10, -40, 24);
    ctx.bezierCurveTo(20, 36, 90, 30, 98, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2b4866';                                       // cauda (nadadeira caudal)
    ctx.beginPath(); ctx.moveTo(-124, b + 3); ctx.quadraticCurveTo(-146, b - 22, -156, b - 26);
    ctx.quadraticCurveTo(-142, b - 4, -134, b + 3); ctx.quadraticCurveTo(-142, b + 10, -156, b + 32);
    ctx.quadraticCurveTo(-146, b + 26, -124, b + 3); ctx.fill();
    ctx.fillStyle = '#c4dbe6';                                       // barriga com pregas
    ctx.beginPath(); ctx.moveTo(90, 8); ctx.bezierCurveTo(60, 28, 0, 30, -40, 22); ctx.quadraticCurveTo(0, 14, 90, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(43,72,102,.55)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(78 - i * 18, 14 + (i % 2)); ctx.lineTo(70 - i * 18, 24); ctx.stroke(); }
    ctx.save(); ctx.translate(30, 20); ctx.rotate(0.6 + Math.sin(t * 1.1) * 0.25);   // nadadeira peitoral longa
    fmEl(24, 0, 38, 6, 0, '#cfe3ec'); ctx.restore();
    ctx.fillStyle = '#10243a'; ctx.beginPath(); ctx.arc(70, 4, 2.4, 0, TAU); ctx.fill();   // olho
    ctx.strokeStyle = '#10243a'; ctx.lineWidth = 1.5;                                      // boca
    ctx.beginPath(); ctx.moveTo(98, 6); ctx.quadraticCurveTo(70, 14, 44, 10); ctx.stroke();
    ctx.fillStyle = '#9fb7c4';
    [[60, -26], [50, -28], [72, -22], [88, -10]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], 2, 0, TAU); ctx.fill(); });  // calosidades
    ctx.restore();
  }

  // Golfinho-rotador (Fernando de Noronha)
  function fmGolfinho(x, y, s, dir, t) {
    fmIni(x, y, s, dir);
    const w = Math.sin(t * 4) * 0.12;
    ctx.rotate(w);
    ctx.fillStyle = '#7f95a6';
    ctx.beginPath(); ctx.moveTo(30, -2); ctx.quadraticCurveTo(10, -14, -14, -9);
    ctx.quadraticCurveTo(-28, -4, -38, Math.sin(t * 4) * 5);
    ctx.quadraticCurveTo(-28, 4, -14, 8); ctx.quadraticCurveTo(12, 12, 30, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7f95a6'; ctx.beginPath(); ctx.moveTo(-36, Math.sin(t * 4) * 5); ctx.lineTo(-48, -8 + Math.sin(t * 4) * 6); ctx.lineTo(-44, Math.sin(t * 4) * 5); ctx.lineTo(-48, 8 + Math.sin(t * 4) * 6); ctx.closePath(); ctx.fill();   // cauda
    ctx.beginPath(); ctx.moveTo(30, -1); ctx.lineTo(44, 0); ctx.lineTo(30, 3); ctx.closePath(); ctx.fill();   // focinho
    ctx.beginPath(); ctx.moveTo(-2, -11); ctx.lineTo(-10, -22); ctx.lineTo(-14, -9); ctx.closePath(); ctx.fill();   // nadadeira dorsal
    ctx.fillStyle = '#dfe9ef'; ctx.beginPath(); ctx.moveTo(26, 3); ctx.quadraticCurveTo(0, 12, -22, 6); ctx.quadraticCurveTo(0, 6, 26, 3); ctx.fill();
    ctx.fillStyle = '#10243a'; ctx.beginPath(); ctx.arc(20, -3, 1.4, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // Tartaruga-verde (Projeto Tamar)
  function fmTartaruga(x, y, s, dir, t) {
    fmIni(x, y, s, dir);
    const f = Math.sin(t * 2.2) * 0.5;
    ctx.fillStyle = '#6a9a4a';                                       // nadadeiras
    ctx.save(); ctx.translate(8, 8); ctx.rotate(0.5 + f); fmEl(14, 0, 22, 6, 0, '#6a9a4a'); ctx.restore();
    ctx.save(); ctx.translate(-12, 8); ctx.rotate(2.4 - f); fmEl(10, 0, 14, 5, 0, '#6a9a4a'); ctx.restore();
    fmEl(-34, 2, 8, 3, 0, '#6a9a4a');                                // cauda
    fmEl(0, 0, 32, 20, 0, '#6d5a2c');                                // casco
    fmEl(0, 0, 27, 16, 0, '#8a7438');
    ctx.strokeStyle = '#5a4a22'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.moveTo(-6, -15); ctx.lineTo(-6, 15); ctx.moveTo(8, -13); ctx.lineTo(8, 13);
    ctx.moveTo(-6, -6); ctx.lineTo(8, -8); ctx.moveTo(-6, 6); ctx.lineTo(8, 8); ctx.stroke();
    ctx.save(); ctx.translate(-6, -8); ctx.rotate(-0.5 - f); fmEl(14, 0, 22, 6, 0, '#6a9a4a'); ctx.restore();   // nadadeira de cima
    fmEl(36, -2, 9, 7, 0, '#7aa85a');                                // cabeça
    ctx.fillStyle = '#0f1a0a'; ctx.beginPath(); ctx.arc(40, -4, 1.6, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // Peixe-boi-marinho
  function fmPeixeBoi(x, y, s, dir, t) {
    fmIni(x, y, s, dir);
    const w = Math.sin(t * 1.6) * 4;
    fmEl(-40, w, 16, 8, w * 0.03, '#7d8186');                        // cauda em remo
    fmEl(-26, w * 0.5, 14, 11, 0, '#848990');
    fmEl(0, 0, 36, 19, 0, '#8d9298');                                // corpo
    fmEl(0, 8, 28, 9, 0, '#9ea3a8');
    ctx.save(); ctx.translate(14, 10); ctx.rotate(0.7 + Math.sin(t * 2) * 0.2); fmEl(8, 0, 14, 5, 0, '#7d8186'); ctx.restore();   // nadadeira
    fmEl(38, 2, 12, 11, 0, '#8d9298');                               // cabeça
    fmEl(48, 6, 6, 5, 0, '#6f7378');                                 // focinho
    ctx.fillStyle = '#2a2d30'; ctx.beginPath(); ctx.arc(40, -2, 1.8, 0, TAU); ctx.fill(); ctx.arc(52, 4, 1, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#d9d3c0'; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(50, 8 + i); ctx.lineTo(55, 9 + i * 1.5); ctx.stroke(); }
    ctx.restore();
  }

  // Arraia-jamanta
  function fmArraia(x, y, s, dir, t) {
    fmIni(x, y, s, dir);
    const a = Math.sin(t * 1.8) * 16;
    ctx.fillStyle = '#26384d';
    ctx.beginPath(); ctx.moveTo(34, 0);
    ctx.quadraticCurveTo(10, -14 - a, -20, -46 - a * 1.6); ctx.quadraticCurveTo(-26, -18, -30, 0);
    ctx.quadraticCurveTo(-26, 18, -20, 46 + a * 1.6); ctx.quadraticCurveTo(10, 14 + a, 34, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#dbe8f0'; ctx.beginPath(); ctx.ellipse(6, 0, 18, 6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#26384d'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-30, 0); ctx.quadraticCurveTo(-52, Math.sin(t * 2) * 6, -72, Math.sin(t * 2 + 1) * 8); ctx.stroke();
    ctx.fillStyle = '#26384d';
    ctx.beginPath(); ctx.moveTo(34, -4); ctx.lineTo(44, -8); ctx.lineTo(38, 0); ctx.closePath(); ctx.fill();   // cefalicos
    ctx.beginPath(); ctx.moveTo(34, 4); ctx.lineTo(44, 8); ctx.lineTo(38, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Cavalo-marinho (preso na alga)
  function fmCavalo(x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.rotate(Math.sin(t * 1.3) * 0.08);
    const cor = '#f0a31c';
    for (let i = 0; i <= 6; i++) fmEl(Math.sin(i * 0.6) * 2, i * 6, 7 - i * 0.3, 4.2, 0, cor);
    for (let i = 0; i < 12; i++) {
      const a = i * 0.5, r = 8 - i * 0.55;
      fmEl(-8 + Math.cos(a) * r, 36 + Math.sin(a) * r, Math.max(1.4, 4 - i * 0.22), Math.max(1.4, 4 - i * 0.22), 0, cor);
    }
    fmEl(0, -6, 8, 7, 0, cor);
    ctx.fillStyle = cor; ctx.fillRect(4, -10, 12, 4);                // focinho
    ctx.fillStyle = '#3a2208'; ctx.beginPath(); ctx.arc(3, -9, 1.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,230,160,.8)'; ctx.lineWidth = 2;     // nadadeira dorsal vibrando
    ctx.beginPath(); ctx.moveTo(-7, 8); ctx.quadraticCurveTo(-14 + Math.sin(t * 14) * 2, 14, -7, 20); ctx.stroke();
    ctx.restore();
  }

  // Budião-azul
  function fmBudiao(x, y, s, dir, t) {
    fmIni(x, y, s, dir);
    const w = Math.sin(t * 7) * 3;
    ctx.fillStyle = '#e07ab0';
    ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-32, -9 + w); ctx.lineTo(-30, 0); ctx.lineTo(-32, 9 + w); ctx.closePath(); ctx.fill();
    fmEl(0, 0, 22, 12, 0, '#2fa7c9');
    fmEl(8, -2, 14, 9, 0, '#37c29a');
    fmEl(4, -12, 8, 3, 0, '#2488a6'); fmEl(2, 12, 8, 3, 0, '#2488a6');
    ctx.fillStyle = '#f3efe0'; ctx.fillRect(20, 0, 5, 4);            // bico de papagaio
    ctx.fillStyle = '#10243a'; ctx.beginPath(); ctx.arc(14, -3, 1.7, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // Sargento (peixe-donzela)
  function fmSargento(x, y, s, dir, t) {
    fmIni(x, y, s, dir);
    const w = Math.sin(t * 8 + x) * 2;
    ctx.fillStyle = '#e8c82e';
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-20, -6 + w); ctx.lineTo(-18, 0); ctx.lineTo(-20, 6 + w); ctx.closePath(); ctx.fill();
    fmEl(0, 0, 13, 9, 0, '#f2d84a');
    fmEl(0, -4, 12, 5, 0, '#8fb9c9');
    ctx.fillStyle = '#1a1a1a';
    for (let i = 0; i < 5; i++) ctx.fillRect(-7 + i * 4, -8, 1.6, 16);
    ctx.beginPath(); ctx.arc(9, -2, 1.3, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // Baiacu
  function fmBaiacu(x, y, s, dir, t) {
    fmIni(x, y, s, dir);
    const k = 1 + Math.sin(t * 0.9) * 0.12;
    ctx.strokeStyle = '#a89560'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) { const a = i * TAU / 14; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 15 * k, Math.sin(a) * 15 * k); ctx.lineTo(Math.cos(a) * 21 * k, Math.sin(a) * 21 * k); ctx.stroke(); }
    fmEl(0, 0, 16 * k, 15 * k, 0, '#d8c48a');
    fmEl(0, 6 * k, 12 * k, 8 * k, 0, '#f1e8c8');
    ctx.fillStyle = '#6b5a2a';
    [[-6, -6], [2, -9], [8, -3], [-2, -1], [-9, 1]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], 1.6, 0, TAU); ctx.fill(); });
    ctx.fillStyle = '#10243a'; ctx.beginPath(); ctx.arc(9, -3, 2.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#d8c48a'; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-24, -5 + Math.sin(t * 8) * 2); ctx.lineTo(-24, 5 + Math.sin(t * 8) * 2); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Cardume de sardinhas
  function fmCardume(x, y, dir, t, n) {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
    for (let i = 0; i < n; i++) {
      const px = Math.cos(i * 2.4) * 46 + Math.sin(t * 1.4 + i) * 8;
      const py = Math.sin(i * 1.7) * 26 + Math.cos(t * 1.8 + i * 0.7) * 6;
      ctx.fillStyle = 'rgba(214,232,242,.9)'; ctx.beginPath(); ctx.ellipse(px, py, 7, 2.6, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(px - 6, py); ctx.lineTo(px - 11, py - 3 + Math.sin(t * 12 + i) * 1.5); ctx.lineTo(px - 11, py + 3 + Math.sin(t * 12 + i) * 1.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(70,110,140,.8)'; ctx.fillRect(px - 5, py - 2.6, 9, 1.4);
    }
    ctx.restore();
  }

  // Água-viva
  function fmMedusa(x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const p = 1 + Math.sin(t * 2) * 0.12;
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = 'rgba(210,150,255,.7)';
    ctx.beginPath(); ctx.ellipse(0, 0, 16 * (2 - p), 12 * p, 0, Math.PI, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(230,190,255,.8)'; ctx.lineWidth = 1.5;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 4.5, 0); ctx.quadraticCurveTo(i * 4.5 + Math.sin(t * 3 + i) * 5, 14, i * 4.5 + Math.sin(t * 3 + i + 1) * 4, 28); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.restore();
  }

  // Coral-cérebro (Mussismilia, endêmico do Brasil)
  function fmCoralCerebro(x, y, r, cor) {
    ctx.fillStyle = cor; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, 0, Math.PI, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(x - r * 0.85 + i * r * 0.1, y - 2);
      ctx.bezierCurveTo(x - r * 0.5, y - r * 0.9 + i * 4, x + r * 0.3, y - r * 0.2 - i * 3, x + r * 0.85 - i * r * 0.12, y - 2); ctx.stroke();
    }
  }

  function fmEstrela(x, y, r, cor) {
    ctx.fillStyle = cor; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -1.5708 + i * TAU / 10, rr = i % 2 ? r * 0.42 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.55); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(x, y, r * 0.18, 0, TAU); ctx.fill();
  }

  // trajeto horizontal: dir=1 vai para a direita, dir=-1 para a esquerda
  function fmX(base, vel, dir, par, W) { return mod(base + dir * relogio * vel - cam * par, W) - (W - L.W) / 2; }

  // ---------- cena ----------
  CENAS.mar = {
    semNuvem: true, semEstrelas: true,
    fundo: function (P) {
      // brilho da superfície
      const g = ctx.createLinearGradient(0, 0, 0, 160);
      g.addColorStop(0, 'rgba(210,250,255,.28)'); g.addColorStop(1, 'rgba(210,250,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, L.W, 160);
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        const x = mod(i * 120 - cam * 0.05 + relogio * 8, L.W + 80) - 40;
        ctx.beginPath(); ctx.moveTo(x, 14 + (i % 3) * 8); ctx.quadraticCurveTo(x + 20, 8 + (i % 3) * 8, x + 40, 14 + (i % 3) * 8); ctx.stroke();
      }

      // raios de luz
      ctx.fillStyle = P.raio;
      for (let i = 0; i < 5; i++) {
        const x0 = mod(i * 230 + 80 - cam * 0.05, L.W + 300) - 150;
        ctx.globalAlpha = 0.7 + 0.3 * Math.sin(relogio * 1.2 + i);
        ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + 60, 0); ctx.lineTo(x0 + 190, L.CHAO); ctx.lineTo(x0 + 70, L.CHAO); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // ---- camada distante: baleia-jubarte com filhote ----
      fmBaleia(fmX(300, 12, 1, 0.04, L.W + 700) - 100, 120 + Math.sin(relogio * 0.4) * 10, 0.9, 1, relogio, 0.55);
      fmBaleia(fmX(300, 12, 1, 0.04, L.W + 700) + 140, 160 + Math.sin(relogio * 0.4 + 1) * 8, 0.38, 1, relogio + 1, 0.5);

      // corais e algas distantes
      const far = [{ x: 60, t: 'c', h: 150 }, { x: 400, t: 'a', h: 190 }, { x: 800, t: 'c', h: 120 }, { x: 1200, t: 'a', h: 170 }];
      far.forEach(function (it) {
        const x = mod(it.x - cam * 0.12 + 80, 1600) - 80;
        if (it.t === 'c') coral(x, L.CHAO + 4, it.h, P.longe); else alga(x, L.CHAO + 4, it.h, P.longe);
      });
      [250, 650, 1050, 1450].forEach(function (x0, i) {
        fmCoralCerebro(mod(x0 - cam * 0.14 + 80, 1600) - 80, L.CHAO + 4, 50 + (i % 2) * 14, P.longe);
      });

      // cardume de sardinhas ao longe
      fmCardume(fmX(200, 28, -1, 0.1, L.W + 300), 150 + Math.sin(relogio * 0.6) * 20, -1, relogio, 16);

      // arraia-jamanta planando
      fmArraia(fmX(100, 22, 1, 0.12, L.W + 400), 200 + Math.sin(relogio * 0.5) * 16, 0.9, 1, relogio);

      // golfinhos-rotadores em grupo
      for (let i = 0; i < 3; i++) {
        fmGolfinho(fmX(0 - i * 70, 70, 1, 0.15, L.W + 500) + i * 20, 70 + i * 24 + Math.sin(relogio * 1.8 + i) * 12, 0.75 + i * 0.08, 1, relogio + i * 0.6);
      }

      // peixe-boi
      fmPeixeBoi(fmX(900, 14, -1, 0.2, L.W + 400), 300 + Math.sin(relogio * 0.7) * 14, 0.95, -1, relogio);

      // tartaruga-verde
      fmTartaruga(fmX(500, 20, 1, 0.22, L.W + 400), 250 + Math.sin(relogio * 0.8) * 18, 1.05, 1, relogio);

      // corais e algas próximos
      const perto = [{ x: 150, t: 'a', h: 120 }, { x: 520, t: 'c', h: 100, c: 1 }, { x: 900, t: 'a', h: 140 }, { x: 1180, t: 'c', h: 90 }];
      perto.forEach(function (it) {
        const x = mod(it.x - cam * 0.3 + 80, 1400) - 80;
        if (it.t === 'c') coral(x, L.CHAO + 4, it.h, it.c ? P.coral : P.perto); else alga(x, L.CHAO + 4, it.h, P.perto);
      });
      fmCoralCerebro(mod(330 - cam * 0.3 + 80, 1400) - 80, L.CHAO + 4, 56, P.coral);
      fmCoralCerebro(mod(1040 - cam * 0.3 + 80, 1400) - 80, L.CHAO + 4, 44, P.perto);

      // cavalo-marinho agarrado na alga e cardume de sargentos
      const ax = mod(900 - cam * 0.3 + 80, 1400) - 80;
      fmCavalo(ax + 12, L.CHAO - 110, 1, relogio);
      for (let i = 0; i < 4; i++) {
        fmSargento(mod(520 - cam * 0.3 + 80, 1400) - 80 + 30 + Math.cos(relogio * 0.9 + i * 1.6) * 40, L.CHAO - 70 + Math.sin(relogio * 1.3 + i * 2) * 20 - i * 6, 1, Math.cos(relogio * 0.9 + i * 1.6 + 1.57) > 0 ? 1 : -1, relogio + i);
      }

      // budiões e baiacu
      fmBudiao(fmX(700, 30, -1, 0.25, L.W + 300), 330 + Math.sin(relogio * 1.5) * 10, 1, -1, relogio);
      fmBudiao(fmX(300, 24, 1, 0.25, L.W + 300), 280 + Math.sin(relogio * 1.2 + 2) * 10, 0.85, 1, relogio + 1);
      fmBaiacu(mod(1100 - cam * 0.3 + 80, 1400) - 80, L.CHAO - 40 + Math.sin(relogio * 0.9) * 6, 1, 1, relogio);

      // peixes do jogo original
      const cores = ['#ffb347', '#ff6b9a', '#ffd84a', '#7ce6ff', '#ff8a5c'];
      for (let i = 0; i < 5; i++) {
        const x = mod(i * 230 - cam * 0.2 - relogio * 25 * (1 + (i % 3) * 0.3), L.W + 200) - 100;
        peixe(x, 110 + i * 52 + Math.sin(relogio * 2 + i) * 8, 0.8 + (i % 3) * 0.25, cores[i]);
      }

      // águas-vivas
      for (let i = 0; i < 4; i++) {
        fmMedusa(mod(i * 340 + 100 - cam * 0.18, L.W + 100) - 50, 120 + ((i * 97) % 220) - Math.sin(relogio * 0.9 + i) * 24, 0.9 + (i % 2) * 0.4, relogio + i * 0.8);
      }

      // bolhas
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2;
      for (let i = 0; i < 14; i++) {
        const x = mod(i * 83 - cam * 0.15, L.W + 40) - 20 + Math.sin(relogio * 2 + i) * 6;
        const y = L.CHAO - mod(relogio * 40 + i * 61, 400);
        ctx.beginPath(); ctx.arc(x, y, 3 + (i % 3) * 2, 0, TAU); ctx.stroke();
      }
      // neve marinha
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      for (let i = 0; i < 26; i++) {
        const x = mod(i * 61 - cam * 0.22 + Math.sin(relogio + i) * 8, L.W + 20) - 10, y = mod(i * 47 + relogio * 10, L.CHAO);
        ctx.fillRect(x, y, 2, 2);
      }
    },

    chao: function (P) {
      ctx.fillStyle = P.chao; ctx.fillRect(0, L.CHAO, L.W, L.H - L.CHAO);
      ctx.fillStyle = P.chaoArco;
      for (let i = 0; i < 14; i++) {
        const x = mod(i * 83 - cam, L.W + 40) - 20, y = L.CHAO + 16 + (i * 37) % 60;
        ctx.beginPath(); ctx.ellipse(x, y, 8 + (i % 3) * 3, 4, 0, 0, TAU); ctx.fill();
      }
      // luz ondulando na areia
      ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        const x = mod(i * 110 - cam + Math.sin(relogio + i) * 14, L.W + 60) - 30, y = L.CHAO + 10 + (i * 23) % 50;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 18, y - 6, x + 36, y); ctx.stroke();
      }
      // estrelas-do-mar e conchas
      [[120, 40, '#ff7a3c'], [520, 66, '#f2a03a'], [900, 34, '#e0523c'], [1250, 58, '#ff9a54']].forEach(function (e, i) {
        fmEstrela(mod(e[0] - cam, L.W + 80) - 40, L.CHAO + e[1], 12 + (i % 2) * 3, e[2]);
      });
      for (let i = 0; i < 6; i++) {
        const x = mod(i * 211 + 60 - cam, L.W + 40) - 20, y = L.CHAO + 24 + (i * 31) % 52;
        ctx.fillStyle = '#f3e6cf'; ctx.beginPath(); ctx.ellipse(x, y, 7, 5, 0, Math.PI, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(160,120,80,.6)'; ctx.lineWidth = 1;
        for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + k * 5, y - 5); ctx.stroke(); }
      }
    }
  };
})();

       // ---- BRASIL (Rio de Janeiro) ----
       const PRED_CORES = {
        claro: ['#f6e3c4', '#f2c9b0', '#d9e8f2', '#f4efe0', '#e7d3e8', '#cfe6d5'],
        noite: ['#3a4a7a', '#46507f', '#2f4170', '#3d4c82', '#39467a', '#2c3d6b']
      };
      let PRED_PER = 0;
      const PREDIOS = (function () {
        const r = semente(33), a = [];
        let x = 0;
        while (x < 1500) {
          const w = 38 + r() * 34, h = 48 + r() * 70;
          a.push({ x: x, w: w, h: h, c: Math.floor(r() * 6), torre: r() < 0.3 });
          x += w + 4 + r() * 10;
        }
        PRED_PER = x;
        return a;
      })();
  
      // mata (bolinhas de árvores) ao longo do contorno de um morro
      function matas(cx, base, rx, ry, cor, n) {
        ctx.fillStyle = cor; ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const a = Math.PI + (i + 0.5) / n * Math.PI, k = 0.9 + 0.08 * Math.sin(i * 7.1);
          bola(cx + Math.cos(a) * rx * k, base + Math.sin(a) * ry * k + 8, 11 + (i % 3) * 4);
        }
        ctx.fill();
      }
  
      function arara(x, y, s, bat) {
        const asa = Math.sin(bat) * 14 * s;
        ctx.fillStyle = '#ffd84a';                                   // cauda
        ctx.beginPath(); ctx.moveTo(x + 8 * s, y - 2 * s); ctx.lineTo(x + 34 * s, y + 4 * s); ctx.lineTo(x + 8 * s, y + 4 * s); ctx.fill();
        ctx.fillStyle = '#e63946';                                   // corpo e cabeça
        ctx.beginPath(); ctx.ellipse(x, y, 13 * s, 6 * s, 0, 0, 6.283); ctx.fill();
        ctx.beginPath(); ctx.arc(x - 13 * s, y - 3 * s, 5 * s, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#2b2b33';                                   // bico
        ctx.beginPath(); ctx.moveTo(x - 17 * s, y - 5 * s); ctx.lineTo(x - 24 * s, y - 1 * s); ctx.lineTo(x - 16 * s, y - 1 * s); ctx.fill();
        ctx.fillStyle = '#2a6ee0';                                   // asa
        ctx.beginPath(); ctx.moveTo(x + 2 * s, y - 3 * s);
        ctx.quadraticCurveTo(x + 6 * s, y - 18 * s - asa, x + 24 * s, y - 12 * s - asa * 1.3);
        ctx.lineTo(x + 4 * s, y - 1 * s); ctx.closePath(); ctx.fill();
      }
  
      CENAS.rio = {
        fundo: function (P) {
          const noite = temaAtual === 'escuro', mar0 = 335, baseMar = L.CHAO - 28;
  
          // ---- sol (dia) ou lua (noite) ----
          const sx0 = 790, sy0 = 104;
          const gs = ctx.createRadialGradient(sx0, sy0, 8, sx0, sy0, 130);
          gs.addColorStop(0, noite ? 'rgba(220,235,255,.5)' : 'rgba(255,224,120,.75)');
          gs.addColorStop(1, noite ? 'rgba(220,235,255,0)' : 'rgba(255,224,120,0)');
          ctx.fillStyle = gs; ctx.beginPath(); ctx.arc(sx0, sy0, 130, 0, 6.283); ctx.fill();
          ctx.fillStyle = noite ? '#eef4ff' : (P.sol || '#ffd84a');
          ctx.beginPath(); ctx.arc(sx0, sy0, 36, 0, 6.283); ctx.fill();
          if (noite) {
            ctx.fillStyle = 'rgba(150,170,210,.45)';
            ctx.beginPath(); bola(sx0 - 12, sy0 - 8, 7); bola(sx0 + 12, sy0 + 10, 5); bola(sx0 + 6, sy0 - 16, 3.5); ctx.fill();
          }
  
          // ---- serras ao fundo (duas camadas, paralaxe lenta) ----
          [[0.04, 330, 70, P.longe, 0.55, 0], [0.08, 346, 50, P.perto, 0.7, 2]].forEach(function (c) {
            const off = cam * c[0];
            ctx.globalAlpha = c[4]; ctx.fillStyle = c[3] || '#8fb6e0';
            ctx.beginPath(); ctx.moveTo(0, c[1]);
            for (let x = 0; x <= L.W + 20; x += 20) {
              const u = x + off + c[5] * 300;
              ctx.lineTo(x, c[1] - (c[2] * 0.55 + c[2] * 0.3 * Math.sin(u / 90) + c[2] * 0.2 * Math.sin(u / 37 + 1)));
            }
            ctx.lineTo(L.W + 20, c[1] + 20); ctx.lineTo(0, c[1] + 20); ctx.closePath(); ctx.fill();
          });
          ctx.globalAlpha = 1;
  
          // ---- Baía de Guanabara ----
          const gm = ctx.createLinearGradient(0, mar0, 0, L.CHAO);
          gm.addColorStop(0, noite ? '#0e3a78' : '#7fd3f2'); gm.addColorStop(1, noite ? '#082a5a' : '#2f9fd6');
          ctx.fillStyle = gm; ctx.fillRect(0, mar0, L.W, L.CHAO - mar0);
          ctx.fillStyle = noite ? 'rgba(120,180,255,.35)' : 'rgba(255,255,255,.55)';
          ctx.fillRect(0, mar0, L.W, 2);                                   // linha do horizonte
          ctx.fillStyle = '#ffffff';
          for (let i = 0; i < 18; i++) {                                   // brilhos na água
            const x = mod(i * 61 - cam * 0.2, L.W + 40) - 20, y = 348 + (i * 29) % 90;
            ctx.globalAlpha = (noite ? 0.2 : 0.3) + 0.35 * Math.abs(Math.sin(relogio * 2 + i));
            ctx.fillRect(x, y, 14 + (i % 3) * 6, 2);
          }
          ctx.globalAlpha = 1;
          for (let i = 0; i < 2; i++) {                                    // veleiros
            const x = mod(i * 470 + 120 - cam * 0.05, L.W + 200) - 100, y = 372 + i * 22;
            ctx.fillStyle = noite ? '#c9d8f5' : '#ffffff';
            ctx.beginPath(); ctx.moveTo(x, y - 34); ctx.lineTo(x + 20, y - 3); ctx.lineTo(x, y - 3); ctx.fill();
            ctx.fillStyle = i ? '#ffd84a' : '#f2548c';
            ctx.beginPath(); ctx.moveTo(x - 14, y - 3); ctx.lineTo(x + 24, y - 3); ctx.lineTo(x + 17, y + 5); ctx.lineTo(x - 8, y + 5); ctx.fill();
          }
  
          // ---- Pão de Açúcar, Morro da Urca e bondinho ----
          const pa = mod(520 - cam * 0.1 + 300, 1920) - 300, rxP = 115, ryP = 215;
          const rochaA = noite ? '#1d3b7e' : '#8fa6c8', rochaB = noite ? '#2a4c99' : '#a9bddb';
          ctx.fillStyle = rochaA;
          ctx.beginPath(); ctx.ellipse(pa - 230, baseMar, 95, 120, 0, Math.PI, 0); ctx.fill();     // Urca
          matas(pa - 230, baseMar, 95, 120, noite ? 'rgba(10,70,60,.55)' : 'rgba(46,150,90,.5)', 9);
          ctx.fillStyle = rochaB;
          ctx.beginPath(); ctx.ellipse(pa, baseMar, rxP, ryP, 0, Math.PI, 0); ctx.fill();            // Pão de Açúcar
          ctx.fillStyle = noite ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.2)';
          ctx.beginPath(); ctx.ellipse(pa - rxP * 0.28, baseMar, rxP * 0.55, ryP * 0.92, 0, Math.PI, 0); ctx.fill();
          matas(pa, baseMar, rxP, ryP * 0.55, noite ? 'rgba(10,70,60,.5)' : 'rgba(46,150,90,.45)', 8);
          ctx.fillStyle = noite ? 'rgba(120,180,255,.35)' : 'rgba(255,255,255,.55)';                // espuma na base
          ctx.beginPath(); ctx.ellipse(pa - 115, baseMar + 1, 190, 5, 0, 0, 6.283); ctx.fill();
          const cx0 = pa - 230, cy0 = baseMar - 118, cx1 = pa - 8, cy1 = baseMar - ryP + 4;          // cabo
          ctx.strokeStyle = noite ? '#9fb4d8' : '#4a4f5c'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(cx0, cy0); ctx.lineTo(cx1, cy1); ctx.stroke();
          const tb = (Math.sin(relogio * 0.35) + 1) / 2, bx = cx0 + (cx1 - cx0) * tb, by = cy0 + (cy1 - cy0) * tb;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + 6); ctx.stroke();
          ctx.fillStyle = '#e63946'; retArred(ctx, bx - 9, by + 6, 18, 12, 3); ctx.fill();
          ctx.fillStyle = noite ? '#ffe9a0' : 'rgba(255,255,255,.85)'; ctx.fillRect(bx - 6, by + 9, 12, 5);
  
          // ---- Corcovado + Cristo Redentor ----
          const base = L.CHAO + 4, px = mod(900 - cam * 0.16 + 260, 2300) - 260, ryC = 235, t = base - ryC + 4;
          ctx.fillStyle = P.perto || '#5f8fc4';
          ctx.beginPath(); ctx.ellipse(px, base, 230, ryC, 0, Math.PI, 0); ctx.fill();
          ctx.fillStyle = noite ? 'rgba(10,70,60,.4)' : 'rgba(46,150,90,.38)';
          ctx.beginPath(); ctx.ellipse(px, base, 230, ryC, 0, Math.PI, 0); ctx.fill();
          matas(px, base, 230, ryC, noite ? 'rgba(6,50,44,.7)' : 'rgba(30,120,70,.65)', 16);
          const gc = ctx.createRadialGradient(px, t - 56, 4, px, t - 56, 70);                         // halo do Cristo
          gc.addColorStop(0, noite ? 'rgba(255,240,180,.55)' : 'rgba(255,255,255,.6)'); gc.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = gc; ctx.beginPath(); ctx.arc(px, t - 56, 70, 0, 6.283); ctx.fill();
          ctx.fillStyle = P.cristo || '#f4f7fb';
          ctx.beginPath(); ctx.moveTo(px - 13, t + 3); ctx.lineTo(px - 8, t - 24); ctx.lineTo(px + 8, t - 24); ctx.lineTo(px + 13, t + 3); ctx.closePath(); ctx.fill();   // pedestal
          ctx.beginPath(); ctx.moveTo(px - 6, t - 82); ctx.lineTo(px + 6, t - 82); ctx.lineTo(px + 9, t - 24); ctx.lineTo(px - 9, t - 24); ctx.closePath(); ctx.fill();    // túnica
          retArred(ctx, px - 46, t - 84, 92, 9, 4); ctx.fill();                                       // braços abertos
          ctx.beginPath(); ctx.arc(px, t - 94, 6.5, 0, 6.283); ctx.fill();                            // cabeça
          ctx.fillStyle = noite ? 'rgba(120,160,255,.2)' : 'rgba(255,255,255,.75)';                  // nuvem passando no topo
          const nx = Math.sin(relogio * 0.3) * 16;
          ctx.beginPath(); ctx.ellipse(px - 60 + nx, t + 40, 70, 12, 0, 0, 6.283); ctx.ellipse(px + 50 - nx, t + 52, 58, 10, 0, 0, 6.283); ctx.fill();
  
          // ---- prédios coloridos de Copacabana ----
          const cores = noite ? PRED_CORES.noite : PRED_CORES.claro;
          PREDIOS.forEach(function (b, i) {
            const sx = mod(b.x - cam * 0.22 + 100, PRED_PER) - 100;
            if (sx > L.W + 10 || sx < -b.w - 10) return;
            const topo = L.CHAO + 2 - b.h;
            ctx.fillStyle = cores[b.c]; ctx.fillRect(sx, topo, b.w, b.h);
            ctx.fillStyle = noite ? '#1c2750' : '#b9a98b';
            if (b.torre) { ctx.beginPath(); ctx.moveTo(sx + b.w * 0.3, topo); ctx.lineTo(sx + b.w / 2, topo - 16); ctx.lineTo(sx + b.w * 0.7, topo); ctx.fill(); }
            else ctx.fillRect(sx - 2, topo - 4, b.w + 4, 4);
            const cols = Math.max(2, Math.floor(b.w / 14)), lin = Math.floor((b.h - 10) / 17);
            for (let r2 = 0; r2 < lin; r2++) for (let c2 = 0; c2 < cols; c2++) {
              const acesa = noite && ((i * 7 + c2 * 3 + r2 * 5) % 4 === 0);
              ctx.fillStyle = acesa ? '#ffe08a' : (noite ? 'rgba(10,20,50,.5)' : 'rgba(60,100,170,.35)');
              ctx.fillRect(sx + 6 + c2 * ((b.w - 12) / cols), topo + 8 + r2 * 17, 6, 9);
            }
          });
  
          // ---- palmeiras ----
          [200, 650, 1000].forEach(function (x0, i) {
            palmeira(mod(x0 - cam * 0.4 + 100, 1200) - 100, L.CHAO + 2, 160 + (i % 2) * 30, P.tronco || '#8a5a35', P.folha || '#2fa05a');
          });
  
          // ---- araras voando ----
          for (let i = 0; i < 2; i++) {
            const x = mod(i * 520 + 300 - cam * 0.15 - relogio * 45, L.W + 240) - 120;
            arara(x, 140 + i * 56 + Math.sin(relogio * 2 + i) * 8, 0.9 + i * 0.2, relogio * 9 + i * 2);
          }
  
          bandeirinhas();
        },
        chao: function (P) {   // calçadão de Copacabana: ondas pretas e brancas
          const noite = temaAtual === 'escuro';
          ctx.fillStyle = noite ? '#8a93ad' : '#f4ecd8'; ctx.fillRect(0, L.CHAO, L.W, L.H - L.CHAO);
          ctx.save();
          ctx.beginPath(); ctx.rect(0, L.CHAO, L.W, L.H - L.CHAO); ctx.clip();
          ctx.strokeStyle = noite ? '#1b2036' : '#2a2a38'; ctx.lineWidth = 13; ctx.lineJoin = 'round';
          for (let k = 0; k < 4; k++) {
            ctx.beginPath();
            for (let x = -10; x <= L.W + 10; x += 10) {
              const y = L.CHAO + 16 + k * 24 + Math.sin((x + cam) / 52) * 10;
              if (x === -10) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
          ctx.restore();
          ctx.fillStyle = noite ? '#5c6585' : '#cdbf9f'; ctx.fillRect(0, L.CHAO, L.W, 5);   // meio-fio
        }
      };

    // ---- FLORESTA AMAZÔNICA ----
// Depende dos mesmos helpers do seu jogo: ctx, L, mod, cam, relogio, arvore.
// Tudo que é novo fica em funções locais (prefixo "fl") para não colidir com nada.
(function () {
  const TAU = 6.283;

  // ---------- helpers de desenho ----------
  function flElipse(x, y, rx, ry, rot, cor) {
    ctx.fillStyle = cor; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); ctx.fill();
  }

  // Indígena em silhueta estilizada (cocar, pintura de urucum, arco opcional)
  function flIndio(x, y, s, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (o.flip ? -1 : 1), s);
    const bal = Math.sin(relogio * 2 + (o.f || 0));
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#7a3f22'; ctx.lineWidth = 5;               // pernas
    ctx.beginPath(); ctx.moveTo(-4, -22); ctx.lineTo(-5, 0); ctx.moveTo(4, -22); ctx.lineTo(5, 0); ctx.stroke();
    ctx.fillStyle = '#d9b45a'; ctx.fillRect(-8, -31, 16, 11);      // saia de palha
    flElipse(0, -43 + bal * 0.4, 9, 14, 0, '#8a4b2a');             // tronco
    ctx.strokeStyle = '#b3261e'; ctx.lineWidth = 2;                // pintura de urucum
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-7, -50 + i * 5); ctx.lineTo(7, -50 + i * 5); ctx.stroke(); }
    ctx.strokeStyle = '#8a4b2a'; ctx.lineWidth = 4;                // braços
    if (o.arco) {
      ctx.beginPath(); ctx.moveTo(6, -50); ctx.lineTo(16, -56); ctx.stroke();
      ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(14, -56, 22, -1.2, 1.2); ctx.stroke();
      ctx.strokeStyle = '#e8dcc0'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(14 + Math.cos(-1.2) * 22, -56 + Math.sin(-1.2) * 22); ctx.lineTo(14 + Math.cos(1.2) * 22, -56 + Math.sin(1.2) * 22); ctx.stroke();
    } else {
      const a = o.danca ? Math.sin(relogio * 4 + (o.f || 0)) * 8 : bal;
      ctx.beginPath(); ctx.moveTo(-7, -50); ctx.lineTo(-13, -38 + a); ctx.moveTo(7, -50); ctx.lineTo(13, -38 - a); ctx.stroke();
    }
    flElipse(0, -62 + bal * 0.3, 7, 7.5, 0, '#8a4b2a');            // cabeça
    ctx.fillStyle = '#16100c'; ctx.beginPath(); ctx.arc(0, -63, 7.6, Math.PI, TAU); ctx.fill();
    ctx.fillRect(-7.6, -63, 15.2, 3);                              // franja
    if (o.cocar) {                                                  // cocar de penas
      const cores = ['#d62828', '#f7b500', '#1d6fd6', '#f7b500', '#d62828'];
      for (let k = -4; k <= 4; k++) {
        const ang = -1.5708 + k * 0.24, len = 17 + (4 - Math.abs(k)) * 1.5;
        ctx.strokeStyle = cores[Math.abs(k) % 5]; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(Math.cos(ang) * 6, -66 + Math.sin(ang) * 6);
        ctx.lineTo(Math.cos(ang) * (6 + len), -66 + Math.sin(ang) * (6 + len)); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function flPalmeira(x, yb, h, cor, folha) {                      // açaizeiro
    const sw = Math.sin(relogio * 0.8 + x * 0.01) * 4;
    ctx.strokeStyle = cor; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, yb); ctx.quadraticCurveTo(x + 14 + sw, yb - h * 0.55, x + 6 + sw, yb - h); ctx.stroke();
    const tx = x + 6 + sw, ty = yb - h;
    ctx.strokeStyle = folha; ctx.lineWidth = 3;
    for (let k = -4; k <= 4; k++) {
      const ex = tx + k * 17, ey = ty + 16 + Math.abs(k) * 7 + Math.sin(relogio * 1.5 + k) * 3;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + k * 9, ty - 16, ex, ey); ctx.stroke();
    }
    ctx.fillStyle = '#3b1450';                                      // cacho de açaí
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(tx - 4 + (i % 3) * 4, ty + 6 + i * 2.4, 2.6, 0, TAU); ctx.fill(); }
  }

  function flArara(x, y, bat, dir, c1, c2) {                       // arara em voo
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
    const asa = Math.sin(bat) * 14;
    ctx.fillStyle = c1;                                             // cauda longa
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-34, 6); ctx.lineTo(-30, 10); ctx.lineTo(-6, 5); ctx.closePath(); ctx.fill();
    flElipse(0, 0, 14, 6, 0, c1);
    flElipse(12, -3, 5, 5, 0, c1);
    ctx.fillStyle = '#f3efe0'; ctx.beginPath(); ctx.arc(14, -3, 2.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.moveTo(16, -5); ctx.lineTo(22, -1); ctx.lineTo(16, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c2;                                             // asas
    ctx.beginPath(); ctx.moveTo(-4, -2); ctx.quadraticCurveTo(-6, -20 - asa, 8, -24 - asa); ctx.quadraticCurveTo(6, -8, 4, -2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-4, 2); ctx.quadraticCurveTo(-8, 16 + asa, 6, 20 + asa); ctx.quadraticCurveTo(6, 8, 4, 2); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function flTucano(x, y, s) {                                     // tucano pousado
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const bic = Math.sin(relogio * 1.3 + x) * 0.06;
    ctx.fillStyle = '#e8e0c8';                                      // cauda
    ctx.strokeStyle = '#141414'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(-20, 8); ctx.stroke();
    flElipse(0, -12, 11, 15, 0.25, '#141414');
    flElipse(5, -15, 5.5, 7, 0.25, '#f5f0e0');                      // peito claro
    flElipse(10, -28, 8, 8, 0, '#141414');
    ctx.save(); ctx.translate(14, -28); ctx.rotate(bic);            // bico grande
    ctx.fillStyle = '#f08a00'; ctx.beginPath(); ctx.moveTo(0, -6); ctx.quadraticCurveTo(24, -8, 34, 2); ctx.quadraticCurveTo(22, 8, 0, 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e6c200'; ctx.fillRect(2, -5, 5, 10);
    ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(30, -1, 2.6, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#7fd0ff'; ctx.beginPath(); ctx.arc(11, -30, 2.4, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function flOnca(x, y, s) {                                       // onça-pintada deitada no galho
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const cauda = Math.sin(relogio * 1.6) * 9;
    ctx.strokeStyle = '#d99a2b'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-34, -6); ctx.quadraticCurveTo(-56, 6 + cauda, -52, 26 + cauda); ctx.stroke();
    flElipse(-6, -10, 36, 13, 0, '#d99a2b');                        // corpo
    flElipse(-10, 0, 7, 11, 0.2, '#d99a2b'); flElipse(-30, 0, 7, 11, -0.2, '#d99a2b');   // patas
    flElipse(34, -12, 12, 10, 0, '#d99a2b');                        // cabeça
    flElipse(27, -21, 3.5, 4, 0, '#d99a2b'); flElipse(40, -21, 3.5, 4, 0, '#d99a2b');   // orelhas
    flElipse(44, -9, 5, 4, 0, '#f1d8a0');                           // focinho
    ctx.fillStyle = '#6f3b00';                                      // rosetas
    [[-26, -14], [-14, -18], [0, -17], [12, -14], [-20, -6], [-6, -8], [8, -6], [26, -16], [34, -17]].forEach(function (p) {
      ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, TAU); ctx.fill();
    });
    ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(38, -14, 1.8, 0, TAU); ctx.fill();
    ctx.fillStyle = Math.sin(relogio * 0.7) > 0.93 ? '#d99a2b' : '#d6ff6a';   // pisca de vez em quando
    ctx.beginPath(); ctx.arc(38, -14, 1.2, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function flPreguica(x, y, s) {                                   // preguiça pendurada
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const sw = Math.sin(relogio * 0.7) * 0.06;
    ctx.rotate(sw);
    ctx.strokeStyle = '#6b5a45'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-8, 22); ctx.moveTo(10, 0); ctx.lineTo(8, 22); ctx.stroke();
    flElipse(0, 34, 15, 18, 0, '#8a7458');
    flElipse(0, 58, 10, 9, 0, '#9c8466');                            // cabeça
    flElipse(0, 59, 7, 6, 0, '#d8c7a4');                             // rosto claro
    ctx.fillStyle = '#2a1d10'; ctx.beginPath(); ctx.arc(-3, 58, 1.6, 0, TAU); ctx.arc(3, 58, 1.6, 0, TAU); ctx.fill();
    ctx.fillRect(-1.5, 61, 3, 2);
    ctx.restore();
  }

  function flBoto(x, y, u) {                                       // boto-cor-de-rosa saltando (u: 0..1)
    ctx.save(); ctx.translate(x, y);
    ctx.rotate((u - 0.5) * 2.4);
    flElipse(0, 0, 22, 8, 0, '#f09bb7');
    flElipse(-24, 0, 8, 3, 0, '#e684a4');                            // cauda
    ctx.strokeStyle = '#f09bb7'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(20, -1); ctx.lineTo(34, 1); ctx.stroke();      // focinho longo
    ctx.fillStyle = '#e684a4'; ctx.beginPath(); ctx.moveTo(-2, -7); ctx.lineTo(4, -15); ctx.lineTo(8, -7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a1a24'; ctx.beginPath(); ctx.arc(16, -2, 1.4, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function flMorpho(x, y, t) {                                     // borboleta azul (Morpho)
    const a = Math.abs(Math.sin(t * 9));
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#2f8bff';
    ctx.beginPath(); ctx.ellipse(-5 * a - 1, 0, 6 * a + 1, 7, -0.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5 * a + 1, 0, 6 * a + 1, 7, 0.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0b2a55'; ctx.fillRect(-0.8, -4, 1.6, 9);
    ctx.restore();
  }

  function flCapivara(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    flElipse(0, -10, 20, 11, 0, '#8a6a43');
    flElipse(20, -14, 9, 8, 0, '#8a6a43');
    flElipse(27, -11, 4, 3.5, 0, '#6e5232');
    ctx.fillStyle = '#6e5232'; ctx.fillRect(-12, -2, 4, 6); ctx.fillRect(8, -2, 4, 6);
    ctx.fillStyle = '#1a1208'; ctx.beginPath(); ctx.arc(22, -16, 1.4, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function flBromelia(x, y, s, cor) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#2f7d3a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(k * 5, -14, k * 9, -22 + Math.abs(k) * 3); ctx.stroke(); }
    ctx.fillStyle = cor; ctx.beginPath(); ctx.ellipse(0, -6, 4, 7, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function flHeliconia(x, y, s) {                                  // bico-de-papagaio
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#2b7a34'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(4, -20, 0, -36); ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? '#e8231c' : '#ff8a00';
      ctx.beginPath(); ctx.moveTo(0, -12 - i * 7); ctx.lineTo(11, -18 - i * 7); ctx.lineTo(0, -20 - i * 7); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function flGalho(x1, y1, x2, y2, cor) {
    ctx.strokeStyle = cor; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo((x1 + x2) / 2, y1 - 6, x2, y2); ctx.stroke();
    ctx.strokeStyle = '#3f8f3a'; ctx.lineWidth = 3;                  // folhinhas no galho
    for (let i = 1; i < 4; i++) { const px = x1 + (x2 - x1) * i / 4; ctx.beginPath(); ctx.moveTo(px, y1 - 4); ctx.lineTo(px + 6, y1 - 14); ctx.stroke(); }
  }

  const X = function (x0, par, off, W) { return mod(x0 - cam * par + off, W) - off; };

  // ---------- cena ----------
  CENAS.floresta = {
    fundo: function (P) {
      // névoa quente da manhã amazônica
      const g = ctx.createLinearGradient(0, 0, 0, L.CHAO);
      g.addColorStop(0, 'rgba(255,244,200,.10)'); g.addColorStop(1, 'rgba(180,230,200,.14)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, L.W, L.CHAO);

      // raios de luz entre as folhas
      ctx.fillStyle = 'rgba(255,255,220,.10)';
      for (let i = 0; i < 4; i++) {
        const x0 = mod(i * 280 - cam * 0.05, L.W + 300) - 150;
        ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + 50, 0); ctx.lineTo(x0 + 190, L.CHAO); ctx.lineTo(x0 + 90, L.CHAO); ctx.closePath(); ctx.fill();
      }

      // rio ao fundo, entrevisto entre os troncos
      const ry = L.CHAO - 38, rh = 34;
      const rg = ctx.createLinearGradient(0, ry, 0, ry + rh);
      rg.addColorStop(0, '#6fb7a8'); rg.addColorStop(1, '#2f6b66');
      ctx.fillStyle = rg; ctx.fillRect(0, ry, L.W, rh);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 14; i++) {
        const x = mod(i * 97 - cam * 0.08 + Math.sin(relogio + i) * 10, L.W + 60) - 30, y = ry + 6 + (i * 13) % (rh - 10);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 16, y); ctx.stroke();
      }

      // boto saltando a cada 5 s
      const ciclo = relogio / 5, k = Math.floor(ciclo), u = (ciclo - k) / 0.22;
      const bx = mod(k * 377 + 150 - cam * 0.08, L.W + 200) - 100;
      if (u < 1) {
        const by = ry + 14 - Math.sin(u * Math.PI) * 58;
        flBoto(bx + u * 80, by, u);
        if (u > 0.85 || u < 0.1) {
          ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(bx + u * 80, ry + 14, 18 + (u % 0.1) * 120, 4, 0, 0, TAU); ctx.stroke();
        }
      }

      // canoa com remadores indígenas
      const cx = mod(relogio * 10 - cam * 0.08 + 300, L.W + 300) - 150, cy = ry + 20;
      flIndio(cx - 22, cy - 2, 0.55, { cocar: true, f: 1 });
      flIndio(cx + 20, cy - 2, 0.55, { f: 2 });
      ctx.fillStyle = '#5b3a1e';
      ctx.beginPath(); ctx.moveTo(cx - 62, cy - 6); ctx.quadraticCurveTo(cx, cy + 14, cx + 62, cy - 6); ctx.lineTo(cx + 54, cy - 2); ctx.quadraticCurveTo(cx, cy + 6, cx - 54, cy - 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 2;                 // remo
      const rem = Math.sin(relogio * 2) * 6;
      ctx.beginPath(); ctx.moveTo(cx + 10, cy - 24); ctx.lineTo(cx + 22 + rem, cy + 10); ctx.stroke();

      // aldeia: maloca + indígenas ao redor da fogueira
      const vx = X(530 + 150, 0.12, 150, 1500);
      ctx.fillStyle = '#6b4a24';                                      // maloca (teto de palha)
      ctx.beginPath(); ctx.moveTo(vx - 90, L.CHAO + 2); ctx.quadraticCurveTo(vx - 70, L.CHAO - 85, vx, L.CHAO - 92);
      ctx.quadraticCurveTo(vx + 70, L.CHAO - 85, vx + 90, L.CHAO + 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#8a6535'; ctx.lineWidth = 2;
      for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(vx + i * 8, L.CHAO - 88 + Math.abs(i) * 4); ctx.lineTo(vx + i * 26, L.CHAO + 2); ctx.stroke(); }
      ctx.fillStyle = '#1e140a'; ctx.beginPath(); ctx.ellipse(vx, L.CHAO + 2, 16, 30, 0, Math.PI, TAU); ctx.fill();   // porta
      const fx = vx + 130;                                            // fogueira
      const fl = 1 + Math.sin(relogio * 14) * 0.15;
      ctx.shadowColor = '#ff9a2a'; ctx.shadowBlur = 18;
      ctx.fillStyle = '#ff7a18'; ctx.beginPath(); ctx.moveTo(fx - 9, L.CHAO + 2); ctx.quadraticCurveTo(fx, L.CHAO - 34 * fl, fx + 9, L.CHAO + 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd34a'; ctx.beginPath(); ctx.moveTo(fx - 4, L.CHAO + 2); ctx.quadraticCurveTo(fx, L.CHAO - 18 * fl, fx + 4, L.CHAO + 2); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
      flIndio(vx + 98, L.CHAO + 3, 0.8, { cocar: true, danca: true, f: 0 });
      flIndio(vx + 162, L.CHAO + 3, 0.8, { danca: true, flip: true, f: 1.7, cocar: true });
      flIndio(vx - 112, L.CHAO + 3, 0.85, { arco: true, cocar: true });

      // capivaras na beira do rio
      flCapivara(X(940, 0.1, 100, 1500), L.CHAO + 1, 0.7);
      flCapivara(X(985, 0.1, 100, 1500), L.CHAO + 1, 0.5);

      // árvores distantes (originais) + açaizeiros
      [80, 360, 700, 1040, 1330].forEach(function (x0, i) {
        arvore(X(x0 + 150, 0.12, 150, 1500), L.CHAO + 4, 230 + (i % 3) * 30, P.longe, P.longe);
      });
      [250, 880, 1250].forEach(function (x0, i) {
        flPalmeira(X(x0 + 120, 0.18, 120, 1500), L.CHAO + 4, 190 + i * 14, P.longe, P.folha);
      });

      // véu de névoa para dar profundidade
      ctx.fillStyle = 'rgba(200,235,215,.12)'; ctx.fillRect(0, L.CHAO - 140, L.W, 150);

      // árvores do meio (originais)
      [200, 700, 1150].forEach(function (x0) {
        arvore(X(x0 + 200, 0.3, 200, 1400), L.CHAO + 4, 330, P.tronco, P.perto);
      });

      // animais nos galhos das árvores do meio
      const t1 = X(200 + 200, 0.3, 200, 1400), t2 = X(700 + 200, 0.3, 200, 1400), t3 = X(1150 + 200, 0.3, 200, 1400);
      flGalho(t1, L.CHAO - 205, t1 + 125, L.CHAO - 212, P.tronco);
      flTucano(t1 + 100, L.CHAO - 212, 1);
      flGalho(t2, L.CHAO - 215, t2 + 140, L.CHAO - 220, P.tronco);
      flPreguica(t2 + 100, L.CHAO - 218, 0.9);
      flGalho(t3, L.CHAO - 175, t3 + 190, L.CHAO - 182, P.tronco);
      flOnca(t3 + 110, L.CHAO - 186, 0.95);

      // araras cruzando o céu
      for (let i = 0; i < 3; i++) {
        const ax = mod(relogio * 55 + i * 520 - cam * 0.15, L.W + 400) - 200;
        const ay = 70 + i * 38 + Math.sin(relogio * 1.2 + i) * 14;
        flArara(ax, ay, relogio * 9 + i, 1, i % 2 ? '#e0a800' : '#d62828', '#1d6fd6');
      }

      // cipós
      ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const x = mod(i * 190 - cam * 0.2, L.W + 60) - 30, h = 90 + (i % 3) * 40, sw = Math.sin(relogio * 1.2 + i) * 6;
        ctx.strokeStyle = P.folha; ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + sw, h / 2, x + sw * 1.4, h); ctx.stroke();
        ctx.fillStyle = P.folha; ctx.beginPath(); ctx.ellipse(x + sw * 1.4, h + 6, 6, 10, 0, 0, TAU); ctx.fill();
      }

      // borboletas Morpho
      for (let i = 0; i < 3; i++) {
        flMorpho(mod(i * 330 + relogio * 22 - cam * 0.25, L.W + 60) - 30, 230 + i * 40 + Math.sin(relogio * 2.2 + i * 2) * 26, relogio + i);
      }

      // vaga-lumes
      ctx.shadowColor = '#fff6a8'; ctx.shadowBlur = 10; ctx.fillStyle = '#fff6a8';
      for (let i = 0; i < 12; i++) {
        const x = mod(i * 97 - cam * 0.25, L.W + 40) - 20, y = 150 + (i * 53) % 240 + Math.sin(relogio * 1.5 + i) * 10;
        ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(relogio * 1.8 + i * 1.3));
        ctx.beginPath(); ctx.arc(x, y, 2.6, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    },

    chao: function (P) {
      ctx.fillStyle = P.chao; ctx.fillRect(0, L.CHAO, L.W, L.H - L.CHAO);
      ctx.fillStyle = P.chaoArco; ctx.fillRect(0, L.CHAO, L.W, 8);
      for (let x = -mod(cam, 14) - 14; x < L.W + 14; x += 14) {
        const i = Math.round((x + cam) / 14), h = 8 + (Math.abs(i) * 7) % 9;
        ctx.beginPath(); ctx.moveTo(x, L.CHAO + 2); ctx.lineTo(x + 7, L.CHAO - h); ctx.lineTo(x + 14, L.CHAO + 2); ctx.closePath(); ctx.fill();
      }
      // folhas caídas no solo
      for (let i = 0; i < 22; i++) {
        const x = mod(i * 83 - cam, L.W + 40) - 20, y = L.CHAO + 14 + (i * 29) % (L.H - L.CHAO - 20);
        ctx.fillStyle = i % 3 ? 'rgba(90,60,25,.55)' : 'rgba(60,110,40,.55)';
        ctx.beginPath(); ctx.ellipse(x, y, 7, 3, (i % 5) * 0.5, 0, TAU); ctx.fill();
      }
      // bromélias e helicônias na borda do chão
      for (let i = 0; i < 9; i++) {
        const x = mod(i * 163 - cam, L.W + 80) - 40;
        if (i % 2) flBromelia(x, L.CHAO + 8, 1 + (i % 3) * 0.2, i % 4 === 1 ? '#e8231c' : '#ff8a00');
        else flHeliconia(x, L.CHAO + 8, 1 + (i % 3) * 0.15);
      }
    }
  };
})();

 // ===== CENA DO BARQUINHO (melhorada) =====
// Substitui ONDAS, desenharOnda e CENAS.barco. Usa: ctx, L (W, H, CHAO), cam, relogio, mod.
// Paleta opcional extra: P.silhueta (cor dos pescadores/ilhas), P.espuma (cor das cristas).

// c = só a curva (sem o fecho de baixo), usada para a crista de espuma
const ONDAS = [
  { w: 1440, h: 140, topo: -130, vel: 0.14,
    p: new Path2D('M0,70 C240,20 480,120 720,70 C960,20 1200,120 1440,70 L1440,140 L0,140 Z'),
    c: new Path2D('M0,70 C240,20 480,120 720,70 C960,20 1200,120 1440,70') },
  { w: 1200, h: 115, topo: -90, vel: 0.3,
    p: new Path2D('M0,80 C240,30 480,130 720,80 C960,30 1200,130 1440,80 L1440,140 L0,140 Z'),
    c: new Path2D('M0,80 C240,30 480,130 720,80 C960,30 1200,130 1440,80') },
  { w: 1000, h: 80, topo: -40, vel: 0.6,
    p: new Path2D('M0,90 C240,45 480,125 720,90 C960,45 1200,125 1440,90 L1440,140 L0,140 Z'),
    c: new Path2D('M0,90 C240,45 480,125 720,90 C960,45 1200,125 1440,90') }
];

function desenharOnda(o, cor1, cor2, alfa, espuma) {
  const desl = cam * o.vel + relogio * 18 * o.vel, y = L.CHAO + o.topo;
  ctx.globalAlpha = alfa;
  for (let x = -mod(desl, o.w); x < L.W; x += o.w) {
    ctx.save(); ctx.translate(x, y); ctx.scale(o.w / 1440, o.h / 140);
    if (cor2) {
      const g = ctx.createLinearGradient(0, 0, 0, 140);
      g.addColorStop(0, cor1); g.addColorStop(1, cor2); ctx.fillStyle = g;
    } else ctx.fillStyle = cor1;
    ctx.fill(o.p);
    if (espuma) {                       // crista clara no topo da onda
      ctx.globalAlpha = alfa * 0.55;
      ctx.strokeStyle = espuma; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.stroke(o.c);
      ctx.globalAlpha = alfa;
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// ---------- elementos do fundo ----------
function ilhaDistante(x, y, w, h, cor) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x, y + 2);
  ctx.quadraticCurveTo(x + w * 0.22, y - h * 1.15, x + w * 0.45, y - h);
  ctx.quadraticCurveTo(x + w * 0.75, y - h * 0.95, x + w, y + 2);
  ctx.closePath(); ctx.fill();
}

function farolMini(x, y, e, cor) {
  ctx.save(); ctx.translate(x, y); ctx.scale(e, e);
  ctx.fillStyle = cor;
  ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-3, -30); ctx.lineTo(3, -30); ctx.lineTo(5, 0); ctx.closePath(); ctx.fill();
  ctx.fillRect(-5, -36, 10, 6);
  ctx.beginPath(); ctx.moveTo(-6, -36); ctx.lineTo(0, -44); ctx.lineTo(6, -36); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,240,170,.95)'; ctx.fillRect(-2, -35, 4, 4);   // luzinha
  ctx.restore();
}

function veleiro(x, y, e, alfa) {
  const bob = Math.sin(relogio * 0.9 + x * 0.01) * 1.5;
  ctx.save(); ctx.globalAlpha = alfa; ctx.translate(x, y + bob); ctx.scale(e, e);
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, -46); ctx.quadraticCurveTo(18, -26, 20, -4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(-3, -36); ctx.quadraticCurveTo(-14, -20, -16, -4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2b4a63';
  ctx.beginPath(); ctx.moveTo(-18, -3); ctx.lineTo(24, -3); ctx.quadraticCurveTo(18, 6, 8, 6); ctx.lineTo(-10, 6); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// tipo 0: pescador sentado com vara | 1: em pé jogando tarrafa | 2: remador
function pescador(x, y, e, tipo, fase, cor, alfa) {
  const bob = Math.sin(relogio * 1.3 + fase) * 2.2 * e;
  const bal = Math.sin(relogio * 1.1 + fase) * 0.035;

  // marolas em volta do barco
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5 * e;
  for (let k = 0; k < 2; k++) {
    const t = mod(relogio * 0.5 + fase + k * 0.5, 1);
    ctx.globalAlpha = alfa * 0.5 * (1 - t);
    ctx.beginPath(); ctx.ellipse(x, y + 10 * e, (44 + t * 26) * e, (4 + t * 3) * e, 0, 0, 6.283); ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = alfa; ctx.translate(x, y + bob); ctx.rotate(bal); ctx.scale(e, e);
  ctx.fillStyle = cor; ctx.strokeStyle = cor; ctx.lineCap = 'round';

  // casco
  ctx.beginPath();
  ctx.moveTo(-38, -5); ctx.lineTo(42, -8);
  ctx.quadraticCurveTo(34, 14, 14, 14); ctx.lineTo(-16, 14);
  ctx.quadraticCurveTo(-34, 12, -38, -5); ctx.closePath(); ctx.fill();

  if (tipo === 0) {
    // corpo sentado, cabeça e chapéu de palha
    ctx.beginPath(); ctx.ellipse(-6, -14, 7, 11, 0.1, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(-4, -31, 5, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-16, -33); ctx.lineTo(-4, -43); ctx.lineTo(8, -33); ctx.closePath(); ctx.fill();
    // vara balançando de leve + linha + boia
    const tx = 36 + Math.sin(relogio * 1.8 + fase) * 1.5, ty = -50;
    ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.lineWidth = 0.7; ctx.globalAlpha = alfa * 0.8;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + 3, 10); ctx.stroke();
    ctx.globalAlpha = alfa; ctx.fillStyle = '#e8543a';
    ctx.beginPath(); ctx.arc(tx + 3, 10 + Math.sin(relogio * 2.4 + fase) * 1.2, 2.2, 0, 6.283); ctx.fill();

  } else if (tipo === 1) {
    // em pé, jogando a tarrafa
    ctx.fillRect(-4, -34, 8, 26);
    ctx.beginPath(); ctx.arc(0, -40, 5, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-10, -42); ctx.lineTo(0, -52); ctx.lineTo(10, -42); ctx.closePath(); ctx.fill();
    const s = (Math.sin(relogio * 0.8 + fase) + 1) * 0.5;      // 0 = recolhida, 1 = aberta
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(3, -32); ctx.lineTo(10 + s * 4, -38 - s * 4); ctx.stroke();
    ctx.globalAlpha = alfa * 0.6;
    ctx.beginPath();
    ctx.moveTo(10 + s * 4, -38 - s * 4);
    ctx.quadraticCurveTo(26 + s * 12, -52 - s * 6, 38 + s * 16, -20 + s * 6);
    ctx.quadraticCurveTo(22, -28, 10 + s * 4, -38 - s * 4);
    ctx.closePath(); ctx.fill();

  } else {
    // remador
    ctx.beginPath(); ctx.ellipse(0, -13, 7, 11, 0, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(1, -30, 5, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-10, -32); ctx.lineTo(1, -42); ctx.lineTo(12, -32); ctx.closePath(); ctx.fill();
    const a = 0.55 + Math.sin(relogio * 1.6 + fase) * 0.35;
    ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(4, -14); ctx.lineTo(4 + Math.cos(a) * 34, -14 + Math.sin(a) * 34); ctx.stroke();
  }
  ctx.restore();
}

function gaivota(x, y, e, fase) {
  const b = Math.sin(relogio * 5 + fase) * 4 * e;
  ctx.beginPath();
  ctx.moveTo(x - 14 * e, y + b);
  ctx.quadraticCurveTo(x - 7 * e, y - 8 * e, x, y);
  ctx.quadraticCurveTo(x + 7 * e, y - 8 * e, x + 14 * e, y + b);
  ctx.stroke();
}

// ---------- cena ----------
const PESCADORES = [
  // x0, parallax, y, escala, tipo, fase, opacidade (mais longe = mais clarinho)
  { x0: 240, f: 0.05, y: 314, e: 0.45, tipo: 0, fase: 0.0, a: 0.55 },
  { x0: 620, f: 0.07, y: 326, e: 0.60, tipo: 1, fase: 1.7, a: 0.70 },
  { x0: 980, f: 0.10, y: 340, e: 0.78, tipo: 2, fase: 3.1, a: 0.85 },
  { x0: 420, f: 0.10, y: 346, e: 0.80, tipo: 0, fase: 4.4, a: 0.88 }
];

CENAS.barco = {
  semBorda: true,
  fundo: function (P) {
    const sil = P.silhueta || '#1f4560';

    // sol com halo
    const g = ctx.createRadialGradient(780, 96, 10, 780, 96, 130);
    g.addColorStop(0, P.sol); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = 0.5; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(780, 96, 130, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = P.sol; ctx.beginPath(); ctx.arc(780, 96, 38, 0, 6.283); ctx.fill();

    // mar ao fundo
    const m = ctx.createLinearGradient(0, 300, 0, L.H); m.addColorStop(0, P.mar); m.addColorStop(1, P.mar2);
    ctx.fillStyle = m; ctx.fillRect(0, 300, L.W, L.H - 300);

    // ilhas distantes (parallax bem lento) + farol
    ctx.globalAlpha = 0.35;
    const ix = mod(150 - cam * 0.03, L.W + 400) - 200;
    ilhaDistante(ix, 300, 190, 34, sil);
    ilhaDistante(ix + 150, 300, 140, 22, sil);
    farolMini(ix + 118, 292, 0.7, sil);
    const jx = mod(700 - cam * 0.03, L.W + 400) - 200;
    ilhaDistante(jx, 300, 220, 26, sil);
    ctx.globalAlpha = 1;

    // bruma no horizonte
    const h = ctx.createLinearGradient(0, 296, 0, 350);
    h.addColorStop(0, 'rgba(255,255,255,.45)'); h.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = h; ctx.fillRect(0, 296, L.W, 54);

    // reflexo do sol brilhando no mar
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 14; i++) {
      const y = 304 + i * 8.5, w = 10 + i * 4.5;
      const x = 780 + Math.sin(relogio * 1.5 + i * 1.7) * (3 + i * 1.6);
      ctx.globalAlpha = Math.max(0.12, 0.75 - i * 0.045) * (0.6 + 0.4 * Math.sin(relogio * 3 + i));
      ctx.fillRect(x - w / 2, y, w, 2);
    }
    ctx.globalAlpha = 1;

    // veleiros distantes, devagarinho
    const vw = L.W + 240;
    veleiro(mod(80 - cam * 0.04 + relogio * 3, vw) - 120, 308, 0.38, 0.8);
    veleiro(mod(520 - cam * 0.05 - relogio * 2, vw) - 120, 312, 0.30, 0.7);

    // pescadores
    PESCADORES.forEach(p => {
      const px = mod(p.x0 - cam * p.f, L.W + 260) - 130;
      pescador(px, p.y, p.e, p.tipo, p.fase, sil, p.a);
    });

    // gaivotas (tamanhos variados)
    ctx.strokeStyle = 'rgba(255,255,255,.88)'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < 5; i++) {
      const e = 0.7 + (i % 3) * 0.25;
      const x = mod(i * 260 + 140 - cam * (0.06 + (i % 3) * 0.02) - relogio * 8, L.W + 160) - 80;
      const y = 100 + (i % 4) * 34 + Math.sin(relogio * 1.6 + i) * 6;
      ctx.lineWidth = 2.2 * e + 0.6;
      gaivota(x, y, e, i * 1.3);
    }
  },

  chao: function (P) {   // ondas de trás e do meio, atrás do barquinho
    ctx.fillStyle = P.mar2; ctx.globalAlpha = 0.5; ctx.fillRect(0, L.CHAO - 60, L.W, L.H - L.CHAO + 60); ctx.globalAlpha = 1;
    desenharOnda(ONDAS[0], P.onda1 || 'rgba(82,199,235,.9)', null, P.onda1 ? 1 : 0.35, P.espuma || 'rgba(255,255,255,.7)');
    desenharOnda(ONDAS[1], P.onda2 || 'rgba(8,125,181,.9)', null, P.onda2 ? 1 : 0.30, P.espuma || 'rgba(255,255,255,.7)');
  },

  frente: function (P) {   // onda da frente, por cima do casco
    desenharOnda(ONDAS[2], P.onda3a || '#52c7eb', P.onda3b || '#087db5', 0.9, P.espuma || 'rgba(255,255,255,.85)');
    // borrifos de espuma na onda da frente
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    for (let i = 0; i < 10; i++) {
      const x = mod(i * 113 - cam * 0.6 - relogio * 14, L.W + 40) - 20;
      const y = L.CHAO - 36 + Math.sin(relogio * 1.2 + i) * 4 + (i % 3) * 5;
      ctx.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(relogio * 2 + i));
      ctx.beginPath(); ctx.arc(x, y, 1.6 + (i % 3) * 0.6, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
};

    function desenharFundo() {
      const P = paleta, cena = P.estilo && CENAS[P.estilo];
      const g = ctx.createLinearGradient(0, 0, 0, L.CHAO);
      g.addColorStop(0, P.ceuTopo); g.addColorStop(1, P.ceuBase);
      ctx.fillStyle = g; ctx.fillRect(0, 0, L.W, L.H);

      if (P.estrelas && !(cena && cena.semEstrelas)) {
        ctx.fillStyle = '#cfe6ff';
        ESTRELAS_CEU.forEach(function (e) {
          ctx.globalAlpha = 0.45 + 0.45 * Math.sin(relogio * 1.6 + e.f);
          ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 6.283); ctx.fill();
        });
        ctx.globalAlpha = 1;
      }

      if (!(cena && cena.semNuvem)) {
        ctx.fillStyle = P.nuvem;
        for (let i = 0; i < 4; i++) {
          const x = mod(i * 340 - cam * 0.06, L.W + 240) - 120, y = 70 + (i % 2) * 70 + i * 6;
          ctx.beginPath(); ctx.ellipse(x, y, 62, 18, 0, 0, 6.283); ctx.ellipse(x + 36, y - 12, 40, 18, 0, 0, 6.283); ctx.ellipse(x - 34, y - 6, 32, 14, 0, 0, 6.283); ctx.fill();
        }
      }

      if (cena) cena.fundo(P);
      else {
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
      }

      // notas musicais flutuando ao fundo
      ctx.fillStyle = P.nota; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      NOTAS_DECOR.forEach(function (n) {
        const x = mod(n.x - cam * 0.2, 1800) - 100, y = n.y + Math.sin(relogio * 1.3 + n.f) * 6;
        ctx.font = '700 ' + n.s + 'px ' + FONTE; ctx.fillText(n.c, x, y);
      });

      // chão
      if (cena && cena.chao) cena.chao(P);
      else {
        ctx.fillStyle = P.chao; ctx.fillRect(0, L.CHAO, L.W, L.H - L.CHAO);
        ctx.fillStyle = P.chaoArco;
        for (let i = -1; i < 7; i++) {
          const x = i * 160 - mod(cam, 160) + 80;
          ctx.beginPath(); ctx.arc(x, L.H + 10, 62, Math.PI, 0); ctx.fill();
        }
      }

      // linha brilhante do chão (o barquinho não usa: a água já faz o papel)
      if (!(cena && cena.semBorda)) {
        ctx.save();
        ctx.shadowColor = P.borda; ctx.shadowBlur = 14;
        ctx.fillStyle = P.borda; ctx.fillRect(0, L.CHAO - 2, L.W, 4);
        ctx.restore();
      }
    }

    function desenharMoeda(x, y, f) {
      const r = C.MOEDA_R, e = Math.abs(Math.cos(relogio * 3 + f)) * 0.55 + 0.45;   // giro
      ctx.save();
      ctx.translate(x, y); ctx.scale(e, 1);
      ctx.fillStyle = '#ffc928'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();
      ctx.strokeStyle = '#d79a00'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#e8a800'; ctx.font = '700 ' + Math.round(r * 1.1) + 'px ' + FONTE;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
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

    // Aura (brilho colorido) ou partículas (símbolos), conforme a descrição do efeito no catálogo.
    function desenharEfeito() {
      const fx = fxCfg;
      if (!fx) return;
      if (fx.tipo === 'aura') {
        const cx = L.PX + (C.CX_ESQ + C.CX_DIR) / 2, cy = L.CHAO - p.desl - 80, pulso = 0.8 + 0.2 * Math.sin(relogio * 4);
        const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 130 * pulso);
        g.addColorStop(0, 'rgba(' + fx.cor + ',.55)'); g.addColorStop(1, 'rgba(' + fx.cor + ',0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 130 * pulso, 0, 6.283); ctx.fill();
        return;
      }
      if (!parts.length) return;
      ctx.save();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(8,36,89,.35)'; ctx.shadowBlur = 4;     // contorno suave para aparecer em qualquer fundo
      parts.forEach(function (q) {
        const k = q.t / q.vida;
        ctx.globalAlpha = q.mov === 'cai' ? (k < 0.8 ? 1 : Math.max(0, (1 - k) / 0.2)) : Math.max(0, 1 - k * k);
        const balanco = q.mov === 'tras' ? 0 : Math.sin(q.t * 4 + q.w) * (q.mov === 'sobe' ? 8 : 14);
        const esc = 1 - k * 0.3;
        ctx.save();
        ctx.translate(q.x + balanco, q.y);
        ctx.rotate(q.rot + q.vr * q.t);
        ctx.scale(esc, esc);
        ctx.fillStyle = q.cor;
        ctx.font = '700 ' + Math.round(q.s) + 'px ' + FONTE;
        ctx.fillText(q.c, 0, 0);
        ctx.restore();
      });
      ctx.restore();
    }

    function desenharPersonagem() {
      const alt = L.CHAO - p.desl;
      const h = C.PERSONAGEM_H, k = h / FRAME_H, w = FRAME_W * k;
      const cx = L.PX + (C.CX_ESQ + C.CX_DIR) / 2;   // o corpo fica sempre no centro da caixa de colisão
      // sombra
      const s = 1 - Math.min(0.5, p.desl / 400);
      const larg = paleta.estilo === 'barco' ? 92 : 50;
      ctx.fillStyle = paleta.estilo === 'barco' ? 'rgba(255,255,255,.45)' : 'rgba(5,20,60,.28)';
      ctx.beginPath(); ctx.ellipse(cx, L.CHAO + 4, larg * s, 8 * s, 0, 0, 6.283); ctx.fill();

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

      const mergulho = paleta.estilo === 'mar' && spriteMar && spriteMar.naturalWidth >= MERG_W * 16;
      const barco = paleta.estilo === 'barco' && spriteBarco && spriteBarco.naturalWidth >= BARCO_W * BARCO_N;
      // no tema escuro, o mergulhador e o barquinho brilham em azul, igual ao Notinha corrida
      if ((barco || mergulho) && temaAtual === 'escuro') {
        ctx.shadowColor = 'rgba(110,215,255,.95)';
        ctx.shadowBlur = 16;
      }
           // desenha as peças da loja na cabeça de um sprite especial (ox, oy = canto do quadro; ke = escala)
           const camadaEsp = function (nome, estilo, ke, ox, oy) {
            try {
              const L2 = NW.loja;
              const cab = L2 && L2.cabecaEspecial ? L2.cabecaEspecial(estilo) : null;
              if (!cab) return;
              camadas.forEach(function (c2) {
                const im = c2[nome];
                if (!(im && im.complete && im.naturalWidth > 0)) return;
                const aj = (L2.ajusteEsp && L2.ajusteEsp(estilo, c2.slot)) || { dx: 0, dy: 0, r: 0, s: 1 };
                const t = L2.VB * cab.R * ke * aj.s;
                const bx = ox + (cab.x + aj.dx * cab.R) * ke, by = oy + (cab.y + aj.dy * cab.R) * ke;
                ctx.save(); ctx.translate(bx, by); ctx.rotate(aj.r * Math.PI / 180);
                ctx.drawImage(im, -t / 2, -t / 2, t, t);
                ctx.restore();
              });
            } catch (e) {
              console.warn('[Notinha Runner] acessório no sprite especial:', e);
            }
          };
    
          if (barco) {
            // navegando: ciclo dos 24 quadros, subindo e descendo na onda; no pulo, quadro de comemoração
            const f = p.pulando ? BARCO_PULO : Math.floor(relogio * 14) % BARCO_N;
            const ke = BARCO_LARG / BARCO_W;
            const bob = p.pulando ? 0 : Math.sin(relogio * 3) * 3;
            const ox = -BARCO_CX * ke, oy = -BARCO_BASE * ke + 8 + bob;
            camadaEsp('tras', 'barco', ke, ox, oy);
            ctx.drawImage(spriteBarco, f * BARCO_W, 0, BARCO_W, BARCO_H, ox, oy, BARCO_W * ke, BARCO_H * ke);
            camadaEsp('frente', 'barco', ke, ox, oy);
          } else if (mergulho) {
            // Notinha mergulhador: nada em vez de correr
            const f = Math.min(frame, 15);
            const bob = p.pulando ? 0 : Math.sin(relogio * 5) * 3 * k;
            const ke = k * MERG_ESC;
            const ox = -MERG_CX * ke, oy = -MERG_ALT * k - MERG_CY * ke + bob;
            camadaEsp('tras', 'mar', ke, ox, oy);
            ctx.drawImage(spriteMar, f * MERG_W, 0, MERG_W, MERG_H, ox, oy, MERG_W * ke, MERG_H * ke);
            camadaEsp('frente', 'mar', ke, ox, oy);
          } else if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        if (paleta.estrelas) { ctx.shadowColor = 'rgba(110,215,255,.95)'; ctx.shadowBlur = 16; }

        // protege contra sprite com menos quadros do que o esperado
        const totalFrames = Math.max(1, Math.floor(sprite.naturalWidth / FRAME_W));
        const f = Math.min(frame, totalFrames - 1);

        // acessórios: centro da cabeça deste quadro ("tras" fica atrás do Notinha, "frente" por cima)
        const ce = (NW.loja && NW.loja.centro) ? NW.loja.centro(f) : null;
        const desenharCamada = function (nome) {
          if (!ce) return;
          const t = 3.6 * ce.R * k, bx = (ce.x - CORPO_X) * k, by = (ce.y - CHAO_Y) * k;
          camadas.forEach(function (c2) {
            const im = c2[nome];
            if (im && im.complete && im.naturalWidth > 0) ctx.drawImage(im, bx - t / 2, by - t / 2, t, t);
          });
        };

        desenharCamada('tras');
        ctx.drawImage(sprite, f * FRAME_W, 0, FRAME_W, FRAME_H, -CORPO_X * k, -CHAO_Y * k, w, h);
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

    function frenteCena() {
      const cn = paleta.estilo && CENAS[paleta.estilo];
      if (cn && cn.frente) cn.frente(paleta);
    }

    function quadro(dt) {
      // faixas fora da área 16:9 (se o palco não for 16:9) ficam com a cor do céu
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = paleta.ceuBase;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.setTransform(escala, 0, 0, escala, offX, offY);
      ctx.beginPath(); ctx.rect(0, 0, L.W, L.H); ctx.clip();

      try {
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
          frenteCena();                         // onda da frente, por cima do barquinho
          desenharTextos(modo === 'pausado' ? 0 : dt);
        } else {
          frenteCena();                         // na tela inicial também
        }
      } catch (e) {
        console.error('[Notinha Runner] erro ao desenhar o quadro:', e);
      }
      ctx.restore();
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