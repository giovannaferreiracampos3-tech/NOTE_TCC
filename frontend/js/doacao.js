/* NoteWave Doações – interface conectada ao backend Node.js/MySQL.
   Login: token em localStorage('token'), enviado em "Authorization: Bearer".
   API em outro endereço? Defina antes deste script: window.NW_API = 'https://note-tcc-backend.vercel.app/api'

   CONTRATO DA API (o backend precisa responder assim; IDs de usuário nunca vêm do front):
   GET    /donations?q&categoria&status&cidade&pagina&limite&minhas=1   -> { itens:[{id,nome,categoria,resumo,autor,autorFoto?,data,status,totalComentarios,imagem,totalInteressados?,pendentes?}], total, pagina, paginas }
   GET    /donations/resumo                                           -> { disponiveis, emProcesso, concluidas }
   GET    /donations/:id                                              -> { id,nome,categoria,descricao,cidade,autor,autorFoto?,data,status,meu,imagens:[{id,url}],meuInteresse:{id,status,contatoLiberado}|null,comentarios:[{id,autor,autorFoto?,texto,data,meu,paiId}] }
   POST   /donations (multipart)  campos: nome,categoria,descricao,cidade,telefone,verificacaoId,confirmacoes(JSON), imagens[]   -> { id }
   PUT    /donations/:id (multipart) mesmos campos + manter(JSON com ids das imagens mantidas); telefone opcional
   PUT    /donations/:id/status  { status: 'disponivel'|'em_processo'|'doada' }
   DELETE /donations/:id
   POST   /donations/:id/comments { texto, paiId? }      DELETE /donation-comments/:id
   POST   /donations/:id/interests                       -> { id }
   GET    /donations/:id/interests (só o dono)           -> [{id,usuario,usuarioFoto?,data,status:'pendente'|'aceito'|'recusado',contatoLiberado}]
   PUT    /donation-interests/:id { acao:'aceitar'|'recusar' }
   POST   /donation-interests/:id/contact-consent { autorizar:true|false }   (false = revogar)
   GET    /donation-interests/:id/contact                -> { telefone }  (só o interessado autorizado)
   POST   /donations/:id/reports { motivo, descricao, comentarioId? }
   POST   /donations/phone/send-code { telefone }        POST /donations/phone/verify-code { telefone, codigo } -> { verificacaoId }
   GET    /donation-notifications                        -> [{id,texto,data,lida,doacaoId}]
   PUT    /donation-notifications/lidas                  PUT /donation-notifications/:id/lida
*/
(() => {
  'use strict';
  const BASE = window.NW_API || 'https://note-tcc-backend.vercel.app/api';
  const HOST = BASE.replace(/\/api\/?$/, '');
  const MASCOTE = '../img/viola.png';
  const LIM = { fotos: 6, mb: 5, nome: 80, desc: 1000, descMin: 20, coment: 500 };

  const CATS = [
    { id: 'corda', nome: 'Instrumentos de corda', curto: 'Cordas', icone: 'ph-guitar' },
    { id: 'sopro', nome: 'Instrumentos de sopro', curto: 'Sopro', icone: 'ph-wind' },
    { id: 'percussao', nome: 'Instrumentos de percussão', curto: 'Percussão', icone: 'ph-metronome' },
    { id: 'teclas', nome: 'Instrumentos de teclas', curto: 'Teclas', icone: 'ph-piano-keys' },
    { id: 'acessorios', nome: 'Acessórios musicais', curto: 'Acessórios', icone: 'ph-headphones' },
    { id: 'outros', nome: 'Outros', curto: 'Outros', icone: 'ph-star' }
  ];
  const STATUS = { disponivel: ['Disponível', 'ok'], em_processo: ['Em processo', 'proc'], doada: ['Doada', 'fim'] };
  const MOTIVOS = [['venda', 'Tentativa de venda'], ['cobranca', 'Cobrança indevida'], ['falsa', 'Informações falsas'],
    ['diferente', 'Instrumento diferente do anunciado'], ['inadequado', 'Conteúdo inadequado'], ['golpe', 'Suspeita de golpe'],
    ['dados', 'Divulgação indevida de dados pessoais'], ['outros', 'Outros']];
  const CONFIRMA = ['Estou disponibilizando este instrumento gratuitamente.',
    'Não estou tentando vender, cobrar ou solicitar qualquer pagamento.',
    'As informações e fotografias correspondem ao instrumento anunciado.',
    'Estou ciente das regras de utilização do NoteWave Doações.',
    'Autorizo o NoteWave a confirmar meu celular por SMS e a compartilhá-lo somente com a pessoa que eu aceitar.'];
  const SEGURANCA = 'Combine entregas em locais públicos e com acompanhamento de um responsável, principalmente quando houver menores de idade. Nunca envie dinheiro.';

  const cat = id => CATS.find(c => c.id === id) || CATS[5];
  const $ = s => document.querySelector(s);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const dataBR = iso => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const logado = () => !!localStorage.getItem('token');
  const url = p => !p ? '' : /^https?:|^data:|^blob:/.test(p) ? p : HOST + p;
  const root = $('#dcRoot');
  let ticket = 0;

  function toast(msg, ms) { const t = el('div', 'dc-toast', msg); t.setAttribute('role', 'status'); document.body.appendChild(t); setTimeout(() => t.remove(), ms || 3200); }

  async function api(caminho, o = {}) {
    const h = {}, tk = localStorage.getItem('token');
    if (tk) h.Authorization = 'Bearer ' + tk;
    let body;
    if (o.form) body = o.form; else if (o.body) { h['Content-Type'] = 'application/json'; body = JSON.stringify(o.body); }
    let r;
    try { r = await fetch(BASE + caminho, { method: o.method || 'GET', headers: h, body }); }
    catch (e) { throw new Error('Não foi possível falar com o servidor. Verifique se ele está ligado.'); }
    let d = {}; try { d = await r.json(); } catch (e) { /* sem corpo */ }
    if (!r.ok) throw Object.assign(new Error(d.erro || 'Algo deu errado. Tente de novo.'), { status: r.status });
    return d;
  }
  // Guarda a tela atual para voltar depois do login (a página de login deve ler 'nw_retorno')
  function guardarRetorno() { try { sessionStorage.setItem('nw_retorno', 'doacao.html' + location.hash); } catch (e) { /* ignora */ } }
  function exigeLogin() { if (logado()) return true; guardarRetorno(); toast('Entre na sua conta para fazer isso.'); setTimeout(() => { location.href = 'login.html'; }, 1400); return false; }
  async function espera(btn, fn) { if (btn.disabled) return; btn.disabled = true; try { return await fn(); } finally { btn.disabled = false; } }
  const inicial = n => (n || '?').charAt(0).toUpperCase();

  // ---------- FOTO DE PERFIL ----------
  const fotoMinha = () => localStorage.getItem('noteWave_avatar') || '';
  // Bolinha com a foto; se não houver foto (ou falhar), mostra a inicial do nome
  function avatar(nome, foto) {
    const s = el('span', 'dc-avatar', foto ? '' : inicial(nome));
    if (foto) {
      const im = el('img'); im.alt = '';
      im.onerror = () => { im.remove(); s.textContent = inicial(nome); };
      im.src = url(foto); s.appendChild(im);
    }
    return s;
  }

  function pill(s) { const [t, c] = STATUS[s] || STATUS.disponivel; const p = el('span', 'dc-pill ' + c); p.append(el('span', 'dc-ponto'), document.createTextNode(t)); return p; }
  function vazio(box, msg, link, mascote) {
    const v = el('div', 'dc-vazio'), i = el('img'); i.src = MASCOTE; i.alt = ''; v.append(i, el('p', '', msg));
    if (link) { const a = el('a', 'dc-btn primario', link[0]); a.href = link[1]; v.appendChild(a); }
    box.appendChild(v);
  }
  function modal(titulo, corpo) {
    const ov = el('div', 'dc-modal dc'), cx = el('div', 'dc-modal-caixa');
    cx.setAttribute('role', 'dialog'); cx.setAttribute('aria-modal', 'true'); cx.setAttribute('aria-label', titulo);
    cx.append(el('h2', '', titulo), corpo); ov.appendChild(cx);
    const esc = e => { if (e.key === 'Escape') fechar(); };
    const fechar = () => { ov.remove(); document.removeEventListener('keydown', esc); };
    document.addEventListener('keydown', esc);
    ov.addEventListener('mousedown', e => { if (e.target === ov) fechar(); });
    document.body.appendChild(ov); return fechar;
  }
  function contador(ctl) { const c = el('small', 'dc-contador'); const a = () => { c.textContent = (ctl.maxLength - ctl.value.length) + ' caracteres restantes'; }; ctl.addEventListener('input', a); a(); return c; }

  // ---------- CARTÃO ----------
  function card(d, gerir) {
    const c = el('article', 'dc-card'), capa = el('div', 'dc-capa');
    capa.appendChild(el('i', 'ph ' + cat(d.categoria).icone));
    if (d.imagem) { const im = el('img'); im.loading = 'lazy'; im.alt = 'Foto de ' + d.nome; im.onerror = () => im.remove(); im.src = url(d.imagem); capa.appendChild(im); }
    capa.appendChild(pill(d.status));
    const k = el('div', 'dc-cat'); k.append(el('i', 'ph ' + cat(d.categoria).icone), document.createTextNode(cat(d.categoria).nome));
    const m = el('div', 'dc-meta'), au = el('span');
    // Em "Minhas doações" (gerir = true) o autor é o próprio usuário
    au.append(avatar(d.autor, d.autorFoto || (gerir ? fotoMinha() : '')), document.createTextNode(d.autor));
    const dt = el('span'); dt.append(el('i', 'ph ph-calendar-blank'), document.createTextNode(dataBR(d.data)));
    const cm = el('span'); cm.append(el('i', 'ph ph-chat-circle'), document.createTextNode(d.totalComentarios));
    cm.setAttribute('aria-label', d.totalComentarios + ' comentários'); m.append(au, dt, cm);
    const ver = el('a', 'dc-btn primario bloco', 'Ver publicação'); ver.href = '#/doacao/' + d.id; ver.appendChild(el('i', 'ph ph-arrow-right'));
    const corpo = el('div', 'dc-corpo'); corpo.append(el('h3', '', d.nome), k, el('p', 'dc-resumo', d.resumo), m);
    if (gerir) {
      const ln = el('p', 'dc-sub', (d.totalInteressados || 0) + ' interessado(s)' + (d.pendentes ? ' · ' + d.pendentes + ' aguardando resposta' : ''));
      const g = el('div', 'dc-gerir'), ed = el('a', 'dc-btn peq', 'Editar'); ed.href = '#/editar/' + d.id;
      g.appendChild(ed);
      if (d.status !== 'doada') {
        const fim = el('button', 'dc-btn peq', 'Marcar como doada'); fim.type = 'button';
        fim.onclick = () => espera(fim, async () => { if (await marcarDoada(d)) minhas(); });
        g.appendChild(fim);
      }
      const ex = el('button', 'dc-btn peq perigo', 'Excluir'); ex.type = 'button';
      ex.onclick = () => espera(ex, async () => { if (await excluir(d)) minhas(); });
      g.appendChild(ex); corpo.append(ln, g);
    }
    corpo.appendChild(ver); c.append(capa, corpo); return c;
  }
  async function marcarDoada(d) {
    if (!confirm('Marcar "' + d.nome + '" como doada?\n\nNovas solicitações serão bloqueadas e a publicação sairá da lista de disponíveis.')) return false;
    try { await api('/donations/' + d.id + '/status', { method: 'PUT', body: { status: 'doada' } }); toast('A doação foi marcada como concluída.'); return true; }
    catch (er) { toast(er.message); return false; }
  }
  async function excluir(d) {
    if (!confirm('Excluir "' + d.nome + '"?\n\nOs comentários e solicitações desta publicação deixarão de aparecer. Isso não pode ser desfeito.')) return false;
    try { await api('/donations/' + d.id, { method: 'DELETE' }); toast('Publicação excluída.'); return true; }
    catch (er) { toast(er.message); return false; }
  }

  // ---------- INÍCIO ----------
  const F = { q: '', cat: '', status: '', cidade: '', pagina: 1 };
  function home() {
    const meu = ++ticket; root.textContent = '';
    // Apresentação
    const hero = el('section', 'dc-hero'), ht = el('div'), h1 = el('h1');
    h1.append(el('i', 'ph ph-heart'), document.createTextNode('NoteWave Doações'));
    const bt = el('a', 'dc-btn primario grande', 'Publicar uma doação'); bt.href = '#/publicar'; bt.prepend(el('i', 'ph ph-upload-simple'));
    ht.append(h1, el('h2', '', 'Um instrumento pode ser o começo de uma grande história musical.'),
      el('p', '', 'O NoteWave Doações conecta pessoas que desejam compartilhar instrumentos musicais gratuitamente com estudantes que sonham em aprender. Aqui, cada doação representa uma nova oportunidade de fazer música.'), bt);
    const hi = el('img'); hi.src = MASCOTE; hi.alt = 'Notinha, o mascote do NoteWave'; hero.append(ht, hi);
    const stats = el('div', 'dc-stats'); root.append(hero, stats);
    api('/donations/resumo').then(r => {
      if (meu !== ticket) return;
      [['disponiveis', 'Instrumentos disponíveis', 'ph-hand-heart'], ['emProcesso', 'Em processo de doação', 'ph-hourglass-medium'], ['concluidas', 'Doações concluídas', 'ph-check-circle']].forEach(([k, t, ic]) => {
        const s = el('div', 'dc-stat'), tx = el('div'); tx.append(el('b', '', String(r[k] || 0)), el('span', '', t)); s.append(el('i', 'ph ' + ic), tx); stats.appendChild(s);
      });
    }).catch(() => { stats.remove(); });

    // Pesquisa e filtros
    const bar = el('section', 'dc-filtros'); bar.setAttribute('aria-label', 'Pesquisa e filtros');
    const busca = el('label', 'dc-busca'), inp = el('input'); inp.type = 'search'; inp.placeholder = 'Qual instrumento você está procurando?'; inp.setAttribute('aria-label', 'Buscar instrumento'); inp.value = F.q; inp.autocomplete = 'off';
    busca.append(el('i', 'ph ph-magnifying-glass'), inp);
    const cd = el('label', 'dc-cidade'), ci = el('input'); ci.type = 'search'; ci.placeholder = 'Município (opcional)'; ci.setAttribute('aria-label', 'Filtrar por município'); ci.value = F.cidade; ci.maxLength = 60;
    cd.append(el('i', 'ph ph-map-pin'), ci);
    const l1 = el('div', 'dc-linha'); l1.append(busca, cd);
    const cats = el('div', 'dc-chips'), sts = el('div', 'dc-chips');
    cats.setAttribute('role', 'group'); cats.setAttribute('aria-label', 'Categorias'); sts.setAttribute('role', 'group'); sts.setAttribute('aria-label', 'Situação');
    const lim = el('button', 'dc-btn peq', 'Limpar filtros'); lim.type = 'button'; lim.prepend(el('i', 'ph ph-arrows-clockwise'));
    const botoes = [];
    CATS.forEach(c => { const b = el('button', 'dc-chip'); b.type = 'button'; b.append(el('i', 'ph ' + c.icone), document.createTextNode(c.curto)); b.onclick = () => { F.cat = F.cat === c.id ? '' : c.id; marcar(); carregar(true); }; b.dataset.k = 'cat:' + c.id; cats.appendChild(b); botoes.push(b); });
    [['', 'Todos'], ['disponivel', 'Disponíveis'], ['em_processo', 'Em processo'], ['doada', 'Doadas']].forEach(([id, nome]) => {
      const b = el('button', 'dc-chip so-texto'); b.type = 'button';
      if (id === 'disponivel') b.appendChild(el('span', 'dc-ponto ok')); if (id === 'em_processo') b.appendChild(el('span', 'dc-ponto proc'));
      b.appendChild(document.createTextNode(nome)); b.onclick = () => { F.status = id; marcar(); carregar(true); }; b.dataset.k = 'st:' + id; sts.appendChild(b); botoes.push(b);
    });
    const l2 = el('div', 'dc-linha'); l2.append(sts, lim);
    function marcar() {
      botoes.forEach(b => { const [t, v] = b.dataset.k.split(':'); const on = t === 'cat' ? F.cat === v : F.status === v; b.classList.toggle('ativo', on); b.setAttribute('aria-pressed', on); });
      lim.hidden = !(F.q || F.cat || F.status || F.cidade);
    }
    let esp; const atrasar = () => { clearTimeout(esp); esp = setTimeout(() => { F.q = inp.value.trim(); F.cidade = ci.value.trim(); marcar(); carregar(true); }, 300); };
    inp.addEventListener('input', atrasar); ci.addEventListener('input', atrasar);
    lim.onclick = () => { Object.assign(F, { q: '', cat: '', status: '', cidade: '' }); inp.value = ''; ci.value = ''; marcar(); carregar(true); };
    bar.append(l1, cats, l2);
    const cont = el('p', 'dc-sub'), grid = el('div', 'dc-grid'), mais = el('button', 'dc-btn dc-mais', 'Carregar mais'); mais.type = 'button'; mais.hidden = true;
    grid.setAttribute('aria-live', 'polite'); root.append(bar, cont, grid, mais); marcar();

    async function carregar(reset) {
      const t = ++ticket; if (reset) { F.pagina = 1; grid.textContent = ''; }
      cont.textContent = 'Carregando…'; mais.hidden = true;
      const qs = new URLSearchParams({ q: F.q, categoria: F.cat, status: F.status, cidade: F.cidade, pagina: F.pagina, limite: 12 });
      try {
        const r = await api('/donations?' + qs); if (t !== ticket) return;
        cont.textContent = r.total + (r.total === 1 ? ' instrumento encontrado' : ' instrumentos encontrados');
        if (!r.total) {
          cont.textContent = '';
          vazio(grid, (F.q || F.cat || F.status || F.cidade) ? 'Não encontrei nenhum instrumento com esses filtros. Tente outra palavra ou limpe os filtros.'
            : 'Ainda não temos instrumentos disponíveis para doação. Que tal compartilhar essa iniciativa e ajudar alguém a começar sua jornada musical?', ['Publicar uma doação', '#/publicar']);
        } else r.itens.forEach(d => grid.appendChild(card(d)));
        mais.hidden = !(r.pagina < r.paginas);
      } catch (er) { if (t !== ticket) return; cont.textContent = ''; vazio(grid, er.message); }
    }
    mais.onclick = () => espera(mais, async () => { F.pagina++; await carregar(false); });
    carregar(true);
  }

  // ---------- PUBLICAR / EDITAR ----------
  function bloco(titulo, sub, ...filhos) { const s = el('section', 'dc-bloco'); s.append(el('h3', '', titulo)); if (sub) s.append(el('p', '', sub)); s.append(...filhos); return s; }
  function campo(rotulo, ctl, ...extra) { const w = el('div', 'dc-campo'), l = el('label', '', rotulo); ctl.id = ctl.id || 'dc' + Math.random().toString(36).slice(2, 8); l.htmlFor = ctl.id; w.append(l, ctl, ...extra); return w; }

  function formulario(ex) {
    const edit = !!ex; ++ticket; root.textContent = '';
    document.title = (edit ? 'Editar doação' : 'Publicar doação') + ' – NoteWave';
    const t = el('h2', 'dc-titulo'); t.append(el('i', 'ph ' + (edit ? 'ph-pencil-simple' : 'ph-upload-simple')), el('span', '', edit ? 'Editar publicação' : 'Publicar uma doação'));
    const grade = el('div', 'dc-pub'), fm = el('form', 'dc-form'), lat = el('aside', 'dc-lateral'); fm.noValidate = true;

    // 1. Instrumento
    const nome = el('input'); nome.type = 'text'; nome.maxLength = LIM.nome; nome.placeholder = 'Ex.: Violão acústico'; nome.value = ex ? ex.nome : ''; nome.required = true;
    const sel = el('select'); const o0 = el('option', '', 'Escolha uma categoria'); o0.value = ''; sel.appendChild(o0);
    CATS.forEach(c => { const o = el('option', '', c.nome); o.value = c.id; sel.appendChild(o); }); sel.value = ex ? ex.categoria : ''; sel.required = true;
    const cidade = el('input'); cidade.type = 'text'; cidade.maxLength = 60; cidade.placeholder = 'Ex.: Campinas (opcional)'; cidade.value = ex && ex.cidade ? ex.cidade : '';
    const s1 = bloco('Sobre o instrumento', null, campo('Nome do instrumento *', nome), campo('Categoria *', sel),
      campo('Município', cidade, el('small', 'dc-dica', 'Opcional. Informe só o município, nunca o endereço de casa.')));

    // 2. Fotos
    let mantidas = ex ? (ex.imagens || []).slice() : [], novas = [];
    const arq = el('input'); arq.type = 'file'; arq.multiple = true; arq.accept = 'image/jpeg,image/png,image/webp'; arq.hidden = true;
    const zona = el('label', 'dc-zona'); zona.tabIndex = 0;
    zona.append(el('i', 'ph ph-image-square'), el('b', '', 'Clique para escolher fotografias'), el('small', '', 'JPG, PNG ou WEBP · até ' + LIM.fotos + ' fotos de ' + LIM.mb + ' MB · a primeira é a foto principal'), arq);
    const fotos = el('div', 'dc-fotos');
    function desenharFotos() {
      fotos.textContent = ''; const todas = [...mantidas.map(m => ({ m, src: url(m.url) })), ...novas.map(n => ({ n, src: n.src }))];
      todas.forEach((f, i) => {
        const b = el('div', 'dc-foto'), im = el('img'); im.src = f.src; im.alt = 'Foto ' + (i + 1) + ' do instrumento'; b.appendChild(im);
        if (i === 0) b.appendChild(el('span', 'prin', 'Principal'));
        const x = el('button', 'x'); x.type = 'button'; x.setAttribute('aria-label', 'Remover foto ' + (i + 1)); x.appendChild(el('i', 'ph ph-x'));
        x.onclick = () => { if (f.m) mantidas = mantidas.filter(z => z !== f.m); else { URL.revokeObjectURL(f.n.src); novas = novas.filter(z => z !== f.n); } desenharFotos(); };
        b.appendChild(x); fotos.appendChild(b);
      });
      zona.hidden = todas.length >= LIM.fotos;
    }
    function aceitar(lista) {
      [...lista].forEach(f => {
        if (mantidas.length + novas.length >= LIM.fotos) { toast('Máximo de ' + LIM.fotos + ' fotos.'); return; }
        if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { toast('"' + f.name + '": use JPG, PNG ou WEBP.'); return; }
        if (f.size > LIM.mb * 1024 * 1024) { toast('"' + f.name + '" passa de ' + LIM.mb + ' MB.'); return; }
        novas.push({ file: f, src: URL.createObjectURL(f) });
      }); desenharFotos();
    }
    arq.addEventListener('change', () => { aceitar(arq.files); arq.value = ''; });
    zona.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); arq.click(); } });
    const s2 = bloco('Fotografias', 'Mostre o instrumento de frente, de lado e os detalhes.', zona, fotos); desenharFotos();

    // 3. Descrição
    const desc = el('textarea'); desc.maxLength = LIM.desc; desc.rows = 6; desc.value = ex ? ex.descricao : ''; desc.required = true;
    desc.placeholder = 'Conte o estado de conservação, se funciona bem, há quanto tempo é usado, o que acompanha e se precisa de reparos.';
    const s3 = bloco('Descrição', null, campo('Descrição *', desc, contador(desc)));

    // 4. Contato (opcional) + confirmação por SMS
    const tel = el('input'); tel.type = 'tel'; tel.inputMode = 'numeric'; tel.placeholder = '(19) 91234-5678'; tel.autocomplete = 'tel';
    const digitos = () => tel.value.replace(/\D/g, '');
    // máscara (DDD) 91234-5678
    tel.addEventListener('input', () => {
      const d = tel.value.replace(/\D/g, '').slice(0, 11);
      tel.value = d.length > 10 ? d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
        : d.length > 6 ? d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
        : d.length > 2 ? d.replace(/(\d{2})(\d*)/, '($1) $2') : d;
    });

    let verif = { tel: null, id: null }, enviadoPara = null;
    const codigo = el('input'); codigo.type = 'text'; codigo.inputMode = 'numeric'; codigo.maxLength = 6; codigo.placeholder = 'Código de 6 números'; codigo.autocomplete = 'one-time-code'; codigo.setAttribute('aria-label', 'Código recebido por SMS');
    const enviar = el('button', 'dc-btn peq', 'Enviar código por SMS'); enviar.type = 'button';
    const conferir = el('button', 'dc-btn peq primario', 'Confirmar código'); conferir.type = 'button';
    const stSms = el('div', 'dc-dica'); stSms.setAttribute('role', 'status');
    const linhaCod = el('div', 'dc-linha'); linhaCod.append(codigo, conferir);
    const boxSms = el('div', 'dc-campo'); boxSms.append(enviar, linhaCod, stSms); boxSms.hidden = true;

    function sincSms() {
      const d = digitos(), celular = /^\d{2}9\d{8}$/.test(d);
      if (verif.tel && verif.tel !== d) verif = { tel: null, id: null };
      if (enviadoPara && enviadoPara !== d) enviadoPara = null;
      const ok = !!d && verif.tel === d;
      boxSms.hidden = !celular; enviar.hidden = ok; linhaCod.hidden = ok || enviadoPara !== d;
      if (ok) stSms.textContent = '✔ Telefone confirmado por SMS.';
      else if (verif.tel === null && stSms.textContent.startsWith('✔')) stSms.textContent = '';
    }
    tel.addEventListener('input', sincSms); // registrado ANTES do listener de atualizar()

    enviar.onclick = () => espera(enviar, async () => {
      stSms.textContent = '';
      try {
        await api('/donations/phone/send-code', { method: 'POST', body: { telefone: digitos() } });
        enviadoPara = digitos(); enviar.textContent = 'Reenviar código'; sincSms(); codigo.focus();
        stSms.textContent = 'Enviamos um código para o seu celular. Ele vale por 10 minutos.';
      } catch (er) { stSms.textContent = er.message; }
    });
    conferir.onclick = () => espera(conferir, async () => {
      const c = codigo.value.replace(/\D/g, '');
      if (c.length !== 6) { stSms.textContent = 'Digite os 6 números do código.'; return; }
      try {
        const r = await api('/donations/phone/verify-code', { method: 'POST', body: { telefone: digitos(), codigo: c } });
        verif = { tel: digitos(), id: r.verificacaoId }; codigo.value = ''; sincSms(); atualizar();
      } catch (er) { stSms.textContent = er.message; }
    });

    const av = el('div', 'dc-aviso'); av.append(el('i', 'ph ph-lock-key'), el('p', '', 'O telefone é opcional. Se você informar, vamos confirmá-lo por SMS. Ele não aparece na publicação: só é liberado, com a sua autorização, para a pessoa que você aceitar.'));
    const s4 = bloco('Telefone para contato (opcional)', null,
      campo(edit ? 'Celular (deixe em branco para manter o atual)' : 'Celular com DDD', tel), boxSms, av);

    // 5. Confirmações
    const checks = CONFIRMA.map(txt => { const l = el('label', 'dc-check'), c = el('input'); c.type = 'checkbox'; l.append(c, el('span', '', txt)); return { l, c }; });
    const cx = el('div', 'dc-checks'); checks.forEach(x => cx.appendChild(x.l));
    const seg = el('div', 'dc-aviso'); seg.append(el('i', 'ph ph-shield-check'), el('p', '', SEGURANCA));
    const s5 = bloco('Confirmações', edit ? 'Obrigatórias somente se você trocar o telefone.' : 'Marque as quatro primeiras para publicar. A quinta é obrigatória só se você informar telefone.', cx, seg);

    const erro = el('div', 'dc-erro'); erro.setAttribute('role', 'alert');
    const env = el('button', 'dc-btn primario grande'); env.type = 'submit'; env.append(el('i', 'ph ph-paper-plane-tilt'), document.createTextNode(edit ? 'Salvar alterações' : 'Publicar doação'));
    fm.append(s1, s2, s3, s4, s5, erro, env);

    // Lateral
    const lista = el('ul', 'dc-reqs');
    const reqs = [['n', 'Nome do instrumento'], ['c', 'Categoria'], ['d', 'Descrição (mín. ' + LIM.descMin + ' caracteres)'],
      ['t', 'Celular válido (se informado)'], ['v', 'Celular confirmado por SMS (se informado)'], ['k', 'Confirmações']]
      .map(([k, tx]) => {
        const li = el('li'); li.dataset.k = k;
        li.append(el('i', 'ph ph-circle'), document.createTextNode(tx));
        lista.appendChild(li);
        return li;
      });
    const lt1 = el('section', 'dc-lat'); lt1.append(el('h3', '', 'Antes de publicar'), lista);
    const lt2 = el('section', 'dc-lat'); lt2.append(el('h3', '', 'Doação é gratuita'), el('p', 'dc-sub', 'Este espaço não permite venda, cobrança ou pedido de pagamento. Publicações que fogem disso podem ser denunciadas.'));
    lat.append(lt1, lt2);

    function estado() {
      const d = digitos(), todas = checks.every(x => x.c.checked), quatro = checks.slice(0, 4).every(x => x.c.checked);
      return {
        n: nome.value.trim().length >= 3, c: !!sel.value, d: desc.value.trim().length >= LIM.descMin,
        t: !d || /^\d{2}9\d{8}$/.test(d),
        v: !d || verif.tel === d,
        k: edit ? (!d || todas) : (quatro && (!d || todas))
      };
    }
    function atualizar() {
      const v = estado();
      reqs.forEach(li => { const ok = v[li.dataset.k]; li.classList.toggle('ok', ok); li.firstChild.className = 'ph ' + (ok ? 'ph-check-circle' : 'ph-circle'); });
    }
    [nome, sel, desc, tel, ...checks.map(x => x.c)].forEach(c => { c.addEventListener('input', atualizar); c.addEventListener('change', atualizar); });
    atualizar();

    fm.addEventListener('submit', async e => {
      e.preventDefault(); erro.textContent = ''; const v = estado();
      if (!v.n) { erro.textContent = 'Informe o nome do instrumento (mínimo 3 letras).'; nome.focus(); return; }
      if (!v.c) { erro.textContent = 'Escolha a categoria do instrumento.'; sel.focus(); return; }
      if (!v.d) { erro.textContent = 'A descrição precisa ter pelo menos ' + LIM.descMin + ' caracteres.'; desc.focus(); return; }
      if (!v.t) { erro.textContent = 'Informe um celular com DDD, por exemplo (19) 91234-5678.'; tel.focus(); return; }
      if (!v.v) { erro.textContent = 'Confirme seu celular pelo código enviado por SMS (ou apague o telefone para publicar sem ele).'; return; }
      if (!v.k) { erro.textContent = 'Marque todas as confirmações para continuar.'; return; }
      const fd = new FormData();
      fd.append('nome', nome.value.trim()); fd.append('categoria', sel.value); fd.append('descricao', desc.value.trim()); fd.append('cidade', cidade.value.trim());
      fd.append('confirmacoes', JSON.stringify(checks.map(x => x.c.checked)));
      if (digitos()) { fd.append('telefone', digitos()); fd.append('verificacaoId', verif.id); }
      novas.forEach(n => fd.append('imagens', n.file));
      if (edit) fd.append('manter', JSON.stringify(mantidas.map(m => m.id)));

      env.disabled = true; env.lastChild.textContent = edit ? 'Salvando…' : 'Publicando…';
      try {
        const r = await api(edit ? '/donations/' + ex.id : '/donations', { method: edit ? 'PUT' : 'POST', form: fd });
        toast(edit ? 'Publicação atualizada!' : 'Sua publicação foi realizada com sucesso! Obrigado por contribuir com a comunidade NoteWave.', 5000);
        location.hash = '#/doacao/' + (r.id || ex.id);
      } catch (er) {
        // mantém tudo o que a pessoa preencheu
        erro.textContent = er.message || 'Não foi possível enviar sua publicação. Verifique os campos e tente novamente.';
        env.disabled = false; env.lastChild.textContent = edit ? 'Salvar alterações' : 'Publicar doação';
      }
    });
    grade.append(fm, lat); root.append(t, grade);
  }
  function telaPublicar() {
    if (!logado()) { guardarRetorno(); ++ticket; root.textContent = ''; vazio(root, 'Entre na sua conta para publicar uma doação. Depois do login você volta para este formulário.', ['Entrar', 'login.html']); return; }
    formulario(null);
  }
  async function telaEditar(id) {
    if (!logado()) { guardarRetorno(); ++ticket; root.textContent = ''; vazio(root, 'Entre na sua conta para editar.', ['Entrar', 'login.html']); return; }
    const meu = ++ticket; root.textContent = '';
    try { const d = await api('/donations/' + id); if (meu !== ticket) return; if (!d.meu) { vazio(root, 'Você só pode editar as suas próprias publicações.', ['Voltar', '#/']); return; } formulario(d); }
    catch (er) { if (meu === ticket) vazio(root, er.message, ['Voltar', '#/']); }
  }

  // ---------- DETALHE ----------
  function lightbox(urls, ini, nome) {
    let i = ini; const ov = el('div', 'dc-lightbox'), im = el('img');
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Foto ampliada');
    const mostrar = n => { i = (n + urls.length) % urls.length; im.src = urls[i]; im.alt = nome + ' – foto ' + (i + 1) + ' de ' + urls.length; };
    const fechar = () => { ov.remove(); document.removeEventListener('keydown', tec); };
    const tec = e => { if (e.key === 'Escape') fechar(); else if (e.key === 'ArrowLeft') mostrar(i - 1); else if (e.key === 'ArrowRight') mostrar(i + 1); };
    const x = el('button', 'dc-seta fechar'); x.type = 'button'; x.setAttribute('aria-label', 'Fechar'); x.appendChild(el('i', 'ph ph-x')); x.onclick = fechar;
    ov.append(im, x);
    if (urls.length > 1) [['e', -1, 'ph-caret-left', 'Foto anterior'], ['d', 1, 'ph-caret-right', 'Próxima foto']].forEach(([c, s, ic, n]) => { const b = el('button', 'dc-seta ' + c); b.type = 'button'; b.setAttribute('aria-label', n); b.appendChild(el('i', 'ph ' + ic)); b.onclick = e => { e.stopPropagation(); mostrar(i + s); }; ov.appendChild(b); });
    ov.addEventListener('click', e => { if (e.target === ov || e.target === im) fechar(); });
    document.addEventListener('keydown', tec); mostrar(i); document.body.appendChild(ov); x.focus();
  }
  function galeria(d) {
    const g = el('div', 'dc-gal'), box = el('div', 'dc-gal-box'), main = el('button', 'dc-gal-main'), th = el('div', 'dc-gal-th'), imgs = d.imagens || []; main.type = 'button';
    if (!imgs.length) { main.classList.add('sem'); main.disabled = true; main.appendChild(el('i', 'ph ' + cat(d.categoria).icone)); box.appendChild(main); g.appendChild(box); return g; }
    let i = 0; const im = el('img'); main.append(im); main.setAttribute('aria-label', 'Ampliar foto');
    const mostrar = n => { i = (n + imgs.length) % imgs.length; im.src = url(imgs[i].url); im.alt = d.nome + ' – foto ' + (i + 1) + ' de ' + imgs.length; [...th.children].forEach((b, k) => b.classList.toggle('ativo', k === i)); };
    main.onclick = () => lightbox(imgs.map(x => url(x.url)), i, d.nome); box.appendChild(main);
    if (imgs.length > 1) {
      [['e', -1, 'ph-caret-left', 'Foto anterior'], ['d', 1, 'ph-caret-right', 'Próxima foto']].forEach(([c, s, ic, n]) => { const b = el('button', 'dc-seta ' + c); b.type = 'button'; b.setAttribute('aria-label', n); b.appendChild(el('i', 'ph ' + ic)); b.onclick = () => mostrar(i + s); box.appendChild(b); });
      imgs.forEach((x, k) => { const b = el('button', 'dc-th'); b.type = 'button'; b.setAttribute('aria-label', 'Ver foto ' + (k + 1)); const t = el('img'); t.src = url(x.url); t.alt = ''; b.appendChild(t); b.onclick = () => mostrar(k); th.appendChild(b); });
    }
    g.append(box, th); mostrar(0); return g;
  }

  function denunciar(donId, comentarioId) {
    if (!exigeLogin()) return;
    const cx = el('form'); cx.style.cssText = 'display:flex;flex-direction:column;gap:12px';
    const s = el('select'); s.setAttribute('aria-label', 'Motivo'); MOTIVOS.forEach(([v, n]) => { const o = el('option', '', n); o.value = v; s.appendChild(o); });
    const ta = el('textarea'); ta.rows = 5; ta.maxLength = 500; ta.required = true;
    ta.placeholder = 'Conte o que aconteceu, para a nossa equipe analisar.'; ta.setAttribute('aria-label', 'Descrição da denúncia');
    const er = el('div', 'dc-erro'), ok = el('button', 'dc-btn primario', 'Enviar denúncia'); ok.type = 'submit';
    cx.append(s, ta, contador(ta), er, ok);
    const fechar = modal(comentarioId ? 'Denunciar comentário' : 'Denunciar publicação', cx);
    cx.addEventListener('submit', e => {
      e.preventDefault(); er.textContent = '';
      if (ta.value.trim().length < 10) { er.textContent = 'Explique em pelo menos 10 caracteres o que aconteceu.'; ta.focus(); return; }
      espera(ok, async () => {
        try { await api('/donations/' + donId + '/reports', { method: 'POST', body: { motivo: s.value, descricao: ta.value.trim(), comentarioId: comentarioId || null } }); fechar(); toast('Denúncia enviada. Obrigado por ajudar a cuidar da comunidade.'); }
        catch (e2) { er.textContent = e2.message; }
      });
    });
  }

  async function detalhe(id, manter) {
    const meu = ++ticket, m = $('.main-content'), y = m.scrollTop; if (!manter) root.textContent = '';
    let d;
    try { d = await api('/donations/' + id); } catch (er) {
      if (meu !== ticket) return; root.textContent = ''; vazio(root, er.status === 404 ? 'Publicação não encontrada.' : er.message, ['Voltar às doações', '#/']); return;
    }
    if (meu !== ticket) return;
    root.textContent = ''; document.title = d.nome + ' – NoteWave Doações';
    const recarregar = () => detalhe(id, true);
    const c = cat(d.categoria);
    const mig = el('nav', 'dc-migalhas'); mig.setAttribute('aria-label', 'Você está em');
    const a1 = el('a', '', 'Doações'); a1.href = '#/'; mig.append(a1, el('i', 'ph ph-caret-right'), document.createTextNode(d.nome));

    // Informações
    const info = el('div', 'dc-info'), quem = el('div', 'dc-quem');
    const q1 = el('span'); q1.append(avatar(d.autor, d.meu ? fotoMinha() : d.autorFoto), document.createTextNode(d.autor));
    const q2 = el('span'); q2.append(el('i', 'ph ph-calendar-blank'), document.createTextNode(dataBR(d.data))); quem.append(q1, q2);
    if (d.cidade) { const q3 = el('span'); q3.append(el('i', 'ph ph-map-pin'), document.createTextNode(d.cidade)); quem.appendChild(q3); }
    const k = el('div', 'dc-cat'); k.append(el('i', 'ph ' + c.icone), document.createTextNode(c.nome));
    const dsc = el('div', 'dc-desc'); d.descricao.split(/\n+/).forEach(p => { if (p.trim()) dsc.appendChild(el('p', '', p)); });
    const acao = el('div', 'dc-acao');
    const rep = el('button', 'dc-link', 'Denunciar esta publicação'); rep.type = 'button'; rep.onclick = () => denunciar(d.id);
    const seg = el('div', 'dc-aviso'); seg.append(el('i', 'ph ph-shield-check'), el('p', '', SEGURANCA));
    info.append(pill(d.status), el('h1', '', d.nome), k, quem, dsc, acao, seg, rep);

    function desenharAcao() {
      acao.textContent = '';
      if (d.meu) { acao.appendChild(el('p', 'dc-msg', 'Esta é a sua publicação. Gerencie os interessados no painel abaixo.')); return; }
      const mi = d.meuInteresse;
      if (!mi) {
        const b = el('button', 'dc-btn primario grande'); b.type = 'button'; b.append(el('i', 'ph ph-hand-heart'), document.createTextNode('Tenho interesse neste instrumento'));
        if (d.status === 'doada') { b.disabled = true; b.lastChild.textContent = 'Esta doação já foi concluída'; }
        b.onclick = () => { if (!exigeLogin()) return; espera(b, async () => {
          try { const r = await api('/donations/' + d.id + '/interests', { method: 'POST' }); d.meuInteresse = { id: r.id, status: 'pendente', contatoLiberado: false }; toast('Sua manifestação de interesse foi enviada.'); desenharAcao(); }
          catch (er) { toast(er.message); if (er.status === 409) recarregar(); }
        }); };
        acao.appendChild(b); return;
      }
      if (mi.status === 'pendente') acao.appendChild(el('p', 'dc-msg', 'Sua solicitação já foi registrada. O responsável poderá analisá-la.'));
      else if (mi.status === 'recusado') acao.appendChild(el('p', 'dc-msg', 'Sua solicitação não foi aceita desta vez. Continue explorando: há outros instrumentos esperando por você.'));
      else if (!mi.contatoLiberado) acao.appendChild(el('p', 'dc-msg', 'Sua solicitação foi aceita! Agora o responsável precisa liberar o contato. Avisaremos você.'));
      else {
        const b = el('button', 'dc-btn primario grande'); b.type = 'button'; b.append(el('i', 'ph ph-phone'), document.createTextNode('Ver telefone do responsável'));
        b.onclick = () => espera(b, async () => {
          try { const r = await api('/donation-interests/' + mi.id + '/contact'); const box = el('div', 'dc-msg'); box.append(el('span', '', 'Telefone do responsável: '), el('div', 'dc-telefone', r.telefone)); acao.textContent = ''; acao.appendChild(box); }
          catch (er) { toast(er.message); recarregar(); }
        });
        acao.append(el('p', 'dc-msg', 'Sua solicitação foi aceita e o contato foi liberado para você.'), b);
      }
    }
    desenharAcao();
    const topo = el('div', 'dc-det'); topo.append(galeria(d), info); root.append(mig, topo);

    // Painel do responsável
    if (d.meu) {
      const p = el('section', 'dc-painel'); p.appendChild(el('h2', '', 'Gerenciar esta doação'));
      const ln = el('div', 'dc-linha'), ss = el('select'); ss.setAttribute('aria-label', 'Situação da doação');
      Object.entries(STATUS).forEach(([v, [n]]) => { const o = el('option', '', n); o.value = v; ss.appendChild(o); }); ss.value = d.status;
      const sv = el('button', 'dc-btn peq', 'Salvar situação'); sv.type = 'button';
      sv.onclick = () => espera(sv, async () => { if (ss.value === d.status) return; try { await api('/donations/' + d.id + '/status', { method: 'PUT', body: { status: ss.value } }); toast('Situação atualizada.'); recarregar(); } catch (er) { toast(er.message); } });
      const ed = el('a', 'dc-btn peq', 'Editar'); ed.href = '#/editar/' + d.id;
      ln.append(ss, sv, ed);
      if (d.status !== 'doada') { const fim = el('button', 'dc-btn peq primario', 'Marcar como doada'); fim.type = 'button'; fim.onclick = () => espera(fim, async () => { if (await marcarDoada(d)) recarregar(); }); ln.appendChild(fim); }
      const ex = el('button', 'dc-btn peq perigo', 'Excluir'); ex.type = 'button'; ex.onclick = () => espera(ex, async () => { if (await excluir(d)) location.hash = '#/minhas'; }); ln.appendChild(ex);
      const li = el('div'); li.appendChild(el('p', 'dc-sub', 'Carregando interessados…'));
      p.append(ln, el('h3', '', 'Interessados'), li); root.appendChild(p);
      api('/donations/' + d.id + '/interests').then(r => {
        if (meu !== ticket) return; li.textContent = '';
        if (!r.length) { li.appendChild(el('p', 'dc-sub', 'Ainda ninguém demonstrou interesse.')); return; }
        li.appendChild(el('p', 'dc-sub', 'A escolha é sua: aceite quem você achar melhor. O telefone só é liberado depois que você autorizar.'));
        r.forEach(it => {
          const row = el('div', 'dc-int'), qq = el('div', 'quem'), st = { pendente: 'Aguardando sua resposta', aceito: it.contatoLiberado ? 'Aceito · contato liberado' : 'Aceito · contato ainda não liberado', recusado: 'Recusado' }[it.status];
          qq.append(el('b', '', '@' + it.usuario), el('small', '', dataBR(it.data) + ' · ' + st));
          const g = el('div', 'dc-gerir'); row.append(avatar(it.usuario, it.usuarioFoto), qq, g);
          const botao = (txt, cls, fn) => { const b = el('button', 'dc-btn peq ' + cls, txt); b.type = 'button'; b.onclick = () => espera(b, async () => { try { await fn(); recarregar(); } catch (er) { toast(er.message); } }); g.appendChild(b); };
          if (d.status !== 'doada' && it.status === 'pendente') {
            botao('Aceitar', 'primario', async () => { await api('/donation-interests/' + it.id, { method: 'PUT', body: { acao: 'aceitar' } }); toast('Solicitação aceita.'); });
            botao('Recusar', '', async () => { await api('/donation-interests/' + it.id, { method: 'PUT', body: { acao: 'recusar' } }); toast('Solicitação recusada.'); });
          }
          if (it.status === 'aceito' && !it.contatoLiberado && d.status !== 'doada')
            botao('Compartilhar meu telefone', 'primario', async () => { if (!confirm('Compartilhar seu telefone com @' + it.usuario + '?\n\nSomente essa pessoa poderá ver o número. Você pode revogar depois.')) throw new Error('Compartilhamento cancelado.'); await api('/donation-interests/' + it.id + '/contact-consent', { method: 'POST', body: { autorizar: true } }); toast('Contato liberado para @' + it.usuario + '.'); });
          if (it.status === 'aceito' && it.contatoLiberado && d.status !== 'doada')
            botao('Revogar compartilhamento', 'perigo', async () => { if (!confirm('Revogar o acesso de @' + it.usuario + ' ao seu telefone?')) throw new Error('Ação cancelada.'); await api('/donation-interests/' + it.id + '/contact-consent', { method: 'POST', body: { autorizar: false } }); toast('Acesso ao telefone revogado.'); });
          li.appendChild(row);
        });
      }).catch(er => { li.textContent = ''; li.appendChild(el('p', 'dc-erro', er.message)); });
    }

    // Comentários
    const sc = el('section', 'dc-com'), tit = el('h2'), lista = el('div'); lista.style.cssText = 'display:flex;flex-direction:column;gap:10px';
    sc.append(tit, lista); let respondendo = null;
    let ta, aviso = () => {};
    function comentarios() {
      tit.textContent = 'Comentários (' + d.comentarios.length + ')'; lista.textContent = '';
      if (!d.comentarios.length) lista.appendChild(el('p', 'dc-sub', 'Ninguém comentou ainda. Tire uma dúvida ou comece a conversa!'));
      const topos = d.comentarios.filter(x => !x.paiId);
      const desenhar = (cm, resp) => {
        const it = el('div', 'dc-coment' + (resp ? ' resp' : '')), cp = el('div', 'dc-coment-corpo'), tp = el('div', 'dc-coment-topo');
        tp.append(el('b', '', '@' + cm.autor), el('span', '', dataBR(cm.data)));
        const ac = el('div', 'dc-coment-acoes');
        if (!resp) { const r = el('button', 'dc-link', 'Responder'); r.type = 'button'; r.onclick = () => { if (!logado()) { exigeLogin(); return; } respondendo = cm; ta.focus(); aviso(); }; ac.appendChild(r); }
        if (cm.meu || d.meu) { const x = el('button', 'dc-link', 'Excluir'); x.type = 'button'; x.onclick = () => espera(x, async () => { if (!confirm('Excluir este comentário?')) return; try { await api('/donation-comments/' + cm.id, { method: 'DELETE' }); d.comentarios = d.comentarios.filter(z => z.id !== cm.id && z.paiId !== cm.id); comentarios(); } catch (er) { toast(er.message); } }); ac.appendChild(x); }
        if (!cm.meu) { const r = el('button', 'dc-link', 'Denunciar'); r.type = 'button'; r.onclick = () => denunciar(d.id, cm.id); ac.appendChild(r); }
        cp.append(tp, el('p', '', cm.texto), ac); it.append(avatar(cm.autor, cm.meu ? fotoMinha() : cm.autorFoto), cp); lista.appendChild(it);
      };
      topos.forEach(cm => { desenhar(cm, false); d.comentarios.filter(x => x.paiId === cm.id).forEach(r => desenhar(r, true)); });
    }
    if (logado()) {
      const fm = el('form', 'dc-com-form'), er = el('div', 'dc-erro'), env = el('button', 'dc-btn primario', 'Comentar'), ra = el('div', 'dc-sub');
      ta = el('textarea'); ta.rows = 3; ta.maxLength = LIM.coment; ta.placeholder = 'Escreva um comentário...'; ta.setAttribute('aria-label', 'Escreva um comentário'); env.type = 'submit';
      aviso = () => { ra.textContent = ''; if (!respondendo) return; ra.append(document.createTextNode('Respondendo a @' + respondendo.autor + ' · ')); const x = el('button', 'dc-link', 'cancelar'); x.type = 'button'; x.onclick = () => { respondendo = null; aviso(); }; ra.appendChild(x); };
      fm.append(ra, ta, contador(ta), el('small', 'dc-dica', 'Não são permitidos valores, vendas, cobranças, links ou dados pessoais (telefone, endereço).'), er, env);
      fm.addEventListener('submit', e => { e.preventDefault(); er.textContent = ''; if (!ta.value.trim()) { er.textContent = 'Escreva alguma coisa antes de comentar.'; return; }
        espera(env, async () => { try { await api('/donations/' + d.id + '/comments', { method: 'POST', body: { texto: ta.value.trim(), paiId: respondendo ? (respondendo.paiId || respondendo.id) : null } }); const n = await api('/donations/' + d.id); d.comentarios = n.comentarios; ta.value = ''; respondendo = null; aviso(); comentarios(); toast('Seu comentário foi publicado.'); } catch (e2) { er.textContent = e2.message; } }); });
      sc.appendChild(fm);
    } else {
      const av2 = el('div', 'dc-msg'), lk = el('a', '', 'Entre na sua conta'); lk.href = 'login.html'; lk.style.cssText = 'color:var(--dc-blue);font-weight:700;text-decoration:underline'; lk.onclick = guardarRetorno;
      av2.append(lk, document.createTextNode(' para comentar e demonstrar interesse.')); sc.appendChild(av2);
    }
    comentarios(); root.appendChild(sc);
    if (manter) m.scrollTop = y;
  }

  // ---------- MINHAS DOAÇÕES ----------
  async function minhas() {
    const meu = ++ticket; root.textContent = ''; document.title = 'Minhas doações – NoteWave';
    const t = el('h2', 'dc-titulo'); t.append(el('i', 'ph ph-gift'), el('span', '', 'Minhas doações'));
    root.appendChild(t);
    if (!logado()) { guardarRetorno(); vazio(root, 'Entre na sua conta para ver e gerenciar suas doações.', ['Entrar', 'login.html']); return; }
    const av = el('section', 'dc-painel'); av.hidden = true; const grid = el('div', 'dc-grid'); root.append(av, grid);
    api('/donation-notifications').then(r => {
      if (meu !== ticket || !r.length) return; av.hidden = false; av.appendChild(el('h2', '', 'Avisos'));
      r.slice(0, 8).forEach(n => { const li = el('div', 'dc-notif' + (n.lida ? '' : ' nova')), tx = el('div'); const a = el('a', '', n.texto); a.href = '#/doacao/' + n.doacaoId; tx.append(a, el('small', '', dataBR(n.data))); li.append(el('i', 'ph ph-bell'), tx); av.appendChild(li); });
    }).catch(() => {});
    try {
      const r = await api('/donations?minhas=1&limite=50'); if (meu !== ticket) return;
      if (!r.itens.length) vazio(grid, 'Você ainda não publicou nenhuma doação. Aquele instrumento parado pode ser o começo de alguém!', ['Publicar uma doação', '#/publicar']);
      else r.itens.forEach(d => grid.appendChild(card(d, true)));
    } catch (er) { if (meu === ticket) vazio(grid, er.message); }
  }

  // ---------- SININHO ----------
  const sino = $('#dcSino'), painel = $('#dcSinoPainel'), selo = $('#dcSinoBadge');
  const temSino = !!(sino && painel && selo);
  let avisos = [];

  function fecharSino() {
    if (!temSino) return;
    painel.hidden = true; sino.setAttribute('aria-expanded', 'false');
  }

  function desenharSino() {
    if (!temSino) return;
    const n = avisos.filter(a => !a.lida).length;
    selo.textContent = n > 9 ? '9+' : (n || '');
    painel.textContent = '';
    const topo = el('div', 'dc-sino-topo'); topo.appendChild(el('b', '', 'Notificações'));
    if (n) {
      const b = el('button', 'dc-link', 'Marcar todas como lidas'); b.type = 'button';
      b.onclick = async () => {
        try { await api('/donation-notifications/lidas', { method: 'PUT' }); avisos.forEach(a => { a.lida = true; }); desenharSino(); }
        catch (er) { toast(er.message); }
      };
      topo.appendChild(b);
    }
    painel.appendChild(topo);
    if (!avisos.length) { painel.appendChild(el('p', 'dc-sub dc-sino-vazio', 'Você não tem notificações.')); return; }
    avisos.forEach(a => {
      const it = el('a', 'dc-notif' + (a.lida ? '' : ' nova')), tx = el('div');
      it.href = '#/doacao/' + a.doacaoId;
      tx.append(document.createTextNode(a.texto), el('small', '', dataBR(a.data)));
      it.append(el('i', 'ph ph-bell'), tx);
      it.onclick = () => {
        fecharSino();
        if (!a.lida) { a.lida = true; api('/donation-notifications/' + a.id + '/lida', { method: 'PUT' }).catch(() => {}); desenharSino(); }
        if (location.hash === it.getAttribute('href')) rota(); // já está nessa página: recarrega
      };
      painel.appendChild(it);
    });
  }

  async function carregarAvisos() {
    if (!temSino) return;
    sino.parentElement.hidden = !logado();
    if (!logado()) return;
    try { avisos = await api('/donation-notifications'); desenharSino(); } catch (e) { /* opcional */ }
  }

  if (temSino) {
    sino.addEventListener('click', e => {
      e.stopPropagation();
      const abrir = painel.hidden; painel.hidden = !abrir; sino.setAttribute('aria-expanded', String(abrir));
      if (abrir) carregarAvisos();
    });
    document.addEventListener('click', e => { if (!painel.contains(e.target)) fecharSino(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharSino(); });
    setInterval(() => { if (!document.hidden) carregarAvisos(); }, 30000); // atualiza sozinho a cada 30 s
  }

  // ---------- ROTAS (#/, #/publicar, #/editar/3, #/doacao/3, #/minhas) ----------
  let ultima = '';
  function rota() {
    const p = (location.hash || '#/').slice(2).split('/'), v = p[0] || '', n = parseInt(p[1], 10);
    document.title = 'Doações – NoteWave';
    const nav = { '': 'home', publicar: 'publicar', editar: 'publicar', minhas: 'minhas' }[v] || 'home';
    document.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('ativo', b.dataset.nav === nav));
    if (v === 'publicar') telaPublicar(); else if (v === 'editar' && n) telaEditar(n);
    else if (v === 'doacao' && n) detalhe(n); else if (v === 'minhas') minhas(); else home();
    const chave = v + '/' + (p[1] || ''); if (chave !== ultima) { ultima = chave; const m = $('.main-content'); if (m) m.scrollTop = 0; window.scrollTo(0, 0); }
    carregarAvisos();
  }
  window.addEventListener('hashchange', rota);
  rota();
})();