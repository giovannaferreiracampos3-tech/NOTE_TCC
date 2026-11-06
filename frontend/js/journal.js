/* NoteWave Journal – interface conectada ao backend (/api/journal).
   Login: o front lê o token em localStorage('token') e envia em "Authorization: Bearer".
   Se sua API está em outro endereço, defina antes deste script: window.NW_API = 'http://localhost:5000/api/journal' */
   (() => {
    const API = window.NW_API || 'http://localhost:5000/api/journal';
    const HOST = API.replace(/\/api\/journal\/?$/, '');
  
    // ---------------------------------------------------------------
    // IMAGENS DOS ARTIGOS QUE JÁ EXISTEM
    // Coloque as imagens em  imagem/journal/  e ligue cada uma ao id do artigo:
    //   id do artigo : 'caminho da imagem'
    // Artigos novos (publicados pelos usuários) já vêm com a imagem do banco.
    // ---------------------------------------------------------------
    const IMAGENS = {
      1: '../img/journal.01.jpg',
      2: '../img/journal.02.jpg',
      3: '../img/journal.03.jpg',
      4: '../img/journal.04.jpg',
      5: '../img/journal.05.jpg',
      6: '../img/journal.06.jpg',
      7: '../img/journal.07.jpg',
      8: '../img/journal.08.jpg',
      9: '../img/journal.09.jpg',
      10: '../img/journal.10.jpg',
      11: '../img/journal.11.jpg',
      12: '../img/journal.12.jpg',
      13: '../img/journal.13.jpg',
      14: '../img/journal.14.jpg',
      15: '../img/journal.15.jpg',
      16: '../img/journal.16.jpg',
      17: '../img/journal.17.jpg',
      18: '../img/journal.18.jpg',
      19: '../img/journal.19.png',
      20: '../img/journal.20.png',
      21: '../img/journal.21.png'
    };
  
    // Imagens do mascote Notinha (pasta imagem/)
    const NOTINHA = {
      ideia: '../img/notinha-ideia.jpg',
      festa: '../img/notinha-comemorando.jpg',
      lendo: '../img/notinha-lendo.jpg'
    };
  
    const CATS = [
      { id: 'teoria', nome: 'Teoria musical', icone: 'ph-music-notes' },
      { id: 'dicas', nome: 'Dicas de estudo', icone: 'ph-lightbulb' },
      { id: 'curiosidades', nome: 'Curiosidades', icone: 'ph-sparkle' },
      { id: 'resenhas', nome: 'Resenhas', icone: 'ph-headphones' },
      { id: 'relatos', nome: 'Relatos', icone: 'ph-chat-circle-text' },
      { id: 'criacoes', nome: 'Criações', icone: 'ph-paint-brush' },
      { id: 'acessiveis', nome: 'Música acessível', icone: 'ph-recycle' },
      { id: 'corpo', nome: 'Prática corporal', icone: 'ph-hands-clapping' },
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
  
    // ---------- FOTO DE PERFIL ----------
    // A API devolve caminho relativo (/uploads/...); aqui vira URL completa.
    const fotoUrl = p => !p ? '' : /^https?:|^data:|^blob:/.test(p) ? p : HOST + p;
    const fotoMinha = () => localStorage.getItem('noteWave_avatar') || '';
    // Bolinha com a foto; se não houver foto (ou falhar), mostra a inicial do nome
    function avatar(cls, nome, foto) {
      const ini = (nome || '?').charAt(0).toUpperCase();
      const s = el('span', cls, foto ? '' : ini);
      if (foto) {
        const im = el('img'); im.alt = '';
        im.onerror = () => { im.remove(); s.textContent = ini; };
        im.src = fotoUrl(foto); s.appendChild(im);
      }
      return s;
    }
  
    function toast(msg) { const t = el('div', 'jr-toast', msg); t.setAttribute('role', 'status'); document.body.appendChild(t); setTimeout(() => t.remove(), 3200); }
  
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
  
    // Capa: usa imagem quando existir; senão, o fundo colorido com ícone
    function capa(a) {
      const c = el('div', 'capa'); c.dataset.cat = a.categoria;
      c.appendChild(el('i', 'ph ' + cat(a.categoria).icone));
      const src = a.imagem || IMAGENS[a.id];
      if (src) {
        const im = el('img'); im.alt = ''; im.loading = 'lazy';
        im.onload = () => c.classList.add('com-imagem');
        im.onerror = () => im.remove();
        im.src = src; c.appendChild(im);
      }
      return c;
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
  
    // Apagar publicação (apaga também do banco: comentários, reações, favoritos e imagem)
    async function apagarArtigo(a) {
      if (!confirm('Apagar "' + a.titulo + '"?\n\nOs comentários e reações também serão apagados. Isso não pode ser desfeito.')) return false;
      try { await api('/artigos/' + a.id, { method: 'DELETE' }); toast('Publicação apagada.'); return true; }
      catch (er) { toast(er.message); return false; }
    }
    function delBtn(a, depois) {
      const b = el('button', 'jr-del'); b.type = 'button'; b.title = 'Apagar publicação'; b.setAttribute('aria-label', 'Apagar ' + a.titulo);
      b.appendChild(el('i', 'ph ph-trash'));
      b.onclick = async e => { e.preventDefault(); e.stopPropagation(); if (await apagarArtigo(a)) depois(); };
      return b;
    }
  
    function card(a, grande, comApagar) {
      const l = el('a', 'jr-card' + (grande ? ' jr-destaque' : '')); l.href = '#/artigo/' + a.id;
      const c = el('div', 'corpo'), ler = el('span', 'ler', 'Ler artigo'); ler.appendChild(el('i', 'ph ph-arrow-right'));
      c.append(el('h3', '', a.titulo), el('p', '', a.resumo), ler, meta(a));
      l.append(capa(a), c, favBtn(a));
      if (comApagar) l.appendChild(delBtn(a, meus));
      return l;
    }
    function chips(box, ativa, aoClicar) {
      box.textContent = '';
      [{ id: '', nome: 'Todas', icone: 'ph-squares-four' }, ...CATS].forEach(c => {
        const b = el('button', 'jr-chip' + (c.id === ativa ? ' ativo' : '')); b.type = 'button';
        b.append(el('i', 'ph ' + c.icone), document.createTextNode(c.nome)); b.onclick = () => aoClicar(c.id); box.appendChild(b);
      });
    }
    function vazio(box, msg, link, imagem) {
      const v = el('div', 'jr-vazio'), i = el('img', imagem ? 'mascote' : ''); i.src = imagem || '../img/nota.png'; i.alt = 'Notinha'; v.append(i, el('p', '', msg));
      if (link) { const a = el('a', 'jr-btn primario', link[0]); a.href = link[1]; v.appendChild(a); }
      box.appendChild(v);
    }
    const erroNa = (box, er) => { box.textContent = ''; vazio(box, er.message); };
  
    let visao = '', ultima = '', params = new URLSearchParams(''), baseLista = '#/explorar', ticket = 0, espera;
    const campo = $('#jrQ');
    const pb = el('div', 'jr-progresso'); document.body.appendChild(pb);
  
    function ver(id, nav) {
      visao = id; pb.style.width = '0'; document.title = 'Journal – NoteWave';
      ['home', 'explorar', 'artigo', 'favoritos', 'publicar', 'meus'].forEach(v => { $('#v-' + v).hidden = v !== id; });
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
  
    // ---------- EXPLORAR / COMUNIDADE ----------
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
  
    // ---------- MEUS POSTS ----------
    async function meus() {
      ver('meus'); const meu = ++ticket, box = $('#jrMeusLista'); box.textContent = '';
      if (!logado()) { $('#jrMeusContagem').textContent = ''; vazio(box, 'Entre na sua conta para ver suas publicações.', ['Entrar', 'login.html']); return; }
      $('#jrMeusContagem').textContent = 'Carregando…';
      try {
        const l = await api('/artigos?meus=1'); if (meu !== ticket) return;
        $('#jrMeusContagem').textContent = l.length + (l.length === 1 ? ' publicação sua' : ' publicações suas') + ' · toque num card para ler os comentários';
        if (!l.length) vazio(box, 'Você ainda não publicou nada. Que tal contar uma descoberta ou uma dica?', ['Escrever agora', '#/publicar'], NOTINHA.lendo);
        else l.forEach(a => box.appendChild(card(a, false, true)));
      } catch (er) { if (meu !== ticket) return; $('#jrMeusContagem').textContent = ''; erroNa(box, er); }
    }
  
    // ---------- PUBLICAR ----------
    // Converte o texto simples do editor em blocos (o mesmo formato dos artigos da equipe)
    function textoParaBlocos(texto) {
      const out = [];
      texto.replace(/\r/g, '').replace(/^(#{2,3} .*)$/gm, '\n\n$1\n\n').split(/\n{2,}/).map(s => s.trim()).filter(Boolean).slice(0, 80).forEach(bl => {
        const linhas = bl.split('\n').map(l => l.trim()).filter(Boolean);
        if (bl.startsWith('### ')) out.push({ tipo: 'subtitulo', texto: bl.slice(4).trim() });
        else if (bl.startsWith('## ')) out.push({ tipo: 'titulo', texto: bl.slice(3).trim() });
        else if (linhas.every(l => /^[-•]\s+/.test(l))) out.push({ tipo: 'lista', ordenada: false, itens: linhas.map(l => l.replace(/^[-•]\s+/, '')) });
        else if (linhas.every(l => /^\d+[.)]\s+/.test(l))) out.push({ tipo: 'lista', ordenada: true, itens: linhas.map(l => l.replace(/^\d+[.)]\s+/, '')) });
        else if (bl.startsWith('> ')) out.push({ tipo: 'citacao', texto: linhas.map(l => l.replace(/^>\s?/, '')).join(' ') });
        else out.push({ tipo: 'paragrafo', texto: linhas.join(' ') });
      });
      return out;
    }
  
    // Reduz a imagem no navegador (máx. 1200 px de largura, JPEG) antes de enviar
    function redimensionar(file, larg = 1200) {
      return new Promise((ok, no) => {
        const url = URL.createObjectURL(file), im = new Image();
        im.onload = () => {
          const f = Math.min(1, larg / im.width), c = document.createElement('canvas');
          c.width = Math.round(im.width * f); c.height = Math.round(im.height * f);
          const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', 0.82));
        };
        im.onerror = () => { URL.revokeObjectURL(url); no(new Error('Não consegui ler essa imagem. Tente outro arquivo (JPG, PNG ou WEBP).')); };
        im.src = url;
      });
    }
  
    // ---- ajudas do editor de texto ----
    function envolver(ta, a, b, ph) {
      const s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e) || ph;
      ta.setRangeText(a + sel + b, s, e, 'select'); ta.focus(); ta.dispatchEvent(new Event('input'));
    }
    function prefixar(ta, pre) {
      const v = ta.value, pos = ta.selectionStart, ini = v.lastIndexOf('\n', pos - 1) + 1;
      ta.setRangeText(pre, ini, ini, 'end'); ta.focus(); ta.dispatchEvent(new Event('input'));
    }
    function secao(num, titulo, sub, ...filhos) {
      const s = el('section', 'jr-bloco'), h = el('header', 'jr-bloco-topo'), t = el('div');
      t.append(el('h3', '', titulo)); if (sub) t.append(el('p', '', sub));
      h.append(el('span', 'jr-num', String(num)), t); s.append(h, ...filhos); return s;
    }
    function contador(ctl) {
      const c = el('small', 'jr-contador'); const atu = () => { c.textContent = ctl.value.length + ' / ' + ctl.maxLength; };
      ctl.addEventListener('input', atu); atu(); return c;
    }
  
    // Tela de comemoração depois de publicar
    function comemorar(id) {
      const ov = el('div', 'jr-sucesso'), cx = el('div', 'jr-sucesso-caixa'), im = el('img');
      im.src = '../img/notinha-feliz.png'; im.alt = 'Notinha comemorando';
      cx.append(im, el('h2', '', 'Publicado!'), el('p', '', 'Seu texto já está no ar para a comunidade.'));
      ov.appendChild(cx); document.body.appendChild(ov);
      let fechado = false;
      const ir_ = () => { if (fechado) return; fechado = true; ov.remove(); ir('#/artigo/' + id); };
      ov.onclick = ir_; setTimeout(ir_, 2200);
    }
  
    function publicar() {
      ver('publicar'); ++ticket;
      const raiz = $('#jrPublicar'); raiz.textContent = '';
  
      // Cabeçalho com o Notinha surfando
      const hero = el('section', 'jr-hero'), ht = el('div', 'jr-hero-txt'), hi = el('img', 'jr-hero-img');
      ht.append(el('span', 'jr-hero-tag', 'Comunidade NoteWave'), el('h2', '', 'Conte sua história com a música'),
        el('p', '', 'Uma dica, uma descoberta ou um relato: o que você escrever pode ajudar outro estudante a aprender.'));
      hi.src = '../img/notinha-surf.png'; hi.alt = 'Notinha surfando em uma onda';
      hero.append(ht, hi); raiz.appendChild(hero);
  
      if (!logado()) { vazio(raiz, 'Entre na sua conta para publicar.', ['Entrar', 'login.html']); return; }
  
      let imagemData = '', categoria = 'teoria';
      const grade = el('div', 'jr-pub'), fm = el('form', 'jr-form'), lateral = el('aside', 'jr-lateral');
      fm.noValidate = true;
  
      // ---- 1. Título + categoria ----
      const titulo = el('input'); titulo.type = 'text'; titulo.maxLength = 120; titulo.placeholder = 'Ex.: Como eu aprendi a ler a Clave de Fá';
      titulo.setAttribute('aria-label', 'Título');
      const tw = el('div', 'jr-campo'); tw.append(titulo, contador(titulo));
      const cats = el('div', 'jr-chips jr-cats-pick'); cats.setAttribute('role', 'radiogroup'); cats.setAttribute('aria-label', 'Categoria');
      CATS.filter(c => c.id !== 'notinha').forEach(c => {
        const b = el('button', 'jr-chip' + (c.id === categoria ? ' ativo' : '')); b.type = 'button';
        b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', c.id === categoria);
        b.append(el('i', 'ph ' + c.icone), document.createTextNode(c.nome));
        b.onclick = () => {
          categoria = c.id;
          [...cats.children].forEach(x => { x.classList.toggle('ativo', x === b); x.setAttribute('aria-checked', x === b); });
          atualizar();
        };
        cats.appendChild(b);
      });
      const s1 = secao(1, 'Título e categoria', 'Um título claro chama mais leitores.', tw, cats);
  
      // ---- 2. Capa ----
      const arq = el('input'); arq.type = 'file'; arq.accept = 'image/jpeg,image/png,image/webp'; arq.hidden = true;
      const zona = el('label', 'jr-zona'); zona.tabIndex = 0;
      const zi = el('i', 'ph ph-image-square');
      zona.append(zi, el('b', '', 'Arraste uma imagem ou clique aqui'), el('small', '', 'JPG, PNG ou WEBP · ela é reduzida automaticamente'), arq);
      const previa = el('div', 'jr-capa-previa'); previa.hidden = true;
      const rem = el('button', 'jr-btn perigo', 'Remover imagem'); rem.type = 'button';
      rem.prepend(el('i', 'ph ph-trash'));
      async function aceitarArquivo(f) {
        if (!f) return;
        if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { toast('Use uma imagem JPG, PNG ou WEBP.'); return; }
        if (f.size > 8 * 1024 * 1024) { toast('A imagem é grande demais (máximo 8 MB).'); return; }
        try {
          imagemData = await redimensionar(f); previa.textContent = '';
          const im = el('img'); im.src = imagemData; im.alt = 'Prévia da capa'; previa.append(im, rem);
          previa.hidden = false; zona.hidden = true; atualizar();
        } catch (er) { toast(er.message); }
      }
      arq.addEventListener('change', () => { aceitarArquivo(arq.files[0]); arq.value = ''; });
      zona.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); arq.click(); } });
      ['dragenter', 'dragover'].forEach(ev => zona.addEventListener(ev, e => { e.preventDefault(); zona.classList.add('arrastando'); }));
      ['dragleave', 'drop'].forEach(ev => zona.addEventListener(ev, e => { e.preventDefault(); zona.classList.remove('arrastando'); }));
      zona.addEventListener('drop', e => aceitarArquivo(e.dataTransfer.files[0]));
      rem.onclick = () => { imagemData = ''; previa.textContent = ''; previa.hidden = true; zona.hidden = false; atualizar(); };
      const s2 = secao(2, 'Imagem de capa', 'Opcional, mas deixa o artigo com cara de artigo.', zona, previa);
  
      // ---- 3. Resumo ----
      const resumo = el('textarea'); resumo.maxLength = 200; resumo.rows = 3;
      resumo.placeholder = 'Uma ou duas frases que apareçam no card da publicação.'; resumo.setAttribute('aria-label', 'Resumo');
      const rw = el('div', 'jr-campo'); rw.append(resumo, contador(resumo));
      const s3 = secao(3, 'Resumo', 'É o que as pessoas leem antes de abrir o texto.', rw);
  
      // ---- 4. Texto ----
      const conteudo = el('textarea'); conteudo.maxLength = 8000; conteudo.rows = 14; conteudo.setAttribute('aria-label', 'Texto');
      conteudo.placeholder = 'Escreva aqui seu texto.\n\nDeixe uma linha em branco para começar um novo parágrafo.';
      const barra = el('div', 'jr-barra'); barra.setAttribute('role', 'toolbar'); barra.setAttribute('aria-label', 'Formatação');
      [['ph-text-b', 'Negrito', () => envolver(conteudo, '**', '**', 'texto')],
       ['ph-text-italic', 'Itálico', () => envolver(conteudo, '*', '*', 'texto')],
       ['ph-text-h-two', 'Título de seção', () => prefixar(conteudo, '## ')],
       ['ph-list-bullets', 'Lista', () => prefixar(conteudo, '- ')],
       ['ph-quotes', 'Citação', () => prefixar(conteudo, '> ')]
      ].forEach(([ic, nome, fn]) => {
        const b = el('button', 'jr-ferr'); b.type = 'button'; b.title = nome; b.setAttribute('aria-label', nome);
        b.appendChild(el('i', 'ph ' + ic)); b.onclick = fn; barra.appendChild(b);
      });
      const tw2 = el('div', 'jr-campo'); tw2.append(barra, conteudo, contador(conteudo),
        el('small', 'jr-dica', 'Deixe uma linha em branco entre os parágrafos. Os botões acima inserem a formatação para você.'));
      const s4 = secao(4, 'Seu texto', null, tw2);
  
      // ---- Combinado + enviar ----
      const regras = el('div', 'jr-regras'); regras.append(el('b', '', 'Combinado da comunidade'));
      const ul = el('ul');
      ['Fale de música, estudo e cultura com respeito.', 'Sem xingamentos, discriminação, conteúdo sexual ou violento.',
       'Sem links, telefones, e-mails ou propaganda.', 'Suas publicações são verificadas automaticamente e você pode apagá-las quando quiser.']
        .forEach(t => ul.appendChild(el('li', '', t)));
      regras.appendChild(ul);
      const erro = el('div', 'jr-erro'); erro.setAttribute('role', 'alert');
      const env = el('button', 'jr-btn primario grande'); env.type = 'submit';
      env.append(el('i', 'ph ph-paper-plane-tilt'), document.createTextNode('Publicar'));
      fm.append(s1, s2, s3, s4, regras, erro, env);
  
      // ---- Lateral: prévia ao vivo + lista de requisitos + Notinha ----
      const pv = el('div', 'jr-card jr-previa-card');
      const cp = el('section', 'jr-lat-cartao'); cp.append(el('h3', '', 'Como vai aparecer'), pv);
      const lista = el('ul', 'jr-checks');
      const itens = [['t', 'Título com pelo menos 5 caracteres'], ['r', 'Resumo com pelo menos 20 caracteres'], ['x', 'Texto com pelo menos 200 caracteres']]
        .map(([k, txt]) => { const li = el('li'); li.dataset.k = k; li.append(el('i', 'ph ph-circle'), document.createTextNode(txt)); lista.appendChild(li); return li; });
      const cc = el('section', 'jr-lat-cartao'); cc.append(el('h3', '', 'Antes de publicar'), lista);
      const dica = el('section', 'jr-lat-cartao jr-notinha-dica'), di = el('img');
      di.src = '../img/notinha-piano.png'; di.alt = 'Notinha tocando piano';
      const dt = el('div'); dt.append(el('b', '', 'Dica do Notinha'), el('p', '', 'Conte uma experiência sua: textos pessoais costumam ser os mais lidos e comentados.'));
      dica.append(di, dt);
      lateral.append(cp, cc, dica);
  
      function valido() {
        return { t: titulo.value.trim().length >= 5, r: resumo.value.trim().length >= 20, x: conteudo.value.trim().length >= 200 };
      }
      function atualizar() {
        const v = valido();
        itens.forEach(li => { const ok = v[li.dataset.k]; li.classList.toggle('ok', ok); li.firstChild.className = 'ph ' + (ok ? 'ph-check-circle' : 'ph-circle'); });
        const palavras = conteudo.value.trim() ? conteudo.value.trim().split(/\s+/).length : 0;
        const a = {
          categoria, titulo: titulo.value.trim() || 'O título da sua publicação', resumo: resumo.value.trim() || 'O resumo aparece aqui, no card.',
          autor: 'você', origem: 'comunidade', data: new Date().toISOString(), minutos: Math.max(1, Math.round(palavras / 200)),
          totalComentarios: 0, totalReacoes: 0, imagem: imagemData || null
        };
        pv.textContent = '';
        const c = el('div', 'corpo'); c.append(el('h3', '', a.titulo), el('p', '', a.resumo), meta(a));
        pv.append(capa(a), c);
      }
      [titulo, resumo, conteudo].forEach(c => c.addEventListener('input', atualizar));
      atualizar();
  
      fm.addEventListener('submit', async e => {
        e.preventDefault(); erro.textContent = '';
        const t = titulo.value.trim(), r = resumo.value.trim(), c = conteudo.value.trim(), v = valido();
        if (!v.t) { erro.textContent = 'Escreva um título com pelo menos 5 caracteres.'; titulo.focus(); return; }
        if (!v.r) { erro.textContent = 'O resumo precisa ter pelo menos 20 caracteres.'; resumo.focus(); return; }
        if (!v.x) { erro.textContent = 'O texto está curto. Escreva pelo menos 200 caracteres.'; conteudo.focus(); return; }
        env.disabled = true; env.lastChild.textContent = 'Publicando…';
        try {
          const res = await api('/artigos', { method: 'POST', body: { titulo: t, resumo: r, categoria, blocos: textoParaBlocos(c), imagem: imagemData || null } });
          comemorar(res.id);
        } catch (er) { erro.textContent = er.message; env.disabled = false; env.lastChild.textContent = 'Publicar'; }
      });
  
      grade.append(fm, lateral); raiz.appendChild(grade);
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
      info.append(avatar('jr-avatar', a.autor, a.meu ? fotoMinha() : a.autorFoto), quem, tempo);
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
  
      // Reações + favoritar (+ apagar, se o artigo for seu)
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
        if (a.meu) {
          const bd = el('button', 'jr-btn perigo'); bd.type = 'button'; bd.append(el('i', 'ph ph-trash'), document.createTextNode('Apagar'));
          bd.onclick = async () => { if (await apagarArtigo(a)) ir('#/meus'); };
          fim.appendChild(bd);
        }
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
          if (cm.meu || a.meu) { // autor do comentário OU dono do artigo pode apagar
            const x = el('button', 'jr-mini'); x.type = 'button'; x.title = 'Apagar comentário'; x.setAttribute('aria-label', 'Apagar comentário'); x.appendChild(el('i', 'ph ph-trash'));
            x.onclick = async () => { try { await api('/comentarios/' + cm.id, { method: 'DELETE' }); a.comentarios = a.comentarios.filter(z => z.id !== cm.id); comentariosDesenhar(); } catch (er) { toast(er.message); } };
            topo.appendChild(x);
          }
          corpo.append(topo, el('p', '', cm.texto)); it.append(avatar('jr-avatar', cm.autor, cm.meu ? fotoMinha() : cm.autorFoto), corpo); lista.appendChild(it);
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
  
    // ---------- ROTAS (#/, #/explorar, #/comunidade, #/artigo/3, #/favoritos, #/publicar, #/meus) ----------
    function rota() {
      const [cam, qs] = (location.hash || '#/').slice(1).split('?'), p = cam.split('/'), v = p[1] || '';
      params = new URLSearchParams(qs || '');
      if (v === 'explorar') explorar(false); else if (v === 'comunidade') explorar(true);
      else if (v === 'artigo') artigo(parseInt(p[2], 10)); else if (v === 'favoritos') favoritos();
      else if (v === 'publicar') publicar(); else if (v === 'meus') meus();
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