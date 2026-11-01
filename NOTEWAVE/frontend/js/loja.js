/* Notinha Runner — catálogo da loja (acessórios, efeitos e cenários).
 * Todos os desenhos são SVG feitos em código (sem imagens), então não têm defeito de arquivo
 * e ficam nítidos em qualquer tela. Para criar um item novo, basta incluir um objeto em ITENS.
 *
 * Os acessórios são desenhados em "unidades da cabeça": o centro da bola do Notinha é (0,0)
 * e o raio dela vale 1. Assim o mesmo desenho serve para o ícone da loja, para a prévia
 * e para o jogo (o motor posiciona pelo rosto de cada quadro da corrida).
 */
(function (NW) {
    'use strict';
  
    // Centro do rosto (óculos) em cada um dos 16 quadros do sprite (em pixels do quadro 290x251).
    const ROSTO = [[163,143],[166,136],[169,138],[165,131],[168,128],[165,131],[167,136],[170,131],
                   [168,132],[164,133],[167,132],[168,133],[169,130],[167,134],[165,137],[166,137]];
    const BOLA = { dx: -23, dy: -1, R: 72 };   // do rosto até o centro da cabeça; R = raio da cabeça
    function centro(frame) {
      const r = ROSTO[frame] || ROSTO[0];
      return { x: r[0] + BOLA.dx, y: r[1] + BOLA.dy, R: BOLA.R };
    }
  
    const SLOTS = [
      { id: 'costas',  nome: 'Costas' },
      { id: 'fones',   nome: 'Fones' },
      { id: 'chapeu',  nome: 'Cabeça' },
      { id: 'pescoco', nome: 'Pescoço' }
    ];
    const CATEGORIAS = [
      { id: 'acessorios', nome: 'Acessórios' },
      { id: 'efeitos',    nome: 'Efeitos' },
      { id: 'cenarios',   nome: 'Cenários' }
    ];
  
    const T = 'stroke="#0b2459" stroke-width=".05" stroke-linejoin="round" stroke-linecap="round"';
    const ESTRELA = '0,-.14 .04,-.045 .14,-.04 .065,.025 .09,.12 0,.07 -.09,.12 -.065,.025 -.14,-.04 -.04,-.045';
  
    const ITENS = [
      // ---------- acessórios ----------
      { id: 'fones-musicais', vb: [-1.25, -1.94, 2.5, 2.5], cat: 'acessorios', slot: 'fones', nome: 'Fones Musicais', preco: 50,
        desc: 'Deixe o Notinha ainda mais estiloso!',
        tras: '<path d="M-.917 -.642 A1.12 1.12 0 0 1 .917 -.642" fill="none" stroke="#0b2459" stroke-width=".2" stroke-linecap="round"/>' +
              '<path d="M-.917 -.642 A1.12 1.12 0 0 1 .917 -.642" fill="none" stroke="#2a6ee0" stroke-width=".1" stroke-linecap="round"/>',
        frente: [-.87, .87].map(function (x) {
          return '<g transform="translate(' + x + ' -.6)"><rect x="-.19" y="-.34" width=".38" height=".68" rx=".17" fill="#1b4fc0" ' + T + '/>' +
                 '<ellipse rx=".085" ry=".2" fill="#27c3ff"/></g>';
        }).join('') },
  
      { id: 'bone-estrelado', vb: [-1.09, -2.23, 2.15, 2.15], cat: 'acessorios', slot: 'chapeu', nome: 'Boné Estrelado', preco: 50,
        desc: 'Um boné azul com estrelinha dourada.',
        frente: '<g transform="translate(-.2 -.93) rotate(-14)">' +
                '<path d="M.15 .02 C.6 -.06 1.0 .02 1.08 .14 C.7 .2 .38 .16 .15 .1 Z" fill="#0d2a66" ' + T + '/>' +
                '<path d="M-.62 .06 C-.64 -.52 .62 -.52 .6 .06 Z" fill="#1b4fc0" ' + T + '/>' +
                '<circle cy="-.47" r=".055" fill="#ffc928"/>' +
                '<polygon transform="translate(-.02 -.2)" points="' + ESTRELA + '" fill="#ffc928" stroke="#b07a00" stroke-width=".02"/></g>' },
  
      { id: 'boina', vb: [-1.28, -2.01, 1.98, 1.98], cat: 'acessorios', slot: 'chapeu', nome: 'Boina Artista', preco: 65,
        desc: 'Para o Notinha que também é artista.',
        frente: '<g transform="translate(-.28 -.95) rotate(-12)">' +
                '<ellipse rx=".78" ry=".3" fill="#13265c" ' + T + '/>' +
                '<path d="M-.02 -.3 L.02 -.44" stroke="#0b2459" stroke-width=".07" stroke-linecap="round"/>' +
                '<polygon transform="translate(.12 -.02)" points="' + ESTRELA + '" fill="#ffc928" stroke="#b07a00" stroke-width=".02"/></g>' },
  
      { id: 'laco-azul', vb: [-1.21, -1.34, 1.22, 1.22], cat: 'acessorios', slot: 'chapeu', nome: 'Laço Azul', preco: 40,
        desc: 'Um laço delicado para ficar charmoso.',
        frente: '<g transform="translate(-.66 -.84) rotate(-28)">' +
                '<path d="M0 0 C-.38 -.34 -.56 .12 -.4 .34 C-.2 .4 -.05 .14 0 0Z" fill="#2a6ee0" ' + T + '/>' +
                '<path d="M0 0 C.38 -.34 .56 .12 .4 .34 C.2 .4 .05 .14 0 0Z" fill="#2a6ee0" ' + T + '/>' +
                '<circle r=".11" fill="#1b4fc0" ' + T + '/></g>' },
  
      { id: 'laco-rosa', vb: [-1.21, -1.34, 1.22, 1.22], cat: 'acessorios', slot: 'chapeu', nome: 'Laço Rosa', preco: 40,
        desc: 'Um toque doce e colorido.',
        frente: '<g transform="translate(-.66 -.84) rotate(-28)">' +
                '<path d="M0 0 C-.38 -.34 -.56 .12 -.4 .34 C-.2 .4 -.05 .14 0 0Z" fill="#ff8fb8" ' + T + '/>' +
                '<path d="M0 0 C.38 -.34 .56 .12 .4 .34 C.2 .4 .05 .14 0 0Z" fill="#ff8fb8" ' + T + '/>' +
                '<circle r=".11" fill="#f2548c" ' + T + '/></g>' },
  
      { id: 'coroa', vb: [-1.09, -2.05, 1.62, 1.62], cat: 'acessorios', slot: 'chapeu', nome: 'Coroa Real', preco: 120,
        desc: 'Para o campeão das notas musicais.',
        frente: '<g transform="translate(-.22 -.94) rotate(-12)">' +
                '<path d="M-.5 .06 L-.56 -.5 L-.26 -.24 L0 -.62 L.26 -.24 L.56 -.5 L.5 .06 Z" fill="#ffc928" stroke="#b07a00" stroke-width=".05" stroke-linejoin="round"/>' +
                '<rect x="-.5" y="-.06" width="1" height=".12" fill="#ffe27a" stroke="#b07a00" stroke-width=".03"/>' +
                '<circle cx="-.56" cy="-.5" r=".06" fill="#27c3ff"/><circle cy="-.62" r=".06" fill="#ff4d63"/><circle cx=".56" cy="-.5" r=".06" fill="#27c3ff"/></g>' },
  
      { id: 'aureola', vb: [-1.05, -2.04, 1.5, 1.5], cat: 'acessorios', slot: 'chapeu', nome: 'Auréola Brilhante', preco: 90,
        desc: 'Uma luz dourada flutuando na cabeça.',
        tras: '<g transform="translate(-.3 -1.3) rotate(-8)"><ellipse rx=".62" ry=".16" fill="none" stroke="#fff3b0" stroke-width=".2" opacity=".5"/>' +
              '<ellipse rx=".62" ry=".16" fill="none" stroke="#ffc928" stroke-width=".1"/></g>' },
  
      { id: 'cachecol-listrado', vb: [-1.48, -0.5, 2.41, 2.41], cat: 'acessorios', slot: 'pescoco', nome: 'Cachecol Listrado', preco: 75,
        desc: 'Quentinho e combinando com o azul.',
        frente: '<path d="M-.78 .5 L-1.3 .62 L-1.24 .9 L-.74 .8Z" fill="#2a6ee0" ' + T + '/>' +
                '<path d="M-1.02 .55 L-1.05 .85 M-1.14 .58 L-1.17 .88" stroke="#eaf4ff" stroke-width=".07"/>' +
                '<path d="M-.74 .52 A.92 .92 0 0 0 .74 .52" fill="none" stroke="#0b2459" stroke-width=".4" stroke-linecap="round"/>' +
                '<path d="M-.74 .52 A.92 .92 0 0 0 .74 .52" fill="none" stroke="#2a6ee0" stroke-width=".3" stroke-linecap="round"/>' +
                '<path d="M-.74 .52 A.92 .92 0 0 0 .74 .52" fill="none" stroke="#eaf4ff" stroke-width=".3" stroke-dasharray=".09 .19" stroke-dashoffset=".05"/>' },
  
      { id: 'cachecol-vinho', vb: [-1.48, -0.5, 2.41, 2.41], cat: 'acessorios', slot: 'pescoco', nome: 'Cachecol Vinho', preco: 75,
        desc: 'Elegante para os dias frios.',
        frente: '<path d="M-.78 .5 L-1.3 .62 L-1.24 .9 L-.74 .8Z" fill="#a8284a" ' + T + '/>' +
                '<path d="M-.74 .52 A.92 .92 0 0 0 .74 .52" fill="none" stroke="#0b2459" stroke-width=".4" stroke-linecap="round"/>' +
                '<path d="M-.74 .52 A.92 .92 0 0 0 .74 .52" fill="none" stroke="#a8284a" stroke-width=".3" stroke-linecap="round"/>' +
                '<path d="M-.7 .5 A.9 .9 0 0 0 .7 .5" fill="none" stroke="#d6506f" stroke-width=".06" stroke-dasharray=".14 .1"/>' },
  
      { id: 'mochila-musical', vb: [-1.65, -0.47, 1.29, 1.29], cat: 'acessorios', slot: 'costas', nome: 'Mochila Musical', preco: 75,
        desc: 'Para levar as partituras para todo lado.',
        tras: '<g transform="translate(-1.0 .2) rotate(-8)">' +
              '<rect x="-.36" y="-.52" width=".72" height="1" rx=".25" fill="#2a6ee0" ' + T + '/>' +
              '<rect x="-.24" y=".06" width=".48" height=".32" rx=".1" fill="#1b4fc0" ' + T + '/>' +
              '<circle cx="-.08" cy="-.12" r=".07" fill="#eaf4ff"/><path d="M-.01 -.12 V-.3 L.12 -.34" fill="none" stroke="#eaf4ff" stroke-width=".035"/></g>' },
  
      // ---------- efeitos (desenhados no jogo pelo motor) ----------
      { id: 'rastro-notas', cat: 'efeitos', nome: 'Rastro de Notas', preco: 60,
        desc: 'Notinhas musicais ficam para trás enquanto ele corre.',
        icone: '<g fill="#27c3ff"><ellipse cx="18" cy="44" rx="7" ry="5" transform="rotate(-20 18 44)"/><path d="M24 43 V16 L36 20 V24 L28 22 V43Z"/>' +
               '<ellipse cx="42" cy="50" rx="6" ry="4.4" transform="rotate(-20 42 50)" opacity=".75"/><path d="M47 49 V30 L56 33 V36 L51 34.5 V49Z" opacity=".75"/></g>' },
      { id: 'brilhos', cat: 'efeitos', nome: 'Chuva de Brilhos', preco: 80,
        desc: 'Faíscas douradas acompanham cada passo.',
        icone: '<g fill="#ffc928" stroke="#d79a00" stroke-width="1.5" stroke-linejoin="round"><path d="M26 10 L31 25 L46 30 L31 35 L26 50 L21 35 L6 30 L21 25Z"/>' +
               '<path d="M47 36 L50 45 L59 48 L50 51 L47 60 L44 51 L35 48 L44 45Z" opacity=".85"/></g>' },
      { id: 'aura', cat: 'efeitos', nome: 'Aura Ciano', preco: 100,
        desc: 'Um brilho azul envolve o Notinha.',
        icone: '<circle cx="32" cy="32" r="22" fill="none" stroke="#27c3ff" stroke-width="3" opacity=".35"/><circle cx="32" cy="32" r="15" fill="none" stroke="#27c3ff" stroke-width="3" opacity=".6"/>' +
               '<circle cx="32" cy="32" r="8" fill="#27c3ff"/>' },
  
      // ---------- cenários (o motor troca as cores do fundo) ----------
      { id: 'castelo', cat: 'cenarios', nome: 'Castelo Musical', preco: 0, desc: 'O cenário original do Notinha.' },
      { id: 'por-do-sol', cat: 'cenarios', nome: 'Pôr do Sol', preco: 150, desc: 'Um fim de tarde cor-de-rosa e laranja.' },
      { id: 'oceano', cat: 'cenarios', nome: 'Mar Tranquilo', preco: 150, desc: 'Tons de azul-turquesa e brisa do mar.' },
      { id: 'doce', cat: 'cenarios', nome: 'Reino Lilás', preco: 150, desc: 'Um reino encantado em tons de lilás.' }
    ];
  
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
      }
    };
  
    function item(id) { for (let i = 0; i < ITENS.length; i++) if (ITENS[i].id === id) return ITENS[i]; return null; }
    function cenario(id) { return CENARIOS[id] || CENARIOS.castelo; }
  
    /** SVG de uma camada do acessório (para desenhar sobre o Notinha), como data URI. */
    function svgCamada(it, camada, tam) {
      const g = it && it[camada];
      if (!g) return null;
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1.8 -1.8 3.6 3.6" width="' + tam + '" height="' + tam + '">' + g + '</svg>';
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }
  
    /** SVG pronto (como texto) para o ícone do item na loja. */
    function svgIcone(it, tema) {
      if (it.cat === 'acessorios') {
        const vb = it.vb || [-1.5, -1.5, 3, 3];
        return '<svg viewBox="' + vb.join(' ') + '" aria-hidden="true">' + (it.tras || '') + (it.frente || '') + '</svg>';
      }
      if (it.cat === 'efeitos') return '<svg viewBox="0 0 64 64" aria-hidden="true">' + it.icone + '</svg>';
      const P = cenario(it.id)[tema === 'escuro' ? 'escuro' : 'claro'], g = 'nwr-g-' + it.id + (tema === 'escuro' ? 'e' : 'c');
      return '<svg viewBox="0 0 120 80" aria-hidden="true" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + P.ceuTopo + '"/><stop offset="1" stop-color="' + P.ceuBase + '"/></linearGradient></defs>' +
        '<rect width="120" height="80" fill="url(#' + g + ')"/>' +
        '<g fill="' + P.longe + '"><rect x="8" y="30" width="22" height="34"/><path d="M6 30 L19 14 L32 30Z"/><rect x="60" y="22" width="18" height="42"/><path d="M58 22 L69 6 L80 22Z"/><rect x="92" y="38" width="24" height="26"/></g>' +
        '<g fill="' + P.perto + '"><rect x="34" y="42" width="24" height="22"/><path d="M34 42 q12 -16 24 0Z"/><rect x="80" y="46" width="14" height="18"/></g>' +
        '<rect y="62" width="120" height="18" fill="' + P.chao + '"/><rect y="61" width="120" height="2" fill="' + P.borda + '"/></svg>';
    }
  
    NW.loja = {
      ITENS: ITENS, SLOTS: SLOTS, CATEGORIAS: CATEGORIAS, CENARIOS: CENARIOS,
      item: item, cenario: cenario, centro: centro, svgCamada: svgCamada, svgIcone: svgIcone,
      PADRAO: { acessorios: {}, efeito: null, cenario: 'castelo' }
    };
  })(window.NWRunner = window.NWRunner || {});