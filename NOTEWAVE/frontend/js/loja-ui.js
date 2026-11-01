/* Notinha Runner — interface da Loja, do Guarda-roupa e dos Cenários.
 * Os três painéis usam o mesmo componente (muda só o "modo"):
 *   loja      → compra e experimenta qualquer item
 *   guarda    → veste/tira o que você já comprou (acessórios e efeitos)
 *   cenarios  → escolhe o cenário do jogo
 * Os dados vêm de api.js (hoje local; na Etapa 4 passam a vir do servidor).
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
    const FRAME_PREVIA = 0, FRAME_W = 290, FRAME_H = 251;
  
    let ctl = null;                 // { aoMudar, atualizarSaldo, irParaAba }
    const E = { saldo: 0, inventario: [], equipado: { acessorios: {}, efeito: null, cenario: 'castelo' } };
    const vistas = {};              // uma por modo
    let ocupado = false;
  
    const moedaHtml = '<span class="nwr-moeda" aria-hidden="true"></span>';
    function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function tema() { return NW.tema ? NW.tema.atual() : 'claro'; }
    function possui(it) { return it.preco === 0 || E.inventario.indexOf(it.id) >= 0; }
    function equipado(it) {
      if (it.cat === 'acessorios') return E.equipado.acessorios[it.slot] === it.id;
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
        if (it.cat === 'acessorios') eq.acessorios[it.slot] = it.id;
        else if (it.cat === 'efeitos') eq.efeito = it.id;
        else eq.cenario = it.id;
      }
      return eq;
    }
  
    // ---------- montagem ----------
    function montar(modo) {
      const cfg = MODOS[modo], raiz = document.getElementById(cfg.painel);
      const v = { modo: modo, raiz: raiz, cat: cfg.cats[0], sel: null, msg: '' };
      raiz.innerHTML =
        '<div class="nwr-loja">' +
          '<aside class="nwr-prev">' +
            '<div class="nwr-prev__palco" data-r="palco">' +
              '<div class="nwr-prev__fx" data-r="fx" aria-hidden="true"></div>' +
              '<div class="nwr-prev__boneco" data-r="boneco"><div class="nwr-prev__anim"><div class="nwr-prev__sprite"></div></div></div>' +
            '</div>' +
            '<p class="nwr-prev__legenda" data-r="legenda"></p>' +
            (modo === 'guarda' ? '<button class="nwr-btn nwr-btn--suave nwr-btn--mini" data-r="limpar">Tirar tudo</button>' : '') +
          '</aside>' +
          '<section class="nwr-loja__corpo">' +
            '<div class="nwr-loja__topo"><h2>' + cfg.titulo + '</h2></div>' +
            '<div class="nwr-chips" role="tablist" data-r="chips"></div>' +
            '<div class="nwr-grade" data-r="grade" role="list"></div>' +
            '<div class="nwr-detalhe" data-r="detalhe"></div>' +
          '</section>' +
        '</div>';
      raiz.querySelectorAll('[data-r]').forEach(function (el) { v[el.dataset.r] = el; });
      if (v.limpar) v.limpar.addEventListener('click', function () { tirarTudo(); });
      vistas[modo] = v;
      return v;
    }
  
    // ---------- desenho ----------
    function desenharPrevia(v) {
      const eq = visualPrevia(v), t = tema();
      // fundo = cenário
      const P = L.cenario(eq.cenario)[t === 'escuro' ? 'escuro' : 'claro'];
      v.palco.style.background = 'linear-gradient(180deg,' + P.ceuTopo + ',' + P.ceuBase + ')';
      v.palco.style.setProperty('--prev-chao', P.chao);
      v.palco.style.setProperty('--prev-borda', P.borda);
      v.palco.style.setProperty('--prev-longe', P.longe);
      v.palco.style.setProperty('--prev-perto', P.perto);
      // acessórios
      const anim = v.boneco.querySelector('.nwr-prev__anim');
      anim.querySelectorAll('img').forEach(function (i) { i.remove(); });
      const spr = anim.querySelector('.nwr-prev__sprite'), ce = L.centro(FRAME_PREVIA), tam = 3.6 * ce.R;
      function camada(nome, antes) {
        L.SLOTS.forEach(function (s) {
          const it = L.item(eq.acessorios[s.id]);
          const uri = it && L.svgCamada(it, nome, 360);
          if (!uri) return;
          const im = document.createElement('img');
          im.src = uri; im.alt = ''; im.draggable = false;
          im.className = 'nwr-prev__peca';
          im.style.cssText = 'left:' + ((ce.x - tam / 2) / FRAME_W * 100) + '%;top:' + ((ce.y - tam / 2) / FRAME_H * 100) + '%;width:' + (tam / FRAME_W * 100) + '%;height:' + (tam / FRAME_H * 100) + '%';
          anim.insertBefore(im, antes ? spr : null);
        });
      }
      camada('tras', true); camada('frente', false);
      // efeito
      v.boneco.classList.toggle('fx-aura', eq.efeito === 'aura');
      v.fx.innerHTML = '';
      v.fx.className = 'nwr-prev__fx';
      if (eq.efeito === 'rastro-notas' || eq.efeito === 'brilhos') {
        v.fx.classList.add('fx-' + eq.efeito);
        for (let i = 0; i < 6; i++) {
          const s = document.createElement('span');
          s.textContent = eq.efeito === 'brilhos' ? '\u2726' : (i % 2 ? '\u266B' : '\u266A');
          s.style.setProperty('--i', i);
          v.fx.appendChild(s);
        }
      }
      const it = v.sel && L.item(v.sel), prova = it && v.modo === 'loja' && !possui(it);
      v.legenda.textContent = prova ? 'Experimentando: ' + it.nome : (v.modo === 'cenarios' ? 'Cenário atual' : 'Visual atual');
      v.legenda.classList.toggle('is-prova', !!prova);
    }
  
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
        b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', v.cat === id ? 'true' : 'false');
        b.textContent = c.nome;
        b.addEventListener('click', function () { v.cat = id; v.sel = null; v.msg = ''; desenhar(v); });
        v.chips.appendChild(b);
      });
      // itens
      const itens = listaDaCategoria(v), t = tema();
      if (!v.sel || !itens.some(function (i) { return i.id === v.sel; })) v.sel = itens.length ? itens[0].id : null;
      v.grade.innerHTML = '';
      if (!itens.length) {
        v.grade.innerHTML = '<div class="nwr-vazio"><p>Você ainda não tem itens aqui.</p><button class="nwr-btn nwr-btn--mini" data-ir="loja">Ir para a Loja</button></div>';
        v.grade.querySelector('[data-ir]').addEventListener('click', function () { irLoja(v.cat); });
      }
      itens.forEach(function (it) {
        const tem = possui(it), eq = equipado(it);
        const b = document.createElement('button');
        b.type = 'button'; b.setAttribute('role', 'listitem');
        b.className = 'nwr-card' + (v.sel === it.id ? ' is-sel' : '') + (!tem && v.modo === 'cenarios' ? ' is-bloq' : '');
        b.setAttribute('aria-pressed', v.sel === it.id ? 'true' : 'false');
        let rodape;
        if (eq) rodape = '<span class="nwr-tag nwr-tag--ok">Em uso</span>';
        else if (tem) rodape = '<span class="nwr-tag">' + (v.modo === 'loja' ? 'Comprado' : 'Disponível') + '</span>';
        else if (v.modo === 'cenarios') rodape = '<span class="nwr-tag nwr-tag--bloq">Na loja</span>';
        else rodape = '<span class="nwr-preco">' + moedaHtml + '<b>' + it.preco + '</b></span>';
        b.innerHTML = '<span class="nwr-card__ico' + (it.cat === 'cenarios' ? ' nwr-card__ico--cen' : '') + '">' + L.svgIcone(it, t) + '</span>' +
                      '<span class="nwr-card__nome">' + esc(it.nome) + '</span>' + rodape;
        b.addEventListener('click', function () { v.sel = it.id; v.msg = ''; desenhar(v); });
        v.grade.appendChild(b);
      });
      desenharDetalhe(v);
    }
  
    function desenharDetalhe(v) {
      const it = v.sel && L.item(v.sel);
      if (!it) { v.detalhe.innerHTML = ''; return; }
      const tem = possui(it), eq = equipado(it);
      let rotulo, acao, desativado = ocupado;
      if (v.modo === 'cenarios') {
        if (!tem) { rotulo = 'Ver na Loja'; acao = 'loja'; }
        else if (eq) { rotulo = 'Em uso'; acao = 'nada'; desativado = true; }
        else { rotulo = 'Usar este cenário'; acao = 'equipar'; }
      } else if (!tem) {
        if (E.saldo >= it.preco) { rotulo = 'Comprar'; acao = 'comprar'; }
        else { rotulo = 'Faltam ' + (it.preco - E.saldo) + ' moedas'; acao = 'nada'; desativado = true; }
      } else if (it.cat === 'cenarios') {
        if (eq) { rotulo = 'Em uso'; acao = 'nada'; desativado = true; } else { rotulo = 'Usar este cenário'; acao = 'equipar'; }
      } else { rotulo = eq ? 'Tirar' : 'Vestir'; acao = 'equipar'; }
      if (acao === 'equipar' && it.cat === 'efeitos' && !eq) rotulo = 'Ativar';
      if (acao === 'equipar' && it.cat === 'efeitos' && eq) rotulo = 'Desativar';
  
      v.detalhe.innerHTML =
        '<div class="nwr-detalhe__txt"><strong>' + esc(it.nome) + '</strong><span>' + esc(it.desc) + '</span>' +
        '<em class="nwr-detalhe__msg" role="status">' + esc(v.msg) + '</em></div>' +
        '<button class="nwr-btn" data-acao="' + acao + '"' + (desativado ? ' disabled' : '') + '>' +
        (acao === 'comprar' ? moedaHtml + ' ' + it.preco + ' · ' : '') + rotulo + '</button>';
      const btn = v.detalhe.querySelector('button');
      btn.addEventListener('click', function () {
        if (acao === 'comprar') comprar(v, it);
        else if (acao === 'equipar') alternar(v, it);
        else if (acao === 'loja') irLoja('cenarios', it.id);
      });
    }
  
    function desenhar(v) { desenharLista(v); desenharPrevia(v); }
  
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
        v.msg = 'Comprado! Agora é só vestir.';
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
      const novo = copiaEq();
      if (it.cat === 'acessorios') { if (novo.acessorios[it.slot] === it.id) delete novo.acessorios[it.slot]; else novo.acessorios[it.slot] = it.id; }
      else if (it.cat === 'efeitos') novo.efeito = novo.efeito === it.id ? null : it.id;
      else novo.cenario = it.id;
      try { await aplicar(novo); v.msg = ''; } catch (e) { v.msg = 'Não foi possível salvar agora. Tente de novo.'; }
      ocupado = false; desenhar(v);
    }
  
    async function tirarTudo() {
      if (ocupado) return; ocupado = true;
      const novo = copiaEq(); novo.acessorios = {}; novo.efeito = null;
      try { await aplicar(novo); } catch (e) { /* mantém como estava */ }
      ocupado = false; Object.keys(vistas).forEach(function (m) { desenhar(vistas[m]); });
    }
  
    // ---------- interface pública ----------
    async function recarregar() {
      const d = await NW.api.obterLoja();
      E.saldo = d.saldo; E.inventario = d.inventario; E.equipado = d.equipado;
      ctl.atualizarSaldo(E.saldo);
    }
  
    async function iniciar(opc) {
      ctl = opc;
      Object.keys(MODOS).forEach(montar);
      try { await recarregar(); } catch (e) { /* segue com o visual padrão */ }
      ctl.aoMudar(E.equipado);
      Object.keys(vistas).forEach(function (m) { desenhar(vistas[m]); });
    }
  
    async function aoAbrir(aba) {
      const modo = ABA_PARA_MODO[aba];
      if (!modo || !ctl) return;
      try { await recarregar(); } catch (e) {}
      desenhar(vistas[modo]);
    }
  
    function atualizarTema() { if (ctl) Object.keys(vistas).forEach(function (m) { desenhar(vistas[m]); }); }
  
    NW.lojaUI = { iniciar: iniciar, aoAbrir: aoAbrir, atualizarTema: atualizarTema };
  })(window.NWRunner = window.NWRunner || {});