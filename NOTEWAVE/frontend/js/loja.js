/* Notinha Runner — catálogo da loja (acessórios, roupas, efeitos e cenários).
 *
 * Todos os desenhos são SVG feitos em código. As peças são desenhadas em "unidades da cabeça":
 *   • (0,0) = centro da bola da cabeça do Notinha, raio da cabeça = 1
 *   • x > 0 = lado do rosto (frente); x < 0 = costas
 *   • y < 0 = acima do centro (chapéus ≈ -1); y > 0 = abaixo (corpo ≈ 0.8 a 1.3, pés ≈ 1.42)
 * O motor e a prévia posicionam esse "quadrado de 4.8 unidades" pelo rosto de cada quadro
 * da corrida e o inclinam junto com a cabeça (inclinação medida do próprio sprite).
 *
 * Para criar item novo: inclua um objeto em ITENS. Se uma peça ficar torta, use o modo de
 * ajuste (abra a página com  #ajuste  no final do endereço) e cole o resultado em AJUSTES_FIXOS.
 */
(function (NW) {
    'use strict';

    /* ===================== ENCAIXE ===================== */

    // Centro do rosto (óculos) em cada um dos 16 quadros do sprite (pixels do quadro 290x251).
    const ROSTO = [[163,143],[166,136],[169,138],[165,131],[168,128],[165,131],[167,136],[170,131],
                   [168,132],[164,133],[167,132],[168,133],[169,130],[167,134],[165,137],[166,137]];
    const BOLA = { dx: -23, dy: -1, R: 72 };   // do rosto até o centro da cabeça; R = raio da cabeça
    const FRAME_W = 290, FRAME_H = 251, FRAMES = 16;
    const VB = 4.8;                            // lado (em unidades da cabeça) do quadrado de cada camada

    // Inclinação da cabeça por quadro, medida nos óculos brancos do sprite (analisarSprite).
    const INCL = new Array(FRAMES).fill(0);
    let INCL_MEDIA = 0;
    const AUTO_INCLINACAO = true;              // false = peças não acompanham a inclinação

    function centro(frame) {
      const f = ROSTO[frame] ? frame : 0, r = ROSTO[f];
      return { x: r[0] + BOLA.dx, y: r[1] + BOLA.dy, R: BOLA.R, rot: AUTO_INCLINACAO ? INCL[f] - INCL_MEDIA : 0 };
    }

    /** Mede a inclinação da cabeça em cada quadro olhando os óculos (pixels brancos). Chamar uma vez. */
    function analisarSprite(img) {
      if (!img || !img.naturalWidth) return false;
      try {
        const s = img.naturalWidth / (FRAME_W * FRAMES);
        const cv = document.createElement('canvas');
        cv.width = img.naturalWidth; cv.height = img.naturalHeight;
        const cx = cv.getContext('2d', { willReadFrequently: true });
        cx.drawImage(img, 0, 0);
        const W = Math.round(100 * s), H = Math.round(36 * s);
        let soma = 0, n = 0;
        for (let f = 0; f < FRAMES; f++) {
          const r = ROSTO[f];
          const d = cx.getImageData(Math.round((f * FRAME_W + r[0] - 50) * s), Math.round((r[1] - 26) * s), W, H).data;
          let c = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
          for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
            const p = (j * W + i) * 4;
            if (d[p + 3] > 200 && d[p] > 185 && d[p + 1] > 185 && d[p + 2] > 185) { c++; sx += i; sy += j; sxx += i * i; syy += j * j; sxy += i * j; }
          }
          INCL[f] = 0;
          if (c < 60) continue;
          const mx = sx / c, my = sy / c, vxx = sxx / c - mx * mx, vyy = syy / c - my * my, vxy = sxy / c - mx * my;
          if (vxx < 1.3 * vyy) continue;                       // formato sem direção clara: ignora
          INCL[f] = Math.max(-0.35, Math.min(0.35, 0.5 * Math.atan2(2 * vxy, vxx - vyy)));
          soma += INCL[f]; n++;
        }
        INCL_MEDIA = n ? soma / n : 0;
        return true;
      } catch (e) { return false; }                            // sem permissão de leitura: segue sem inclinação
    }

       // Cabeça dos Notinhas especiais (pixels do quadro de cada sprite).
    // x,y = centro da cabeça; R = raio da cabeça.
    // slots = ajuste fino de cada tipo de peça, em "unidades da cabeça":
    //   dx (+ direita), dy (+ para baixo), r (giro em graus, + = horário), s (tamanho, 1 = normal)
    const CABECA_ESP = {
        mar:   { w: 270, h: 200, x: 138, y: 82, R: 50,
                 slots: { chapeu:  { dx: 0, dy: 0, r: 20, s: 1 },
                          pescoco: { dx: 0, dy: 0, r: 0,  s: 1 },
                          costas:  { dx: 0, dy: 0, r: 0,  s: 1 } } },
        barco: { w: 240, h: 211, x: 119, y: 95, R: 40,
                 slots: { chapeu:  { dx: 0, dy: 0,   r: 0, s: 1 },
                          pescoco: { dx: 0, dy: 0.3, r: 0, s: 1 },
                          costas:  { dx: 0, dy: 0,   r: 0, s: 1 } } }
      };
      function cabecaEspecial(estilo) { return CABECA_ESP[estilo] || null; }
      function ajusteEsp(estilo, slot) {
        const c = CABECA_ESP[estilo];
        return Object.assign({ dx: 0, dy: 0, r: 0, s: 1 }, c && c.slots && c.slots[slot]);
      }

    // ---- ajustes finos (modo #ajuste). Cole aqui o JSON final depois de calibrar. ----
    const AJUSTES_FIXOS = {
      // 'moletom-azul': { dx: 0, dy: 0.02, s: 1, r: 0 },
    };
    const CFG_FIXA = { recorte: 0.97 };        // raio do "furo" da cabeça nas roupas (1 = bola inteira)

    const CH_AJ = 'nwr_ajustes_v1';            // preferência de desenvolvimento, não é dado de conta
    let locais = {}, cfg = Object.assign({}, CFG_FIXA);
    try {
      const d = JSON.parse(localStorage.getItem(CH_AJ) || '{}');
      locais = d.ajustes || {}; if (d.recorte) cfg.recorte = d.recorte;
    } catch (e) {}
    function salvarLocal() { try { localStorage.setItem(CH_AJ, JSON.stringify({ ajustes: locais, recorte: cfg.recorte })); } catch (e) {} }

    function obterAjuste(id) { return Object.assign({ dx: 0, dy: 0, s: 1, r: 0 }, AJUSTES_FIXOS[id], locais[id]); }
    function definirAjuste(id, a) { locais[id] = a; salvarLocal(); }
    function zerarAjuste(id) { delete locais[id]; salvarLocal(); }
    function definirRecorte(v) { cfg.recorte = v; salvarLocal(); }
    function obterRecorte() { return cfg.recorte; }
    function exportarAjustes() {
      const out = {};
      Object.keys(Object.assign({}, AJUSTES_FIXOS, locais)).forEach(function (id) {
        const a = obterAjuste(id);
        if (a.dx || a.dy || a.s !== 1 || a.r) out[id] = a;
      });
      return { AJUSTES_FIXOS: out, recorte: cfg.recorte };
    }

    /* ===================== CATEGORIAS E SLOTS ===================== */

    // A ordem dos slots é a ordem de empilhamento (de baixo para cima).
    const SLOTS = [
      { id: 'costas',  nome: 'Costas' },
      { id: 'pescoco', nome: 'Pescoço' },
      { id: 'chapeu',  nome: 'Cabeça' }
    ];
    const CATEGORIAS = [
      { id: 'acessorios', nome: 'Acessórios' },
      { id: 'efeitos',    nome: 'Efeitos' },
      { id: 'cenarios',   nome: 'Cenários' }
    ];

    /* ===================== DESENHO ===================== */

    const T = 'stroke="#0b2459" stroke-width=".05" stroke-linejoin="round" stroke-linecap="round"';
    const O = 'stroke="#0b2459" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';   // contorno dos ícones 64x64
    const ESTRELA = '0,-.14 .04,-.045 .14,-.04 .065,.025 .09,.12 0,.07 -.09,.12 -.065,.025 -.14,-.04 -.04,-.045';

    // pequenos símbolos reaproveitados em roupas e bolsas (x, y, escala, cor)
    const GL = {
      nota: function (x, y, s, c) {
        return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><ellipse cx="-.08" cy=".1" rx=".11" ry=".08" fill="' + c + '" transform="rotate(-20 -.08 .1)"/>' +
               '<path d="M.02 .08V-.22L.17 -.16V-.11L.06 -.15V.08Z" fill="' + c + '"/></g>';
      },
      estrela: function (x, y, s, c) {
        return '<polygon transform="translate(' + x + ' ' + y + ') scale(' + s + ')" points="' + ESTRELA + '" fill="' + c + '"/>';
      },
      coracao: function (x, y, s, c) {
        return '<path transform="translate(' + x + ' ' + y + ') scale(' + s + ')" d="M0 .12C-.2 -.02 -.14 -.16 -.07 -.16C-.03 -.16 0 -.13 0 -.1C0 -.13 .03 -.16 .07 -.16C.14 -.16 .2 -.02 0 .12Z" fill="' + c + '"/>';
      }
    };

    /* ---- peças reaproveitadas pelos acessórios ---- */

    // Asa de penas: 4 penas em leque saindo de um ponto (0,0), apontando para trás/cima (lado esquerdo).
    function penas() {
      return [[-110, 0.9], [-85, 1.1], [-60, 1.1], [-35, 0.9]].map(function (a) {
        return '<g transform="rotate(' + a[0] + ') scale(' + a[1] + ')">' +
               '<path d="M0 0C-.15 -.2 -.17 -.6 0 -1C.17 -.6 .15 -.2 0 0Z" fill="#f4faff" ' + T + '/>' +
               '<path d="M0 -.14V-.72" stroke="#b8d4f0" stroke-width=".04" stroke-linecap="round"/></g>';
      }).join('') + '<circle r=".14" fill="#f4faff" ' + T + '/>';
    }

    // Cachecol: um anel que abraça a base da cabeça (por isso recorte: true) + uma ponta voando para trás.
    function cachecol(a, listrado) {
      const arco = 'M-.97 .45A1.07 1.07 0 0 0 .97 .45';
      return '<path d="M-.78 .7L-1.5 .92L-1.4 1.2L-.66 1.0Z" fill="' + a + '" ' + T + '/>' +
             (listrado ? '<path d="M-1.014 .786L-.926 1.074M-1.234 .846L-1.146 1.134" stroke="#eaf4ff" stroke-width=".07"/>'
                       : '<path d="M-1.4 .9L-1.33 1.14" stroke="#d6506f" stroke-width=".05"/>') +
             '<path d="' + arco + '" fill="none" stroke="#0b2459" stroke-width=".32" stroke-linecap="round"/>' +
             '<path d="' + arco + '" fill="none" stroke="' + a + '" stroke-width=".22" stroke-linecap="round"/>' +
             (listrado ? '<path d="' + arco + '" fill="none" stroke="#eaf4ff" stroke-width=".22" stroke-dasharray=".1 .16" stroke-dashoffset=".05"/>'
                       : '<path d="' + arco + '" fill="none" stroke="#d6506f" stroke-width=".05" stroke-dasharray=".12 .09"/>');
    }

    // Bolsas das costas: penduradas atrás do corpo, ao lado e abaixo da cabeça.
    function mochila() {
      return '<g transform="translate(-.86 1.04) rotate(-6)">' +
             '<rect x="-.3" y="-.38" width=".6" height=".76" rx=".22" fill="#2a6ee0" ' + T + '/>' +
             '<path d="M-.3 -.08Q0 .08 .3 -.08" fill="none" stroke="#0b2459" stroke-width=".04"/>' +
             '<rect x="-.2" y=".1" width=".4" height=".22" rx=".07" fill="#1b4fc0" ' + T + '/>' +
             GL.nota(0, -.16, 1.1, '#eaf4ff') + '</g>';
    }
    function bolsa() {
      return '<g transform="translate(-.86 1.1) rotate(-4)">' +
             '<path d="M-.18 -.26C-.18 -.6 .18 -.6 .18 -.26" fill="none" stroke="#0b2459" stroke-width=".1" stroke-linecap="round"/>' +
             '<rect x="-.3" y="-.28" width=".6" height=".56" rx=".08" fill="#2a5bd0" ' + T + '/>' +
             GL.nota(0, 0, 1.3, '#eaf4ff') + '</g>';
    }

    /* ---- acessórios ---- */

    const ACESSORIOS = [
      { id: 'bone-estrelado', vb: [-1.09, -2.23, 2.15, 2.15], pivo: [-.2, -.93], cat: 'acessorios', slot: 'chapeu', nome: 'Boné Estrelado', preco: 50,
        desc: 'Um boné azul com estrelinha dourada.',
        frente: '<g transform="translate(-.2 -.93) rotate(-14)">' +
                '<path d="M.15 .02 C.6 -.06 1.0 .02 1.08 .14 C.7 .2 .38 .16 .15 .1 Z" fill="#0d2a66" ' + T + '/>' +
                '<path d="M-.62 .06 C-.64 -.52 .62 -.52 .6 .06 Z" fill="#1b4fc0" ' + T + '/>' +
                '<circle cy="-.47" r=".055" fill="#ffc928"/>' +
                '<polygon transform="translate(-.02 -.2)" points="' + ESTRELA + '" fill="#ffc928" stroke="#b07a00" stroke-width=".02"/></g>' },

      { id: 'boina', vb: [-1.28, -2.01, 1.98, 1.98], pivo: [-.28, -.95], cat: 'acessorios', slot: 'chapeu', nome: 'Boina Artista', preco: 65,
        desc: 'Para o Notinha que também é artista.',
        frente: '<g transform="translate(-.28 -.95) rotate(-12)">' +
                '<ellipse rx=".78" ry=".3" fill="#13265c" ' + T + '/>' +
                '<path d="M-.02 -.3 L.02 -.44" stroke="#0b2459" stroke-width=".07" stroke-linecap="round"/>' +
                '<polygon transform="translate(.12 -.02)" points="' + ESTRELA + '" fill="#ffc928" stroke="#b07a00" stroke-width=".02"/></g>' },

      { id: 'gorro', vb: [-1.15, -2.05, 1.9, 1.9], pivo: [-.2, -.9], cat: 'acessorios', slot: 'chapeu', nome: 'Gorro Azul', preco: 55,
        desc: 'Um gorrinho com pompom para os dias frios.',
        frente: '<g transform="translate(-.2 -.9) rotate(-12)">' +
                '<path d="M-.6 .06C-.66 -.55 .6 -.58 .58 .06Z" fill="#2a6ee0" ' + T + '/>' +
                '<path d="M-.3 0V-.38M0 0V-.44M.3 0V-.38" stroke="#1b4fc0" stroke-width=".035" stroke-linecap="round"/>' +
                '<rect x="-.66" y="-.04" width="1.28" height=".2" rx=".1" fill="#eaf4ff" ' + T + '/>' +
                '<circle cy="-.5" r=".1" fill="#eaf4ff" ' + T + '/></g>' },

      { id: 'orelhas-gato', vb: [-1.2, -2.1, 1.9, 1.9], pivo: [-.25, -.92], cat: 'acessorios', slot: 'chapeu', nome: 'Orelhas de Gatinho', preco: 70,
        desc: 'Uma tiara com orelhinhas fofas.',
        frente: '<g transform="translate(-.25 -.92) rotate(-10)">' +
                '<path d="M-.66 -.02L-.58 -.52L-.2 -.16Z" fill="#4a62c0" ' + T + '/><path d="M-.57 -.08L-.54 -.36L-.33 -.15Z" fill="#ff9ec4"/>' +
                '<path d="M.66 -.02L.58 -.52L.2 -.16Z" fill="#4a62c0" ' + T + '/><path d="M.57 -.08L.54 -.36L.33 -.15Z" fill="#ff9ec4"/>' +
                '<path d="M-.72 .12Q0 -.22 .72 .12" fill="none" stroke="#0b2459" stroke-width=".14" stroke-linecap="round"/>' +
                '<path d="M-.72 .12Q0 -.22 .72 .12" fill="none" stroke="#6f84e0" stroke-width=".07" stroke-linecap="round"/></g>' },

      { id: 'laco-azul', vb: [-1.21, -1.34, 1.22, 1.22], pivo: [-.66, -.84], cat: 'acessorios', slot: 'chapeu', nome: 'Laço Azul', preco: 40,
        desc: 'Um laço delicado para ficar charmoso.',
        frente: '<g transform="translate(-.66 -.84) rotate(-28)">' +
                '<path d="M0 0 C-.38 -.34 -.56 .12 -.4 .34 C-.2 .4 -.05 .14 0 0Z" fill="#2a6ee0" ' + T + '/>' +
                '<path d="M0 0 C.38 -.34 .56 .12 .4 .34 C.2 .4 .05 .14 0 0Z" fill="#2a6ee0" ' + T + '/>' +
                '<circle r=".11" fill="#1b4fc0" ' + T + '/></g>' },

      { id: 'laco-rosa', vb: [-1.21, -1.34, 1.22, 1.22], pivo: [-.66, -.84], cat: 'acessorios', slot: 'chapeu', nome: 'Laço Rosa', preco: 40,
        desc: 'Um toque doce e colorido.',
        frente: '<g transform="translate(-.66 -.84) rotate(-28)">' +
                '<path d="M0 0 C-.38 -.34 -.56 .12 -.4 .34 C-.2 .4 -.05 .14 0 0Z" fill="#ff8fb8" ' + T + '/>' +
                '<path d="M0 0 C.38 -.34 .56 .12 .4 .34 C.2 .4 .05 .14 0 0Z" fill="#ff8fb8" ' + T + '/>' +
                '<circle r=".11" fill="#f2548c" ' + T + '/></g>' },

      { id: 'coroa', vb: [-1.09, -2.05, 1.62, 1.62], pivo: [-.22, -.94], cat: 'acessorios', slot: 'chapeu', nome: 'Coroa Real', preco: 120,
        desc: 'Para o campeão das notas musicais.',
        frente: '<g transform="translate(-.22 -.94) rotate(-12)">' +
                '<path d="M-.5 .06 L-.56 -.5 L-.26 -.24 L0 -.62 L.26 -.24 L.56 -.5 L.5 .06 Z" fill="#ffc928" stroke="#b07a00" stroke-width=".05" stroke-linejoin="round"/>' +
                '<rect x="-.5" y="-.06" width="1" height=".12" fill="#ffe27a" stroke="#b07a00" stroke-width=".03"/>' +
                '<circle cx="-.56" cy="-.5" r=".06" fill="#27c3ff"/><circle cy="-.62" r=".06" fill="#ff4d63"/><circle cx=".56" cy="-.5" r=".06" fill="#27c3ff"/></g>' },

      { id: 'aureola', vb: [-1.05, -2.04, 1.5, 1.5], pivo: [-.3, -1.3], cat: 'acessorios', slot: 'chapeu', nome: 'Auréola Brilhante', preco: 90,
        desc: 'Uma luz dourada flutuando na cabeça.',
        tras: '<g transform="translate(-.3 -1.3) rotate(-8)"><ellipse rx=".62" ry=".16" fill="none" stroke="#fff3b0" stroke-width=".2" opacity=".5"/>' +
              '<ellipse rx=".62" ry=".16" fill="none" stroke="#ffc928" stroke-width=".1"/></g>' },

      // Cachecol abraçando a base da cabeça (anel recortado fora da bola) com a ponta voando para trás.
      { id: 'cachecol-listrado', vb: [-1.55, .2, 3.1, 1.4], pivo: [0, 1], cat: 'acessorios', slot: 'pescoco', nome: 'Cachecol Listrado', preco: 75,
        segue: 0.6, recorte: true, desc: 'Quentinho e combinando com o azul.',
        frente: cachecol('#2a6ee0', true) },

      { id: 'cachecol-vinho', vb: [-1.55, .2, 3.1, 1.4], pivo: [0, 1], cat: 'acessorios', slot: 'pescoco', nome: 'Cachecol Vinho', preco: 75,
        segue: 0.6, recorte: true, desc: 'Elegante para os dias frios.',
        frente: cachecol('#a8284a', false) },

      // Itens das costas: ficam atrás do corpo, abaixo/ao lado da cabeça.
      { id: 'mochila-musical', vb: [-1.46, .44, 1.2, 1.2], pivo: [-.86, 1.04], cat: 'acessorios', slot: 'costas', nome: 'Mochila Musical', preco: 75,
        segue: 0.55, desc: 'Para levar as partituras para todo lado.',
        tras: mochila() },

      { id: 'bolsa-musical', vb: [-1.46, .5, 1.2, 1.2], pivo: [-.86, 1.1], cat: 'acessorios', slot: 'costas', nome: 'Bolsa Musical', preco: 80,
        segue: 0.55, desc: 'Uma bolsa de pano com uma nota.',
        tras: bolsa() },

      // Asinha de penas saindo do alto das costas e apontando para trás/cima.
      // (antes saía na altura do bumbum, em y = 1; agora nasce em y = .55, perto das omoplatas)
      { id: 'asinhas', pivo: [-.62, .55], cat: 'acessorios', slot: 'costas', nome: 'Asinhas Brancas', preco: 95,
        segue: 0.55, desc: 'Asinhas macias para voar mais alto.',
        tras: '<g transform="translate(-.62 .55)">' + penas() + '</g>',
        icone: '<g transform="translate(30 52) scale(24)">' + penas() + '</g>' +
               '<g transform="translate(34 52) scale(-24 24)">' + penas() + '</g>' }
    ].map(function (it) { it.ancora = it.ancora || 'cabeca'; return it; });

    /* ---- novos acessórios ---- */

    const NOVOS = [
      // ---------- CABEÇA ----------
      { id: 'chapeu-festa', vb: [-1.2, -2.3, 1.9, 1.9], pivo: [-.25, -.93], cat: 'acessorios', slot: 'chapeu', nome: 'Chapéu de Festa', preco: 45,
        desc: 'Todo dia é dia de comemorar!',
        frente: '<g transform="translate(-.25 -.93) rotate(-12)">' +
                '<path d="M-.42 .05L0 -1.05L.42 .05Z" fill="#ff7ab8" ' + T + '/>' +
                '<path d="M-.267 -.35L.267 -.35L.191 -.55L-.191 -.55Z" fill="#ffd84a"/>' +
                '<rect x="-.45" y="-.02" width=".9" height=".12" rx=".05" fill="#ffd84a" ' + T + '/>' +
                '<circle cy="-1.07" r=".1" fill="#27c3ff" ' + T + '/></g>' },

      { id: 'cartola-maestro', vb: [-1.1, -2.1, 1.7, 1.7], pivo: [-.25, -.93], cat: 'acessorios', slot: 'chapeu', nome: 'Cartola de Maestro', preco: 85,
        desc: 'Para quem rege a melodia.',
        frente: '<g transform="translate(-.25 -.93) rotate(-12)">' +
                '<ellipse cy=".03" rx=".62" ry=".13" fill="#5a3fb0" ' + T + '/>' +
                '<path d="M-.4 .03L-.38 -.78Q0 -.86 .38 -.78L.4 .03Z" fill="#5a3fb0" ' + T + '/>' +
                '<rect x="-.395" y="-.22" width=".79" height=".15" fill="#ffd84a"/>' +
                GL.nota(0, -.5, 1.2, '#ffffff') + '</g>' },

      { id: 'chapeu-mago', vb: [-1.3, -2.2, 1.9, 1.9], pivo: [-.25, -.93], cat: 'acessorios', slot: 'chapeu', nome: 'Chapéu de Mago', preco: 95,
        desc: 'Mágico como um bom acorde.',
        frente: '<g transform="translate(-.25 -.93) rotate(-12)">' +
                '<ellipse cy=".05" rx=".72" ry=".16" fill="#3b4ca3" ' + T + '/>' +
                '<path d="M-.44 .05Q-.2 -.6 .08 -.98Q.24 -1.08 .32 -.92Q.2 -.7 .44 .05Z" fill="#3b4ca3" ' + T + '/>' +
                GL.estrela(-.05, -.5, 1.3, '#ffe27a') + GL.estrela(.12, -.22, .9, '#ffe27a') + '</g>' },

      { id: 'chapeu-palha', vb: [-1.3, -1.9, 2.0, 2.0], pivo: [-.25, -.93], cat: 'acessorios', slot: 'chapeu', nome: 'Chapéu de Palha', preco: 55,
        desc: 'Leve e ótimo para dias de sol.',
        frente: '<g transform="translate(-.25 -.93) rotate(-12)">' +
                '<ellipse cy=".05" rx=".8" ry=".17" fill="#f2c66d" ' + T + '/>' +
                '<path d="M-.46 .05C-.5 -.75 .5 -.75 .46 .05Z" fill="#f2c66d" ' + T + '/>' +
                '<rect x="-.47" y="-.08" width=".94" height=".13" fill="#2a6ee0"/>' +
                '<path d="M-.3 -.3Q0 -.4 .3 -.3" fill="none" stroke="#d9a441" stroke-width=".03"/></g>' },

      { id: 'florzinha', vb: [-1.3, -1.5, 1.4, 1.4], pivo: [-.62, -.86], cat: 'acessorios', slot: 'chapeu', nome: 'Florzinha', preco: 40,
        desc: 'Um toque de primavera.',
        frente: '<g transform="translate(-.62 -.86) rotate(-20)">' +
                [[0, -.2], [.19, -.06], [.12, .16], [-.12, .16], [-.19, -.06]].map(function (p) {
                  return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r=".15" fill="#ff8fb8" ' + T + '/>';
                }).join('') +
                '<circle r=".11" fill="#ffd84a" ' + T + '/></g>' },

      { id: 'brotinho', vb: [-1.0, -1.8, 1.5, 1.5], pivo: [-.25, -.96], cat: 'acessorios', slot: 'chapeu', nome: 'Brotinho', preco: 50,
        desc: 'Uma plantinha crescendo no ritmo.',
        frente: '<g transform="translate(-.25 -.96) rotate(-12)">' +
                '<path d="M0 .05Q-.02 -.2 .02 -.38" fill="none" stroke="#2f9e4f" stroke-width=".07" stroke-linecap="round"/>' +
                '<path d="M.02 -.38Q.34 -.62 .44 -.3Q.2 -.2 .02 -.38Z" fill="#5fd068" ' + T + '/>' +
                '<path d="M.02 -.38Q-.3 -.64 -.42 -.34Q-.2 -.2 .02 -.38Z" fill="#7ce685" ' + T + '/></g>' },

      // ---------- PESCOÇO ----------
      { id: 'gravata-borboleta', vb: [-.5, .8, 1.1, .7], pivo: [.05, 1.12], cat: 'acessorios', slot: 'pescoco', nome: 'Gravata Borboleta', preco: 55,
        segue: 0.6, recorte: true, desc: 'Elegante para a apresentação.',
        frente: '<g transform="translate(.05 1.14) scale(1.15)">' +
                '<path d="M0 0C-.2 -.17 -.36 -.12 -.34 0C-.36 .12 -.2 .17 0 0Z" fill="#e04565" ' + T + '/>' +
                '<path d="M0 0C.2 -.17 .36 -.12 .34 0C.36 .12 .2 .17 0 0Z" fill="#e04565" ' + T + '/>' +
                '<rect x="-.07" y="-.07" width=".14" height=".14" rx=".04" fill="#b3263e" ' + T + '/></g>' },

      { id: 'colar-nota', vb: [-.8, .7, 1.6, 1.0], pivo: [0, 1.1], cat: 'acessorios', slot: 'pescoco', nome: 'Colar de Nota', preco: 70,
        segue: 0.6, recorte: true, desc: 'Uma notinha dourada no peito.',
        frente: '<path d="M-.7 .7Q0 1.6 .7 .7" fill="none" stroke="#ffc928" stroke-width=".05"/>' +
                GL.nota(0, 1.22, 1.5, '#ffc928') },

      { id: 'medalha-ouro', vb: [-.8, .7, 1.6, 1.0], pivo: [0, 1.1], cat: 'acessorios', slot: 'pescoco', nome: 'Medalha de Ouro', preco: 85,
        segue: 0.6, recorte: true, desc: 'Para o campeão das notas.',
        frente: '<path d="M-.6 .75L-.02 1.18" stroke="#d6304f" stroke-width=".13"/>' +
                '<path d="M.6 .75L.02 1.18" stroke="#2a6ee0" stroke-width=".13"/>' +
                '<circle cx="0" cy="1.3" r=".18" fill="#ffc928" stroke="#b07a00" stroke-width=".04"/>' +
                GL.estrela(0, 1.3, .9, '#fff3b0') },

      // ---------- COSTAS ----------
      { id: 'ukulele', vb: [-1.95, -.05, 1.6, 1.6], pivo: [-.95, 1.05], cat: 'acessorios', slot: 'costas', nome: 'Ukulelê', preco: 90,
        segue: 0.55, desc: 'Para animar a turma onde for.',
        tras: '<g transform="translate(-.95 1.05) rotate(-35)">' +
              '<rect x="-.045" y="-1" width=".09" height=".75" fill="#6b3f1d" ' + T + '/>' +
              '<rect x="-.09" y="-1.12" width=".18" height=".16" rx=".04" fill="#4a2a12" ' + T + '/>' +
              '<circle cy="-.2" r=".2" fill="#e0994f" ' + T + '/>' +
              '<circle cy=".12" r=".28" fill="#e0994f" ' + T + '/>' +
              '<ellipse cy="-.03" rx=".22" ry=".14" fill="#e0994f"/>' +
              '<circle cy=".02" r=".08" fill="#3a1f0c"/>' +
              '<path d="M0 -.3V.3" stroke="#fff3b0" stroke-width=".015"/>' +
              '<rect x="-.12" y=".26" width=".24" height=".04" rx=".02" fill="#6b3f1d"/></g>' },

      // Asas de borboleta também sobem para o alto das costas (antes y = 1, agora y = .55).
      { id: 'asas-borboleta', vb: [-2.0, -.55, 1.9, 1.9], pivo: [-.62, .55], cat: 'acessorios', slot: 'costas', nome: 'Asas de Borboleta', preco: 100,
        segue: 0.55, desc: 'Coloridas e leves como uma melodia.',
        tras: '<g transform="translate(-.62 .55)">' +
              '<path d="M0 0C-.3 -.7 -1 -.9 -1.1 -.4C-1.15 -.05 -.5 .1 0 0Z" fill="#9b8cff" ' + T + '/>' +
              '<path d="M0 0C-.6 .1 -1 .45 -.8 .75C-.55 .95 -.15 .5 0 0Z" fill="#ff8fd0" ' + T + '/>' +
              '<circle cx="-.7" cy="-.38" r=".1" fill="#ffffff"/><circle cx="-.55" cy=".38" r=".08" fill="#ffffff"/></g>' }
    ].map(function (it) { it.ancora = 'cabeca'; return it; });

    const ITENS = ACESSORIOS.concat(NOVOS, [
      // ---------- efeitos (desenhados no jogo pelo motor) ----------
      { id: 'rastro-notas', cat: 'efeitos', nome: 'Rastro de Notas', preco: 60,
        desc: 'Notinhas musicais ficam para trás enquanto ele corre.',
        fx: { tipo: 'particulas', glifos: ['\u266A', '\u266B'], cor: '#27c3ff', mov: 'tras', dur: 2.2, tam: 22 },
        icone: '<g fill="#27c3ff"><ellipse cx="18" cy="44" rx="7" ry="5" transform="rotate(-20 18 44)"/><path d="M24 43 V16 L36 20 V24 L28 22 V43Z"/>' +
               '<ellipse cx="42" cy="50" rx="6" ry="4.4" transform="rotate(-20 42 50)" opacity=".75"/><path d="M47 49 V30 L56 33 V36 L51 34.5 V49Z" opacity=".75"/></g>' },
      { id: 'brilhos', cat: 'efeitos', nome: 'Chuva de Brilhos', preco: 80,
        desc: 'Faíscas douradas acompanham cada passo.',
        fx: { tipo: 'particulas', glifos: ['\u2726', '\u2727'], cor: '#ffd84a', mov: 'tras', dur: 1.1, tam: 18 },
        icone: '<g fill="#ffc928" stroke="#d79a00" stroke-width="1.5" stroke-linejoin="round"><path d="M26 10 L31 25 L46 30 L31 35 L26 50 L21 35 L6 30 L21 25Z"/>' +
               '<path d="M47 36 L50 45 L59 48 L50 51 L47 60 L44 51 L35 48 L44 45Z" opacity=".85"/></g>' },
      { id: 'aura', cat: 'efeitos', nome: 'Aura Ciano', preco: 100,
        desc: 'Um brilho azul envolve o Notinha.',
        fx: { tipo: 'aura', cor: '60,210,255' },
        icone: '<circle cx="32" cy="32" r="22" fill="none" stroke="#27c3ff" stroke-width="3" opacity=".35"/><circle cx="32" cy="32" r="15" fill="none" stroke="#27c3ff" stroke-width="3" opacity=".6"/>' +
               '<circle cx="32" cy="32" r="8" fill="#27c3ff"/>' },

      // ---------- NOVOS EFEITOS ----------
      // "fx" descreve o efeito de forma simples (a prévia da loja e o motor do jogo leem daqui):
      //   tipo 'particulas': glifos = símbolos sorteados; cor/cores; mov = 'tras' | 'sobe' | 'cai'; dur = segundos; tam = tamanho
      //   tipo 'aura': cor = "R,G,B" do brilho em volta do Notinha
      { id: 'bolhas', cat: 'efeitos', nome: 'Bolhas do Mar', preco: 70,
        desc: 'Bolhinhas sobem ao redor dele, como no fundo do mar.',
        fx: { tipo: 'particulas', glifos: ['\u25CB'], cor: '#7fe1ff', mov: 'sobe', dur: 2.8, tam: 20 },
        icone: '<g fill="rgba(255,255,255,.45)" stroke="#27a8e0" stroke-width="3"><circle cx="24" cy="40" r="13"/><circle cx="44" cy="22" r="8"/><circle cx="46" cy="46" r="5"/></g>' +
               '<path d="M19 36Q21 31 26 30" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>' },

      { id: 'gotas', cat: 'efeitos', nome: 'Chuva do Mar', preco: 65,
        desc: 'Gotinhas de água caem enquanto ele corre.',
        fx: { tipo: 'particulas', glifos: ['\u25CF'], cor: '#2a9df4', mov: 'cai', dur: 1.5, tam: 11 },
        icone: '<path d="M32 6C32 6 14 28 14 40a18 18 0 0 0 36 0C50 28 32 6 32 6Z" fill="#27c3ff" stroke="#0b79ad" stroke-width="2.5" stroke-linejoin="round"/>' +
               '<path d="M24 40a8 8 0 0 0 7 8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>' },

      { id: 'coracoes', cat: 'efeitos', nome: 'Chuva de Corações', preco: 75,
        desc: 'Coraçõezinhos flutuam para o alto.',
        fx: { tipo: 'particulas', glifos: ['\u2665'], cor: '#ff6fa8', mov: 'sobe', dur: 2.6, tam: 20 },
        icone: '<path d="M32 54C8 38 8 16 22 16c5 0 8 3 10 7 2-4 5-7 10-7 14 0 14 22-10 38Z" fill="#ff6fa8" stroke="#d6306f" stroke-width="2.5" stroke-linejoin="round"/>' +
               '<path d="M20 25q2-4 6-3" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>' },

      { id: 'flocos', cat: 'efeitos', nome: 'Flocos Brilhantes', preco: 80,
        desc: 'Flocos de neve cintilantes caem do céu.',
        fx: { tipo: 'particulas', glifos: ['\u2744', '\u2745'], cor: '#9fd4ff', mov: 'cai', dur: 3.2, tam: 20 },
        icone: '<g stroke="#4f9be8" stroke-width="4" stroke-linecap="round"><path d="M32 8V56M11 20L53 44M53 20L11 44"/>' +
               '<path d="M26 12L32 18L38 12M26 52L32 46L38 52" fill="none" stroke-width="3"/></g>' },

      { id: 'petalas', cat: 'efeitos', nome: 'Pétalas ao Vento', preco: 85,
        desc: 'Pétalas rosadas dançam no ar.',
        fx: { tipo: 'particulas', glifos: ['\u273F', '\u2740'], cor: '#ff8fb8', mov: 'cai', dur: 3, tam: 20 },
        icone: '<g fill="#ffb3cf" stroke="#e0709a" stroke-width="2">' +
               [0, 72, 144, 216, 288].map(function (a) { return '<ellipse cx="32" cy="19" rx="8" ry="12" transform="rotate(' + a + ' 32 32)"/>'; }).join('') +
               '</g><circle cx="32" cy="32" r="6" fill="#ffd84a" stroke="#d79a00" stroke-width="2"/>' },

      { id: 'arco-iris', cat: 'efeitos', nome: 'Rastro Arco-íris', preco: 110,
        desc: 'Um rastro colorido fica para trás a cada passo.',
        fx: { tipo: 'particulas', glifos: ['\u25CF'], cores: ['#ff4d63', '#ff9f1c', '#ffd84a', '#1fbf6a', '#27c3ff', '#8a6bff'], mov: 'tras', dur: 1.4, tam: 16 },
        icone: '<g fill="none" stroke-width="5" stroke-linecap="round"><path d="M6 48A26 26 0 0 1 58 48" stroke="#ff4d63"/><path d="M12 48A20 20 0 0 1 52 48" stroke="#ffc928"/>' +
               '<path d="M18 48A14 14 0 0 1 46 48" stroke="#1fbf6a"/><path d="M24 48A8 8 0 0 1 40 48" stroke="#27c3ff"/></g>' },

      { id: 'notas-douradas', cat: 'efeitos', nome: 'Chuva de Notas Douradas', preco: 90,
        desc: 'Notas musicais douradas caem como um aplauso.',
        fx: { tipo: 'particulas', glifos: ['\u266A', '\u266B'], cor: '#ffc928', mov: 'cai', dur: 2.8, tam: 22 },
        icone: '<g fill="#ffc928" stroke="#b07a00" stroke-width="1.5" stroke-linejoin="round"><ellipse cx="20" cy="46" rx="8" ry="6" transform="rotate(-20 20 46)"/>' +
               '<path d="M27 45V14L42 19V25L33 22V45Z"/><ellipse cx="46" cy="50" rx="6" ry="4.5" transform="rotate(-20 46 50)" opacity=".85"/></g>' },

      { id: 'estrelinhas', cat: 'efeitos', nome: 'Estrelinhas do Céu', preco: 85,
        desc: 'Estrelinhas douradas sobem e se apagam no ar.',
        fx: { tipo: 'particulas', glifos: ['\u2605', '\u2726'], cores: ['#ffd84a', '#fff3b0'], mov: 'sobe', dur: 2.4, tam: 18 },
        icone: '<polygon points="32,6 39,24 58,26 43,38 48,57 32,47 16,57 21,38 6,26 25,24" fill="#ffd84a" stroke="#d79a00" stroke-width="2.5" stroke-linejoin="round"/>' },

      { id: 'aura-dourada', cat: 'efeitos', nome: 'Aura Dourada', preco: 120,
        desc: 'Um brilho dourado de campeão envolve o Notinha.',
        fx: { tipo: 'aura', cor: '255,201,40' },
        icone: '<circle cx="32" cy="32" r="22" fill="none" stroke="#ffc928" stroke-width="3" opacity=".35"/><circle cx="32" cy="32" r="15" fill="none" stroke="#ffc928" stroke-width="3" opacity=".6"/>' +
               '<circle cx="32" cy="32" r="8" fill="#ffc928"/>' },

      { id: 'aura-rosa', cat: 'efeitos', nome: 'Aura Rosa', preco: 100,
        desc: 'Um brilho rosado e fofo em volta dele.',
        fx: { tipo: 'aura', cor: '255,111,168' },
        icone: '<circle cx="32" cy="32" r="22" fill="none" stroke="#ff6fa8" stroke-width="3" opacity=".35"/><circle cx="32" cy="32" r="15" fill="none" stroke="#ff6fa8" stroke-width="3" opacity=".6"/>' +
               '<circle cx="32" cy="32" r="8" fill="#ff6fa8"/>' },

      // ---------- cenários (o motor troca as cores do fundo) ----------
      { id: 'castelo', cat: 'cenarios', nome: 'Castelo Musical', preco: 0, desc: 'O cenário original do Notinha.' },
      { id: 'por-do-sol', cat: 'cenarios', nome: 'Pôr do Sol', preco: 150, desc: 'Um fim de tarde cor-de-rosa e laranja.' },
      { id: 'oceano', cat: 'cenarios', nome: 'Mar Tranquilo', preco: 150, desc: 'Tons de azul-turquesa e brisa do mar.' },
      { id: 'doce', cat: 'cenarios', nome: 'Reino Lilás', preco: 150, desc: 'Um reino encantado em tons de lilás.' },
      { id: 'praia', cat: 'cenarios', nome: 'Praia Ensolarada', preco: 150, desc: 'Sol, mar azul, palmeiras e guarda-sóis.' },
{ id: 'fundo-do-mar', cat: 'cenarios', nome: 'Fundo do Mar', preco: 180, desc: 'Peixinhos, corais e bolhas debaixo d\'água.' },
{ id: 'brasil', cat: 'cenarios', nome: 'Brasil em Festa', preco: 200, desc: 'Pão de Açúcar, Cristo, palmeiras e bandeirinhas.' },
{ id: 'floresta', cat: 'cenarios', nome: 'Floresta Tropical', preco: 180, desc: 'Árvores gigantes, cipós e vaga-lumes.' },
{ id: 'barquinho', cat: 'cenarios', nome: 'Barquinho de Partitura', preco: 150,
    desc: 'Navegando no mar com as ondas do site.'}
    ]);

    // Paletas dos cenários (as chaves seguem as do motor). "castelo" repete o padrão do motor.
    const CENARIOS = {
      'castelo': {
        claro:  { ceuTopo: '#bfe2ff', ceuBase: '#eef8ff', nuvem: 'rgba(255,255,255,.85)', longe: '#b3d0f1', perto: '#93b7e6', janela: 'rgba(60,100,170,.35)', chao: '#16306b', chaoArco: '#10265a', borda: '#35d3ff', nota: 'rgba(40,120,220,.28)' },
        escuro: { ceuTopo: '#061030', ceuBase: '#14337f', nuvem: 'rgba(120,160,255,.14)', longe: '#122b66', perto: '#1b3f8f', janela: 'rgba(90,200,255,.35)', chao: '#081a47', chaoArco: '#06143a', borda: '#2ad0ff', nota: 'rgba(90,200,255,.30)' }
      },
      'por-do-sol': {
        claro:  { ceuTopo: '#ffc2a0', ceuBase: '#fff2e0', nuvem: 'rgba(255,255,255,.8)', longe: '#f0b3b8', perto: '#d98fa6', janela: 'rgba(150,60,110,.35)', chao: '#4a2a63', chaoArco: '#3b1f52', borda: '#ff9ac2', nota: 'rgba(220,90,140,.30)' },
        escuro: { ceuTopo: '#2a0f3d', ceuBase: '#7a2f6b', nuvem: 'rgba(255,160,200,.15)', longe: '#4a1d5e', perto: '#6a2a78', janela: 'rgba(255,190,120,.4)', chao: '#22103a', chaoArco: '#1a0b2e', borda: '#ff8ad0', nota: 'rgba(255,170,220,.30)' }
      },
      'oceano': {
        claro:  { ceuTopo: '#b0efe8', ceuBase: '#effffb', nuvem: 'rgba(255,255,255,.85)', longe: '#a6dcd8', perto: '#7fc7c6', janela: 'rgba(30,110,120,.35)', chao: '#0e4a5a', chaoArco: '#0a3b49', borda: '#3ff0d0', nota: 'rgba(20,150,150,.28)' },
        escuro: { ceuTopo: '#021a24', ceuBase: '#0b5560', nuvem: 'rgba(120,255,230,.12)', longe: '#0a3d4a', perto: '#0f5a66', janela: 'rgba(120,255,230,.35)', chao: '#04202a', chaoArco: '#03171f', borda: '#3ff0d0', nota: 'rgba(120,255,230,.30)' }
      },
      'doce': {
        claro:  { ceuTopo: '#dccaff', ceuBase: '#fbf5ff', nuvem: 'rgba(255,255,255,.85)', longe: '#cdb8f0', perto: '#b49ae0', janela: 'rgba(100,70,170,.35)', chao: '#3a2a7a', chaoArco: '#2d2063', borda: '#c58bff', nota: 'rgba(130,90,220,.28)' },
        escuro: { ceuTopo: '#120a33', ceuBase: '#3a2a8f', nuvem: 'rgba(190,160,255,.14)', longe: '#2a1d66', perto: '#3a2a8f', janela: 'rgba(200,170,255,.35)', chao: '#150c3a', chaoArco: '#0f082d', borda: '#b98cff', nota: 'rgba(200,170,255,.30)' }
      },
      'praia': {
        claro:  { estilo: 'praia', ceuTopo: '#7fd6ff', ceuBase: '#e6f9ff', nuvem: 'rgba(255,255,255,.9)', longe: '#8fd4e8', perto: '#5cc0d8', janela: 'rgba(0,0,0,0)', chao: '#f0d9a0', chaoArco: '#d8bd7c', borda: '#ffffff', nota: 'rgba(20,140,200,.28)', mar: '#27b6d6', mar2: '#7fe3ee', sol: '#ffd84a', tronco: '#8a5a2b', folha: '#2f9e4f' },
        escuro: { estilo: 'praia', ceuTopo: '#050d2e', ceuBase: '#1a3a7a', nuvem: 'rgba(140,170,255,.14)', longe: '#0d3a5e', perto: '#0e4d6d', janela: 'rgba(0,0,0,0)', chao: '#6b5a3a', chaoArco: '#4a3d26', borda: '#7fe9ff', nota: 'rgba(120,220,255,.30)', mar: '#0a3560', mar2: '#12528a', sol: '#f4f1d0', tronco: '#2d1d0e', folha: '#14603a' }
        },
        'fundo-do-mar': {
        claro:  { estilo: 'mar', ceuTopo: '#3fb8e8', ceuBase: '#bff4ff', nuvem: 'rgba(0,0,0,0)', longe: '#2f9fc8', perto: '#1d85b0', janela: 'rgba(0,0,0,0)', chao: '#e6c98f', chaoArco: '#cfae70', borda: '#8ff5ff', nota: 'rgba(255,255,255,.40)', raio: 'rgba(255,255,255,.16)', coral: '#ff8a7a' },
        escuro: { estilo: 'mar', ceuTopo: '#021a3a', ceuBase: '#0a4a7a', nuvem: 'rgba(0,0,0,0)', longe: '#08365c', perto: '#0b4c78', janela: 'rgba(0,0,0,0)', chao: '#4b4a52', chaoArco: '#3a3940', borda: '#5ff0ff', nota: 'rgba(120,220,255,.30)', raio: 'rgba(120,220,255,.10)', coral: '#b04a6a' }
        },
        'brasil': {
        claro:  { estilo: 'rio', ceuTopo: '#4aa8ff', ceuBase: '#d8f0ff', nuvem: 'rgba(255,255,255,.9)', longe: '#7fb6d9', perto: '#2fa35a', janela: 'rgba(0,0,0,0)', chao: '#f3efe4', chaoArco: '#2a2a33', borda: '#ffd84a', nota: 'rgba(31,160,90,.30)', cristo: '#f4f1e8', tronco: '#8a5a2b', folha: '#1f8f4a' },
        escuro: { estilo: 'rio', ceuTopo: '#050f33', ceuBase: '#17407f', nuvem: 'rgba(140,170,255,.14)', longe: '#143a66', perto: '#14663a', janela: 'rgba(0,0,0,0)', chao: '#4a4a58', chaoArco: '#1c1c26', borda: '#ffd84a', nota: 'rgba(255,216,74,.30)', cristo: '#cfe8ff', tronco: '#2d1d0e', folha: '#0f5a30' }
        },
        'floresta': {
        claro:  { estilo: 'floresta', ceuTopo: '#b9f0b0', ceuBase: '#f4ffe6', nuvem: 'rgba(255,255,255,.7)', longe: '#7cc78a', perto: '#3fa860', janela: 'rgba(0,0,0,0)', chao: '#5a3b22', chaoArco: '#2f9e4f', borda: '#9bff6b', nota: 'rgba(30,140,70,.30)', tronco: '#6b4423', folha: '#2f9e4f' },
        escuro: { estilo: 'floresta', ceuTopo: '#04140f', ceuBase: '#0f4a38', nuvem: 'rgba(120,255,180,.10)', longe: '#0a3a2a', perto: '#0f5a3a', janela: 'rgba(0,0,0,0)', chao: '#2a1b10', chaoArco: '#1b6b3a', borda: '#9bff6b', nota: 'rgba(155,255,107,.30)', tronco: '#1b1008', folha: '#14603a' }
        },
        'barquinho': {
  claro:  { estilo: 'barco', ceuTopo: '#8fd8ff', ceuBase: '#f4fcff', nuvem: 'rgba(255,255,255,.9)',
            longe: '#9ccfe0', perto: '#6fb7d8', janela: 'rgba(255,255,255,.5)',
            chao: '#2a9fd0', chaoArco: '#2a9fd0', borda: '#52c7eb', nota: 'rgba(8,125,181,.28)',
            sol: '#ffd84a', mar: '#bdeefa', mar2: '#52c7eb' },
  escuro: { estilo: 'barco', ceuTopo: '#06123a', ceuBase: '#1d4a8f', nuvem: 'rgba(140,170,255,.14)',
            longe: '#14407a', perto: '#0f5a88', janela: 'rgba(255,255,255,.3)',
            chao: '#0a4f7a', chaoArco: '#0a4f7a', borda: '#52c7eb', nota: 'rgba(140,200,255,.30)',
            sol: '#fff3c4', mar: '#0e3f7a', mar2: '#0a2f66',
            onda1: 'rgba(82,199,235,.25)', onda2: 'rgba(8,125,181,.32)', onda3a: '#1f7a96', onda3b: '#054a6b' }
}
    };

    const POR_ID = new Map(ITENS.map(function (it) { return [it.id, it]; }));
    function item(id) { return POR_ID.get(id) || null; }

    const CACHE_CAMADAS = new Map();
    function svgCamada(it, camada, tam) {
      const g = it && it[camada];
      if (!g) return null;
      const a = obterAjuste(it.id), pv = it.pivo || [0, 0];
      const chave = [it.id, camada, tam, a.dx, a.dy, a.s, a.r, it.recorte ? cfg.recorte : '-'].join('|');
      if (CACHE_CAMADAS.has(chave)) return CACHE_CAMADAS.get(chave);
      let corpo = '<g transform="translate(' + a.dx + ' ' + a.dy + ') translate(' + pv[0] + ' ' + pv[1] + ') rotate(' + a.r + ') scale(' + a.s + ') translate(' + (-pv[0]) + ' ' + (-pv[1]) + ')">' + g + '</g>';
      let defs = '';
      if (it.recorte) {
        const r = cfg.recorte;
        defs = '<defs><clipPath id="fora"><path clip-rule="evenodd" d="M-3 -3H3V3H-3Z M' + (-r) + ' 0a' + r + ' ' + r + ' 0 1 0 ' + (2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0Z"/></clipPath></defs>';
        corpo = '<g clip-path="url(#fora)">' + corpo + '</g>';
      }
      const h = VB / 2;
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + (-h) + ' ' + (-h) + ' ' + VB + ' ' + VB + '" width="' + tam + '" height="' + tam + '">' + defs + corpo + '</svg>';
      const uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      if (CACHE_CAMADAS.size > 200) CACHE_CAMADAS.clear();
      CACHE_CAMADAS.set(chave, uri);
      return uri;
    }

    const ICONES_CEN = {
        praia: function (P) {
          return '<circle cx="94" cy="18" r="9" fill="' + P.sol + '"/><rect y="38" width="120" height="26" fill="' + P.mar + '"/>' +
            '<path d="M0 46Q15 42 30 46T60 46T90 46T120 46" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>' +
            '<rect y="62" width="120" height="18" fill="' + P.chao + '"/>' +
            '<path d="M30 64Q36 44 32 28" fill="none" stroke="' + P.tronco + '" stroke-width="4" stroke-linecap="round"/>' +
            '<g fill="' + P.folha + '"><path d="M32 28Q46 20 58 30Q44 26 32 28Z"/><path d="M32 28Q18 20 6 30Q20 26 32 28Z"/><path d="M32 28Q40 14 52 14Q42 20 32 28Z"/><path d="M32 28Q24 14 12 14Q22 20 32 28Z"/></g>' +
            '<path d="M88 66V46" stroke="#888" stroke-width="2"/><path d="M76 46A12 12 0 0 1 100 46Z" fill="#ff6b6b"/>';
        },
        mar: function (P) {
          return '<path d="M20 0H34L52 62H30Z M70 0H80L96 62H80Z" fill="rgba(255,255,255,.15)"/>' +
            '<ellipse cx="78" cy="26" rx="11" ry="6" fill="#ffb347"/><path d="M89 26L98 20V32Z" fill="#ffb347"/><circle cx="72" cy="24" r="1.6" fill="#0b2459"/>' +
            '<ellipse cx="38" cy="40" rx="8" ry="4.5" fill="#ff6b9a"/><path d="M46 40L53 35V45Z" fill="#ff6b9a"/>' +
            '<path d="M14 66Q8 54 14 44T14 26" fill="none" stroke="' + P.perto + '" stroke-width="5" stroke-linecap="round"/>' +
            '<path d="M104 66Q98 56 104 46" fill="none" stroke="' + P.coral + '" stroke-width="5" stroke-linecap="round"/>' +
            '<circle cx="56" cy="20" r="3" fill="none" stroke="#fff" stroke-opacity=".7"/><circle cx="62" cy="10" r="2" fill="none" stroke="#fff" stroke-opacity=".7"/>' +
            '<rect y="64" width="120" height="16" fill="' + P.chao + '"/>';
        },
        rio: function (P) {
          return '<path d="M10 62A18 36 0 0 1 46 62Z" fill="' + P.longe + '"/><path d="M40 62A12 24 0 0 1 64 62Z" fill="' + P.longe + '"/>' +
            '<path d="M62 62A34 34 0 0 1 130 62Z" fill="' + P.perto + '"/>' +
            '<rect x="95" y="14" width="2" height="14" fill="' + P.cristo + '"/><rect x="88" y="18" width="16" height="2.4" fill="' + P.cristo + '"/>' +
            '<path d="M0 6Q30 18 60 6T120 6" fill="none" stroke="#555" stroke-width="1"/>' +
            '<g><path d="M10 9L18 9L14 18Z" fill="#1fbf6a"/><path d="M34 12L42 12L38 21Z" fill="#ffd84a"/><path d="M58 8L66 8L62 17Z" fill="#2a6ee0"/><path d="M82 11L90 11L86 20Z" fill="#1fbf6a"/><path d="M104 8L112 8L108 17Z" fill="#ffd84a"/></g>' +
            '<rect y="62" width="120" height="18" fill="' + P.chao + '"/><path d="M0 70Q10 64 20 70T40 70T60 70T80 70T100 70T120 70" fill="none" stroke="' + P.chaoArco + '" stroke-width="5"/>';
        },
        floresta: function (P) {
          return '<g fill="' + P.longe + '"><circle cx="18" cy="34" r="14"/><circle cx="58" cy="28" r="16"/><circle cx="102" cy="34" r="14"/></g>' +
            '<rect x="16" y="42" width="4" height="22" fill="' + P.longe + '"/><rect x="56" y="40" width="4" height="24" fill="' + P.longe + '"/><rect x="100" y="42" width="4" height="22" fill="' + P.longe + '"/>' +
            '<rect x="38" y="30" width="7" height="36" fill="' + P.tronco + '"/><circle cx="41" cy="26" r="17" fill="' + P.perto + '"/><circle cx="30" cy="36" r="11" fill="' + P.perto + '"/><circle cx="52" cy="36" r="11" fill="' + P.perto + '"/>' +
            '<rect y="64" width="120" height="16" fill="' + P.chao + '"/><rect y="62" width="120" height="4" fill="' + P.chaoArco + '"/>' +
            '<circle cx="84" cy="30" r="1.8" fill="#fff6a8"/><circle cx="90" cy="46" r="1.8" fill="#fff6a8"/><circle cx="72" cy="20" r="1.8" fill="#fff6a8"/>';
        },
        barco: function (P) {
            return '<circle cx="96" cy="18" r="9" fill="' + P.sol + '"/>' +
              '<rect y="40" width="120" height="40" fill="' + P.mar + '"/>' +
              '<path d="M0 46Q15 40 30 46T60 46T90 46T120 46" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>' +
              '<circle cx="58" cy="30" r="10" fill="#1b3fa8"/>' +
              '<path d="M66 24Q72 14 77 18" fill="none" stroke="#1b3fa8" stroke-width="3.5" stroke-linecap="round"/>' +
              '<rect x="51" y="29" width="14" height="3" rx="1.5" fill="#fff"/>' +
              '<path d="M36 42H82L74 58H44Z" fill="#f5ead3" stroke="#0b2459" stroke-width="2" stroke-linejoin="round"/>' +
              '<path d="M0 58Q15 50 30 58T60 58T90 58T120 58V80H0Z" fill="' + P.mar2 + '"/>' +
              '<path d="M0 66Q15 60 30 66T60 66T90 66T120 66V80H0Z" fill="' + P.chao + '" opacity=".85"/>';
          }
      };

    /** SVG pronto (como texto) para o ícone do item na loja. */
    function svgIconeBase(it, tema) {
      if (it.icone) return '<svg viewBox="0 0 64 64" aria-hidden="true">' + it.icone + '</svg>';
      if (it.cat === 'acessorios') {
        const vb = it.vb || [-1.5, -1.5, 3, 3];
        return '<svg viewBox="' + vb.join(' ') + '" aria-hidden="true">' + (it.tras || '') + (it.frente || '') + '</svg>';
      }
      const P = cenario(it.id)[tema === 'escuro' ? 'escuro' : 'claro'], g = 'nwr-g-' + it.id + (tema === 'escuro' ? 'e' : 'c');

      // >>> NOVO: cenários temáticos (praia, mar, brasil, floresta) <<<
      if (P.estilo && ICONES_CEN[P.estilo]) {
        return '<svg viewBox="0 0 120 80" aria-hidden="true" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + P.ceuTopo + '"/><stop offset="1" stop-color="' + P.ceuBase + '"/></linearGradient></defs><rect width="120" height="80" fill="url(#' + g + ')"/>' + ICONES_CEN[P.estilo](P) + '</svg>';
      }
      // >>> FIM DO NOVO <<<

      return '<svg viewBox="0 0 120 80" aria-hidden="true" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + P.ceuTopo + '"/><stop offset="1" stop-color="' + P.ceuBase + '"/></linearGradient></defs>' +
        '<rect width="120" height="80" fill="url(#' + g + ')"/>' +
        '<g fill="' + P.longe + '"><rect x="8" y="30" width="22" height="34"/><path d="M6 30 L19 14 L32 30Z"/><rect x="60" y="22" width="18" height="42"/><path d="M58 22 L69 6 L80 22Z"/><rect x="92" y="38" width="24" height="26"/></g>' +
        '<g fill="' + P.perto + '"><rect x="34" y="42" width="24" height="22"/><path d="M34 42 q12 -16 24 0Z"/><rect x="80" y="46" width="14" height="18"/></g>' +
        '<rect y="62" width="120" height="18" fill="' + P.chao + '"/><rect y="61" width="120" height="2" fill="' + P.borda + '"/></svg>';
    }


    let contadorIcones = 0;
    function unicos(svg) {
      const n = ++contadorIcones, ids = [];
      svg.replace(/\bid="([^"]+)"/g, function (m, id) { ids.push(id); return m; });
      ids.forEach(function (id) {
        svg = svg.split('id="' + id + '"').join('id="' + id + '-' + n + '"')
                 .split('url(#' + id + ')').join('url(#' + id + '-' + n + ')');
      });
      return svg;
    }
    function svgIcone(it, tema) { return unicos(svgIconeBase(it, tema)); }

    /** Paleta do cenário (cai no "castelo" se o id não existir). */
    function cenario(id) { return CENARIOS[id] || CENARIOS['castelo']; }

    /** Quanto a peça acompanha a inclinação da cabeça (1 = totalmente; roupas/costas seguem menos). */
    function fator(it) { return it && typeof it.segue === 'number' ? it.segue : 1; }

    /** Configuração do efeito (partículas ou aura) pelo id, ou null se o efeito não existir. */
    function efeito(id) { const it = item(id); return it && it.cat === 'efeitos' && it.fx ? it.fx : null; }

    NW.loja = {
        ITENS: ITENS, SLOTS: SLOTS, CATEGORIAS: CATEGORIAS, CENARIOS: CENARIOS, VB: VB,
        item: item, cenario: cenario, centro: centro, fator: fator, efeito: efeito, svgCamada: svgCamada, svgIcone: svgIcone,
        analisarSprite: analisarSprite,
        cabecaEspecial: cabecaEspecial,
        ajusteEsp: ajusteEsp,
        obterAjuste: obterAjuste, definirAjuste: definirAjuste, zerarAjuste: zerarAjuste,
        obterRecorte: obterRecorte, definirRecorte: definirRecorte, exportarAjustes: exportarAjustes,
        PADRAO: { acessorios: {}, efeito: null, cenario: 'castelo' }
      };
  })(window.NWRunner = window.NWRunner || {});