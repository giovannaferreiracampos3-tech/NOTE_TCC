// Transforma os cartões do hub em um carrossel de formas do mar (uma atividade por vez).
// Carregue DEPOIS de atividades-mar.js. Não altera a lógica das atividades.
(function () {
  var cards = document.getElementById('cards');
  if (!cards) return;
  var reduz = matchMedia('(prefers-reduced-motion:reduce)').matches, ultimo = 0, pend = 0;

  function defs(a, b, n) {
    return '<defs><linearGradient id="g@" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient>' +
      '<radialGradient id="n@" cx=".5" cy=".4" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".96"/><stop offset="1" stop-color="' + n + '" stop-opacity=".88"/></radialGradient>' +
      '<radialGradient id="p@" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#cfc6ee"/></radialGradient></defs>';
  }
  function pontos(n, r, rd, cor) {
    var s = '';
    for (var i = 0; i < n; i++) { var a = i / n * 6.2832; s += '<circle cx="' + (160 + r * Math.cos(a)).toFixed(1) + '" cy="' + (184 + r * Math.sin(a)).toFixed(1) + '" r="' + rd + '" fill="' + cor + '"/>'; }
    return s;
  }
  var ANG = [0, 72, 144, 216, 288];
  var petalas = ANG.map(function (a) { return '<ellipse cy="-82" rx="17" ry="62" transform="rotate(' + a + ')"/>'; }).join('');
  var poros = ANG.map(function (a) { return '<g transform="rotate(' + a + ')"><circle cy="-50" r="2.6"/><circle cy="-82" r="2.6"/><circle cy="-114" r="2.6"/></g>'; }).join('');
  var VIEIRA = 'M160 318L28 200Q8 168 36 148Q28 106 70 98Q80 56 125 60Q160 28 195 60Q240 56 250 98Q292 106 284 148Q312 168 292 200Z';
  var ESPIGAS = [[135,44],[185,44],[231,62],[269,95],[293,139]].map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="12" fill="url(#g@)" stroke="#d9604a" stroke-width="4"/>'; }).join('');
  var FORMAS = [
    // vieira: estrias, borda perolada e miolo de madrepérola para o texto
    defs('#e3fbfb', '#5fc1cb', '#bdeef0') +
    '<path d="' + VIEIRA + '" fill="url(#g@)" stroke="#2f8f9a" stroke-width="5" stroke-linejoin="round"/>' +
    '<path d="M160 318L36 152M160 318L70 100M160 318L125 62M160 318L160 38M160 318L195 62M160 318L250 100M160 318L284 152M160 318L52 126M160 318L94 78M160 318L142 50M160 318L178 50M160 318L226 78M160 318L268 126" stroke="#2f8f9a" stroke-opacity=".3" stroke-width="3" stroke-linecap="round"/>' +
    '<path transform="translate(3 0)" d="M160 318L36 152M160 318L70 100M160 318L125 62M160 318L160 38M160 318L195 62M160 318L250 100M160 318L284 152" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-linecap="round"/>' +
    '<path transform="translate(160 318) scale(.93) translate(-160 -318)" d="' + VIEIRA + '" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M58 116Q74 84 112 72" stroke="#fff" stroke-opacity=".85" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M116 340Q104 318 128 304L160 316L192 304Q216 318 204 340Z" fill="url(#g@)" stroke="#2f8f9a" stroke-width="5" stroke-linejoin="round"/><path d="M140 336V320M160 338V320M180 336V320" stroke="#fff" stroke-opacity=".7" stroke-width="2.5" stroke-linecap="round"/>' +
    '<ellipse cx="160" cy="180" rx="99" ry="92" fill="url(#n@)" stroke="#fff" stroke-opacity=".9" stroke-width="3"/>',
    // búzio com coroa de espigas e lábio brilhante
    defs('#ffe0d5', '#ff9a84', '#ffc4b3') + ESPIGAS +
    '<circle cx="62" cy="64" r="36" fill="url(#g@)" stroke="#d9604a" stroke-width="5"/>' +
    '<path d="M62 64a5 5 0 1 1 5 5a10 10 0 1 1-10-10a16 16 0 1 1 16 16a22 22 0 1 1-22-22" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="3" stroke-linecap="round"/>' +
    '<ellipse cx="160" cy="190" rx="142" ry="148" fill="url(#g@)" stroke="#d9604a" stroke-width="5"/>' +
    '<path d="M50 122Q28 190 56 262M270 122Q292 190 264 262" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="10" stroke-linecap="round"/>' +
    '<ellipse cx="160" cy="190" rx="126" ry="132" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round"/>' +
    '<path d="M40 252Q84 322 172 330" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="4" stroke-linecap="round"/><path d="M62 266Q102 308 162 314" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M64 112Q84 70 134 54" stroke="#fff" stroke-opacity=".85" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<ellipse cx="160" cy="190" rx="105" ry="113" fill="url(#n@)" stroke="#fff" stroke-opacity=".9" stroke-width="3"/>',
    // ostra com interior de madrepérola e pérolas
    defs('#dbe9ff', '#7fb0f0', '#b9d3fa') +
    '<path d="M24 198Q24 338 160 338Q296 338 296 198Z" fill="url(#g@)" stroke="#4a78c4" stroke-width="5" stroke-linejoin="round"/>' +
    '<path d="M24 198Q160 246 296 198Z" fill="#ffd9ea" stroke="#4a78c4" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M60 262Q160 336 260 262" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M18 198Q4 84 96 50Q160 26 224 50Q316 84 302 198Q160 216 18 198Z" fill="url(#g@)" stroke="#4a78c4" stroke-width="5" stroke-linejoin="round"/>' +
    '<path d="M18 198Q4 84 96 50Q160 26 224 50Q316 84 302 198Q160 216 18 198Z" fill="#fff" fill-opacity=".2"/>' +
    '<path d="M44 188Q50 100 110 72Q160 56 210 72Q270 100 276 188" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round"/>' +
    '<path d="M60 184Q64 112 118 86Q160 74 202 86Q256 112 260 184" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M54 110Q70 78 110 62" stroke="#fff" stroke-opacity=".85" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<ellipse cx="160" cy="190" rx="106" ry="98" fill="url(#n@)" stroke="#fff" stroke-opacity=".9" stroke-width="3"/>' +
    '<circle cx="258" cy="298" r="22" fill="url(#p@)" stroke="#a9b7d8" stroke-width="3"/><circle cx="250" cy="290" r="6" fill="#fff"/><circle cx="268" cy="308" r="4" fill="#ffd1e6"/>' +
    '<circle cx="60" cy="312" r="10" fill="url(#p@)" stroke="#a9b7d8" stroke-width="2.5"/><circle cx="57" cy="309" r="3" fill="#fff"/>',
    // bolacha-da-praia com pétalas, poros e miolo
    defs('#fff3d8', '#ecca8c', '#f5deae') +
    '<circle cx="160" cy="184" r="150" fill="url(#g@)" stroke="#c79a4a" stroke-width="5"/>' +
    '<g fill="#c79a4a" fill-opacity=".5">' + pontos(30, 139, 2.8, '#c79a4a') + '</g>' +
    '<g transform="translate(160 184)"><g fill="none" stroke="#c79a4a" stroke-opacity=".5" stroke-width="3">' + petalas + '</g><g fill="#c79a4a" fill-opacity=".55">' + poros + '</g>' +
    '<circle r="128" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round"/></g>' +
    '<path d="M58 120Q76 70 128 50" stroke="#fff" stroke-opacity=".85" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<circle cx="160" cy="184" r="106" fill="url(#n@)" stroke="#fff" stroke-opacity=".9" stroke-width="3"/>'
  ];
  function forma(k) { return '<svg class="forma" viewBox="0 0 320 360" aria-hidden="true">' + FORMAS[k].replace(/@/g, k) + '</svg>'; }

  // estrutura: [seta] [janela > #cards] [seta] + pontos
  function seta(c, t, l) { var b = document.createElement('button'); b.type = 'button'; b.className = 'seta ' + c; b.textContent = t; b.setAttribute('aria-label', l); return b; }
  var wrap = document.createElement('div'), jan = document.createElement('div'), pts = document.createElement('div');
  wrap.className = 'carrossel'; wrap.setAttribute('role', 'region'); wrap.setAttribute('aria-label', 'Atividades do recife');
  jan.className = 'janela'; pts.className = 'pontos';
  var esq = seta('esq', '‹', 'Atividade anterior'), dir = seta('dir', '›', 'Próxima atividade');
  cards.parentNode.insertBefore(wrap, cards);
  jan.append(cards); wrap.append(esq, jan, dir); wrap.after(pts);

  function atual() { var w = cards.clientWidth; return w ? Math.round(cards.scrollLeft / w) : ultimo; }
  function ir(i) { var k = cards.children.length; if (!k) return; i = (i + k) % k; cards.scrollTo({ left: i * cards.clientWidth, behavior: reduz ? 'auto' : 'smooth' }); }
  function marca() { var a = atual(); [].forEach.call(pts.children, function (b, k) { b.setAttribute('aria-current', k === a); }); }
  esq.onclick = function () { ir(atual() - 1); };
  dir.onclick = function () { ir(atual() + 1); };
  wrap.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); ir(atual() - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); ir(atual() + 1); }
  });
  cards.addEventListener('scroll', function () { if (cards.clientWidth) { ultimo = atual(); marca(); } }, { passive: true });

  // o hub() recria os cartões a cada volta ao recife: decora de novo e volta para a mesma atividade
  function montar() {
    pend = 0;
    var cs = [].slice.call(cards.children);
    cs.forEach(function (c, k) {
      if (c.dataset.f !== undefined) return;
      c.dataset.f = k % 4;
      var cont = document.createElement('span'); cont.className = 'conteudo';
      while (c.firstChild) cont.append(c.firstChild);
      c.insertAdjacentHTML('afterbegin', forma(k % 4)); c.append(cont);
    });
    pts.innerHTML = '';
    cs.forEach(function (c, k) {
      var b = document.createElement('button'), h = c.querySelector('h3');
      b.type = 'button'; b.setAttribute('aria-label', 'Ir para ' + (h ? h.textContent : 'atividade ' + (k + 1)));
      b.onclick = function () { ir(k); }; pts.append(b);
    });
    if (cards.clientWidth) cards.scrollLeft = ultimo * cards.clientWidth;
    marca();
  }
  new MutationObserver(function () { if (!pend) { pend = 1; requestAnimationFrame(montar); } }).observe(cards, { childList: true });
  montar();
})();