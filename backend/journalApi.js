/* journalApi.js – NoteWave Journal – API (Express + MySQL)
   Artigos da equipe ficam no banco. Usuários logados podem: reagir, favoritar, comentar,
   PUBLICAR os próprios artigos (com imagem de capa) e APAGÁ-LOS.
   Uso no server.js:  app.use('/api/journal', require('./journalApi')(db.promise()));
*/
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { moderar } = require('./moderacao');

// O segredo precisa ser o MESMO que o server.js usa para criar o token de login.
const SEGREDO = process.env.JWT_SECRET || 'troque-este-segredo';

// Endereço público da API (usado para montar o link das imagens de capa)
const URL_BASE = process.env.API_URL || 'http://localhost:5000';
const PASTA_IMAGENS = path.join(__dirname, 'uploads', 'journal');

const CATEGORIAS = ['teoria', 'dicas', 'curiosidades', 'resenhas', 'relatos', 'criacoes', 'acessiveis', 'corpo', 'cultura', 'notinha'];
const CATEGORIAS_USUARIO = CATEGORIAS.filter(c => c !== 'notinha'); // "Notinha Explica" é só da equipe
const REACOES = ['aprendi', 'adorei', 'inspirador', 'excelente'];
const MAX_IMAGEM = 2 * 1024 * 1024;   // 2 MB (o navegador já reduz antes de enviar)
const MAX_POSTS_POR_HORA = 5;

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

// Aceita só os tipos de bloco que o usuário pode criar; descarta qualquer outra coisa
function limparBlocos(brutos) {
  if (!Array.isArray(brutos) || !brutos.length || brutos.length > 80) return null;
  const out = [];
  for (const b of brutos) {
    if (!b || typeof b !== 'object') return null;
    switch (b.tipo) {
      case 'titulo': case 'subtitulo': case 'paragrafo': {
        const t = texto(b.texto, 3000); if (t) out.push({ tipo: b.tipo, texto: t }); break;
      }
      case 'lista': {
        const itens = (Array.isArray(b.itens) ? b.itens : []).slice(0, 30).map(i => texto(i, 500)).filter(Boolean);
        if (itens.length) out.push({ tipo: 'lista', ordenada: !!b.ordenada, itens }); break;
      }
      case 'citacao': {
        const t = texto(b.texto, 1000);
        if (t) out.push({ tipo: 'citacao', texto: t, ...(b.fonte ? { fonte: texto(b.fonte, 120) } : {}) }); break;
      }
      default: return null;
    }
  }
  return out.length ? out : null;
}
const textoDosBlocos = blocos => blocos.flatMap(b => (b.itens ? b.itens : [b.texto, b.fonte].filter(Boolean))).join('\n');

// Confere o conteúdo REAL da imagem (não só o nome/tipo informado)
function lerImagem(dataUrl) {
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!m) return null;
  const buf = Buffer.from(m[2], 'base64');
  if (!buf.length || buf.length > MAX_IMAGEM) return null;
  const jpg = buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
  const png = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
  const webp = buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP';
  if ((m[1] === 'jpeg' && !jpg) || (m[1] === 'png' && !png) || (m[1] === 'webp' && !webp)) return null;
  return { buf, ext: m[1] === 'jpeg' ? 'jpg' : m[1] };
}
async function apagarArquivo(url) {
  if (!url || !url.startsWith(URL_BASE + '/uploads/journal/')) return;
  try { await fs.unlink(path.join(PASTA_IMAGENS, path.basename(url))); } catch (e) { /* já não existe */ }
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
           p.criada_em AS data, p.autor, p.imagem, p.id_usuario AS idDono,
           (SELECT COUNT(*) FROM comentarios c WHERE c.id_publicacao = p.id_publicacao) AS totalComentarios,
           (SELECT COUNT(*) FROM reacoes r WHERE r.id_publicacao = p.id_publicacao) AS totalReacoes,
           EXISTS(SELECT 1 FROM favoritos f WHERE f.id_publicacao = p.id_publicacao AND f.id_usuario = ?) AS favorito
    FROM publicacoes p`;

  const formatar = (r, eu) => {
    const blocos = lerJson(r.blocos);
    return {
      id: r.id, titulo: r.titulo, resumo: r.resumo, categoria: r.categoria, origem: r.origem,
      destaque: !!r.destaque, autor: r.autor, data: r.data, minutos: minutos(blocos, r.resumo),
      totalComentarios: r.totalComentarios, totalReacoes: r.totalReacoes, favorito: !!r.favorito,
      imagem: r.imagem || null,
      meu: !!eu && r.idDono === eu
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
    const { cat, origem, q, ordem, favoritos, meus } = req.query;
    const onde = [], args = [eu || 0];
    if (CATEGORIAS.includes(cat)) { onde.push('p.categoria = ?'); args.push(cat); }
    if (['equipe', 'comunidade'].includes(origem)) { onde.push('p.origem = ?'); args.push(origem); }
    if (favoritos === '1') {
      if (!eu) return res.status(401).json({ erro: 'Entre na sua conta para ver seus favoritos.' });
      onde.push('EXISTS(SELECT 1 FROM favoritos f2 WHERE f2.id_publicacao = p.id_publicacao AND f2.id_usuario = ?)'); args.push(eu);
    }
    if (meus === '1') {
      if (!eu) return res.status(401).json({ erro: 'Entre na sua conta para ver suas publicações.' });
      onde.push('p.id_usuario = ?'); args.push(eu);
    }
    String(q || '').trim().split(/\s+/).filter(Boolean).slice(0, 6).forEach(palavra => {
      onde.push('(p.titulo LIKE ? OR p.resumo LIKE ? OR p.autor LIKE ? OR CAST(p.blocos AS CHAR) LIKE ?)');
      const l = '%' + palavra.replace(/[%_\\]/g, '\\$&') + '%';
      args.push(l, l, l, l);
    });
    const sql = SELECT_BASE + (onde.length ? ' WHERE ' + onde.join(' AND ') : '') +
      ' ORDER BY p.criada_em ' + (ordem === 'antigos' ? 'ASC' : 'DESC') + ' LIMIT 60';
    const [linhas] = await db.query(sql, args);
    res.json(linhas.map(l => formatar(l, eu)));
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
      ...formatar(linhas[0], eu), blocos: lerJson(linhas[0].blocos), ...(await reacoesDe(id, eu)),
      comentarios: coms.map(c => ({ id: c.id, texto: c.texto, data: c.data, autor: c.autor, meu: !!eu && c.idAutor === eu }))
    });
  }));

  // ---------- PUBLICAR ----------
  router.post('/artigos', seguro(async (req, res) => {
    const eu = exigir(req, res); if (!eu) return;

    const titulo = texto(req.body.titulo, 120), resumo = texto(req.body.resumo, 200), categoria = req.body.categoria;
    const blocos = limparBlocos(req.body.blocos);
    if (titulo.length < 5) return res.status(400).json({ erro: 'O título precisa ter pelo menos 5 caracteres.' });
    if (resumo.length < 20) return res.status(400).json({ erro: 'O resumo precisa ter pelo menos 20 caracteres.' });
    if (!CATEGORIAS_USUARIO.includes(categoria)) return res.status(400).json({ erro: 'Escolha uma categoria válida.' });
    if (!blocos) return res.status(400).json({ erro: 'Texto inválido.' });
    const corpo = textoDosBlocos(blocos);
    if (corpo.length < 200) return res.status(400).json({ erro: 'O texto está curto. Escreva pelo menos 200 caracteres.' });

    // Moderação por palavras-chave (título, resumo e texto)
    const mod = moderar({ 'título': titulo, 'resumo': resumo, 'texto': corpo });
    if (!mod.ok) return res.status(422).json({ erro: mod.mensagem });

    // Limite de publicações por hora (evita spam)
    const [cont] = await db.query(
      'SELECT COUNT(*) AS total FROM publicacoes WHERE id_usuario = ? AND criada_em > (NOW() - INTERVAL 1 HOUR)', [eu]);
    if (cont[0].total >= MAX_POSTS_POR_HORA)
      return res.status(429).json({ erro: 'Você publicou bastante em pouco tempo. Tente de novo daqui a pouco.' });

    // Nome do autor vem do banco (nunca do que o navegador enviou)
    const [us] = await db.query('SELECT nome FROM usuarios WHERE id_usuario = ?', [eu]);
    if (!us[0]) return res.status(401).json({ erro: 'Usuário não encontrado. Entre de novo.' });

    // Imagem de capa (opcional)
    let imagemUrl = null;
    if (req.body.imagem) {
      const img = lerImagem(req.body.imagem);
      if (!img) return res.status(400).json({ erro: 'Imagem inválida ou grande demais.' });
      await fs.mkdir(PASTA_IMAGENS, { recursive: true });
      const nome = crypto.randomUUID() + '.' + img.ext;
      await fs.writeFile(path.join(PASTA_IMAGENS, nome), img.buf);
      imagemUrl = `${URL_BASE}/uploads/journal/${nome}`;
    }

    try {
      const [r] = await db.query(
        `INSERT INTO publicacoes (titulo, resumo, categoria, blocos, autor, origem, destaque, id_usuario, imagem)
         VALUES (?, ?, ?, ?, ?, 'comunidade', 0, ?, ?)`,
        [titulo, resumo, categoria, JSON.stringify(blocos), us[0].nome, eu, imagemUrl]);
      res.status(201).json({ id: r.insertId });
    } catch (e) { await apagarArquivo(imagemUrl); throw e; } // não deixa imagem órfã
  }));

  // ---------- APAGAR ARTIGO (apaga do banco: comentários, reações, favoritos e a imagem) ----------
  router.delete('/artigos/:id', seguro(async (req, res) => {
    const eu = exigir(req, res); if (!eu) return;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ erro: 'Publicação inválida.' });

    const [a] = await db.query('SELECT id_usuario, imagem FROM publicacoes WHERE id_publicacao = ?', [id]);
    if (!a[0]) return res.status(404).json({ erro: 'Publicação não encontrada.' });
    if (a[0].id_usuario == null || a[0].id_usuario !== eu)
      return res.status(403).json({ erro: 'Você só pode apagar as suas próprias publicações.' });

    // Transação, quando a conexão permitir (pool); senão apaga na ordem certa
    const conn = typeof db.getConnection === 'function' ? await db.getConnection() : db;
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM comentarios WHERE id_publicacao = ?', [id]);
      await conn.query('DELETE FROM reacoes WHERE id_publicacao = ?', [id]);
      await conn.query('DELETE FROM favoritos WHERE id_publicacao = ?', [id]);
      await conn.query('DELETE FROM publicacoes WHERE id_publicacao = ? AND id_usuario = ?', [id, eu]);
      await conn.commit();
    } catch (e) {
      await conn.rollback().catch(() => {});
      throw e;
    } finally { if (conn !== db) conn.release(); }

    await apagarArquivo(a[0].imagem);
    res.json({ ok: true });
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

    // Moderação por palavras-chave também nos comentários
    const mod = moderar({ 'comentário': t });
    if (!mod.ok) return res.status(422).json({ erro: mod.mensagem });

    const [p] = await db.query('SELECT 1 FROM publicacoes WHERE id_publicacao = ?', [Number(req.params.id)]);
    if (!p[0]) return res.status(404).json({ erro: 'Publicação não encontrada.' });
    const [r] = await db.query('INSERT INTO comentarios (id_publicacao, id_usuario, texto) VALUES (?, ?, ?)', [Number(req.params.id), eu, t]);
    res.status(201).json({ id: r.insertId });
  }));

  // Pode apagar: o autor do comentário OU o dono do artigo
  router.delete('/comentarios/:id', seguro(async (req, res) => {
    const eu = exigir(req, res); if (!eu) return;
    const [r] = await db.query(
      `DELETE c FROM comentarios c
       JOIN publicacoes p ON p.id_publicacao = c.id_publicacao
       WHERE c.id_comentario = ? AND (c.id_usuario = ? OR p.id_usuario = ?)`,
      [Number(req.params.id), eu, eu]);
    if (!r.affectedRows) return res.status(403).json({ erro: 'Você só pode apagar os seus comentários ou os do seu artigo.' });
    res.json({ ok: true });
  }));

  return router;
};