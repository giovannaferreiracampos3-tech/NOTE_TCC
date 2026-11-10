// ================================
// NOTEWAVE DOAÇÕES – API (Express + PostgreSQL)
// Uso no server.js:
//   const { Pool } = require('pg');
//   const db = new Pool({ connectionString: process.env.DATABASE_URL });
//   app.use('/api', require('./doacaoApi')(db));
// Dependência:       npm install multer pg   (Node 18+ por causa do fetch embutido)
// Variáveis .env:
//   JWT_SECRET   (mesmo do server.js)
//   DOACAO_KEY   (opcional: chave que criptografa os telefones; se faltar, usa o JWT_SECRET)
//   TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM  (envio de SMS; sem eles, só em desenvolvimento o código aparece no console)
//
// Fotos de perfil: as respostas trazem "autorFoto" (publicação e comentários) e "usuarioFoto" (interessados).
// São o caminho guardado em usuarios.foto (ex.: /uploads/avatars/12-1730700000.png) ou null.
// ================================
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer = require('multer');
const nuvem = require('./storage');
const { moderar } = require('./moderacao'); // mesmo filtro de palavras do Journal
// no topo do arquivo, junto das constantes
const SEM_LIMITE_SMS = process.env.NODE_ENV !== 'production' && process.env.SMS_SEM_LIMITE === '1';

const JWT_SECRET = process.env.JWT_SECRET || 'troque-este-segredo'; // mesmo do server.js
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') console.warn('DOACAO: defina JWT_SECRET no .env!');

const CATEGORIAS = ['corda', 'sopro', 'percussao', 'teclas', 'acessorios', 'outros'];
const STATUS = ['disponivel', 'em_processo', 'doada'];
const MOTIVOS = ['venda', 'cobranca', 'falsa', 'diferente', 'inadequado', 'golpe', 'dados', 'outros'];
const MAX_FOTOS = 6, MAX_MB = 5;

// ---------- helpers do Postgres ----------
// "cli" pode ser o pool ou uma conexão de transação (ambos têm .query)
const um = async (cli, sql, p) => (await cli.query(sql, p)).rows[0];       // primeira linha (ou undefined)
const todos = async (cli, sql, p) => (await cli.query(sql, p)).rows;       // todas as linhas
const rollback = cli => cli.query('ROLLBACK').catch(() => {});
// ids podem vir como número ou string (BIGINT) dependendo da coluna
const igual = (a, b) => a != null && b != null && Number(a) === Number(b);
// id vindo da URL/corpo: inteiro positivo válido, senão 0 (que não casa com nenhuma linha)
const idn = v => { const n = parseInt(v, 10); return Number.isSafeInteger(n) && n > 0 && n < 2147483647 ? n : 0; };

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

// ---------- verificação por SMS ----------
const CHAVE_HMAC = crypto.createHmac('sha256', CHAVE).update('verificacao-sms').digest(); // chave separada da usada na cifra
const hashTel = tel => crypto.createHmac('sha256', CHAVE_HMAC).update('tel:' + tel).digest('hex');
const hashCodigo = (uid, tel, cod) => crypto.createHmac('sha256', CHAVE_HMAC).update('cod:' + uid + ':' + tel + ':' + cod).digest('hex');
const CELULAR = /^\d{2}9\d{8}$/; // SMS só chega em celular (DDD + 9 + 8 dígitos)
const MSG_SMS = 'Confirme o código enviado ao seu e-mail antes de publicar.';

async function enviarSms(tel, texto) {
  const sid = process.env.TWILIO_SID, tok = process.env.TWILIO_TOKEN, from = process.env.TWILIO_FROM;
  if (!sid) { // sem provedor configurado: só em desenvolvimento
    if (process.env.NODE_ENV === 'production') throw new Error('SMS não configurado');
    console.log('[SMS DEV] +55' + tel + ' -> ' + texto); return;
  }
  const r = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + sid + '/Messages.json', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(sid + ':' + tok).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: '+55' + tel, From: from, Body: texto }),
    signal: AbortSignal.timeout(10000)
  });
  if (!r.ok) throw new Error('Falha no provedor de SMS: ' + r.status);
}

// Marca a verificação como usada (uso único). Roda DENTRO da transação de publicar/editar:
// se algo falhar depois, o rollback devolve o código como "não usado".
async function consumirVerificacao(conn, userId, tel, vid) {
  const r = await conn.query(
    `UPDATE donation_phone_verifications SET used_at=now()
     WHERE id=$1 AND user_id=$2 AND phone_hash=$3 AND verified_at IS NOT NULL AND used_at IS NULL
       AND verified_at > now() - INTERVAL '30 minutes'`, [idn(vid), userId, hashTel(tel)]);
  return r.rowCount === 1;
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
const apagarArquivos = caminhos => Promise.all(caminhos.map(c => nuvem.apagarCaminho(c)));

// `db` deve ser um pg.Pool
module.exports = (db, transporter) => {
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
    if (a.startsWith('Bearer ')) { try { const p = jwt.verify(a.slice(7), JWT_SECRET); req.user = { id: Number(p.id_usuario ?? p.id), nome: p.nome }; } catch (e) { /* token inválido = visitante */ } }
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

  const notificar = (conn, userId, donId, msg) => conn.query('INSERT INTO donation_notifications (user_id, donation_id, message) VALUES ($1,$2,$3)', [userId, donId, msg]);
  const buscar = id => um(db, 'SELECT * FROM donations WHERE id=$1 AND deleted_at IS NULL', [id]);

  // Comentário no formato que o front espera (com a foto de quem comentou)
  const comentarioJson = (c, req) => ({
    id: c.id, autor: nomePublico(c.nome), autorFoto: c.foto || null,
    texto: c.comment, data: c.created_at, meu: !!req.user && igual(req.user.id, c.user_id), paiId: c.parent_comment_id
  });

  // ---------- validação dos campos de publicação ----------
  // O celular é opcional. Se vier preenchido, precisa ser celular válido (a confirmação por SMS é conferida depois).
  function lerCampos(b) {
    const nome = String(b.nome || '').trim(), categoria = String(b.categoria || ''), descricao = String(b.descricao || '').trim(), cidade = String(b.cidade || '').trim();
    const tel = String(b.telefone || '').replace(/\D/g, '');
    if (nome.length < 3 || nome.length > 80) return { e: 'O nome do instrumento deve ter entre 3 e 80 caracteres.' };
    if (!CATEGORIAS.includes(categoria)) return { e: 'Escolha uma categoria válida.' };
    if (descricao.length < 20 || descricao.length > 1000) return { e: 'A descrição deve ter entre 20 e 1000 caracteres.' };
    if (cidade.length > 60) return { e: 'O município pode ter no máximo 60 caracteres.' };
    if (tel && !CELULAR.test(tel)) return { e: 'Informe um celular válido com DDD (ex.: 19 91234-5678).' };
    const p = proibido(nome) || proibido(descricao) || (cidade && proibido(cidade));
    if (p) return { e: p };
    const mod = moderar({ 'nome do instrumento': nome, 'descrição': descricao, ...(cidade ? { 'município': cidade } : {}) });
    if (!mod.ok) return { e: mod.mensagem };
    return { nome, categoria, descricao, cidade: cidade || null, tel };
  }
  // As 4 primeiras confirmações são sempre obrigatórias; a 5ª (sobre o telefone) só quando há telefone.
  function confirmou(b, comTel) {
    try {
      const c = JSON.parse(b.confirmacoes);
      return Array.isArray(c) && c.length === 5 && c.slice(0, 4).every(x => x === true) && (!comTel || c[4] === true);
    } catch (e) { return false; }
  }
  function validarArquivos(files) {
    const out = [];
    for (const f of files || []) { const t = tipoReal(f.buffer); if (!t) return { e: 'Uma das fotos não é uma imagem válida (use JPG, PNG ou WEBP).' }; out.push({ buf: f.buffer, nome: 'doacao/' + crypto.randomBytes(16).toString('hex') + '.' + t }); }
    return { arquivos: out };
  }
  const TIPOS_IMG = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const salvar = arqs => Promise.all(arqs.map(a => nuvem.enviar(a.nome, a.buf, TIPOS_IMG[a.nome.split('.').pop()])));

  // ================= CONFIRMAÇÃO DE TELEFONE POR EMAIL =================
  r.post('/donations/phone/send-code', exige,
    (req, res, next) => SEM_LIMITE_SMS ? next() : limite(5, 3600000, 'sms')(req, res, next),
    h(async (req, res) => {
      const tel = String((req.body || {}).telefone || '').replace(/\D/g, '');
      if (!CELULAR.test(tel)) return erro(res, 400, 'Informe um celular válido com DDD.');
      const ph = hashTel(tel);

      if (!SEM_LIMITE_SMS) {
        const u = await um(db, 'SELECT EXTRACT(EPOCH FROM (now() - created_at))::int AS s FROM donation_phone_verifications WHERE user_id=$1 ORDER BY id DESC LIMIT 1', [req.user.id]);
        if (u && u.s < 60) return erro(res, 429, 'Aguarde ' + (60 - u.s) + ' segundos para pedir outro código.');
      }

      // o código vai para o e-mail da conta de quem está logado
      const usuario = await um(db, 'SELECT email, nome FROM usuarios WHERE id_usuario=$1', [req.user.id]);
      if (!usuario || !usuario.email) return erro(res, 400, 'Sua conta não tem e-mail cadastrado.');

      const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
      const ins = await um(db, `INSERT INTO donation_phone_verifications (user_id, phone_hash, code_hash, expires_at) VALUES ($1,$2,$3, now() + INTERVAL '10 minutes') RETURNING id`,
        [req.user.id, ph, hashCodigo(req.user.id, tel, codigo)]);

      try {
        await transporter.sendMail({
          from: `"NoteWave" <${process.env.EMAIL_USER}>`,
          to: usuario.email,
          subject: 'Seu código de confirmação - NoteWave',
          text: `Olá, ${usuario.nome}!\n\nSeu código de confirmação é ${codigo}.\nEle vale por 10 minutos. Não compartilhe com ninguém.`
        });
      } catch (e) {
        console.error('EMAIL:', e.message);
        await db.query('DELETE FROM donation_phone_verifications WHERE id=$1', [ins.id]); // não conta como envio
        return erro(res, 502, 'Não foi possível enviar o e-mail agora. Tente de novo em instantes.');
      }
      res.json({ ok: true });
    }));


  // ================= PUBLICAÇÕES =================
  const item = x => ({
    id: x.id, nome: x.instrument_name, categoria: x.category,
    resumo: x.description.length > 120 ? x.description.slice(0, 117).trimEnd() + '…' : x.description,
    autor: nomePublico(x.autor_nome), autorFoto: x.autor_foto || null,
    data: x.created_at, status: x.status, totalComentarios: x.total_comentarios,
    imagem: x.imagem ? '/uploads/' + x.imagem : null,
    totalInteressados: x.total_interessados, pendentes: x.pendentes
  });

  r.get('/donations/resumo', h(async (req, res) => {
    const rows = await todos(db, 'SELECT status, COUNT(*)::int AS n FROM donations WHERE deleted_at IS NULL GROUP BY status');
    const n = s => (rows.find(x => x.status === s) || { n: 0 }).n;
    res.json({ disponiveis: n('disponivel'), emProcesso: n('em_processo'), concluidas: n('doada') });
  }));

  r.get('/donations', h(async (req, res) => {
    const q = String(req.query.q || '').trim().slice(0, 80), categoria = String(req.query.categoria || ''), status = String(req.query.status || ''), cidade = String(req.query.cidade || '').trim().slice(0, 60);
    const minhas = req.query.minhas === '1';
    const limite_ = Math.min(50, Math.max(1, parseInt(req.query.limite, 10) || 12)), pagina = Math.max(1, parseInt(req.query.pagina, 10) || 1);
    const w = ['d.deleted_at IS NULL'], p = [];
    const arg = v => { p.push(v); return '$' + p.length; };   // adiciona o valor e devolve o $n
    if (minhas) { if (!req.user) return erro(res, 401, 'Entre na sua conta para ver suas doações.'); w.push('d.user_id=' + arg(req.user.id)); }
    if (q) w.push('d.instrument_name ILIKE ' + arg('%' + likeSeguro(q) + '%'));
    if (CATEGORIAS.includes(categoria)) w.push('d.category=' + arg(categoria));
    if (STATUS.includes(status)) w.push('d.status=' + arg(status));
    if (cidade) w.push('d.city ILIKE ' + arg('%' + likeSeguro(cidade) + '%'));
    const where = w.join(' AND ');
    // a contagem usa só os parâmetros dos filtros; limite/offset entram depois
    const { total } = await um(db, 'SELECT COUNT(*)::int AS total FROM donations d WHERE ' + where, p);
    const extra = minhas ? `, (SELECT COUNT(*)::int FROM donation_interests i WHERE i.donation_id=d.id) AS total_interessados, (SELECT COUNT(*)::int FROM donation_interests i WHERE i.donation_id=d.id AND i.status='pendente') AS pendentes` : '';
    const lim = arg(limite_), off = arg((pagina - 1) * limite_);
    const rows = await todos(db,
      `SELECT d.id, d.instrument_name, d.category, d.description, d.status, d.created_at, u.nome AS autor_nome, u.foto AS autor_foto,
        (SELECT image_path FROM donation_images WHERE donation_id=d.id ORDER BY "position", id LIMIT 1) AS imagem,
        (SELECT COUNT(*)::int FROM donation_comments c WHERE c.donation_id=d.id) AS total_comentarios ${extra}
       FROM donations d JOIN usuarios u ON u.id_usuario=d.user_id WHERE ${where}
       ORDER BY (d.status='disponivel') DESC, d.created_at DESC, d.id DESC LIMIT ${lim} OFFSET ${off}`, p);
    res.json({ itens: rows.map(item), total, pagina, paginas: Math.max(1, Math.ceil(total / limite_)) });
  }));

  r.get('/donations/:id', h(async (req, res) => {
    const id = idn(req.params.id);
    const d = await um(db, 'SELECT d.*, u.nome AS autor_nome, u.foto AS autor_foto FROM donations d JOIN usuarios u ON u.id_usuario=d.user_id WHERE d.id=$1 AND d.deleted_at IS NULL', [id]);
    if (!d) return erro(res, 404, 'Publicação não encontrada.');
    const imgs = await todos(db, 'SELECT id, image_path FROM donation_images WHERE donation_id=$1 ORDER BY "position", id', [id]);
    const coms = await todos(db, 'SELECT c.id, c.user_id, c.parent_comment_id, c.comment, c.created_at, u.nome, u.foto FROM donation_comments c JOIN usuarios u ON u.id_usuario=c.user_id WHERE c.donation_id=$1 ORDER BY c.created_at, c.id', [id]);
    let meuInteresse = null;
    if (req.user) {
      const i = await um(db, `SELECT i.id, i.status, (p.consent_status='autorizado') AS liberado FROM donation_interests i
        LEFT JOIN donation_contact_permissions p ON p.donation_id=i.donation_id AND p.interested_user_id=i.interested_user_id
        WHERE i.donation_id=$1 AND i.interested_user_id=$2`, [id, req.user.id]);
      if (i) meuInteresse = { id: i.id, status: i.status, contatoLiberado: !!i.liberado };
    }
    const dono = !!req.user && igual(req.user.id, d.user_id);
    // O telefone NUNCA sai nesta rota; só o dono sabe se existe um cadastrado
    res.json({
      id: d.id, nome: d.instrument_name, categoria: d.category, descricao: d.description, cidade: d.city,
      autor: nomePublico(d.autor_nome), autorFoto: d.autor_foto || null,
      data: d.created_at, status: d.status, meu: dono, temTelefone: dono ? !!d.phone : undefined,
      imagens: imgs.map(x => ({ id: x.id, url: '/uploads/' + x.image_path })), meuInteresse,
      comentarios: coms.map(c => comentarioJson(c, req))
    });
  }));

  r.post('/donations', exige, limite(10, 3600000, 'publicar'), receber, h(async (req, res) => {
    const c = lerCampos(req.body || {}); if (c.e) return erro(res, 400, c.e);
    if (!confirmou(req.body || {}, !!c.tel)) return erro(res, 400, 'Marque todas as confirmações para publicar.');
    const v = validarArquivos(req.files); if (v.e) return erro(res, 400, v.e);
    const conn = await db.connect();
    try {
      await conn.query('BEGIN');
      if (c.tel && !(await consumirVerificacao(conn, req.user.id, c.tel, req.body.verificacaoId))) { await rollback(conn); return erro(res, 400, MSG_SMS); }
      const ins = await um(conn, `INSERT INTO donations (user_id, instrument_name, category, description, city, phone, phone_verified_at, consent_at)
        VALUES ($1,$2,$3,$4,$5,$6, CASE WHEN $7::boolean THEN now() END, now()) RETURNING id`,
        [req.user.id, c.nome, c.categoria, c.descricao, c.cidade, c.tel ? cifrar(c.tel) : null, !!c.tel]);
        await salvar(v.arquivos);
      for (let i = 0; i < v.arquivos.length; i++) await conn.query('INSERT INTO donation_images (donation_id, image_path, "position") VALUES ($1,$2,$3)', [ins.id, v.arquivos[i].nome, i]);
      await conn.query('COMMIT'); res.status(201).json({ id: ins.id });
    } catch (e) { await rollback(conn); apagarArquivos(v.arquivos.map(a => a.nome)); throw e; } finally { conn.release(); }
  }));

  r.put('/donations/:id', exige, receber, h(async (req, res) => {
    const id = idn(req.params.id), d = await buscar(id);
    if (!d) return erro(res, 404, 'Publicação não encontrada.');
    if (!igual(d.user_id, req.user.id)) return erro(res, 403, 'Você só pode editar as suas próprias publicações.');
    const b = req.body || {};
    const c = lerCampos(b); if (c.e) return erro(res, 400, c.e);
    if (c.tel && !confirmou(b, true)) return erro(res, 400, 'Para trocar o telefone, marque todas as confirmações.');
    const v = validarArquivos(req.files); if (v.e) return erro(res, 400, v.e);
    let manter = []; try { manter = JSON.parse(b.manter || '[]').map(Number); } catch (e) { manter = []; }
    const atuais = await todos(db, 'SELECT id, image_path FROM donation_images WHERE donation_id=$1', [id]);
    const ficam = manter.filter(m => atuais.some(a => Number(a.id) === m)), sai = atuais.filter(a => !ficam.includes(Number(a.id)));
    if (ficam.length + v.arquivos.length > MAX_FOTOS) return erro(res, 400, 'Máximo de ' + MAX_FOTOS + ' fotos.');
    const conn = await db.connect();
    try {
      await conn.query('BEGIN');
      if (c.tel && !(await consumirVerificacao(conn, req.user.id, c.tel, b.verificacaoId))) { await rollback(conn); return erro(res, 400, MSG_SMS); }
      await conn.query('UPDATE donations SET instrument_name=$1, category=$2, description=$3, city=$4 WHERE id=$5', [c.nome, c.categoria, c.descricao, c.cidade, id]);
      if (c.tel) { // telefone novo: confirmado por SMS, novo consentimento e todas as liberações anteriores são revogadas
        await conn.query('UPDATE donations SET phone=$1, phone_verified_at=now(), consent_at=now() WHERE id=$2', [cifrar(c.tel), id]);
        await conn.query("UPDATE donation_contact_permissions SET consent_status='revogado', revoked_at=now() WHERE donation_id=$1 AND consent_status='autorizado'", [id]);
      }
      if (sai.length) await conn.query('DELETE FROM donation_images WHERE id = ANY($1::int[])', [sai.map(s => Number(s.id))]);
      await salvar(v.arquivos);
      for (const a of v.arquivos) { const ins = await um(conn, 'INSERT INTO donation_images (donation_id, image_path) VALUES ($1,$2) RETURNING id', [id, a.nome]); ficam.push(Number(ins.id)); }
      for (let i = 0; i < ficam.length; i++) await conn.query('UPDATE donation_images SET "position"=$1 WHERE id=$2', [i, ficam[i]]);
      await conn.query('COMMIT'); apagarArquivos(sai.map(s => s.image_path)); res.json({ id });
    } catch (e) { await rollback(conn); apagarArquivos(v.arquivos.map(a => a.nome)); throw e; } finally { conn.release(); }
  }));

  r.put('/donations/:id/status', exige, h(async (req, res) => {
    const id = idn(req.params.id), d = await buscar(id), novo = String((req.body || {}).status || '');
    if (!d) return erro(res, 404, 'Publicação não encontrada.');
    if (!igual(d.user_id, req.user.id)) return erro(res, 403, 'Você só pode alterar as suas próprias publicações.');
    if (!STATUS.includes(novo)) return erro(res, 400, 'Situação inválida.');
    const conn = await db.connect();
    try {
      await conn.query('BEGIN');
      await conn.query('UPDATE donations SET status=$1 WHERE id=$2', [novo, id]);
      if (novo === 'doada') { // fecha o que ficou pendente e avisa quem esperava
        const pend = await todos(conn, "SELECT interested_user_id AS u FROM donation_interests WHERE donation_id=$1 AND status='pendente'", [id]);
        await conn.query("UPDATE donation_interests SET status='recusado' WHERE donation_id=$1 AND status='pendente'", [id]);
        for (const p of pend) await notificar(conn, p.u, id, 'O instrumento "' + d.instrument_name + '" já foi doado para outra pessoa.');
      }
      await conn.query('COMMIT'); res.json({ status: novo });
    } catch (e) { await rollback(conn); throw e; } finally { conn.release(); }
  }));

  r.delete('/donations/:id', exige, h(async (req, res) => {
    const id = idn(req.params.id), d = await buscar(id);
    if (!d) return erro(res, 404, 'Publicação não encontrada.');
    if (!igual(d.user_id, req.user.id)) return erro(res, 403, 'Você só pode excluir as suas próprias publicações.');
    const conn = await db.connect(); // exclusão lógica: preserva histórico para auditoria
    try {
      await conn.query('BEGIN');
      await conn.query('UPDATE donations SET deleted_at=now() WHERE id=$1', [id]);
      await conn.query("UPDATE donation_contact_permissions SET consent_status='revogado', revoked_at=now() WHERE donation_id=$1 AND consent_status='autorizado'", [id]);
      await conn.query('COMMIT'); res.json({ ok: true });
    } catch (e) { await rollback(conn); throw e; } finally { conn.release(); }
  }));

  // ================= COMENTÁRIOS =================
  r.get('/donations/:id/comments', h(async (req, res) => {
    const id = idn(req.params.id); if (!(await buscar(id))) return erro(res, 404, 'Publicação não encontrada.');
    const coms = await todos(db, 'SELECT c.id, c.user_id, c.parent_comment_id, c.comment, c.created_at, u.nome, u.foto FROM donation_comments c JOIN usuarios u ON u.id_usuario=c.user_id WHERE c.donation_id=$1 ORDER BY c.created_at, c.id', [id]);
    res.json(coms.map(c => comentarioJson(c, req)));
  }));

  r.post('/donations/:id/comments', exige, limite(20, 600000, 'comentar'), h(async (req, res) => {
    const b = req.body || {}, id = idn(req.params.id), texto = String(b.texto || '').trim();
    if (!(await buscar(id))) return erro(res, 404, 'Publicação não encontrada.');
    if (!texto) return erro(res, 400, 'Escreva alguma coisa antes de comentar.');
    if (texto.length > 500) return erro(res, 400, 'O comentário pode ter no máximo 500 caracteres.');
    const p = proibido(texto); if (p) return erro(res, 400, p);
    const mod = moderar({ 'comentário': texto }); if (!mod.ok) return erro(res, 422, mod.mensagem);
    let pai = null;
    if (b.paiId) {
      const c = await um(db, 'SELECT id, parent_comment_id FROM donation_comments WHERE id=$1 AND donation_id=$2', [idn(b.paiId), id]);
      if (!c) return erro(res, 400, 'O comentário que você quer responder não existe mais.');
      pai = c.parent_comment_id || c.id; // respostas ficam em um só nível
    }
    const ins = await um(db, 'INSERT INTO donation_comments (donation_id, user_id, parent_comment_id, comment) VALUES ($1,$2,$3,$4) RETURNING id', [id, req.user.id, pai, texto]);
    res.status(201).json({ id: ins.id });
  }));

  r.delete('/donation-comments/:id', exige, h(async (req, res) => {
    const id = idn(req.params.id);
    const c = await um(db, 'SELECT c.id, c.user_id, d.user_id AS dono FROM donation_comments c JOIN donations d ON d.id=c.donation_id WHERE c.id=$1', [id]);
    if (!c) return erro(res, 404, 'Comentário não encontrado.');
    if (!igual(c.user_id, req.user.id) && !igual(c.dono, req.user.id)) return erro(res, 403, 'Você não pode excluir este comentário.');
    await db.query('DELETE FROM donation_comments WHERE id=$1', [id]); res.json({ ok: true });
  }));

  // ================= INTERESSE =================
  r.post('/donations/:id/interests', exige, limite(20, 3600000, 'interesse'), h(async (req, res) => {
    const id = idn(req.params.id), d = await buscar(id);
    if (!d) return erro(res, 404, 'Publicação não encontrada.');
    if (d.status === 'doada') return erro(res, 409, 'Esta publicação não está mais disponível.');
    if (igual(d.user_id, req.user.id)) return erro(res, 400, 'Você não pode pedir o seu próprio instrumento.');
    const conn = await db.connect();
    try {
      await conn.query('BEGIN');
      const ins = await um(conn, 'INSERT INTO donation_interests (donation_id, interested_user_id) VALUES ($1,$2) RETURNING id', [id, req.user.id]);
      const eu = await um(conn, 'SELECT nome FROM usuarios WHERE id_usuario=$1', [req.user.id]);
      await notificar(conn, d.user_id, id, nomePublico(eu && eu.nome) + ' tem interesse no seu instrumento "' + d.instrument_name + '".');
      await conn.query('COMMIT'); res.status(201).json({ id: ins.id });
    } catch (e) {
      await rollback(conn);
      if (e.code === '23505') return erro(res, 409, 'Sua solicitação já foi registrada.'); // unique_violation
      throw e;
    } finally { conn.release(); }
  }));

  r.get('/donations/:id/interests', exige, h(async (req, res) => {
    const id = idn(req.params.id), d = await buscar(id);
    if (!d) return erro(res, 404, 'Publicação não encontrada.');
    if (!igual(d.user_id, req.user.id)) return erro(res, 403, 'Somente o responsável vê as solicitações.');
    const rows = await todos(db, `SELECT i.id, i.status, i.created_at, u.nome, u.foto, (p.consent_status='autorizado') AS liberado FROM donation_interests i
      JOIN usuarios u ON u.id_usuario=i.interested_user_id
      LEFT JOIN donation_contact_permissions p ON p.donation_id=i.donation_id AND p.interested_user_id=i.interested_user_id
      WHERE i.donation_id=$1 ORDER BY i.created_at`, [id]);
    res.json(rows.map(x => ({ id: x.id, usuario: nomePublico(x.nome), usuarioFoto: x.foto || null, data: x.created_at, status: x.status, contatoLiberado: !!x.liberado })));
  }));

  // Carrega uma solicitação garantindo que quem pede é o dono da doação
  async function interesseDoDono(req, res) {
    const i = await um(db, `SELECT i.*, d.user_id AS dono, d.status AS dstatus, d.instrument_name AS nome, d.deleted_at, d.phone AS fone FROM donation_interests i JOIN donations d ON d.id=i.donation_id WHERE i.id=$1`, [idn(req.params.id)]);
    if (!i || i.deleted_at) { erro(res, 404, 'Solicitação não encontrada.'); return null; }
    if (!igual(i.dono, req.user.id)) { erro(res, 403, 'Somente o responsável pode fazer isso.'); return null; }
    return i;
  }

  r.put('/donation-interests/:id', exige, h(async (req, res) => {
    const i = await interesseDoDono(req, res); if (!i) return;
    const acao = String((req.body || {}).acao || '');
    if (!['aceitar', 'recusar'].includes(acao)) return erro(res, 400, 'Ação inválida.');
    if (i.dstatus === 'doada') return erro(res, 409, 'Esta doação já foi concluída.');
    if (i.status !== 'pendente') return erro(res, 409, 'Esta solicitação já foi respondida.');
    const conn = await db.connect();
    try {
      await conn.query('BEGIN');
      await conn.query('UPDATE donation_interests SET status=$1 WHERE id=$2', [acao === 'aceitar' ? 'aceito' : 'recusado', i.id]);
      if (acao === 'aceitar' && i.dstatus === 'disponivel') await conn.query("UPDATE donations SET status='em_processo' WHERE id=$1", [i.donation_id]);
      await notificar(conn, i.interested_user_id, i.donation_id, acao === 'aceitar'
        ? 'Sua solicitação para "' + i.nome + '" foi aceita! O responsável poderá liberar o contato.'
        : 'Sua solicitação para "' + i.nome + '" não foi aceita desta vez.');
      await conn.query('COMMIT'); res.json({ ok: true });
    } catch (e) { await rollback(conn); throw e; } finally { conn.release(); }
  }));

  // ================= COMPARTILHAMENTO DO TELEFONE =================
  r.post('/donation-interests/:id/contact-consent', exige, h(async (req, res) => {
    const i = await interesseDoDono(req, res); if (!i) return;
    const autorizar = (req.body || {}).autorizar === true;
    if (autorizar) {
      if (i.dstatus === 'doada') return erro(res, 409, 'Esta doação já foi concluída.');
      if (i.status !== 'aceito') return erro(res, 409, 'Aceite a solicitação antes de compartilhar o telefone.');
      if (!i.fone) return erro(res, 409, 'Você não cadastrou um telefone nesta publicação. Edite-a para adicionar um.');
      await db.query(`INSERT INTO donation_contact_permissions (donation_id, interested_user_id, authorized_by_user_id, consent_status, authorized_at)
        VALUES ($1,$2,$3,'autorizado',now())
        ON CONFLICT (donation_id, interested_user_id) DO UPDATE SET authorized_by_user_id=EXCLUDED.authorized_by_user_id, consent_status='autorizado', authorized_at=now(), revoked_at=NULL`,
        [i.donation_id, i.interested_user_id, req.user.id]);
      await notificar(db, i.interested_user_id, i.donation_id, 'O responsável liberou o telefone para "' + i.nome + '". Abra a publicação para ver.');
    } else {
      await db.query("UPDATE donation_contact_permissions SET consent_status='revogado', revoked_at=now() WHERE donation_id=$1 AND interested_user_id=$2 AND consent_status='autorizado'", [i.donation_id, i.interested_user_id]);
    }
    res.json({ ok: true });
  }));

  r.get('/donation-interests/:id/contact', exige, limite(30, 600000, 'contato'), h(async (req, res) => {
    const x = await um(db, `SELECT i.interested_user_id, i.status, d.phone, d.deleted_at, p.consent_status FROM donation_interests i
      JOIN donations d ON d.id=i.donation_id
      LEFT JOIN donation_contact_permissions p ON p.donation_id=i.donation_id AND p.interested_user_id=i.interested_user_id
      WHERE i.id=$1`, [idn(req.params.id)]);
    // Só o interessado, com solicitação aceita e autorização ativa, chega ao telefone
    if (!x || x.deleted_at || !igual(x.interested_user_id, req.user.id) || x.status !== 'aceito' || x.consent_status !== 'autorizado')
      return erro(res, 403, 'Você não tem autorização para ver este contato.');
    if (!x.phone) return erro(res, 404, 'O responsável não cadastrou telefone nesta publicação.');
    res.set('Cache-Control', 'no-store'); res.json({ telefone: decifrar(x.phone) });
  }));

  // ================= DENÚNCIAS =================
  r.post('/donations/:id/reports', exige, limite(10, 3600000, 'denuncia'), h(async (req, res) => {
    const id = idn(req.params.id), b = req.body || {}, motivo = String(b.motivo || ''), desc = String(b.descricao || '').trim().slice(0, 500);
    if (!(await buscar(id))) return erro(res, 404, 'Publicação não encontrada.');
    if (!MOTIVOS.includes(motivo)) return erro(res, 400, 'Escolha um motivo para a denúncia.');
    let cid = null;
    if (b.comentarioId) {
      const c = await um(db, 'SELECT id FROM donation_comments WHERE id=$1 AND donation_id=$2', [idn(b.comentarioId), id]);
      if (!c) return erro(res, 404, 'Comentário não encontrado.'); cid = c.id;
    }
    const ja = await um(db, 'SELECT id FROM donation_reports WHERE reporter_user_id=$1 AND donation_id=$2 AND comment_id IS NOT DISTINCT FROM $3::int', [req.user.id, id, cid]);
    if (ja) return erro(res, 409, 'Você já denunciou isso. Nossa equipe vai analisar.');
    // Denúncias nunca apagam nada sozinhas: ficam na fila para a moderação
    await db.query('INSERT INTO donation_reports (donation_id, comment_id, reporter_user_id, reason, description) VALUES ($1,$2,$3,$4,$5)', [id, cid, req.user.id, motivo, desc || null]);
    res.status(201).json({ ok: true });
  }));

  // ================= AVISOS =================
  r.get('/donation-notifications', exige, h(async (req, res) => {
    const rows = await todos(db, 'SELECT id, donation_id, message, is_read, created_at FROM donation_notifications WHERE user_id=$1 ORDER BY created_at DESC, id DESC LIMIT 30', [req.user.id]);
    res.json(rows.map(n => ({ id: n.id, texto: n.message, data: n.created_at, lida: !!n.is_read, doacaoId: n.donation_id })));
  }));
  r.put('/donation-notifications/lidas', exige, h(async (req, res) => {
    await db.query('UPDATE donation_notifications SET is_read=TRUE WHERE user_id=$1 AND is_read=FALSE', [req.user.id]); res.json({ ok: true });
  }));

  r.put('/donation-notifications/:id/lida', exige, h(async (req, res) => {
    await db.query('UPDATE donation_notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2', [idn(req.params.id), req.user.id]);
    res.json({ ok: true });
  }));

  r.post('/donations/phone/verify-code', exige, limite(15, 3600000, 'sms-verif'), h(async (req, res) => {
    const b = req.body || {}, tel = String(b.telefone || '').replace(/\D/g, ''), cod = String(b.codigo || '').replace(/\D/g, '');
    if (!CELULAR.test(tel) || cod.length !== 6) return erro(res, 400, 'Informe o telefone e o código de 6 números.');
    const v = await um(db, 'SELECT id, code_hash, attempts, (expires_at < now()) AS expirou FROM donation_phone_verifications WHERE user_id=$1 AND phone_hash=$2 AND verified_at IS NULL ORDER BY id DESC LIMIT 1', [req.user.id, hashTel(tel)]);
    if (!v) return erro(res, 400, 'Peça um novo código por e-mail.');
    if (v.expirou || v.attempts >= 5) return erro(res, 400, 'Código expirado ou com muitas tentativas. Peça um novo.');
    // contagem atômica: requisições simultâneas não conseguem passar de 5 tentativas
    const inc = await db.query('UPDATE donation_phone_verifications SET attempts=attempts+1 WHERE id=$1 AND attempts<5', [v.id]);
    if (inc.rowCount !== 1) return erro(res, 400, 'Código expirado ou com muitas tentativas. Peça um novo.');
    const certo = crypto.timingSafeEqual(Buffer.from(v.code_hash, 'hex'), Buffer.from(hashCodigo(req.user.id, tel, cod), 'hex'));
    if (!certo) return erro(res, 400, 'Código incorreto.');
    const ok = await db.query('UPDATE donation_phone_verifications SET verified_at=now() WHERE id=$1 AND verified_at IS NULL', [v.id]);
    if (ok.rowCount !== 1) return erro(res, 400, 'Peça um novo código por e-mail.');
    res.json({ verificacaoId: v.id });
  }));

  // limpeza de registros antigos
  setInterval(() => { db.query(`DELETE FROM donation_phone_verifications WHERE created_at < now() - INTERVAL '1 day'`).catch(() => {}); }, 3600000).unref();

  return r;
};