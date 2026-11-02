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

    // ---------- cenários temáticos (escolhidos por "estilo" na paleta) ----------
    const CENAS = {};

    function bola(x, y, r) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.283); }

    function linhaOnda(y, amp, comp, vel, cor, larg) {
      ctx.strokeStyle = cor; ctx.lineWidth = larg || 3; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let x = -10; x <= L.W + 10; x += 14) {
        const yy = y + Math.sin((x + cam * vel) / comp + relogio * 1.4) * amp;
        if (x === -10) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }

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

    // ---- PRAIA ----
    CENAS.praia = {
      fundo: function (P) {
        const g = ctx.createRadialGradient(780, 96, 10, 780, 96, 110);
        g.addColorStop(0, P.sol); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = 0.5; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(780, 96, 110, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
        ctx.fillStyle = P.sol; ctx.beginPath(); ctx.arc(780, 96, 38, 0, 6.283); ctx.fill();
        const m = ctx.createLinearGradient(0, 280, 0, L.CHAO); m.addColorStop(0, P.mar); m.addColorStop(1, P.mar2);
        ctx.fillStyle = m; ctx.fillRect(0, 280, L.W, L.CHAO - 280);
        for (let i = 0; i < 2; i++) {   // veleiros bem longe
          const x = mod(i * 520 + 160 - cam * 0.04, L.W + 200) - 100, y = 284;
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x, y - 46); ctx.lineTo(x + 26, y - 4); ctx.lineTo(x, y - 4); ctx.fill();
          ctx.fillStyle = '#f2548c'; ctx.beginPath(); ctx.moveTo(x - 20, y - 4); ctx.lineTo(x + 30, y - 4); ctx.lineTo(x + 22, y + 6); ctx.lineTo(x - 12, y + 6); ctx.fill();
        }
        linhaOnda(305, 3, 40, 0.15, 'rgba(255,255,255,.45)', 3);
        linhaOnda(345, 4, 55, 0.25, 'rgba(255,255,255,.35)', 3);
        linhaOnda(390, 5, 70, 0.35, 'rgba(255,255,255,.30)', 4);
        linhaOnda(430, 5, 90, 0.5, 'rgba(255,255,255,.55)', 5);   // espuma na beira
        [120, 560, 980].forEach(function (px, i) {
          palmeira(mod(px - cam * 0.35 + 100, 1300) - 100, L.CHAO + 2, 170 + (i % 2) * 40, P.tronco, P.folha);
        });
        guardaSol(mod(300 - cam * 0.5 + 150, 1700) - 150, L.CHAO + 2, '#ff6b6b', '#ffffff');
        guardaSol(mod(1100 - cam * 0.5 + 150, 1700) - 150, L.CHAO + 2, '#ffd84a', '#ffffff');
      },
      chao: function (P) {
        ctx.fillStyle = P.chao; ctx.fillRect(0, L.CHAO, L.W, L.H - L.CHAO);
        ctx.fillStyle = P.chaoArco;
        for (let i = 0; i < 16; i++) {
          const x = mod(i * 71 - cam, L.W + 40) - 20, y = L.CHAO + 14 + (i * 37) % 64;
          ctx.beginPath(); ctx.ellipse(x, y, 5 + (i % 3) * 2, 2.5, 0, 0, 6.283); ctx.fill();
        }
      }
    };

    // ---- FUNDO DO MAR ----
    CENAS.mar = {
      semNuvem: true, semEstrelas: true,
      fundo: function (P) {
        ctx.fillStyle = P.raio;   // raios de luz da superfície
        for (let i = 0; i < 5; i++) {
          const x0 = mod(i * 230 + 80 - cam * 0.05, L.W + 300) - 150;
          ctx.globalAlpha = 0.7 + 0.3 * Math.sin(relogio * 1.2 + i);
          ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + 60, 0); ctx.lineTo(x0 + 190, L.CHAO); ctx.lineTo(x0 + 70, L.CHAO); ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = 1;
        const far = [{ x: 60, t: 'c', h: 150 }, { x: 400, t: 'a', h: 190 }, { x: 800, t: 'c', h: 120 }, { x: 1200, t: 'a', h: 170 }];
        far.forEach(function (it) {
          const x = mod(it.x - cam * 0.12 + 80, 1600) - 80;
          if (it.t === 'c') coral(x, L.CHAO + 4, it.h, P.longe); else alga(x, L.CHAO + 4, it.h, P.longe);
        });
        const perto = [{ x: 150, t: 'a', h: 120 }, { x: 520, t: 'c', h: 100, c: 1 }, { x: 900, t: 'a', h: 140 }, { x: 1180, t: 'c', h: 90 }];
        perto.forEach(function (it) {
          const x = mod(it.x - cam * 0.3 + 80, 1400) - 80;
          if (it.t === 'c') coral(x, L.CHAO + 4, it.h, it.c ? P.coral : P.perto); else alga(x, L.CHAO + 4, it.h, P.perto);
        });
        const cores = ['#ffb347', '#ff6b9a', '#ffd84a', '#7ce6ff', '#ff8a5c'];
        for (let i = 0; i < 5; i++) {
          const x = mod(i * 230 - cam * 0.2 - relogio * 25 * (1 + (i % 3) * 0.3), L.W + 200) - 100;
          peixe(x, 110 + i * 52 + Math.sin(relogio * 2 + i) * 8, 0.8 + (i % 3) * 0.25, cores[i]);
        }
        ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2;
        for (let i = 0; i < 14; i++) {   // bolhas
          const x = mod(i * 83 - cam * 0.15, L.W + 40) - 20 + Math.sin(relogio * 2 + i) * 6;
          const y = L.CHAO - mod(relogio * 40 + i * 61, 400);
          ctx.beginPath(); ctx.arc(x, y, 3 + (i % 3) * 2, 0, 6.283); ctx.stroke();
        }
      },
      chao: function (P) {
        ctx.fillStyle = P.chao; ctx.fillRect(0, L.CHAO, L.W, L.H - L.CHAO);
        ctx.fillStyle = P.chaoArco;
        for (let i = 0; i < 14; i++) {
          const x = mod(i * 83 - cam, L.W + 40) - 20, y = L.CHAO + 16 + (i * 37) % 60;
          ctx.beginPath(); ctx.ellipse(x, y, 8 + (i % 3) * 3, 4, 0, 0, 6.283); ctx.fill();
        }
      }
    };

    // ---- BRASIL (Rio de Janeiro) ----
    CENAS.rio = {
      fundo: function (P) {
        const base = L.CHAO + 4;
        const pa = mod(520 - cam * 0.1 + 300, 1920) - 300;   // Pão de Açúcar
        ctx.fillStyle = P.longe;
        ctx.beginPath(); ctx.ellipse(pa, base, 120, 230, 0, Math.PI, 0); ctx.fill();
        ctx.beginPath(); ctx.ellipse(pa + 190, base, 90, 140, 0, Math.PI, 0); ctx.fill();
        const px = mod(900 - cam * 0.16 + 260, 2300) - 260;   // morro do Cristo
        ctx.fillStyle = P.perto; ctx.beginPath(); ctx.ellipse(px, base, 230, 250, 0, Math.PI, 0); ctx.fill();
        const t = base - 250;
        ctx.fillStyle = P.cristo;
        ctx.fillRect(px - 10, t - 26, 20, 28);          // pedestal
        ctx.fillRect(px - 6, t - 88, 12, 64);           // corpo
        ctx.fillRect(px - 46, t - 82, 92, 9);           // braços abertos
        ctx.beginPath(); ctx.arc(px, t - 96, 7, 0, 6.283); ctx.fill();   // cabeça
        [200, 650, 1000].forEach(function (x0, i) {
          palmeira(mod(x0 - cam * 0.4 + 100, 1200) - 100, L.CHAO + 2, 160 + (i % 2) * 30, P.tronco, P.folha);
        });
        bandeirinhas();
      },
      chao: function (P) {   // calçadão de ondas, estilo Copacabana
        ctx.fillStyle = P.chao; ctx.fillRect(0, L.CHAO, L.W, L.H - L.CHAO);
        ctx.strokeStyle = P.chaoArco; ctx.lineWidth = 18; ctx.lineCap = 'butt';
        [26, 66].forEach(function (dy, k) {
          ctx.beginPath();
          for (let x = -10; x <= L.W + 10; x += 10) {
            const y = L.CHAO + dy + Math.sin((x + cam) / 46 + k * Math.PI) * 13;
            if (x === -10) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        });
      }
    };

    // ---- FLORESTA TROPICAL ----
    CENAS.floresta = {
      fundo: function (P) {
        ctx.fillStyle = 'rgba(255,255,220,.10)';   // luz entre as folhas
        for (let i = 0; i < 4; i++) {
          const x0 = mod(i * 280 - cam * 0.05, L.W + 300) - 150;
          ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + 50, 0); ctx.lineTo(x0 + 190, L.CHAO); ctx.lineTo(x0 + 90, L.CHAO); ctx.closePath(); ctx.fill();
        }
        [80, 360, 700, 1040, 1330].forEach(function (x0, i) {
          arvore(mod(x0 - cam * 0.12 + 150, 1500) - 150, L.CHAO + 4, 230 + (i % 3) * 30, P.longe, P.longe);
        });
        [200, 700, 1150].forEach(function (x0) {
          arvore(mod(x0 - cam * 0.3 + 200, 1400) - 200, L.CHAO + 4, 330, P.tronco, P.perto);
        });
        ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (let i = 0; i < 6; i++) {   // cipós
          const x = mod(i * 190 - cam * 0.2, L.W + 60) - 30, h = 90 + (i % 3) * 40, sw = Math.sin(relogio * 1.2 + i) * 6;
          ctx.strokeStyle = P.folha; ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + sw, h / 2, x + sw * 1.4, h); ctx.stroke();
          ctx.fillStyle = P.folha; ctx.beginPath(); ctx.ellipse(x + sw * 1.4, h + 6, 6, 10, 0, 0, 6.283); ctx.fill();
        }
        ctx.shadowColor = '#fff6a8'; ctx.shadowBlur = 10; ctx.fillStyle = '#fff6a8';   // vaga-lumes
        for (let i = 0; i < 12; i++) {
          const x = mod(i * 97 - cam * 0.25, L.W + 40) - 20, y = 150 + (i * 53) % 240 + Math.sin(relogio * 1.5 + i) * 10;
          ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(relogio * 1.8 + i * 1.3));
          ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 6.283); ctx.fill();
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
      }
    };

        // ---- BARQUINHO (ondas reaproveitadas do rodapé do site) ----
    // Mesmos desenhos do tema.css: onda de trás 1440x140, do meio 1200x115, da frente 1000x80.
    const ONDAS = [
      { w: 1440, h: 140, topo: -130, vel: 0.14, p: new Path2D('M0,70 C240,20 480,120 720,70 C960,20 1200,120 1440,70 L1440,140 L0,140 Z') },
      { w: 1200, h: 115, topo: -90,  vel: 0.3,  p: new Path2D('M0,80 C240,30 480,130 720,80 C960,30 1200,130 1440,80 L1440,140 L0,140 Z') },
      { w: 1000, h: 80,  topo: -40,  vel: 0.6,  p: new Path2D('M0,90 C240,45 480,125 720,90 C960,45 1200,125 1440,90 L1440,140 L0,140 Z') }
    ];
    function desenharOnda(o, cor1, cor2, alfa) {
      const desl = cam * o.vel + relogio * 18 * o.vel, y = L.CHAO + o.topo;
      ctx.globalAlpha = alfa;
      for (let x = -mod(desl, o.w); x < L.W; x += o.w) {
        ctx.save(); ctx.translate(x, y); ctx.scale(o.w / 1440, o.h / 140);
        if (cor2) {
          const g = ctx.createLinearGradient(0, 0, 0, 140); g.addColorStop(0, cor1); g.addColorStop(1, cor2); ctx.fillStyle = g;
        } else ctx.fillStyle = cor1;
        ctx.fill(o.p);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    CENAS.barco = {
      semBorda: true,
      fundo: function (P) {
        const g = ctx.createRadialGradient(780, 96, 10, 780, 96, 110);
        g.addColorStop(0, P.sol); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = 0.5; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(780, 96, 110, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
        ctx.fillStyle = P.sol; ctx.beginPath(); ctx.arc(780, 96, 38, 0, 6.283); ctx.fill();
        const m = ctx.createLinearGradient(0, 300, 0, L.H); m.addColorStop(0, P.mar); m.addColorStop(1, P.mar2);
        ctx.fillStyle = m; ctx.fillRect(0, 300, L.W, L.H - 300);        // mar ao fundo
        ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; ctx.lineCap = 'round';   // gaivotas
        for (let i = 0; i < 3; i++) {
          const x = mod(i * 340 + 140 - cam * 0.08, L.W + 160) - 80, y = 110 + i * 38 + Math.sin(relogio * 1.6 + i) * 6, b = Math.sin(relogio * 5 + i) * 4;
          ctx.beginPath(); ctx.moveTo(x - 14, y + b); ctx.quadraticCurveTo(x - 7, y - 8, x, y); ctx.quadraticCurveTo(x + 7, y - 8, x + 14, y + b); ctx.stroke();
        }
      },
      chao: function (P) {   // ondas de trás e do meio, atrás do barquinho
        ctx.fillStyle = P.mar2; ctx.globalAlpha = 0.5; ctx.fillRect(0, L.CHAO - 60, L.W, L.H - L.CHAO + 60); ctx.globalAlpha = 1;
        desenharOnda(ONDAS[0], P.onda1 || 'rgba(82,199,235,.9)', null, P.onda1 ? 1 : 0.35);
        desenharOnda(ONDAS[1], P.onda2 || 'rgba(8,125,181,.9)', null, P.onda2 ? 1 : 0.30);
      },
      frente: function (P) {   // onda da frente, por cima do casco
        desenharOnda(ONDAS[2], P.onda3a || '#52c7eb', P.onda3b || '#087db5', 0.9);
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
      if (barco) {
        // navegando: ciclo dos 24 quadros, subindo e descendo na onda; no pulo, quadro de comemoração
        const f = p.pulando ? BARCO_PULO : Math.floor(relogio * 14) % BARCO_N;
        const ke = BARCO_LARG / BARCO_W;
        const bob = p.pulando ? 0 : Math.sin(relogio * 3) * 3;
        ctx.drawImage(spriteBarco, f * BARCO_W, 0, BARCO_W, BARCO_H,
          -BARCO_CX * ke, -BARCO_BASE * ke + 8 + bob, BARCO_W * ke, BARCO_H * ke);
      } else if (mergulho) {
        // Notinha mergulhador: nada em vez de correr (acessórios da loja não são desenhados aqui)
        const f = Math.min(frame, 15);
        const bob = p.pulando ? 0 : Math.sin(relogio * 5) * 3 * k;
        const ke = k * MERG_ESC;
        ctx.drawImage(spriteMar, f * MERG_W, 0, MERG_W, MERG_H,
          -MERG_CX * ke, -MERG_ALT * k - MERG_CY * ke + bob, MERG_W * ke, MERG_H * ke);
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