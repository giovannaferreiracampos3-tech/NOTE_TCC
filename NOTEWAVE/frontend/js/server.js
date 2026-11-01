// NoteWave – API do Journal (Node.js + Express + MySQL)
// Como rodar:  npm install   e depois   node server.js
const express = require('express'), cors = require('cors'), mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken');

// ====== CONFIGURE AQUI ======
const DB = { host: 'localhost', user: 'root', password: 'SUA_SENHA_DO_MYSQL', database: 'tcc' };
const SEGREDO = 'troque-esta-frase-secreta', PORTA = 3001;
// ============================

const pool = mysql.createPool({ ...DB, waitForConnections: true, connectionLimit: 10 });
const app = express(); app.use(cors()); app.use(express.json({ limit: '300kb' }));
const CATS = ['teoria', 'dicas', 'curiosidades', 'resenhas', 'relatos', 'criacoes'], TIPOS = ['aprendi', 'adorei', 'inspirador', 'excelente'];
const rota = f => (q, s) => f(q, s).catch(e => { console.error(e); s.status(500).json({ erro: 'Erro no servidor. Veja o terminal.' }); });
const ler = q => { try { return jwt.verify((q.headers.authorization || '').slice(7), SEGREDO); } catch (e) { return null; } };
const exige = (q, s, n) => { q.u = ler(q); q.u ? n() : s.status(401).json({ erro: 'Entre na sua conta para continuar.' }); };
const dia = d => new Date(d).toLocaleDateString('sv-SE');
const txt = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const entrega = u => ({ token: jwt.sign({ id: u.id, nome: u.nome }, SEGREDO, { expiresIn: '7d' }), usuario: { id: u.id, nome: u.nome } });
const existe = async id => (await pool.query('SELECT id_publicacao FROM publicacoes WHERE id_publicacao = ?', [id]))[0][0];

// Só aceita os tipos de bloco que o Journal sabe desenhar (nada de HTML)
function limpar(blocos) {
  if (!Array.isArray(blocos)) return [];
  return blocos.slice(0, 80).map(b => {
    if (!b || typeof b !== 'object') return null;
    const t = txt(b.texto, 3000);
    if (['titulo', 'subtitulo', 'paragrafo', 'citacao'].includes(b.tipo)) return t && { tipo: b.tipo, texto: t };
    if (b.tipo === 'caixa') return t && { tipo: 'caixa', titulo: 'Você sabia?', texto: t };
    if (b.tipo === 'lista' && Array.isArray(b.itens)) { const itens = b.itens.slice(0, 40).map(i => txt(i, 500)).filter(Boolean); return itens.length && { tipo: 'lista', ordenada: !!b.ordenada, itens }; }
    return null;
  }).filter(Boolean);
}

app.post('/api/cadastro', rota(async (q, s) => {
  const nome = txt(q.body.nome, 100), email = txt(q.body.email, 100).toLowerCase(), senha = String(q.body.senha || '');
  if (nome.length < 2) return s.status(400).json({ erro: 'Digite seu nome.' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return s.status(400).json({ erro: 'Digite um e-mail válido.' });
  if (senha.length < 6) return s.status(400).json({ erro: 'A senha precisa ter pelo menos 6 caracteres.' });
  const [ja] = await pool.query('SELECT id_usuario FROM usuarios WHERE LOWER(email) = ?', [email]);
  if (ja.length) return s.status(409).json({ erro: 'Já existe uma conta com esse e-mail.' });
  const [r] = await pool.query('INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)', [nome, email, await bcrypt.hash(senha, 10)]);
  s.json(entrega({ id: r.insertId, nome }));
}));

app.post('/api/login', rota(async (q, s) => {
  const email = txt(q.body.email, 100).toLowerCase(), senha = String(q.body.senha || '');
  const [[u]] = await pool.query('SELECT * FROM usuarios WHERE LOWER(email) = ?', [email]);
  // aceita senhas já criptografadas (bcrypt) e contas antigas com senha em texto
  const ok = u && (String(u.senha).startsWith('$2') ? await bcrypt.compare(senha, u.senha) : u.senha === senha);
  if (!ok) return s.status(400).json({ erro: 'E-mail ou senha incorretos.' });
  s.json(entrega({ id: u.id_usuario, nome: u.nome }));
}));

app.get('/api/publicacoes', rota(async (q, s) => {
  const eu = (ler(q) || {}).id || 0;
  const [ps] = await pool.query(`SELECT p.id_publicacao id, p.titulo, p.resumo, p.categoria, p.blocos, p.criado_em, u.nome autor,
    (SELECT COUNT(*) FROM comentarios c WHERE c.id_publicacao = p.id_publicacao) comentarios,
    (SELECT tipo FROM reacoes r WHERE r.id_publicacao = p.id_publicacao AND r.id_usuario = ?) minha
    FROM publicacoes p JOIN usuarios u ON u.id_usuario = p.id_usuario ORDER BY p.criado_em DESC, p.id_publicacao DESC`, [eu]);
  const [rs] = await pool.query('SELECT id_publicacao id, tipo, COUNT(*) n FROM reacoes GROUP BY id_publicacao, tipo');
  s.json(ps.map(p => {
    const reacoes = { aprendi: 0, adorei: 0, inspirador: 0, excelente: 0 };
    rs.filter(r => r.id === p.id).forEach(r => reacoes[r.tipo] = Number(r.n));
    return { id: p.id, titulo: p.titulo, resumo: p.resumo, categoria: p.categoria, autor: p.autor, minha: p.minha, data: dia(p.criado_em), blocos: JSON.parse(p.blocos), reacoes, comentarios: Number(p.comentarios) };
  }));
}));

app.post('/api/publicacoes', exige, rota(async (q, s) => {
  const titulo = txt(q.body.titulo, 150), resumo = txt(q.body.resumo, 300), blocos = limpar(q.body.blocos);
  if (titulo.length < 5 || resumo.length < 10 || !blocos.length || !CATS.includes(q.body.categoria)) return s.status(400).json({ erro: 'Preencha título, categoria, resumo e conteúdo.' });
  const [r] = await pool.query('INSERT INTO publicacoes (id_usuario, titulo, resumo, categoria, blocos) VALUES (?, ?, ?, ?, ?)', [q.u.id, titulo, resumo, q.body.categoria, JSON.stringify(blocos)]);
  s.json({ id: r.insertId });
}));

app.get('/api/publicacoes/:id/comentarios', rota(async (q, s) => {
  const [l] = await pool.query('SELECT c.texto, c.criado_em, u.nome autor FROM comentarios c JOIN usuarios u ON u.id_usuario = c.id_usuario WHERE c.id_publicacao = ? ORDER BY c.criado_em, c.id_comentario', [q.params.id]);
  s.json(l.map(c => ({ autor: c.autor, texto: c.texto, data: dia(c.criado_em) })));
}));

app.post('/api/publicacoes/:id/comentarios', exige, rota(async (q, s) => {
  const texto = txt(q.body.texto, 1000), p = await existe(q.params.id);
  if (!texto) return s.status(400).json({ erro: 'Escreva um comentário.' });
  if (!p) return s.status(404).json({ erro: 'Publicação não encontrada.' });
  await pool.query('INSERT INTO comentarios (id_publicacao, id_usuario, texto) VALUES (?, ?, ?)', [p.id_publicacao, q.u.id, texto]);
  s.json({ ok: true });
}));

// Reagir: clicar na mesma reação de novo remove; clicar em outra troca
app.put('/api/publicacoes/:id/reacao', exige, rota(async (q, s) => {
  const tipo = q.body.tipo, p = await existe(q.params.id);
  if (!TIPOS.includes(tipo)) return s.status(400).json({ erro: 'Reação inválida.' });
  if (!p) return s.status(404).json({ erro: 'Publicação não encontrada.' });
  const [[atual]] = await pool.query('SELECT tipo FROM reacoes WHERE id_publicacao = ? AND id_usuario = ?', [p.id_publicacao, q.u.id]);
  if (atual && atual.tipo === tipo) { await pool.query('DELETE FROM reacoes WHERE id_publicacao = ? AND id_usuario = ?', [p.id_publicacao, q.u.id]); return s.json({ minha: null }); }
  await pool.query('INSERT INTO reacoes (id_publicacao, id_usuario, tipo) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE tipo = VALUES(tipo)', [p.id_publicacao, q.u.id, tipo]);
  s.json({ minha: tipo });
}));

// Cria as tabelas sozinho (não apaga nada que já exista) e liga o servidor
(async () => {
  const U = 'INT NOT NULL, FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE';
  await pool.query('CREATE TABLE IF NOT EXISTS usuarios (id_usuario INT AUTO_INCREMENT PRIMARY KEY, nome VARCHAR(100) NOT NULL, email VARCHAR(100) NOT NULL, senha VARCHAR(200) NOT NULL)');
  await pool.query(`CREATE TABLE IF NOT EXISTS publicacoes (id_publicacao INT AUTO_INCREMENT PRIMARY KEY, id_usuario ${U}, titulo VARCHAR(150) NOT NULL, resumo VARCHAR(300) NOT NULL, categoria VARCHAR(30) NOT NULL, blocos LONGTEXT NOT NULL, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS comentarios (id_comentario INT AUTO_INCREMENT PRIMARY KEY, id_publicacao INT NOT NULL, id_usuario ${U}, texto VARCHAR(1000) NOT NULL, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (id_publicacao) REFERENCES publicacoes(id_publicacao) ON DELETE CASCADE)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS reacoes (id_publicacao INT NOT NULL, id_usuario ${U}, tipo VARCHAR(20) NOT NULL, PRIMARY KEY (id_publicacao, id_usuario), FOREIGN KEY (id_publicacao) REFERENCES publicacoes(id_publicacao) ON DELETE CASCADE)`);
  app.listen(PORTA, () => console.log('NoteWave API rodando em http://localhost:' + PORTA));
})().catch(e => { console.error('Erro ao conectar no MySQL:', e.message); process.exit(1); });