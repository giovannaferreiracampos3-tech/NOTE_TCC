/* NoteWave Journal – interface conectada ao backend (/api/journal).
   Login: o front lê o token em localStorage('token') e envia em "Authorization: Bearer".
   Se sua API está em outro endereço, defina antes deste script: window.NW_API = 'http://localhost:5000/api/journal' */
   (() => {
    const API = window.NW_API || 'http://localhost:5000/api/journal';
    const CATS = [
      { id: 'teoria', nome: 'Teoria musical', icone: 'ph-music-notes' },
      { id: 'dicas', nome: 'Dicas de estudo', icone: 'ph-lightbulb' },
      { id: 'curiosidades', nome: 'Curiosidades', icone: 'ph-sparkle' },
      { id: 'resenhas', nome: 'Resenhas', icone: 'ph-headphones' },
      { id: 'relatos', nome: 'Relatos', icone: 'ph-chat-circle-text' },
      { id: 'criacoes', nome: 'Criações', icone: 'ph-paint-brush' },
      { id: 'acessiveis', nome: 'Música acessível', icone: 'ph-recycle' },
      { id: 'corpo', nome: 'Prática corporal', icone: 'ph-hand-clapping' },
      { id: 'cultura', nome: 'Música e cultura', icone: 'ph-globe-hemisphere-west' },
      { id: 'notinha', nome: 'Notinha Explica', icone: 'ph-chat-teardrop-text' }
    ];
    const DICAS = [
      'Estudar 15 minutos por dia rende mais do que 2 horas só no fim de semana. Constância vence!',
      'Você sabia? A palavra “pentagrama” vem do grego e significa “cinco linhas”.',
      'Errou uma nota? Respire e tente de novo, devagar. O ritmo vem depois da precisão.',
      'Cantar a nota em voz alta ajuda o ouvido a reconhecer cada som.',
      'Escrever o que aprendeu no Caderno ajuda a fixar o conteúdo.'
    ];
    const REACOES = [['aprendi', '💡', 'Aprendi!'], ['adorei', '💙', 'Adorei!'], ['inspirador', '🎵', 'Inspirador!'], ['excelente', '⭐', 'Excelente!']];
  
    const cat = id => CATS.find(c => c.id === id) || CATS[0];
    const $ = s => document.querySelector(s);
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    const dataBR = iso => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    const logado = () => !!localStorage.getItem('token');
    const nomeAutor = a => (a.origem === 'equipe' ? '' : '@') + a.autor;
  
    function toast(msg) { const t = el('div', 'jr-toast', msg); t.setAttribute('role', 'status'); document.body.appendChild(t); setTimeout(() => t.remove(), 2800); }
  
    async function api(caminho, o = {}) {
      const h = { 'Content-Type': 'application/json' }, tk = localStorage.getItem('token');
      if (tk) h.Authorization = 'Bearer ' + tk;
      let r;
      try { r = await fetch(API + caminho, { method: o.method || 'GET', headers: h, body: o.body ? JSON.stringify(o.body) : undefined }); }
      catch (e) { throw new Error('Não foi possível falar com o servidor. Verifique se ele está ligado.'); }
      let d = {}; try { d = await r.json(); } catch (e) { /* resposta sem corpo */ }
      if (!r.ok) throw Object.assign(new Error(d.erro || 'Algo deu errado. Tente de novo.'), { status: r.status });
      return d;
    }
    const exigeLogin = () => { if (logado()) return true; toast('Entre na sua conta para fazer isso.'); return false; };
  
    // Texto com **negrito** e *itálico* montado por DOM (sem innerHTML => sem HTML arbitrário)
    function inline(parent, texto) {
      texto.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).forEach(p => {
        if (!p) return;
        if (p.startsWith('**')) parent.appendChild(el('strong', '', p.slice(2, -2)));
        else if (p.startsWith('*')) parent.appendChild(el('em', '', p.slice(1, -1)));
        else parent.appendChild(document.createTextNode(p));
      });
      return parent;
    }
  
    function capa(a) {
      const c = el('div', 'capa'); c.dataset.cat = a.categoria;
      c.appendChild(el('i', 'ph ' + cat(a.categoria).icone)); return c;
    }
    function meta(a) {
      const m = el('div', 'jr-meta'); m.appendChild(el('span', 'jr-tag', cat(a.categoria).nome));
      m.append(el('span', '', nomeAutor(a)), el('span', '', dataBR(a.data)), el('span', '', a.minutos + ' min'));
      const c = el('span', 'jr-int'); c.append(el('i', 'ph ph-chat-circle'), document.createTextNode(a.totalComentarios)); m.appendChild(c);
      const r = el('span', 'jr-int'); r.append(el('i', 'ph ph-heart'), document.createTextNode(a.totalReacoes)); m.appendChild(r);
      return m;
    }
    function favBtn(a) {
      const b = el('button', 'jr-fav' + (a.favorito ? ' ativo' : '')); b.type = 'button'; b.title = 'Favoritar'; b.setAttribute('aria-label', 'Favoritar ' + a.titulo);
      b.appendChild(el('i', 'ph' + (a.favorito ? '-fill' : '') + ' ph-bookmark-simple'));
      b.onclick = async e => {
        e.preventDefault(); e.stopPropagation(); if (!exigeLogin()) return;
        try {
          const r = await api('/artigos/' + a.id + '/favorito', { method: 'PUT' }); a.favorito = r.favorito;
          b.classList.toggle('ativo', a.favorito); b.firstChild.className = 'ph' + (a.favorito ? '-fill' : '') + ' ph-bookmark-simple';
          toast(a.favorito ? 'Salvo em Meus artigos favoritos.' : 'Removido dos favoritos.'); atualizarContador();
          if (visao === 'favoritos') favoritos();
        } catch (er) { toast(er.message); }
      };
      return b;
    }
    function card(a, grande) {
      const l = el('a', 'jr-card' + (grande ? ' jr-destaque' : '')); l.href = '#/artigo/' + a.id;
      const c = el('div', 'corpo'), ler = el('span', 'ler', 'Ler artigo'); ler.appendChild(el('i', 'ph ph-arrow-right'));
      c.append(el('h3', '', a.titulo), el('p', '', a.resumo), ler, meta(a));
      l.append(capa(a), c, favBtn(a)); return l;
    }
    function chips(box, ativa, aoClicar) {
      box.textContent = '';
      [{ id: '', nome: 'Todas', icone: 'ph-squares-four' }, ...CATS].forEach(c => {
        const b = el('button', 'jr-chip' + (c.id === ativa ? ' ativo' : '')); b.type = 'button';
        b.append(el('i', 'ph ' + c.icone), document.createTextNode(c.nome)); b.onclick = () => aoClicar(c.id); box.appendChild(b);
      });
    }
    function vazio(box, msg, link) {
      const v = el('div', 'jr-vazio'), i = el('img'); i.src = '../imagem/nota.png'; i.alt = 'Notinha'; v.append(i, el('p', '', msg));
      if (link) { const a = el('a', '', link[0]); a.href = link[1]; v.appendChild(a); }
      box.appendChild(v);
    }
    const erroNa = (box, er) => { box.textContent = ''; vazio(box, er.message); };
  
    let visao = '', ultima = '', params = new URLSearchParams(''), baseLista = '#/explorar', ticket = 0, espera;
    const campo = $('#jrQ');
    const pb = el('div', 'jr-progresso'); document.body.appendChild(pb);
  
    function ver(id, nav) {
      visao = id; pb.style.width = '0'; document.title = 'Journal – NoteWave';
      ['home', 'explorar', 'artigo', 'favoritos'].forEach(v => { $('#v-' + v).hidden = v !== id; });
      document.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('ativo', b.dataset.nav === (nav || id)));
    }
    const hashLista = (base, mudar) => {
      const p = new URLSearchParams(visao === 'explorar' && base === baseLista ? params : '');
      Object.entries(mudar).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k));
      const q = p.toString(); return base + (q ? '?' + q : '');
    };
    function ir(h, trocar) { if (trocar) { history.replaceState(null, '', h); rota(); } else if (location.hash === h) rota(); else location.hash = h; }
  
    async function atualizarContador() {
      try { const r = await api('/favoritos/total'); $('#jrFavCount').textContent = r.total || ''; } catch (e) { /* contador é opcional */ }
    }
  
    // ---------- INÍCIO ----------
    async function home() {
      ver('home'); campo.value = ''; const meu = ++ticket;
      const d = $('#jrDestaque'), r = $('#jrRecentes'); d.textContent = ''; r.textContent = '';
      chips($('#jrCatsHome'), '', id => ir('#/explorar' + (id ? '?cat=' + id : '')));
      const dicas = DICAS, t = $('#jrDica'); let i = 0; t.textContent = dicas[0];
      $('#jrOutraDica').onclick = () => { i = (i + 1) % dicas.length; t.textContent = dicas[i]; };
      try {
        const lista = await api('/artigos'); if (meu !== ticket) return;
        if (!lista.length) { vazio(d, 'Ainda não há artigos por aqui. Volte em breve!'); return; }
        const dest = lista.find(a => a.destaque) || lista[0];
        d.appendChild(card(dest, true)); lista.filter(a => a !== dest).slice(0, 6).forEach(a => r.appendChild(card(a)));
      } catch (er) { if (meu === ticket) erroNa(d, er); }
    }
  
    // ---------- EXPLORAR / COMUNIDADE / MINHAS ----------
    async function explorar(com) {
      ver('explorar', com ? 'comunidade' : 'explorar'); baseLista = com ? '#/comunidade' : '#/explorar'; const meu = ++ticket;
      const f = { q: (params.get('q') || '').trim(), cat: params.get('cat') || '', origem: com ? 'comunidade' : (params.get('origem') || ''), ordem: params.get('ordem') || 'recentes' };
      if (campo.value.trim() !== f.q) campo.value = f.q;
      $('#jrOrigemBox').hidden = com;
      const titulo = com ? 'Comunidade' : f.q ? 'Resultados para “' + f.q + '”' : 'Explorar';
      $('#jrTituloExp').firstChild.className = 'ph ' + (com ? 'ph-users-three' : f.q ? 'ph-magnifying-glass' : 'ph-compass');
      $('#jrTituloExp span').textContent = titulo;
      chips($('#jrCatsExp'), f.cat, id => ir(hashLista(baseLista, { cat: id }), true));
      document.querySelectorAll('[data-origem]').forEach(b => { b.classList.toggle('ativo', b.dataset.origem === f.origem); b.onclick = () => ir(hashLista(baseLista, { origem: b.dataset.origem }), true); });
      const so = $('#jrOrdem'); so.value = f.ordem; so.onchange = () => ir(hashLista(baseLista, { ordem: so.value === 'recentes' ? '' : so.value }), true);
      const lim = $('#jrLimpar'); lim.hidden = !(f.q || f.cat || (!com && f.origem) || f.ordem !== 'recentes');
      lim.onclick = () => { campo.value = ''; ir(baseLista, true); };
      const box = $('#jrResultados'); box.textContent = ''; $('#jrContagem').textContent = 'Carregando…';
      const qs = new URLSearchParams({ q: f.q, cat: f.cat, origem: f.origem, ordem: f.ordem });
      try {
        const lista = await api('/artigos?' + qs); if (meu !== ticket) return;
        $('#jrContagem').textContent = lista.length + (lista.length === 1 ? ' publicação encontrada' : ' publicações encontradas');
        if (!lista.length) vazio(box, 'Não encontrei nada com esses filtros. Que tal tentar outra palavra ou categoria?');
        else lista.forEach(a => box.appendChild(card(a)));
      } catch (er) { if (meu !== ticket) return; $('#jrContagem').textContent = ''; erroNa(box, er); }
    }
  
    // ---------- FAVORITOS ----------
    async function favoritos() {
      ver('favoritos'); const meu = ++ticket, box = $('#jrFavLista'); box.textContent = '';
      if (!logado()) { $('#jrFavContagem').textContent = ''; vazio(box, 'Entre na sua conta para salvar e ver seus favoritos.'); return; }
      try {
        const l = await api('/artigos?favoritos=1'); if (meu !== ticket) return;
        $('#jrFavContagem').textContent = l.length + (l.length === 1 ? ' artigo salvo' : ' artigos salvos');
        if (!l.length) vazio(box, 'Você ainda não favoritou nenhum artigo. Toque no marcador de qualquer card para salvar aqui.'); else l.forEach(a => box.appendChild(card(a)));
      } catch (er) { if (meu === ticket) erroNa(box, er); }
    }
  
    // ---------- ARTIGO ----------
    function bloco(b) {
      switch (b.tipo) {
        case 'titulo': return el('h2', '', b.texto);
        case 'subtitulo': return el('h3', '', b.texto);
        case 'paragrafo': return inline(el('p'), b.texto);
        case 'lista': { const l = el(b.ordenada ? 'ol' : 'ul'); b.itens.forEach(i => l.appendChild(inline(el('li'), i))); return l; }
        case 'citacao': { const q = el('blockquote'); q.appendChild(el('p', '', b.texto)); if (b.fonte) q.appendChild(el('cite', '', '— ' + b.fonte)); return q; }
        case 'caixa': { const c = el('div', 'jr-caixa'); c.appendChild(el('i', 'ph ph-lightbulb')); const d = el('div'); d.append(el('b', '', b.titulo || 'Você sabia?'), inline(el('p'), b.texto)); c.appendChild(d); return c; }
        default: return el('span');
      }
    }
  
    async function artigo(id) {
      ver('artigo'); const meu = ++ticket, raiz = $('#jrArtigo'); raiz.textContent = '';
      let a;
      try { a = await api('/artigos/' + id); } catch (er) {
        if (meu !== ticket) return; const v = el('a', 'jr-btn', 'Voltar ao Journal'); v.href = '#/';
        raiz.append(el('p', 'jr-vazio', er.status === 404 ? 'Publicação não encontrada.' : er.message), v); return;
      }
      if (meu !== ticket) return;
      document.title = a.titulo + ' – NoteWave Journal';
      const c = cat(a.categoria);
      const mig = el('nav', 'jr-migalhas'); mig.setAttribute('aria-label', 'Você está em');
      const l1 = el('a', '', 'Journal'); l1.href = '#/'; const l2 = el('a', '', c.nome); l2.href = '#/explorar?cat=' + a.categoria;
      mig.append(l1, el('i', 'ph ph-caret-right'), l2);
      const h = el('header'), info = el('div', 'jr-info'), quem = el('div'), tempo = el('span', 'tempo');
      quem.append(el('b', '', nomeAutor(a)), document.createTextNode(dataBR(a.data)));
      tempo.append(el('i', 'ph ph-clock'), document.createTextNode(a.minutos + ' min de leitura'));
      info.append(el('span', 'jr-avatar', a.autor.charAt(0).toUpperCase()), quem, tempo);
      h.append(el('span', 'jr-tag', c.nome), el('h1', '', a.titulo), el('p', 'jr-lead', a.resumo), info);
      raiz.append(mig, h, capa(a));
  
      const t = el('div', 'jr-texto'); a.blocos.forEach(b => t.appendChild(bloco(b)));
      const secs = [...t.querySelectorAll('h2')];
      if (secs.length > 1) {
        const sm = el('nav', 'jr-sumario'), ol = el('ol'); sm.setAttribute('aria-label', 'Sumário'); sm.appendChild(el('h2', '', 'Neste artigo'));
        secs.forEach(x => { const li = el('li'), l = el('a', '', x.textContent); l.href = '#/artigo/' + a.id; l.onclick = e => { e.preventDefault(); x.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; li.appendChild(l); ol.appendChild(li); });
        sm.appendChild(ol); raiz.appendChild(sm);
      }
      raiz.appendChild(t);
  
      // Reações + favoritar
      const barra = el('div', 'jr-reagir'); raiz.appendChild(barra);
      function barraDesenhar() {
        barra.textContent = '';
        REACOES.forEach(([rid, emoji, nome]) => {
          const b = el('button', 'jr-btn' + (a.minhaReacao === rid ? ' ativo' : '')); b.type = 'button'; b.setAttribute('aria-pressed', a.minhaReacao === rid);
          b.append(document.createTextNode(emoji + ' ' + nome + ' '), el('b', '', a.reacoes[rid] || 0));
          b.onclick = async () => {
            if (!exigeLogin()) return;
            try { const r = await api('/artigos/' + a.id + '/reacao', { method: 'PUT', body: { tipo: rid } }); a.reacoes = r.reacoes; a.minhaReacao = r.minhaReacao; barraDesenhar(); }
            catch (er) { toast(er.message); }
          };
          barra.appendChild(b);
        });
        const fim = el('div', 'jr-fim'), bf = el('button', 'jr-btn' + (a.favorito ? ' ativo' : '')); bf.type = 'button';
        bf.append(el('i', 'ph' + (a.favorito ? '-fill' : '') + ' ph-bookmark-simple'), document.createTextNode(a.favorito ? 'Salvo nos favoritos' : 'Favoritar'));
        bf.onclick = async () => {
          if (!exigeLogin()) return;
          try { const r = await api('/artigos/' + a.id + '/favorito', { method: 'PUT' }); a.favorito = r.favorito; barraDesenhar(); atualizarContador(); } catch (er) { toast(er.message); }
        };
        fim.appendChild(bf);
        barra.appendChild(fim);
      }
      barraDesenhar();
  
      // Comentários
      const sc = el('section', 'jr-com'), lista = el('div', 'jr-com-lista'), tit = el('h2', '');
      sc.append(tit, lista);
      function comentariosDesenhar() {
        tit.textContent = 'Comentários (' + a.comentarios.length + ')'; lista.textContent = '';
        if (!a.comentarios.length) lista.appendChild(el('p', 'jr-sub', 'Ninguém comentou ainda. Comece a conversa!'));
        a.comentarios.forEach(cm => {
          const it = el('div', 'jr-coment'), corpo = el('div', 'jr-coment-corpo'), topo = el('div', 'jr-coment-topo');
          topo.append(el('b', '', '@' + cm.autor), el('span', '', dataBR(cm.data)));
          if (cm.meu) {
            const x = el('button', 'jr-mini'); x.type = 'button'; x.title = 'Apagar comentário'; x.setAttribute('aria-label', 'Apagar comentário'); x.appendChild(el('i', 'ph ph-trash'));
            x.onclick = async () => { try { await api('/comentarios/' + cm.id, { method: 'DELETE' }); a.comentarios = a.comentarios.filter(z => z.id !== cm.id); comentariosDesenhar(); } catch (er) { toast(er.message); } };
            topo.appendChild(x);
          }
          corpo.append(topo, el('p', '', cm.texto)); it.append(el('span', 'jr-avatar', cm.autor.charAt(0).toUpperCase()), corpo); lista.appendChild(it);
        });
      }
      comentariosDesenhar();
      if (logado()) {
        const fm = el('form', 'jr-comentar'), ta = el('textarea'), env = el('button', 'jr-btn primario'), erro = el('div', 'jr-erro');
        ta.maxLength = 1000; ta.placeholder = 'Escreva um comentário respeitoso…'; ta.setAttribute('aria-label', 'Seu comentário');
        env.type = 'submit'; env.append(el('i', 'ph ph-paper-plane-tilt'), document.createTextNode('Comentar'));
        fm.addEventListener('submit', async e => {
          e.preventDefault(); erro.textContent = ''; env.disabled = true;
          try {
            await api('/artigos/' + a.id + '/comentarios', { method: 'POST', body: { texto: ta.value } });
            const nova = await api('/artigos/' + a.id); a.comentarios = nova.comentarios; ta.value = ''; comentariosDesenhar();
          } catch (er) { erro.textContent = er.message; }
          env.disabled = false;
        });
        fm.append(ta, erro, env); sc.appendChild(fm);
      } else {
        const av = el('div', 'jr-aviso'), lk = el('a', '', 'Entre na sua conta'); lk.href = 'login.html';
        av.append(lk, document.createTextNode(' para comentar e reagir.')); sc.appendChild(av);
      }
      raiz.appendChild(sc);
    }
  
    // ---------- ROTAS (#/, #/explorar, #/comunidade, #/artigo/3, #/favoritos) ----------
    function rota() {
      const [cam, qs] = (location.hash || '#/').slice(1).split('?'), p = cam.split('/'), v = p[1] || '';
      params = new URLSearchParams(qs || '');
      if (v === 'explorar') explorar(false); else if (v === 'comunidade') explorar(true);
      else if (v === 'artigo') artigo(parseInt(p[2], 10)); else if (v === 'favoritos') favoritos();
      else home();
      const chave = v + '/' + (p[2] || '');
      if (chave !== ultima) { ultima = chave; const m = $('.main-content'); if (m) m.scrollTop = 0; window.scrollTo(0, 0); }
      atualizarContador();
    }
    const buscar = () => ir(hashLista(visao === 'explorar' ? baseLista : '#/explorar', { q: campo.value.trim() }), visao === 'explorar');
    $('#jrBusca').addEventListener('submit', e => { e.preventDefault(); clearTimeout(espera); buscar(); });
    campo.addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(buscar, 300); });
    window.addEventListener('hashchange', rota);
    document.addEventListener('scroll', e => { if (visao !== 'artigo') return; const z = e.target.scrollingElement || e.target, m = z.scrollHeight - z.clientHeight; if (m > 0) pb.style.width = Math.min(100, z.scrollTop / m * 100) + '%'; }, true);
    rota();
  })();