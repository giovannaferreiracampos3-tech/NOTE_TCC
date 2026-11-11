/* journalApi.js – NoteWave Journal – API (Express + PostgreSQL)
   Artigos da equipe ficam no banco. Usuários logados podem: reagir, favoritar, comentar,
   PUBLICAR os próprios artigos (com imagem de capa) e APAGÁ-LOS.
   Uso no server.js:
     const { Pool } = require('pg');
     const db = new Pool({ connectionString: process.env.DATABASE_URL });
     app.use('/api/journal', require('./journalApi')(db));

   Fotos de perfil: artigos e comentários trazem "autorFoto" (caminho guardado em usuarios.foto,
   ex.: /uploads/avatars/12-1730700000.png) ou null. Artigos da equipe não têm id_usuario, então vêm com null.
*/
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const nuvem = require('./storage');
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
const MOTIVOS = ['ofensivo', 'discriminacao', 'inadequado', 'falsa', 'spam', 'dados', 'copia', 'outros'];
const ROTULO_MOTIVO = {
  ofensivo: 'Ofensa ou xingamento', discriminacao: 'Discriminação ou discurso de ódio',
  inadequado: 'Conteúdo sexual ou violento', falsa: 'Informações falsas',
  spam: 'Propaganda ou spam', dados: 'Divulgação indevida de dados pessoais',
  copia: 'Texto copiado de outra pessoa', outros: 'Outros'
};

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
const lerJson = v => (typeof v === 'string' ? JSON.parse(v) : v) || [];   // JSONB já chega como objeto
function minutos(blocos, resumo) {
  const palavras = (resumo + ' ' + blocos.map(b => (b.texto || '') + ' ' + (b.itens || []).join(' ')).join(' ')).split(/\s+/).length;
  return Math.max(1, Math.round(palavras / 200));
}

// Aceita só os tipos de bloco que o usuário pode criar; descarta qualquer outra coisa
function limparBlocos(brutos, equipe = false) {
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
      case 'caixa': {
        if (!equipe) return null;
        const t = texto(b.texto, 1000);
        if (t) out.push({ tipo: 'caixa', titulo: texto(b.titulo, 100) || 'Você sabia?', texto: t }); break;
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

async function apagarArquivo(url) { await nuvem.apagar(url); }


// `db` deve ser um pg.Pool
module.exports = function (db, transporter) {
  const router = express.Router();
  const seguro = fn => (req, res) => fn(req, res).catch(e => { console.error('ERRO NO JOURNAL:', e); res.status(500).json({ erro: 'Erro no servidor. Tente de novo.' }); });
  const exigir = (req, res) => {
    const id = usuarioDaRequisicao(req);
    if (!id) res.status(401).json({ erro: 'Entre na sua conta para fazer isso.' });
    return id;
  };
  // id da URL: inteiro positivo ou null
  const idDaUrl = req => { const n = Number(req.params.id); return Number.isSafeInteger(n) && n > 0 && n < 2147483647 ? n : null; };
  router.get('/eu', seguro(async (req, res) => {
    const eu = usuarioDaRequisicao(req);
    if (!eu) return res.json({ equipe: false });
    const { rows } = await db.query('SELECT papel FROM usuarios WHERE id_usuario = $1', [eu]);
    res.json({ equipe: rows[0]?.papel === 'equipe' });
  }));

  // LEFT JOIN em usuarios: artigos da equipe (id_usuario nulo) continuam aparecendo, só sem foto.
  // Atenção: no Postgres alias sem aspas vira minúsculo, então os camelCase precisam de "aspas".
  // $1 = id do usuário logado (ou 0)
  const SELECT_BASE = `
    SELECT p.id_publicacao AS id, p.titulo, p.resumo, p.categoria, p.origem, p.destaque, p.blocos,
           p.criada_em AS data, p.autor, p.imagem, p.id_usuario AS "idDono", ua.foto AS "autorFoto",
           (SELECT COUNT(*)::int FROM comentarios c WHERE c.id_publicacao = p.id_publicacao) AS "totalComentarios",
           (SELECT COUNT(*)::int FROM reacoes r WHERE r.id_publicacao = p.id_publicacao) AS "totalReacoes",
           EXISTS(SELECT 1 FROM favoritos f WHERE f.id_publicacao = p.id_publicacao AND f.id_usuario = $1) AS favorito
    FROM publicacoes p
    LEFT JOIN usuarios ua ON ua.id_usuario = p.id_usuario`;

  const formatar = (r, eu) => {
    const blocos = lerJson(r.blocos);
    return {
      id: r.id, titulo: r.titulo, resumo: r.resumo, categoria: r.categoria, origem: r.origem,
      destaque: !!r.destaque, autor: r.autor, autorFoto: r.autorFoto || null, data: r.data, minutos: minutos(blocos, r.resumo),
      totalComentarios: r.totalComentarios, totalReacoes: r.totalReacoes, favorito: !!r.favorito,
      imagem: r.imagem || null,
      meu: !!eu && Number(r.idDono) === eu
    };
  };

  async function reacoesDe(idPub, eu) {
    const { rows: linhas } = await db.query('SELECT tipo, COUNT(*)::int AS n FROM reacoes WHERE id_publicacao = $1 GROUP BY tipo', [idPub]);
    const reacoes = { aprendi: 0, adorei: 0, inspirador: 0, excelente: 0 };
    linhas.forEach(l => { reacoes[l.tipo] = l.n; });
    let minha = null;
    if (eu) {
      const { rows: m } = await db.query('SELECT tipo FROM reacoes WHERE id_publicacao = $1 AND id_usuario = $2', [idPub, eu]);
      minha = m[0] ? m[0].tipo : null;
    }
    return { reacoes, minhaReacao: minha };
  }

  // ---------- LISTAR / BUSCAR ----------
  router.get('/artigos', seguro(async (req, res) => {
    const eu = usuarioDaRequisicao(req);
    const { cat, origem, q, ordem, favoritos, meus } = req.query;
    const onde = [], args = [eu || 0];                    // $1 já é o usuário
    const arg = v => { args.push(v); return '$' + args.length; };   // adiciona e devolve o $n
    if (CATEGORIAS.includes(cat)) onde.push('p.categoria = ' + arg(cat));
    if (['equipe', 'comunidade'].includes(origem)) onde.push('p.origem = ' + arg(origem));
    if (favoritos === '1') {
      if (!eu) return res.status(401).json({ erro: 'Entre na sua conta para ver seus favoritos.' });
      onde.push('EXISTS(SELECT 1 FROM favoritos f2 WHERE f2.id_publicacao = p.id_publicacao AND f2.id_usuario = ' + arg(eu) + ')');
    }
    if (meus === '1') {
      if (!eu) return res.status(401).json({ erro: 'Entre na sua conta para ver suas publicações.' });
      onde.push('p.id_usuario = ' + arg(eu));
    }
    String(q || '').trim().split(/\s+/).filter(Boolean).slice(0, 6).forEach(palavra => {
      const l = '%' + palavra.replace(/[%_\\]/g, '\\$&') + '%';
      const a = arg(l);   // o mesmo $n serve para as 4 colunas
      onde.push(`(p.titulo ILIKE ${a} OR p.resumo ILIKE ${a} OR p.autor ILIKE ${a} OR p.blocos::text ILIKE ${a})`);
    });
    const sql = SELECT_BASE + (onde.length ? ' WHERE ' + onde.join(' AND ') : '') +
      ' ORDER BY p.criada_em ' + (ordem === 'antigos' ? 'ASC' : 'DESC') + ' LIMIT 60';
    const { rows: linhas } = await db.query(sql, args);
    res.json(linhas.map(l => formatar(l, eu)));
  }));

  // ---------- LER UM ARTIGO (com reações e comentários) ----------
  router.get('/artigos/:id', seguro(async (req, res) => {
    const eu = usuarioDaRequisicao(req), id = idDaUrl(req);
    if (!id) return res.status(404).json({ erro: 'Publicação não encontrada.' });
    const { rows: linhas } = await db.query(SELECT_BASE + ' WHERE p.id_publicacao = $2', [eu || 0, id]);
    if (!linhas[0]) return res.status(404).json({ erro: 'Publicação não encontrada.' });
    const { rows: coms } = await db.query(
      `SELECT c.id_comentario AS id, c.texto, c.criado_em AS data, c.id_usuario AS "idAutor", u.nome AS autor, u.foto AS "autorFoto"
       FROM comentarios c JOIN usuarios u ON u.id_usuario = c.id_usuario
       WHERE c.id_publicacao = $1 ORDER BY c.criado_em ASC LIMIT 200`, [id]);
    res.json({
      ...formatar(linhas[0], eu), blocos: lerJson(linhas[0].blocos), ...(await reacoesDe(id, eu)),
      comentarios: coms.map(c => ({ id: c.id, texto: c.texto, data: c.data, autor: c.autor, autorFoto: c.autorFoto || null, meu: !!eu && Number(c.idAutor) === eu }))
    });
  }));

   // ---------- PUBLICAR ----------
   router.post('/artigos', seguro(async (req, res) => {
    const eu = exigir(req, res); if (!eu) return;

    const { rows: us } = await db.query('SELECT nome, papel FROM usuarios WHERE id_usuario = $1', [eu]);
    if (!us[0]) return res.status(401).json({ erro: 'Usuário não encontrado. Entre de novo.' });
    const ehEquipe = us[0].papel === 'equipe';
    const comoEquipe = req.body.comoEquipe === true;
    if (comoEquipe && !ehEquipe)
      return res.status(403).json({ erro: 'Apenas a equipe pode publicar como Equipe NoteWave.' });

    const titulo = texto(req.body.titulo, 120), resumo = texto(req.body.resumo, 200), categoria = req.body.categoria;
    const blocos = limparBlocos(req.body.blocos, comoEquipe);
    if (titulo.length < 5) return res.status(400).json({ erro: 'O título precisa ter pelo menos 5 caracteres.' });
    if (resumo.length < 20) return res.status(400).json({ erro: 'O resumo precisa ter pelo menos 20 caracteres.' });
    if (!(comoEquipe ? CATEGORIAS : CATEGORIAS_USUARIO).includes(categoria))
      return res.status(400).json({ erro: 'Escolha uma categoria válida.' });
    if (!blocos) return res.status(400).json({ erro: 'Texto inválido.' });
    const corpo = textoDosBlocos(blocos);
    if (corpo.length < 200) return res.status(400).json({ erro: 'O texto está curto. Escreva pelo menos 200 caracteres.' });

    if (!comoEquipe) {
      const mod = moderar({ 'título': titulo, 'resumo': resumo, 'texto': corpo });
      if (!mod.ok) return res.status(422).json({ erro: mod.mensagem });
      const { rows: cont } = await db.query(
        `SELECT COUNT(*)::int AS total FROM publicacoes WHERE id_usuario = $1 AND criada_em > (now() - INTERVAL '1 hour')`, [eu]);
      if (cont[0].total >= MAX_POSTS_POR_HORA)
        return res.status(429).json({ erro: 'Você publicou bastante em pouco tempo. Tente de novo daqui a pouco.' });
    }

    const origem = comoEquipe ? 'equipe' : 'comunidade';
    const autor = comoEquipe ? (categoria === 'notinha' ? 'Notinha' : 'Equipe NoteWave') : us[0].nome;
    const destaque = comoEquipe && req.body.destaque === true;

    let imagemUrl = null;
    if (req.body.imagem) {
      const img = lerImagem(req.body.imagem);
      if (!img) return res.status(400).json({ erro: 'Imagem inválida ou grande demais.' });
      const nome = 'journal/' + crypto.randomUUID() + '.' + img.ext;
      imagemUrl = await nuvem.enviar(nome, img.buf, img.ext === 'jpg' ? 'image/jpeg' : 'image/' + img.ext);
    }

    try {
      const { rows } = await db.query(
        `INSERT INTO publicacoes (titulo, resumo, categoria, blocos, autor, origem, destaque, id_usuario, imagem)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id_publicacao`,
        [titulo, resumo, categoria, JSON.stringify(blocos), autor, origem, destaque, eu, imagemUrl]);
      res.status(201).json({ id: rows[0].id_publicacao });
    } catch (e) { await apagarArquivo(imagemUrl); throw e; }
  }));

  // ---------- APAGAR ARTIGO (apaga do banco: comentários, reações, favoritos e a imagem) ----------
  router.delete('/artigos/:id', seguro(async (req, res) => {
    const eu = exigir(req, res); if (!eu) return;
    const id = idDaUrl(req);
    if (!id) return res.status(400).json({ erro: 'Publicação inválida.' });

    const { rows: a } = await db.query('SELECT id_usuario, imagem FROM publicacoes WHERE id_publicacao = $1', [id]);
    if (!a[0]) return res.status(404).json({ erro: 'Publicação não encontrada.' });
    if (a[0].id_usuario == null || Number(a[0].id_usuario) !== eu)
      return res.status(403).json({ erro: 'Você só pode apagar as suas próprias publicações.' });

    const conn = await db.connect();
    try {
      await conn.query('BEGIN');
      await conn.query('DELETE FROM comentarios WHERE id_publicacao = $1', [id]);
      await conn.query('DELETE FROM reacoes WHERE id_publicacao = $1', [id]);
      await conn.query('DELETE FROM favoritos WHERE id_publicacao = $1', [id]);
      await conn.query('DELETE FROM publicacoes WHERE id_publicacao = $1 AND id_usuario = $2', [id, eu]);
      await conn.query('COMMIT');
    } catch (e) {
      await conn.query('ROLLBACK').catch(() => {});
      throw e;
    } finally { conn.release(); }

    await apagarArquivo(a[0].imagem);
    res.json({ ok: true });
  }));

  // ---------- REAÇÃO (uma por pessoa; clicar na mesma remove) ----------
  router.put('/artigos/:id/reacao', seguro(async (req, res) => {
    const eu = exigir(req, res); if (!eu) return;
    const id = idDaUrl(req), tipo = req.body.tipo;
    if (!id) return res.status(404).json({ erro: 'Publicação não encontrada.' });
    if (!REACOES.includes(tipo)) return res.status(400).json({ erro: 'Reação inválida.' });
    const { rows: atual } = await db.query('SELECT tipo FROM reacoes WHERE id_publicacao = $1 AND id_usuario = $2', [id, eu]);
    if (atual[0] && atual[0].tipo === tipo) await db.query('DELETE FROM reacoes WHERE id_publicacao = $1 AND id_usuario = $2', [id, eu]);
    else await db.query(
      `INSERT INTO reacoes (id_publicacao, id_usuario, tipo) VALUES ($1, $2, $3)
       ON CONFLICT (id_publicacao, id_usuario) DO UPDATE SET tipo = EXCLUDED.tipo`, [id, eu, tipo]);
    res.json(await reacoesDe(id, eu));
  }));

  // ---------- FAVORITO ----------
  router.put('/artigos/:id/favorito', seguro(async (req, res) => {
    const eu = exigir(req, res); if (!eu) return;
    const id = idDaUrl(req);
    if (!id) return res.status(404).json({ erro: 'Publicação não encontrada.' });
    const r = await db.query('DELETE FROM favoritos WHERE id_publicacao = $1 AND id_usuario = $2', [id, eu]);
    if (r.rowCount) return res.json({ favorito: false });
    await db.query('INSERT INTO favoritos (id_publicacao, id_usuario) VALUES ($1, $2)', [id, eu]);
    res.json({ favorito: true });
  }));

  router.get('/favoritos/total', seguro(async (req, res) => {
    const eu = usuarioDaRequisicao(req);
    if (!eu) return res.json({ total: 0 });
    const { rows } = await db.query('SELECT COUNT(*)::int AS total FROM favoritos WHERE id_usuario = $1', [eu]);
    res.json({ total: rows[0].total });
  }));

  // ---------- COMENTÁRIOS ----------
  router.post('/artigos/:id/comentarios', seguro(async (req, res) => {
    const eu = exigir(req, res); if (!eu) return;
    const id = idDaUrl(req);
    if (!id) return res.status(404).json({ erro: 'Publicação não encontrada.' });
    const t = texto(req.body.texto, 1000);
    if (t.length < 2) return res.status(400).json({ erro: 'Escreva o comentário antes de enviar.' });

    // Moderação por palavras-chave também nos comentários
    const mod = moderar({ 'comentário': t });
    if (!mod.ok) return res.status(422).json({ erro: mod.mensagem });

    const { rows: p } = await db.query('SELECT 1 FROM publicacoes WHERE id_publicacao = $1', [id]);
    if (!p[0]) return res.status(404).json({ erro: 'Publicação não encontrada.' });
    const { rows } = await db.query(
      'INSERT INTO comentarios (id_publicacao, id_usuario, texto) VALUES ($1, $2, $3) RETURNING id_comentario', [id, eu, t]);
    res.status(201).json({ id: rows[0].id_comentario });
  }));

  // Pode apagar: o autor do comentário OU o dono do artigo
  router.delete('/comentarios/:id', seguro(async (req, res) => {
    const eu = exigir(req, res); if (!eu) return;
    const id = idDaUrl(req);
    if (!id) return res.status(403).json({ erro: 'Você só pode apagar os seus comentários ou os do seu artigo.' });
    const r = await db.query(
      `DELETE FROM comentarios c
       USING publicacoes p
       WHERE p.id_publicacao = c.id_publicacao
         AND c.id_comentario = $1 AND (c.id_usuario = $2 OR p.id_usuario = $2)`,
      [id, eu]);
    if (!r.rowCount) return res.status(403).json({ erro: 'Você só pode apagar os seus comentários ou os do seu artigo.' });
    res.json({ ok: true });
  }));

    // ---------- DENÚNCIAS ----------
    const hitsDen = new Map();
    const limiteDen = (req, res, next) => {
      const eu = usuarioDaRequisicao(req), agora = Date.now();
      const lista = (hitsDen.get(eu) || []).filter(t => agora - t < 3600000);
      if (lista.length >= 10) return res.status(429).json({ erro: 'Muitas tentativas em pouco tempo. Aguarde um pouco e tente de novo.' });
      lista.push(agora); hitsDen.set(eu, lista); next();
    };
  
    router.post('/artigos/:id/denuncias', limiteDen, seguro(async (req, res) => {
      const eu = exigir(req, res); if (!eu) return;
      const id = idDaUrl(req), b = req.body || {};
      const motivo = String(b.motivo || ''), desc = String(b.descricao || '').trim().slice(0, 500);
      if (!id) return res.status(404).json({ erro: 'Publicação não encontrada.' });
  
      const { rows: pub } = await db.query('SELECT id_publicacao, titulo, id_usuario FROM publicacoes WHERE id_publicacao = $1', [id]);
      if (!pub[0]) return res.status(404).json({ erro: 'Publicação não encontrada.' });
      if (!MOTIVOS.includes(motivo)) return res.status(400).json({ erro: 'Escolha um motivo para a denúncia.' });
      if (desc.length < 10) return res.status(400).json({ erro: 'Explique em pelo menos 10 caracteres o que aconteceu.' });
  
      let cid = null, coment = null;
      if (b.comentarioId) {
        const n = Number(b.comentarioId);
        const { rows: c } = await db.query(
          `SELECT c.id_comentario AS id, c.texto, u.nome FROM comentarios c JOIN usuarios u ON u.id_usuario = c.id_usuario
           WHERE c.id_comentario = $1 AND c.id_publicacao = $2`, [Number.isSafeInteger(n) ? n : 0, id]);
        coment = c[0];
        if (!coment) return res.status(404).json({ erro: 'Comentário não encontrado.' });
        cid = coment.id;
      }
  
      const { rows: ja } = await db.query(
        'SELECT id FROM journal_reports WHERE id_denunciante = $1 AND id_publicacao = $2 AND id_comentario IS NOT DISTINCT FROM $3::int', [eu, id, cid]);
      if (ja[0]) return res.status(409).json({ erro: 'Você já denunciou isso. Nossa equipe vai analisar.' });
  
      const { rows: nova } = await db.query(
        'INSERT INTO journal_reports (id_publicacao, id_comentario, id_denunciante, motivo, descricao) VALUES ($1,$2,$3,$4,$5) RETURNING id',
        [id, cid, eu, motivo, desc]);
  
      // Avisa a equipe por e-mail; se falhar, a denúncia continua salva
      try {
        const { rows: [quem] } = await db.query('SELECT nome, email FROM usuarios WHERE id_usuario = $1', [eu]);
        const { rows: [dono] } = pub[0].id_usuario
          ? await db.query('SELECT nome, email FROM usuarios WHERE id_usuario = $1', [pub[0].id_usuario]) : { rows: [] };
        const link = (process.env.FRONTEND_URL || '') + '/html/journal.html#/artigo/' + id;
        await transporter.sendMail({
          from: `"NoteWave" <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_DENUNCIAS || process.env.EMAIL_USER,
          subject: 'Denúncia #' + nova[0].id + ' (Journal) – ' + (coment ? 'comentário' : 'artigo') + ' em "' + pub[0].titulo + '"',
          text: [
            'Nova denúncia no NoteWave Journal.', '',
            'Motivo: ' + ROTULO_MOTIVO[motivo],
            'O que a pessoa escreveu:', desc, '',
            'Artigo: ' + pub[0].titulo + ' (id ' + id + ')',
            'Link: ' + link,
            'Autor do artigo: ' + (dono ? dono.nome + ' <' + dono.email + '>' : 'equipe NoteWave'),
            coment ? '\nComentário denunciado (id ' + coment.id + ', de ' + coment.nome + '):\n' + coment.texto : '',
            '', 'Quem denunciou: ' + (quem ? quem.nome + ' <' + quem.email + '>' : 'não encontrado')
          ].join('\n')
        });
      } catch (e) { console.error('EMAIL DENUNCIA JOURNAL:', e.message); }
  
      res.status(201).json({ ok: true });
    }));

    router.get('/versao', (req, res) => res.json({ denuncias: true }));
    return router;
  };