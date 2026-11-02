/* Notinha Runner — interface da Loja, do Guarda-roupa e dos Cenários.
 * Os três painéis usam o mesmo componente (muda só o "modo"):
 *   loja      → compra e experimenta qualquer item
 *   guarda    → veste/tira o que você já comprou (roupas, acessórios e efeitos)
 *   cenarios  → escolhe o cenário do jogo
 * A prévia mostra o Notinha correndo, com cada peça seguindo a cabeça quadro a quadro,
 * exatamente como no jogo. Abra a página com  #ajuste  para calibrar peças (ver loja.js).
 *
 * Melhorias desta versão:
 *   - o foco do teclado não se perde mais ao selecionar/comprar/vestir;
 *   - mensagens anunciadas para leitores de tela (região "status" fixa);
 *   - setas do teclado percorrem os itens (um único Tab entra na grade);
 *   - a prévia troca as peças só depois de decodificadas (sem piscar);
 *   - o laço de animação para quando a aba do navegador está em segundo plano;
 *   - botão "Jogar para ganhar moedas" quando faltam moedas;
 *   - efeitos lidos do catálogo (NW.loja.efeito): partículas e auras configuráveis.
 */
(function (NW) {
    'use strict';

    const L = NW.loja;
    const MODOS = {
        loja:     { painel: 'aba-loja',         titulo: 'Loja do Notinha',  cats: ['acessorios', 'efeitos', 'cenarios'] },
        guarda:   { painel: 'aba-guarda-roupa', titulo: 'Guarda-roupa',     cats: ['acessorios', 'efeitos'] },
        cenarios: { painel: 'aba-cenarios',     titulo: 'Cenários',         cats: ['cenarios'] }
      };
    const ABA_PARA_MODO = { 'loja': 'loja', 'guarda-roupa': 'guarda', 'cenarios': 'cenarios' };
    const FRAME_PREVIA = 0, FRAME_W = 290, FRAME_H = 251, QUADROS_CORRIDA = 15, ULTIMO_QUADRO = 15, FPS = 16;
    const FRAMES_SPRITE = 16;   // quadros do sprite normal
    const MODO_AJUSTE = /[?&#]ajuste\b/.test(location.search + location.hash);

    let ctl = null;                 // { aoMudar, atualizarSaldo, irParaAba }
    const E = { saldo: 0, inventario: [], equipado: { acessorios: {}, efeito: null, cenario: 'castelo' } };
    const vistas = {};              // uma por modo
    let ocupado = false;
    let corre = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    let temaVisto = null;

       // Notinhas especiais de cada cenário: imagens na mesma pasta do sprite normal.
    //   estilo 'mar'   → mergulhador.png (16 quadros de 270x200)
    //   estilo 'barco' → barquinho.png   (24 quadros de 240x211)
    // Enquanto a imagem não carregar (ou se não existir), tudo continua com o Notinha normal.
    const MERG_W = 270, MERG_H = 200;
    const ESPECIAIS = {
      mar:   { arquivo: 'mergulhador.png', url: null, n: 16, ciclo: 15 },
      barco: { arquivo: 'barquinho.png',   url: null, n: 24, ciclo: 24 }
    };
    function especial(estilo) { const e = ESPECIAIS[estilo]; return e && e.url ? e : null; }

    function carregarMergulhador() {   // carrega os dois sprites especiais (o nome foi mantido)
      const raiz = document.getElementById('nw-runner'), rel = raiz && raiz.dataset.sprite;
      if (!rel) return;
      Object.keys(ESPECIAIS).forEach(function (estilo) {
        const esp = ESPECIAIS[estilo];
        let url;
        try { url = new URL(rel.replace(/[^\/?#]*([?#].*)?$/, esp.arquivo), document.baseURI).href; } catch (e) { return; }
        const im = new Image();
        im.onload = function () {
          esp.url = url;
          Object.keys(vistas).forEach(function (m) { desenharPrevia(vistas[m]); });
          atualizarTelasMar();
        };
        im.src = url;
      });
    }

    function aplicarSprite(v, estilo) {
      const st = v.sprite.style, esp = especial(estilo);
      if (esp && estilo === 'mar') {
        const alt = (MERG_H / MERG_W) * (290 / FRAME_W) * (FRAME_W / FRAME_H) * 100;   // altura do quadro em % da caixa
        st.backgroundImage = 'url("' + esp.url + '")';
        st.backgroundSize = '1600% ' + alt.toFixed(1) + '%';
        st.backgroundPositionY = '75%';
      } else if (esp && estilo === 'barco') {
        st.backgroundImage = 'url("' + esp.url + '")';
        st.backgroundSize = '2400% 100%';          // 24 quadros; a proporção é quase igual à da caixa
        st.backgroundPositionY = '';
      } else {
        st.backgroundImage = ''; st.backgroundSize = ''; st.backgroundPositionY = '';
      }
      v.nq = esp ? esp.n : FRAMES_SPRITE;          // quantos quadros tem a tira
      v.ciclo = esp ? esp.ciclo : QUADROS_CORRIDA; // quantos entram no ciclo de corrida/navegação
    }

        // Telas de início e de resultado: no cenário "Fundo do Mar" mostram o mergulhador.
        function eMar(id) {
            const P = L.cenario(id)[tema() === 'escuro' ? 'escuro' : 'claro'];
            return !!P && P.estilo === 'mar';
          }
          function estiloDe(id) {
            const P = L.cenario(id)[tema() === 'escuro' ? 'escuro' : 'claro'];
            return (P && P.estilo) || '';
          }
          // Telas de início e de resultado: mergulhador no Fundo do Mar, barquinho no Barquinho de Partitura.
          function atualizarTelasMar() {
            const raiz = document.getElementById('nw-runner');
            if (!raiz) return;
            const estilo = estiloDe(E.equipado.cenario), esp = especial(estilo);
            raiz.classList.toggle('nwr-mar', !!esp && estilo === 'mar');
            raiz.classList.toggle('nwr-barco', !!esp && estilo === 'barco');
            if (esp) raiz.style.setProperty(estilo === 'mar' ? '--nwr-merg' : '--nwr-barco', 'url("' + esp.url + '")');
          }

    const moedaHtml = '<span class="nwr-moeda" aria-hidden="true"></span>';
    function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function tema() { return NW.tema ? NW.tema.atual() : 'claro'; }
    function possui(it) { return it.preco === 0 || E.inventario.indexOf(it.id) >= 0; }
    function equipado(it) {
      if (it.slot) return E.equipado.acessorios[it.slot] === it.id;
      if (it.cat === 'efeitos') return E.equipado.efeito === it.id;
      return E.equipado.cenario === it.id;
    }
    function copiaEq() {
      return { acessorios: Object.assign({}, E.equipado.acessorios), efeito: E.equipado.efeito, cenario: E.equipado.cenario };
    }
    // visual mostrado na prévia = equipado + o item que está sendo experimentado
    function visualPrevia(v) {
      const eq = copiaEq();
      const it = v.sel && L.item(v.sel);
      if (it && v.modo === 'loja' && !possui(it)) {
        if (it.slot) eq.acessorios[it.slot] = it.id;
        else if (it.cat === 'efeitos') eq.efeito = it.id;
        else eq.cenario = it.id;
      }
      return eq;
    }

    // ---------- montagem ----------
    function montar(modo) {
      const cfg = MODOS[modo], raiz = document.getElementById(cfg.painel);
      const v = { modo: modo, raiz: raiz, cat: cfg.cats[0], sel: null, msg: '', ultimaMsg: '', pecas: [], frame: -1, tok: 0 };
      raiz.innerHTML =
        '<div class="nwr-loja">' +
          '<aside class="nwr-prev" aria-label="Prévia do Notinha">' +
            '<div class="nwr-prev__palco" data-r="palco">' +
              '<div class="nwr-prev__fx" data-r="fx" aria-hidden="true"></div>' +
              '<div class="nwr-prev__boneco" data-r="boneco" aria-hidden="true"><div class="nwr-prev__anim" data-r="anim"><div class="nwr-prev__sprite" data-r="sprite"></div></div></div>' +
            '</div>' +
            '<p class="nwr-prev__legenda" data-r="legenda"></p>' +
            '<div class="nwr-prev__botoes">' +
              '<button type="button" class="nwr-btn nwr-btn--suave nwr-btn--mini" data-r="corre" aria-pressed="true"></button>' +
              (modo === 'guarda' ? '<button type="button" class="nwr-btn nwr-btn--suave nwr-btn--mini" data-r="limpar">Tirar tudo</button>' : '') +
            '</div>' +
          '</aside>' +
          '<section class="nwr-loja__corpo" aria-label="' + cfg.titulo + '">' +
            '<div class="nwr-loja__topo"><h2>' + cfg.titulo + '</h2></div>' +
            '<div class="nwr-chips" role="group" aria-label="Categorias" data-r="chips"></div>' +
            '<div class="nwr-grade" data-r="grade" role="group" aria-label="Itens"></div>' +
            '<div class="nwr-detalhe" data-r="detalhe"></div>' +
            '<p class="nwr-sr" role="status" aria-live="polite" data-r="anuncio"></p>' +
            (MODO_AJUSTE ? '<div class="nwr-ajuste" data-r="ajuste"></div>' : '') +
          '</section>' +
        '</div>';
      raiz.querySelectorAll('[data-r]').forEach(function (el) { v[el.dataset.r] = el; });
      if (v.limpar) v.limpar.addEventListener('click', function () { tirarTudo(); });
      v.corre.addEventListener('click', function () { corre = !corre; rotuloCorre(); });
      v.grade.addEventListener('keydown', function (e) { navegarGrade(v, e); });
      vistas[modo] = v;
      return v;
    }

    function rotuloCorre() {
      Object.keys(vistas).forEach(function (m) {
        const b = vistas[m].corre;
        b.textContent = corre ? 'Pausar corrida' : 'Ver correndo';
        b.setAttribute('aria-pressed', corre ? 'true' : 'false');
      });
    }

    // Setas/Home/End movem o foco entre os itens da grade.
    function navegarGrade(v, e) {
      const passo = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      const cards = [].slice.call(v.grade.querySelectorAll('.nwr-card'));
      const i = cards.indexOf(document.activeElement);
      if (i < 0 || !cards.length) return;
      let j;
      if (passo) j = (i + passo + cards.length) % cards.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = cards.length - 1;
      else return;
      e.preventDefault();
      cards[j].focus();
    }

    // Refaz a tela sem jogar o foco do teclado no lixo.
    function comFoco(v, fazer) {
      const a = document.activeElement;
      let chave = null;
      if (a && v.raiz.contains(a)) {
        if (a.dataset.id) chave = '[data-id="' + a.dataset.id + '"]';
        else if (a.dataset.acao) chave = '[data-acao]';
        else if (a.dataset.cat) chave = '[data-cat="' + a.dataset.cat + '"]';
      }
      fazer();
      if (!chave) return;
      let n = v.raiz.querySelector(chave);
      if (!n || n.disabled) n = v.sel ? v.raiz.querySelector('[data-id="' + v.sel + '"]') : null;
      if (n) n.focus({ preventScroll: true });
    }

    function anunciar(v, texto) {
      if (v.ultimaMsg === texto) return;
      v.ultimaMsg = texto;
      v.anuncio.textContent = texto;
    }

    // ---------- prévia ----------
    // Põe cada peça no lugar certo para o quadro "f": centro da cabeça daquele quadro + inclinação.
    function posicionar(v, f) {
      const ce = L.centro(f), tam = L.VB * ce.R;
      v.sprite.style.backgroundPositionX = (f / ((v.nq || FRAMES_SPRITE) - 1) * 100) + '%';
      if (!v.sprite.style.backgroundPositionY) v.sprite.style.backgroundPositionY = '0%';
      v.pecas.forEach(function (p) {
        const s = p.img.style;
        s.left = ((ce.x - tam / 2) / FRAME_W * 100) + '%';
        s.top = ((ce.y - tam / 2) / FRAME_H * 100) + '%';
        s.width = (tam / FRAME_W * 100) + '%';
        s.height = (tam / FRAME_H * 100) + '%';
        s.transform = 'rotate(' + (ce.rot * p.fator) + 'rad)';
      });
    }

    // Monta as camadas (costas → roupa → pescoço → cabeça) e só troca na tela quando todas estão decodificadas.
    function montarPecas(v, eq) {
      const tok = ++v.tok, lista = [];
      ['tras', 'frente'].forEach(function (nome) {
        L.SLOTS.forEach(function (s) {
          const it = L.item(eq.acessorios[s.id]);
          const uri = it && L.svgCamada(it, nome, 640);
          if (!uri) return;
          const im = new Image();
          im.alt = ''; im.draggable = false; im.className = 'nwr-prev__peca'; im.src = uri;
          lista.push({ img: im, fator: L.fator(it), atras: nome === 'tras' });
        });
      });
      function trocar() {
        if (tok !== v.tok) return;                 // chegou uma versão mais nova: ignora esta
        v.anim.querySelectorAll('img').forEach(function (i) { i.remove(); });
        lista.forEach(function (p) { v.anim.insertBefore(p.img, p.atras ? v.sprite : null); });
        v.pecas = lista;
        posicionar(v, v.frame < 0 ? FRAME_PREVIA : v.frame);
      }
      Promise.all(lista.map(function (p) { return p.img.decode ? p.img.decode().catch(function () {}) : Promise.resolve(); })).then(trocar);
    }

    // Desenha o efeito equipado/experimentado. A descrição vem do catálogo (L.efeito):
    //   aura       → brilho em volta do boneco (cor "R,G,B")
    //   partículas → símbolos que ficam para trás ('tras'), sobem ('sobe') ou caem ('cai')
    function desenharEfeito(v, idEfeito) {
      const fx = idEfeito ? L.efeito(idEfeito) : null;
      v.boneco.classList.toggle('fx-aura', !!fx && fx.tipo === 'aura');
      if (fx && fx.tipo === 'aura') v.boneco.style.setProperty('--aura', fx.cor);
      else v.boneco.style.removeProperty('--aura');
      v.fx.innerHTML = '';
      v.fx.className = 'nwr-prev__fx';
      if (!fx || fx.tipo !== 'particulas') return;
      const N = 8;
      v.fx.classList.add('fx-part', 'fx-mov-' + fx.mov);
      for (let i = 0; i < N; i++) {
        const s = document.createElement('span');
        s.textContent = fx.glifos[i % fx.glifos.length];
        s.style.color = fx.cores ? fx.cores[i % fx.cores.length] : fx.cor;
        s.style.fontSize = (fx.tam || 20) + 'px';
        s.style.animationDuration = fx.dur + 's';
        s.style.animationDelay = (-i * fx.dur / N) + 's';
        if (fx.mov === 'tras') { s.style.left = '34%'; s.style.bottom = (i % 2 ? 48 : 36) + '%'; }
        else if (fx.mov === 'sobe') { s.style.left = (18 + (i * 47) % 60) + '%'; s.style.bottom = '24%'; }
        else { s.style.left = (12 + (i * 47) % 72) + '%'; s.style.top = '2%'; s.style.bottom = 'auto'; }
        v.fx.appendChild(s);
      }
    }

    function desenharPrevia(v) {
      const eq = visualPrevia(v), t = tema();
      // fundo = cenário
      const P = L.cenario(eq.cenario)[t === 'escuro' ? 'escuro' : 'claro'];
      v.palco.style.background = 'linear-gradient(180deg,' + P.ceuTopo + ',' + P.ceuBase + ')';
      v.palco.style.setProperty('--prev-chao', P.chao);
      v.palco.style.setProperty('--prev-borda', P.borda);
      v.palco.style.setProperty('--prev-longe', P.longe);
      v.palco.style.setProperty('--prev-perto', P.perto);
      const esp = especial(P.estilo);              // 'mar' → mergulhador, 'barco' → barquinho
      aplicarSprite(v, esp ? P.estilo : null);
      v.palco.dataset.estilo = P.estilo || '';     // o CSS usa isto para pôr as ondas na prévia
      // com Notinha especial, os acessórios não são desenhados (as posições são do sprite original)
      montarPecas(v, esp ? Object.assign({}, eq, { acessorios: {} }) : eq);
      desenharEfeito(v, eq.efeito);
      const it = v.sel && L.item(v.sel), prova = it && v.modo === 'loja' && !possui(it);
      v.legenda.textContent = prova ? 'Experimentando: ' + it.nome : (v.modo === 'cenarios' ? 'Cenário atual' : 'Visual atual');
      v.legenda.classList.toggle('is-prova', !!prova);
    }

    // O Notinha corre na prévia (quadros 0–14); com "pausar", fica na pose parada.
    // Não gasta CPU quando a aba do navegador está escondida.
    function loopPrevia(ts) {
      requestAnimationFrame(loopPrevia);
      if (document.hidden) return;
      Object.keys(vistas).forEach(function (m) {
        const v = vistas[m];
        if (v.raiz.hidden) return;
        const f = corre ? Math.floor(ts / 1000 * FPS) % (v.ciclo || QUADROS_CORRIDA) : FRAME_PREVIA;
        if (f !== v.frame) { v.frame = f; posicionar(v, f); }
      });
    }

    // ---------- lista ----------
    function listaDaCategoria(v) {
      return L.ITENS.filter(function (it) {
        if (it.cat !== v.cat) return false;
        return v.modo === 'guarda' ? possui(it) : true;
      });
    }

    function desenharLista(v) {
      const cfg = MODOS[v.modo];
      // categorias
      v.chips.innerHTML = '';
      v.chips.hidden = cfg.cats.length < 2;
      cfg.cats.forEach(function (id) {
        const c = L.CATEGORIAS.filter(function (x) { return x.id === id; })[0];
        const b = document.createElement('button');
        b.className = 'nwr-chipcat' + (v.cat === id ? ' is-ativa' : '');
        b.type = 'button'; b.dataset.cat = id; b.setAttribute('aria-pressed', v.cat === id ? 'true' : 'false');
        b.textContent = c.nome;
        b.addEventListener('click', function () { v.cat = id; v.sel = null; v.msg = ''; desenhar(v); });
        v.chips.appendChild(b);
      });
      // itens
      const itens = listaDaCategoria(v), t = tema();
      if (!v.sel || !itens.some(function (i) { return i.id === v.sel; })) v.sel = itens.length ? itens[0].id : null;
      v.grade.innerHTML = '';
      if (!itens.length) {
        v.grade.innerHTML = '<div class="nwr-vazio"><p>Você ainda não tem itens aqui.</p><button type="button" class="nwr-btn nwr-btn--mini" data-ir="loja">Ir para a Loja</button></div>';
        v.grade.querySelector('[data-ir]').addEventListener('click', function () { irLoja(v.cat); });
      }
      itens.forEach(function (it) {
        const tem = possui(it), eq = equipado(it);
        const b = document.createElement('button');
        b.type = 'button'; b.dataset.id = it.id;
        b.tabIndex = v.sel === it.id ? 0 : -1;       // um único Tab entra na grade; setas percorrem
        b.className = 'nwr-card' + (v.sel === it.id ? ' is-sel' : '') + (!tem && v.modo === 'cenarios' ? ' is-bloq' : '');
        b.setAttribute('aria-pressed', v.sel === it.id ? 'true' : 'false');
        let rodape, estado;
        if (eq) { rodape = '<span class="nwr-tag nwr-tag--ok">Em uso</span>'; estado = 'em uso'; }
        else if (tem) { rodape = '<span class="nwr-tag">' + (v.modo === 'loja' ? 'Comprado' : 'Disponível') + '</span>'; estado = v.modo === 'loja' ? 'comprado' : 'disponível'; }
        else if (v.modo === 'cenarios') { rodape = '<span class="nwr-tag nwr-tag--bloq">Na loja</span>'; estado = 'à venda na loja'; }
        else { rodape = '<span class="nwr-preco">' + moedaHtml + '<b>' + it.preco + '</b></span>'; estado = it.preco + ' moedas'; }
        b.setAttribute('aria-label', it.nome + ', ' + estado);
        b.innerHTML = '<span class="nwr-card__ico' + (it.cat === 'cenarios' ? ' nwr-card__ico--cen' : '') + '" aria-hidden="true">' + L.svgIcone(it, t) + '</span>' +
                      '<span class="nwr-card__nome" aria-hidden="true">' + esc(it.nome) + '</span>' + rodape;
        b.addEventListener('click', function () { v.sel = it.id; v.msg = ''; desenhar(v); });
        v.grade.appendChild(b);
      });
      desenharDetalhe(v);
    }

    function desenharDetalhe(v) {
      const it = v.sel && L.item(v.sel);
      if (!it) { v.detalhe.innerHTML = ''; anunciar(v, v.msg); return; }
      const tem = possui(it), eq = equipado(it);
      let rotulo, acao, desativado = ocupado, faltam = 0;
      if (v.modo === 'cenarios') {
        if (!tem) { rotulo = 'Ver na Loja'; acao = 'loja'; }
        else if (eq) { rotulo = 'Em uso'; acao = 'nada'; desativado = true; }
        else { rotulo = 'Usar este cenário'; acao = 'equipar'; }
      } else if (!tem) {
        if (E.saldo >= it.preco) { rotulo = 'Comprar'; acao = 'comprar'; }
        else { faltam = it.preco - E.saldo; rotulo = 'Faltam ' + faltam + (faltam === 1 ? ' moeda' : ' moedas'); acao = 'nada'; desativado = true; }
      } else if (it.cat === 'cenarios') {
        if (eq) { rotulo = 'Em uso'; acao = 'nada'; desativado = true; } else { rotulo = 'Usar este cenário'; acao = 'equipar'; }
      } else { rotulo = eq ? 'Tirar' : 'Vestir'; acao = 'equipar'; }
      if (acao === 'equipar' && it.cat === 'efeitos') rotulo = eq ? 'Desativar' : 'Ativar';

      v.detalhe.innerHTML =
        '<div class="nwr-detalhe__txt"><strong>' + esc(it.nome) + '</strong><span>' + esc(it.desc) + '</span>' +
        '<em class="nwr-detalhe__msg">' + esc(v.msg) + '</em></div>' +
        '<div class="nwr-detalhe__acoes">' +
          '<button type="button" class="nwr-btn" data-acao="' + acao + '"' + (desativado ? ' disabled' : '') + '>' +
          (acao === 'comprar' ? moedaHtml + ' ' + it.preco + ' · ' : '') + esc(rotulo) + '</button>' +
          (faltam ? '<button type="button" class="nwr-link" data-jogar>Jogar para ganhar moedas</button>' : '') +
        '</div>';
      anunciar(v, v.msg);
      v.detalhe.querySelector('[data-acao]').addEventListener('click', function () {
        if (acao === 'comprar') comprar(v, it);
        else if (acao === 'equipar') alternar(v, it);
        else if (acao === 'loja') irLoja('cenarios', it.id);
      });
      const jogar = v.detalhe.querySelector('[data-jogar]');
      if (jogar) jogar.addEventListener('click', function () { ctl.irParaAba('jogar'); });
    }

    // ---------- modo de ajuste (só com #ajuste no endereço) ----------
    const CAMPOS_AJUSTE = [['dx', 'Horizontal', -1, 1, 0.01], ['dy', 'Vertical', -1, 1, 0.01], ['s', 'Tamanho', 0.5, 1.6, 0.01], ['r', 'Giro (graus)', -45, 45, 1]];

    function desenharAjuste(v) {
      if (!MODO_AJUSTE || !v.ajuste) return;
      const it = v.sel && L.item(v.sel);
      if (!it || !(it.tras || it.frente)) { v.ajuste.innerHTML = ''; return; }
      const a = L.obterAjuste(it.id);
      let h = '<h3>Ajuste fino: ' + esc(it.nome) + '</h3><p>Mexa até a peça encaixar com o Notinha correndo. Só vale para este navegador até você colar o resultado em <code>AJUSTES_FIXOS</code>.</p>';
      CAMPOS_AJUSTE.forEach(function (c) {
        h += '<label class="nwr-ajuste__linha"><span>' + c[1] + '</span><input type="range" data-k="' + c[0] + '" min="' + c[2] + '" max="' + c[3] + '" step="' + c[4] + '" value="' + a[c[0]] + '"><output>' + a[c[0]] + '</output></label>';
      });
      if (it.recorte) h += '<label class="nwr-ajuste__linha"><span>Recorte da cabeça</span><input type="range" data-g="recorte" min="0.8" max="1.1" step="0.01" value="' + L.obterRecorte() + '"><output>' + L.obterRecorte() + '</output></label>';
      h += '<div class="nwr-ajuste__bot"><button type="button" class="nwr-btn nwr-btn--suave nwr-btn--mini" data-a="zerar">Zerar esta peça</button><button type="button" class="nwr-btn nwr-btn--mini" data-a="copiar">Copiar ajustes</button></div>' +
           '<textarea class="nwr-ajuste__json" readonly rows="6" aria-label="Ajustes em JSON"></textarea>';
      v.ajuste.innerHTML = h;

      function atualizar() { desenharPrevia(v); ctl.aoMudar(copiaEq()); }
      v.ajuste.querySelectorAll('input[type=range]').forEach(function (inp) {
        inp.addEventListener('input', function () {
          const val = parseFloat(inp.value);
          inp.nextElementSibling.textContent = val;
          if (inp.dataset.g === 'recorte') L.definirRecorte(val);
          else { const n = L.obterAjuste(it.id); n[inp.dataset.k] = val; L.definirAjuste(it.id, n); }
          atualizar();
        });
      });
      v.ajuste.querySelector('[data-a=zerar]').addEventListener('click', function () { L.zerarAjuste(it.id); atualizar(); desenharAjuste(v); });
      v.ajuste.querySelector('[data-a=copiar]').addEventListener('click', function () {
        const ta = v.ajuste.querySelector('textarea'), txt = JSON.stringify(L.exportarAjustes(), null, 1);
        ta.value = txt; ta.select();
        try { navigator.clipboard.writeText(txt); } catch (e) { /* o texto fica selecionado para copiar à mão */ }
      });
    }

    function desenhar(v) {
      comFoco(v, function () { desenharLista(v); desenharPrevia(v); desenharAjuste(v); });
    }

    // ---------- ações ----------
    function irLoja(cat, sel) {
      const v = vistas.loja; v.cat = cat; v.sel = sel || null; v.msg = '';
      ctl.irParaAba('loja');
    }

    async function comprar(v, it) {
      if (ocupado) return; ocupado = true; v.msg = 'Comprando…'; desenharDetalhe(v);
      try {
        const r = await NW.api.comprar(it.id);
        E.saldo = r.saldo; E.inventario = r.inventario;
        ctl.atualizarSaldo(E.saldo);
        v.msg = it.slot ? 'Comprado! Agora é só vestir.' : 'Comprado!';
      } catch (e) {
        v.msg = e.message === 'saldo-insuficiente' ? 'Você ainda não tem moedas suficientes.' :
                e.message === 'ja-possui' ? 'Você já tem este item.' : 'Não foi possível comprar agora. Tente de novo.';
      }
      ocupado = false; desenhar(v);
    }

    async function aplicar(novo) {
      const antes = E.equipado;
      E.equipado = novo;
      ctl.aoMudar(novo);
      try { const r = await NW.api.equipar(novo); E.equipado = r.equipado; ctl.aoMudar(E.equipado); }
      catch (e) { E.equipado = antes; ctl.aoMudar(antes); throw e; }
    }

    async function alternar(v, it) {
      if (ocupado) return; ocupado = true;
      const novo = copiaEq(), estavaEm = equipado(it);
      if (it.slot) { if (novo.acessorios[it.slot] === it.id) delete novo.acessorios[it.slot]; else novo.acessorios[it.slot] = it.id; }
      else if (it.cat === 'efeitos') novo.efeito = novo.efeito === it.id ? null : it.id;
      else novo.cenario = it.id;
      try { await aplicar(novo); v.msg = it.nome + (estavaEm ? ' removido.' : ' em uso.'); }
      catch (e) { v.msg = 'Não foi possível salvar agora. Tente de novo.'; }
      ocupado = false; desenhar(v);
    }

    async function tirarTudo() {
      if (ocupado) return; ocupado = true;
      const novo = copiaEq(); novo.acessorios = {}; novo.efeito = null;
      try { await aplicar(novo); vistas.guarda.msg = 'Visual limpo.'; } catch (e) { vistas.guarda.msg = 'Não foi possível salvar agora. Tente de novo.'; }
      ocupado = false; Object.keys(vistas).forEach(function (m) { desenhar(vistas[m]); });
    }

    // ---------- interface pública ----------
    async function recarregar() {
      const d = await NW.api.obterLoja();
      E.saldo = d.saldo; E.inventario = d.inventario; E.equipado = d.equipado;
      ctl.atualizarSaldo(E.saldo);
    }

    async function iniciar(opc) {
        const aoMudarApp = opc.aoMudar;
        ctl = Object.assign({}, opc, {
          aoMudar: function (v) { aoMudarApp(v); atualizarTelasMar(); }
        });
      Object.keys(MODOS).forEach(montar);
      rotuloCorre();
      temaVisto = tema();
      try { await recarregar(); } catch (e) { /* segue com o visual padrão */ }
      ctl.aoMudar(E.equipado);
      Object.keys(vistas).forEach(function (m) { desenhar(vistas[m]); });
      requestAnimationFrame(loopPrevia);
      carregarMergulhador();
    }

    async function aoAbrir(aba) {
      const modo = ABA_PARA_MODO[aba];
      if (!modo || !ctl) return;
      try { await recarregar(); } catch (e) { /* mantém o que já está na tela */ }
      vistas[modo].msg = '';
      desenhar(vistas[modo]);
    }

    function atualizarTema() {
      if (!ctl) return;
      const t = tema();
      if (t === temaVisto) return;                 // nada mudou: evita redesenhar tudo à toa
      temaVisto = t;
      Object.keys(vistas).forEach(function (m) { desenhar(vistas[m]); });
    }

    NW.lojaUI = { iniciar: iniciar, aoAbrir: aoAbrir, atualizarTema: atualizarTema };
  })(window.NWRunner = window.NWRunner || {});