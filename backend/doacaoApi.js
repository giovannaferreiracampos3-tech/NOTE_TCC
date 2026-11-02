// ================================
// NOTEWAVE DOAÇÕES – API (Express + MySQL)
// Uso no server.js:  app.use('/api', require('./doacaoApi')(db.promise()));
// Dependência nova:  npm install multer
// Variável opcional: DOACAO_KEY (chave que criptografa os telefones; se faltar, usa o JWT_SECRET)
// ================================
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'troque-este-segredo'; // mesmo do server.js
const PASTA = path.join(__dirname, 'uploads', 'doacao');
fs.mkdirSync(PASTA, { recursive: true });

const CATEGORIAS = ['corda', 'sopro', 'percussao', 'teclas', 'acessorios', 'outros'];
const STATUS = ['disponivel', 'em_processo', 'doada'];
const MOTIVOS = ['venda', 'cobranca', 'falsa', 'diferente', 'inadequado', 'golpe', 'dados', 'outros'];
const MAX_FOTOS = 6, MAX_MB = 5;

// ---------- telefone protegido (AES-256-GCM) ----------
const CHAVE = crypto.scryptSync(process.env.DOACAO_KEY || JWT_SECRET, 'notewave-doacao', 32);
function cifrar(txt) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', CHAVE, iv);
  const dados = Buffer.concat([c.update(txt, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), dados].map(b => b.toString('base64')).join('.');
}
function decifrar(s) {
  const [iv, tag, dados] = s.split('.').map(x => Buffer.from(x, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', CHAVE, iv); d.setAuthTag(tag);
  return Buffer.concat([d.update(dados), d.final()]).toString('utf8');
}

// ---------- utilidades ----------
// Nome público: primeiro nome + inicial do sobrenome (menos dados pessoais expostos)
const nomePublico = n => { const p = String(n || 'Usuário').trim().split(/\s+/); return p.length > 1 ? p[0] + ' ' + p[p.length - 1][0].toUpperCase() + '.' : p[0]; };
const likeSeguro = s => s.replace(/[\\%_]/g, '\\$&');
const REGRAS = [
  [/https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|br|me|io)\b/i, 'Links não são permitidos.'],
  [/(\d[\s().-]*){8,}/, 'Não escreva telefones ou números de contato no texto.'],
  [/r\$|\breais?\b|\bpix\b|\bvendo\b|\bvendendo\b|\b[àa] venda\b|\bpre[çc]o\b|\bcobr(o|ar|an[çc]a)\b/i, 'Esta plataforma é só de doações: valores, vendas e cobranças não são permitidos.']
];
const proibido = txt => { for (const [re, msg] of REGRAS) if (re.test(txt)) return msg; return null; };
const tipoReal = b => { // confere o conteúdo REAL do arquivo, não a extensão
  if (b.length < 12) return null;
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'jpg';
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) return 'png';
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
};
const apagarArquivos = caminhos => caminhos.forEach(c => fs.unlink(path.join(__dirname, 'uploads', c), () => {}));

module.exports = (db) => {
  const r = express.Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_MB * 1024 * 1024, files: MAX_FOTOS } });
  const receber = (req, res, next) => upload.array('imagens', MAX_FOTOS)(req, res, err => {
    if (!err) return next();
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Cada foto pode ter no máximo ' + MAX_MB + ' MB.' : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE' ? 'Envie no máximo ' + MAX_FOTOS + ' fotos.' : 'Não foi possível ler as fotos.';
    res.status(400).json({ erro: msg });
  });
  const h = fn => (req, res) => fn(req, res).catch(e => { console.error('DOACAO:', e); res.status(500).json({ erro: 'Erro no servidor. Tente de novo.' }); });
  const erro = (res, s, m) => res.status(s).json({ erro: m });

  // ---------- autenticação: identidade SEMPRE vem do token ----------
  r.use((req, res, next) => {
    req.user = null;
    const a = req.headers.authorization || '';
    if (a.startsWith('Bearer ')) { try { const p = jwt.verify(a.slice(7), JWT_SECRET); req.user = { id: p.id_usuario, nome: p.nome }; } catch (e) { /* token inválido = visitante */ } }
    next();
  });
  const exige = (req, res, next) => req.user ? next() : erro(res, 401, 'Entre na sua conta para fazer isso.');

  // ---------- limite de requisições (em memória) ----------
  const hits = new Map();
  function limite(max, ms, chave) {
    return (req, res, next) => {
      const k = chave + ':' + (req.user ? req.user.id : req.ip), agora = Date.now();
      const lista = (hits.get(k) || []).filter(t => agora - t < ms);
      if (lista.length >= max) return erro(res, 429, 'Muitas tentativas em pouco tempo. Aguarde um pouco e tente de novo.');
      lista.push(agora); hits.set(k, lista); next();
    };
  }
  setInterval(() => { const agora = Date.now(); for (const [k, l] of hits) if (!l.some(t => agora - t < 3600000)) hits.delete(k); }, 600000).unref();
  r.use((req, res, next) => req.method === 'GET' ? next() : limite(60, 60000, 'escrita')(req, res, next));

  const notificar = (conn, userId, donId, msg) => conn.query('INSERT INTO donation_notifications (user_id, donation_id, message) VALUES (?,?,?)', [userId, donId, msg]);
  const buscar = async id => { const [[d]] = await db.query('SELECT * FROM donations WHERE id=? AND deleted_at IS NULL', [id]); return d; };

  // ---------- validação dos campos de publicação ----------
  function lerCampos(b, exigeTel) {
    const nome = String(b.nome || '').trim(), categoria = String(b.categoria || ''), descricao = String(b.descricao || '').trim(), cidade = String(b.cidade || '').trim();
    const tel = String(b.telefone || '').replace(/\D/g, '');
    if (nome.length < 3 || nome.length > 80) return { e: 'O nome do instrumento deve ter entre 3 e 80 caracteres.' };
    if (!CATEGORIAS.includes(categoria)) return { e: 'Escolha uma categoria válida.' };
    if (descricao.length < 20 || descricao.length > 1000) return { e: 'A descrição deve ter entre 20 e 1000 caracteres.' };
    if (cidade.length > 60) return { e: 'O município pode ter no máximo 60 caracteres.' };
    if ((exigeTel || tel) && !/^\d{10,11}$/.test(tel)) return { e: 'Informe um telefone válido com DDD.' };
    const p = proibido(nome) || proibido(descricao) || (cidade && proibido(cidade));
    if (p) return { e: p };
    return { nome, categoria, descricao, cidade: cidade || null, tel };
  }
  function confirmou(b) { try { const c = JSON.parse(b.confirmacoes); return Array.isArray(c) && c.length === 5 && c.every(x => x === true); } catch (e) { return false; } }
  function validarArquivos(files) {
    const out = [];
    for (const f of files || []) { const t = tipoReal(f.buffer); if (!t) return { e: 'Uma das fotos não é uma imagem válida (use JPG, PNG ou WEBP).' }; out.push({ buf: f.buffer, nome: 'doacao/' + crypto.randomBytes(16).toString('hex') + '.' + t }); }
    return { arquivos: out };
  }
  const salvar = arqs => arqs.forEach(a => fs.writeFileSync(path.join(__dirname, 'uploads', a.nome), a.buf, { mode: 0o644 }));

  // ================= PUBLICAÇÕES =================
  const item = x => ({
    id: x.id, nome: x.instrument_name, categoria: x.category,
    resumo: x.description.length > 120 ? x.description.slice(0, 117).trimEnd() + '…' : x.description,
    autor: nomePublico(x.autor_nome), data: x.created_at, status: x.status, totalComentarios: x.total_comentarios,
    imagem: x.imagem ? '/uploads/' + x.imagem : null,
    totalInteressados: x.total_interessados, pendentes: x.pendentes
  });

  r.get('/donations/resumo', h(async (req, res) => {
    const [rows] = await db.query('SELECT status, COUNT(*) n FROM donations WHERE deleted_at IS NULL GROUP BY status');
    const n = s => (rows.find(x => x.status === s) || { n: 0 }).n;
    res.json({ disponiveis: n('disponivel'), emProcesso: n('em_processo'), concluidas: n('doada') });
  }));

  r.get('/donations', h(async (req, res) => {
    const q = String(req.query.q || '').trim().slice(0, 80), categoria = String(req.query.categoria || ''), status = String(req.query.status || ''), cidade = String(req.query.cidade || '').trim().slice(0, 60);
    const minhas = req.query.minhas === '1';
    const limite_ = Math.min(50, Math.max(1, parseInt(req.query.limite, 10) || 12)), pagina = Math.max(1, parseInt(req.query.pagina, 10) || 1);
    const w = ['d.deleted_at IS NULL'], p = [];
    if (minhas) { if (!req.user) return erro(res, 401, 'Entre na sua conta para ver suas doações.'); w.push('d.user_id=?'); p.push(req.user.id); }
    if (q) { w.push('d.instrument_name LIKE ?'); p.push('%' + likeSeguro(q) + '%'); }
    if (CATEGORIAS.includes(categoria)) { w.push('d.category=?'); p.push(categoria); }
    if (STATUS.includes(status)) { w.push('d.status=?'); p.push(status); }
    if (cidade) { w.push('d.city LIKE ?'); p.push('%' + likeSeguro(cidade) + '%'); }
    const where = w.join(' AND ');
    const [[{ total }]] = await db.query('SELECT COUNT(*) total FROM donations d WHERE ' + where, p);
    const extra = minhas ? ', (SELECT COUNT(*) FROM donation_interests i WHERE i.donation_id=d.id) total_interessados, (SELECT COUNT(*) FROM donation_interests i WHERE i.donation_id=d.id AND i.status=\'pendente\') pendentes' : '';
    const [rows] = await db.query(
      `SELECT d.id, d.instrument_name, d.category, d.description, d.status, d.created_at, u.nome autor_nome,
        (SELECT image_path FROM donation_images WHERE donation_id=d.id ORDER BY position, id LIMIT 1) imagem,
        (SELECT COUNT(*) FROM donation_comments c WHERE c.donation_id=d.id) total_comentarios ${extra}
       FROM donations d JOIN usuarios u ON u.id_usuario=d.user_id WHERE ${where}
       ORDER BY (d.status='disponivel') DESC, d.created_at DESC, d.id DESC LIMIT ? OFFSET ?`, [...p, limite_, (pagina - 1) * limite_]);
    res.json({ itens: rows.map(item), total, pagina, paginas: Math.max(1, Math.ceil(total / limite_)) });
  }));

  r.get('/donations/:id', h(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const [[d]] = await db.query('SELECT d.*, u.nome autor_nome FROM donations d JOIN usuarios u ON u.id_usuario=d.user_id WHERE d.id=? AND d.deleted_at IS NULL', [id]);
    if (!d) return erro(res, 404, 'Publicação não encontrada.');
    const [imgs] = await db.query('SELECT id, image_path FROM donation_images WHERE donation_id=? ORDER BY position, id', [id]);
    const [coms] = await db.query('SELECT c.id, c.user_id, c.parent_comment_id, c.comment, c.created_at, u.nome FROM donation_comments c JOIN usuarios u ON u.id_usuario=c.user_id WHERE c.donation_id=? ORDER BY c.created_at, c.id', [id]);
    let meuInteresse = null;
    if (req.user) {
      const [[i]] = await db.query(`SELECT i.id, i.status, (p.consent_status='autorizado') liberado FROM donation_interests i
        LEFT JOIN donation_contact_permissions p ON p.donation_id=i.donation_id AND p.interested_user_id=i.interested_user_id
        WHERE i.donation_id=? AND i.interested_user_id=?`, [id, req.user.id]);
      if (i) meuInteresse = { id: i.id, status: i.status, contatoLiberado: !!i.liberado };
    }
    // O telefone NUNCA sai nesta rota
    res.json({
      id: d.id, nome: d.instrument_name, categoria: d.category, descricao: d.description, cidade: d.city, autor: nomePublico(d.autor_nome),
      data: d.created_at, status: d.status, meu: !!req.user && req.user.id === d.user_id,
      imagens: imgs.map(x => ({ id: x.id, url: '/uploads/' + x.image_path })), meuInteresse,
      comentarios: coms.map(c => ({ id: c.id, autor: nomePublico(c.nome), texto: c.comment, data: c.created_at, meu: !!req.user && req.user.id === c.user_id, paiId: c.parent_comment_id }))
    });
  }));

  r.post('/donations', exige, limite(10, 3600000, 'publicar'), receber, h(async (req, res) => {
    const c = lerCampos(req.body, true); if (c.e) return erro(res, 400, c.e);
    if (!confirmou(req.body)) return erro(res, 400, 'Marque todas as confirmações para publicar.');
    const v = validarArquivos(req.files); if (v.e) return erro(res, 400, v.e);
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [ins] = await conn.query('INSERT INTO donations (user_id, instrument_name, category, description, city, phone, consent_at) VALUES (?,?,?,?,?,?,NOW())',
        [req.user.id, c.nome, c.categoria, c.descricao, c.cidade, cifrar(c.tel)]);
      salvar(v.arquivos);
      for (let i = 0; i < v.arquivos.length; i++) await conn.query('INSERT INTO donation_images (donation_id, image_path, position) VALUES (?,?,?)', [ins.insertId, v.arquivos[i].nome, i]);
      await conn.commit(); res.status(201).json({ id: ins.insertId });
    } catch (e) { await conn.rollback(); apagarArquivos(v.arquivos.map(a => a.nome)); throw e; } finally { conn.release(); }
  }));

  r.put('/donations/:id', exige, receber, h(async (req, res) => {
    const id = parseInt(req.params.id, 10), d = await buscar(id);
    if (!d) return erro(res, 404, 'Publicação não encontrada.');
    if (d.user_id !== req.user.id) return erro(res, 403, 'Você só pode editar as suas próprias publicações.');
    const c = lerCampos(req.body, false); if (c.e) return erro(res, 400, c.e);
    if (c.tel && !confirmou(req.body)) return erro(res, 400, 'Para trocar o telefone, marque todas as confirmações.');
    const v = validarArquivos(req.files); if (v.e) return erro(res, 400, v.e);
    let manter = []; try { manter = JSON.parse(req.body.manter || '[]').map(Number); } catch (e) { manter = []; }
    const [atuais] = await db.query('SELECT id, image_path FROM donation_images WHERE donation_id=?', [id]);
    const ficam = manter.filter(m => atuais.some(a => a.id === m)), sai = atuais.filter(a => !ficam.includes(a.id));
    if (ficam.length + v.arquivos.length > MAX_FOTOS) return erro(res, 400, 'Máximo de ' + MAX_FOTOS + ' fotos.');
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('UPDATE donations SET instrument_name=?, category=?, description=?, city=? WHERE id=?', [c.nome, c.categoria, c.descricao, c.cidade, id]);
      if (c.tel) { // telefone novo: novo consentimento e todas as liberações anteriores são revogadas
        await conn.query('UPDATE donations SET phone=?, consent_at=NOW() WHERE id=?', [cifrar(c.tel), id]);
        await conn.query("UPDATE donation_contact_permissions SET consent_status='revogado', revoked_at=NOW() WHERE donation_id=? AND consent_status='autorizado'", [id]);
      }
      if (sai.length) await conn.query('DELETE FROM donation_images WHERE id IN (?)', [sai.map(s => s.id)]);
      salvar(v.arquivos);
      for (const a of v.arquivos) { const [ins] = await conn.query('INSERT INTO donation_images (donation_id, image_path) VALUES (?,?)', [id, a.nome]); ficam.push(ins.insertId); }
      for (let i = 0; i < ficam.length; i++) await conn.query('UPDATE donation_images SET position=? WHERE id=?', [i, ficam[i]]);
      await conn.commit(); apagarArquivos(sai.map(s => s.image_path)); res.json({ id });
    } catch (e) { await conn.rollback(); apagarArquivos(v.arquivos.map(a => a.nome)); throw e; } finally { conn.release(); }
  }));

  r.put('/donations/:id/status', exige, h(async (req, res) => {
    const id = parseInt(req.params.id, 10), d = await buscar(id), novo = String((req.body || {}).status || '');
    if (!d) return erro(res, 404, 'Publicação não encontrada.');
    if (d.user_id !== req.user.id) return erro(res, 403, 'Você só pode alterar as suas próprias publicações.');
    if (!STATUS.includes(novo)) return erro(res, 400, 'Situação inválida.');
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('UPDATE donations SET status=? WHERE id=?', [novo, id]);
      if (novo === 'doada') { // fecha o que ficou pendente e avisa quem esperava
        const [pend] = await conn.query("SELECT interested_user_id u FROM donation_interests WHERE donation_id=? AND status='pendente'", [id]);
        await conn.query("UPDATE donation_interests SET status='recusado' WHERE donation_id=? AND status='pendente'", [id]);
        for (const p of pend) await notificar(conn, p.u, id, 'O instrumento "' + d.instrument_name + '" já foi doado para outra pessoa.');
      }
      await conn.commit(); res.json({ status: novo });
    } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  }));

  r.delete('/donations/:id', exige, h(async (req, res) => {
    const id = parseInt(req.params.id, 10), d = await buscar(id);
    if (!d) return erro(res, 404, 'Publicação não encontrada.');
    if (d.user_id !== req.user.id) return erro(res, 403, 'Você só pode excluir as suas próprias publicações.');
    const conn = await db.getConnection(); // exclusão lógica: preserva histórico para auditoria
    try {
      await conn.beginTransaction();
      await conn.query('UPDATE donations SET deleted_at=NOW() WHERE id=?', [id]);
      await conn.query("UPDATE donation_contact_permissions SET consent_status='revogado', revoked_at=NOW() WHERE donation_id=? AND consent_status='autorizado'", [id]);
      await conn.commit(); res.json({ ok: true });
    } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  }));

  // ================= COMENTÁRIOS =================
  r.get('/donations/:id/comments', h(async (req, res) => {
    const id = parseInt(req.params.id, 10); if (!(await buscar(id))) return erro(res, 404, 'Publicação não encontrada.');
    const [coms] = await db.query('SELECT c.id, c.user_id, c.parent_comment_id, c.comment, c.created_at, u.nome FROM donation_comments c JOIN usuarios u ON u.id_usuario=c.user_id WHERE c.donation_id=? ORDER BY c.created_at, c.id', [id]);
    res.json(coms.map(c => ({ id: c.id, autor: nomePublico(c.nome), texto: c.comment, data: c.created_at, meu: !!req.user && req.user.id === c.user_id, paiId: c.parent_comment_id })));
  }));

  r.post('/donations/:id/comments', exige, limite(20, 600000, 'comentar'), h(async (req, res) => {
    const id = parseInt(req.params.id, 10), texto = String((req.body || {}).texto || '').trim();
    if (!(await buscar(id))) return erro(res, 404, 'Publicação não encontrada.');
    if (!texto) return erro(res, 400, 'Escreva alguma coisa antes de comentar.');
    if (texto.length > 500) return erro(res, 400, 'O comentário pode ter no máximo 500 caracteres.');
    const p = proibido(texto); if (p) return erro(res, 400, p);
    let pai = null;
    if (req.body.paiId) {
      const [[c]] = await db.query('SELECT id, parent_comment_id FROM donation_comments WHERE id=? AND donation_id=?', [parseInt(req.body.paiId, 10), id]);
      if (!c) return erro(res, 400, 'O comentário que você quer responder não existe mais.');
      pai = c.parent_comment_id || c.id; // respostas ficam em um só nível
    }
    const [ins] = await db.query('INSERT INTO donation_comments (donation_id, user_id, parent_comment_id, comment) VALUES (?,?,?,?)', [id, req.user.id, pai, texto]);
    res.status(201).json({ id: ins.insertId });
  }));

  r.delete('/donation-comments/:id', exige, h(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const [[c]] = await db.query('SELECT c.id, c.user_id, d.user_id dono FROM donation_comments c JOIN donations d ON d.id=c.donation_id WHERE c.id=?', [id]);
    if (!c) return erro(res, 404, 'Comentário não encontrado.');
    if (c.user_id !== req.user.id && c.dono !== req.user.id) return erro(res, 403, 'Você não pode excluir este comentário.');
    await db.query('DELETE FROM donation_comments WHERE id=?', [id]); res.json({ ok: true });
  }));

  // ================= INTERESSE =================
  r.post('/donations/:id/interests', exige, limite(20, 3600000, 'interesse'), h(async (req, res) => {
    const id = parseInt(req.params.id, 10), d = await buscar(id);
    if (!d) return erro(res, 404, 'Publicação não encontrada.');
    if (d.status === 'doada') return erro(res, 409, 'Esta publicação não está mais disponível.');
    if (d.user_id === req.user.id) return erro(res, 400, 'Você não pode pedir o seu próprio instrumento.');
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [ins] = await conn.query('INSERT INTO donation_interests (donation_id, interested_user_id) VALUES (?,?)', [id, req.user.id]);
      await notificar(conn, d.user_id, id, nomePublico(req.user.nome) + ' tem interesse no seu instrumento "' + d.instrument_name + '".');
      await conn.commit(); res.status(201).json({ id: ins.insertId });
    } catch (e) {
      await conn.rollback();
      if (e.code === 'ER_DUP_ENTRY') return erro(res, 409, 'Sua solicitação já foi registrada.');
      throw e;
    } finally { conn.release(); }
  }));

  r.get('/donations/:id/interests', exige, h(async (req, res) => {
    const id = parseInt(req.params.id, 10), d = await buscar(id);
    if (!d) return erro(res, 404, 'Publicação não encontrada.');
    if (d.user_id !== req.user.id) return erro(res, 403, 'Somente o responsável vê as solicitações.');
    const [rows] = await db.query(`SELECT i.id, i.status, i.created_at, u.nome, (p.consent_status='autorizado') liberado FROM donation_interests i
      JOIN usuarios u ON u.id_usuario=i.interested_user_id
      LEFT JOIN donation_contact_permissions p ON p.donation_id=i.donation_id AND p.interested_user_id=i.interested_user_id
      WHERE i.donation_id=? ORDER BY i.created_at`, [id]);
    res.json(rows.map(x => ({ id: x.id, usuario: nomePublico(x.nome), data: x.created_at, status: x.status, contatoLiberado: !!x.liberado })));
  }));

  // Carrega uma solicitação garantindo que quem pede é o dono da doação
  async function interesseDoDono(req, res) {
    const [[i]] = await db.query(`SELECT i.*, d.user_id dono, d.status dstatus, d.instrument_name nome, d.deleted_at FROM donation_interests i JOIN donations d ON d.id=i.donation_id WHERE i.id=?`, [parseInt(req.params.id, 10)]);
    if (!i || i.deleted_at) { erro(res, 404, 'Solicitação não encontrada.'); return null; }
    if (i.dono !== req.user.id) { erro(res, 403, 'Somente o responsável pode fazer isso.'); return null; }
    return i;
  }

  r.put('/donation-interests/:id', exige, h(async (req, res) => {
    const i = await interesseDoDono(req, res); if (!i) return;
    const acao = String((req.body || {}).acao || '');
    if (!['aceitar', 'recusar'].includes(acao)) return erro(res, 400, 'Ação inválida.');
    if (i.dstatus === 'doada') return erro(res, 409, 'Esta doação já foi concluída.');
    if (i.status !== 'pendente') return erro(res, 409, 'Esta solicitação já foi respondida.');
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('UPDATE donation_interests SET status=? WHERE id=?', [acao === 'aceitar' ? 'aceito' : 'recusado', i.id]);
      if (acao === 'aceitar' && i.dstatus === 'disponivel') await conn.query("UPDATE donations SET status='em_processo' WHERE id=?", [i.donation_id]);
      await notificar(conn, i.interested_user_id, i.donation_id, acao === 'aceitar'
        ? 'Sua solicitação para "' + i.nome + '" foi aceita! O responsável poderá liberar o contato.'
        : 'Sua solicitação para "' + i.nome + '" não foi aceita desta vez.');
      await conn.commit(); res.json({ ok: true });
    } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  }));

  // ================= COMPARTILHAMENTO DO TELEFONE =================
  r.post('/donation-interests/:id/contact-consent', exige, h(async (req, res) => {
    const i = await interesseDoDono(req, res); if (!i) return;
    const autorizar = (req.body || {}).autorizar === true;
    if (autorizar) {
      if (i.status !== 'aceito') return erro(res, 409, 'Aceite a solicitação antes de compartilhar o telefone.');
      await db.query(`INSERT INTO donation_contact_permissions (donation_id, interested_user_id, authorized_by_user_id, consent_status, authorized_at)
        VALUES (?,?,?,'autorizado',NOW()) ON DUPLICATE KEY UPDATE authorized_by_user_id=VALUES(authorized_by_user_id), consent_status='autorizado', authorized_at=NOW(), revoked_at=NULL`,
        [i.donation_id, i.interested_user_id, req.user.id]);
      await notificar(db, i.interested_user_id, i.donation_id, 'O responsável liberou o telefone para "' + i.nome + '". Abra a publicação para ver.');
    } else {
      await db.query("UPDATE donation_contact_permissions SET consent_status='revogado', revoked_at=NOW() WHERE donation_id=? AND interested_user_id=? AND consent_status='autorizado'", [i.donation_id, i.interested_user_id]);
    }
    res.json({ ok: true });
  }));

  r.get('/donation-interests/:id/contact', exige, limite(30, 600000, 'contato'), h(async (req, res) => {
    const [[x]] = await db.query(`SELECT i.interested_user_id, i.status, d.phone, d.deleted_at, p.consent_status FROM donation_interests i
      JOIN donations d ON d.id=i.donation_id
      LEFT JOIN donation_contact_permissions p ON p.donation_id=i.donation_id AND p.interested_user_id=i.interested_user_id
      WHERE i.id=?`, [parseInt(req.params.id, 10)]);
    // Só o interessado, com solicitação aceita e autorização ativa, chega ao telefone
    if (!x || x.deleted_at || x.interested_user_id !== req.user.id || x.status !== 'aceito' || x.consent_status !== 'autorizado')
      return erro(res, 403, 'Você não tem autorização para ver este contato.');
    res.set('Cache-Control', 'no-store'); res.json({ telefone: decifrar(x.phone) });
  }));

  // ================= DENÚNCIAS =================
  r.post('/donations/:id/reports', exige, limite(10, 3600000, 'denuncia'), h(async (req, res) => {
    const id = parseInt(req.params.id, 10), b = req.body || {}, motivo = String(b.motivo || ''), desc = String(b.descricao || '').trim().slice(0, 500);
    if (!(await buscar(id))) return erro(res, 404, 'Publicação não encontrada.');
    if (!MOTIVOS.includes(motivo)) return erro(res, 400, 'Escolha um motivo para a denúncia.');
    let cid = null;
    if (b.comentarioId) {
      const [[c]] = await db.query('SELECT id FROM donation_comments WHERE id=? AND donation_id=?', [parseInt(b.comentarioId, 10), id]);
      if (!c) return erro(res, 404, 'Comentário não encontrado.'); cid = c.id;
    }
    const [[ja]] = await db.query('SELECT id FROM donation_reports WHERE reporter_user_id=? AND donation_id=? AND comment_id <=> ?', [req.user.id, id, cid]);
    if (ja) return erro(res, 409, 'Você já denunciou isto. Nossa equipe vai analisar.');
    // Denúncias nunca apagam nada sozinhas: ficam na fila para a moderação
    await db.query('INSERT INTO donation_reports (donation_id, comment_id, reporter_user_id, reason, description) VALUES (?,?,?,?,?)', [id, cid, req.user.id, motivo, desc || null]);
    res.status(201).json({ ok: true });
  }));

  // ================= AVISOS =================
  r.get('/donation-notifications', exige, h(async (req, res) => {
    const [rows] = await db.query('SELECT id, donation_id, message, is_read, created_at FROM donation_notifications WHERE user_id=? ORDER BY created_at DESC, id DESC LIMIT 30', [req.user.id]);
    res.json(rows.map(n => ({ id: n.id, texto: n.message, data: n.created_at, lida: !!n.is_read, doacaoId: n.donation_id })));
  }));
  r.put('/donation-notifications/lidas', exige, h(async (req, res) => {
    await db.query('UPDATE donation_notifications SET is_read=1 WHERE user_id=? AND is_read=0', [req.user.id]); res.json({ ok: true });
  }));

  return r;
};