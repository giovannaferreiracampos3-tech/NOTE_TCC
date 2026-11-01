/* journalApi.js – NoteWave Journal – API (Express + MySQL)
   Artigos são fixos (ficam no banco). Usuários logados podem: reagir, favoritar e comentar.
   Uso no server.js:  app.use('/api/journal', require('./journalApi')(db.promise()));
*/
const express = require('express');
const jwt = require('jsonwebtoken');

// O segredo precisa ser o MESMO que o server.js usa para criar o token de login.
const SEGREDO = process.env.JWT_SECRET || 'troque-este-segredo';

const CATEGORIAS = ['teoria', 'dicas', 'curiosidades', 'resenhas', 'relatos', 'criacoes'];
const REACOES = ['aprendi', 'adorei', 'inspirador', 'excelente'];

// Devolve o id_usuario de quem fez a requisição, ou null se não estiver logado.
function usuarioDaRequisicao(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try {
    const p = jwt.verify(h.slice(7), SEGREDO);
    return Number(p.id_usuario ?? p.id) || null;
  } catch (e) { return null; }
}

const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const lerJson = v => (typeof v === 'string' ? JSON.parse(v) : v) || [];
function minutos(blocos, resumo) {
  const palavras = (resumo + ' ' + blocos.map(b => (b.texto || '') + ' ' + (b.itens || []).join(' ')).join(' ')).split(/\s+/).length;
  return Math.max(1, Math.round(palavras / 200));
}

module.exports = function (db) {
  const router = express.Router();
  const seguro = fn => (req, res) => fn(req, res).catch(e => { console.error('ERRO NO JOURNAL:', e); res.status(500).json({ erro: 'Erro no servidor. Tente de novo.' }); });
  const exigir = (req, res) => {
    const id = usuarioDaRequisicao(req);
    if (!id) res.status(401).json({ erro: 'Entre na sua conta para fazer isso.' });
    return id;
  };

  const SELECT_BASE = `
    SELECT p.id_publicacao AS id, p.titulo, p.resumo, p.categoria, p.origem, p.destaque, p.blocos,
           p.criada_em AS data, p.autor,
           (SELECT COUNT(*) FROM comentarios c WHERE c.id_publicacao = p.id_publicacao) AS totalComentarios,
           (SELECT COUNT(*) FROM reacoes r WHERE r.id_publicacao = p.id_publicacao) AS totalReacoes,
           EXISTS(SELECT 1 FROM favoritos f WHERE f.id_publicacao = p.id_publicacao AND f.id_usuario = ?) AS favorito
    FROM publicacoes p`;

  const formatar = r => {
    const blocos = lerJson(r.blocos);
    return {
      id: r.id, titulo: r.titulo, resumo: r.resumo, categoria: r.categoria, origem: r.origem,
      destaque: !!r.destaque, autor: r.autor, data: r.data, minutos: minutos(blocos, r.resumo),
      totalComentarios: r.totalComentarios, totalReacoes: r.totalReacoes, favorito: !!r.favorito
    };
  };

  async function reacoesDe(idPub, eu) {
    const [linhas] = await db.query('SELECT tipo, COUNT(*) AS n FROM reacoes WHERE id_publicacao = ? GROUP BY tipo', [idPub]);
    const reacoes = { aprendi: 0, adorei: 0, inspirador: 0, excelente: 0 };
    linhas.forEach(l => { reacoes[l.tipo] = l.n; });
    let minha = null;
    if (eu) {
      const [m] = await db.query('SELECT tipo FROM reacoes WHERE id_publicacao = ? AND id_usuario = ?', [idPub, eu]);
      minha = m[0] ? m[0].tipo : null;
    }
    return { reacoes, minhaReacao: minha };
  }

  // ---------- LISTAR / BUSCAR ----------
  router.get('/artigos', seguro(async (req, res) => {
    const eu = usuarioDaRequisicao(req);
    const { cat, origem, q, ordem, favoritos } = req.query;
    const onde = [], args = [eu || 0];
    if (CATEGORIAS.includes(cat)) { onde.push('p.categoria = ?'); args.push(cat); }
    if (['equipe', 'comunidade'].includes(origem)) { onde.push('p.origem = ?'); args.push(origem); }
    if (favoritos === '1') {
      if (!eu) return res.status(401).json({ erro: 'Entre na sua conta para ver seus favoritos.' });
      onde.push('EXISTS(SELECT 1 FROM favoritos f2 WHERE f2.id_publicacao = p.id_publicacao AND f2.id_usuario = ?)'); args.push(eu);
    }
    String(q || '').trim().split(/\s+/).filter(Boolean).slice(0, 6).forEach(palavra => {
      onde.push('(p.titulo LIKE ? OR p.resumo LIKE ? OR p.autor LIKE ? OR CAST(p.blocos AS CHAR) LIKE ?)');
      const l = '%' + palavra.replace(/[%_\\]/g, '\\$&') + '%';
      args.push(l, l, l, l);
    });
    const sql = SELECT_BASE + (onde.length ? ' WHERE ' + onde.join(' AND ') : '') +
      ' ORDER BY p.criada_em ' + (ordem === 'antigos' ? 'ASC' : 'DESC') + ' LIMIT 60';
    const [linhas] = await db.query(sql, args);
    res.json(linhas.map(formatar));
  }));

  // ---------- LER UM ARTIGO (com reações e comentários) ----------
  router.get('/artigos/:id', seguro(async (req, res) => {
    const eu = usuarioDaRequisicao(req), id = Number(req.params.id);
    const [linhas] = await db.query(SELECT_BASE + ' WHERE p.id_publicacao = ?', [eu || 0, id]);
    if (!linhas[0]) return res.status(404).json({ erro: 'Publicação não encontrada.' });
    const [coms] = await db.query(
      `SELECT c.id_comentario AS id, c.texto, c.criado_em AS data, c.id_usuario AS idAutor, u.nome AS autor
       FROM comentarios c JOIN usuarios u ON u.id_usuario = c.id_usuario
       WHERE c.id_publicacao = ? ORDER BY c.criado_em ASC LIMIT 200`, [id]);
    res.json({
      ...formatar(linhas[0]), blocos: lerJson(linhas[0].blocos), ...(await reacoesDe(id, eu)),
      comentarios: coms.map(c => ({ id: c.id, texto: c.texto, data: c.data, autor: c.autor, meu: !!eu && c.idAutor === eu }))
    });
  }));

  // ---------- REAÇÃO (uma por pessoa; clicar na mesma remove) ----------
  router.put('/artigos/:id/reacao', seguro(async (req, res) => {
    const eu = exigir(req, res); if (!eu) return;
    const id = Number(req.params.id), tipo = req.body.tipo;
    if (!REACOES.includes(tipo)) return res.status(400).json({ erro: 'Reação inválida.' });
    const [atual] = await db.query('SELECT tipo FROM reacoes WHERE id_publicacao = ? AND id_usuario = ?', [id, eu]);
    if (atual[0] && atual[0].tipo === tipo) await db.query('DELETE FROM reacoes WHERE id_publicacao = ? AND id_usuario = ?', [id, eu]);
    else await db.query('INSERT INTO reacoes (id_publicacao, id_usuario, tipo) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE tipo = VALUES(tipo)', [id, eu, tipo]);
    res.json(await reacoesDe(id, eu));
  }));

  // ---------- FAVORITO ----------
  router.put('/artigos/:id/favorito', seguro(async (req, res) => {
    const eu = exigir(req, res); if (!eu) return;
    const id = Number(req.params.id);
    const [r] = await db.query('DELETE FROM favoritos WHERE id_publicacao = ? AND id_usuario = ?', [id, eu]);
    if (r.affectedRows) return res.json({ favorito: false });
    await db.query('INSERT INTO favoritos (id_publicacao, id_usuario) VALUES (?, ?)', [id, eu]);
    res.json({ favorito: true });
  }));

  router.get('/favoritos/total', seguro(async (req, res) => {
    const eu = usuarioDaRequisicao(req);
    if (!eu) return res.json({ total: 0 });
    const [r] = await db.query('SELECT COUNT(*) AS total FROM favoritos WHERE id_usuario = ?', [eu]);
    res.json({ total: r[0].total });
  }));

  // ---------- COMENTÁRIOS ----------
  router.post('/artigos/:id/comentarios', seguro(async (req, res) => {
    const eu = exigir(req, res); if (!eu) return;
    const t = texto(req.body.texto, 1000);
    if (t.length < 2) return res.status(400).json({ erro: 'Escreva o comentário antes de enviar.' });
    const [p] = await db.query('SELECT 1 FROM publicacoes WHERE id_publicacao = ?', [Number(req.params.id)]);
    if (!p[0]) return res.status(404).json({ erro: 'Publicação não encontrada.' });
    const [r] = await db.query('INSERT INTO comentarios (id_publicacao, id_usuario, texto) VALUES (?, ?, ?)', [Number(req.params.id), eu, t]);
    res.status(201).json({ id: r.insertId });
  }));

  router.delete('/comentarios/:id', seguro(async (req, res) => {
    const eu = exigir(req, res); if (!eu) return;
    const [r] = await db.query('DELETE FROM comentarios WHERE id_comentario = ? AND id_usuario = ?', [Number(req.params.id), eu]);
    if (!r.affectedRows) return res.status(403).json({ erro: 'Você só pode apagar os seus comentários.' });
    res.json({ ok: true });
  }));

  return router;
};