/* progressoApi.js – NoteWave – progresso individual de cada usuário (Express + PostgreSQL)
   Guarda, por conta, tudo o que antes ficava só no navegador: lições concluídas, medalhas,
   sequência de estudos, caderno, foto de perfil etc.

   Uso no server.js (junto das outras rotas):
     const { Pool } = require('pg');
     const db = new Pool({ connectionString: process.env.DATABASE_URL });
     app.use(express.json({ limit: '2mb' }));   // precisa ser ANTES das rotas; a foto de perfil é grande
     app.use('/api/progresso', require('./progressoApi')(db));

   A tabela progresso_usuario é criada sozinha na primeira vez que o servidor sobe. */
   const express = require('express');
   const jwt = require('jsonwebtoken');
   
   // Precisa ser o MESMO segredo usado para criar o token no login (igual ao journalApi.js).
   const SEGREDO = process.env.JWT_SECRET || 'troque-este-segredo';
   
   // Só estas chaves são aceitas (a mesma lista do front, em nw-sync.js).
   const PERMITIDA = /^(status_|musical_|medalha_|notewave-caderno|noteWave_diasEstudo$|noteWave_avatar$|noteWave_tour_choice$|progressoModulos$|nw_runner)/;
   const CHAVE_OK = /^[\p{L}\p{N}_.\-]{1,100}$/u;
   const MAX_VALOR = 1500000;   // ~1,5 MB por item
   const MAX_CHAVES = 300;      // por requisição
   
   function usuarioDaRequisicao(req) {
     const h = req.headers.authorization || '';
     if (!h.startsWith('Bearer ')) return null;
     try {
       const p = jwt.verify(h.slice(7), SEGREDO);
       return Number(p.id_usuario ?? p.id) || null;
     } catch (e) { return null; }
   }
   
   const chaveValida = k => typeof k === 'string' && CHAVE_OK.test(k) && PERMITIDA.test(k);
   
   // `db` deve ser um pg.Pool
   module.exports = function (db) {
     const router = express.Router();
     router.use(express.json({ limit: '2mb' }));
   
     db.query(`
       CREATE TABLE IF NOT EXISTS progresso_usuario (
         id_usuario INTEGER NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
         chave VARCHAR(100) NOT NULL,
         valor TEXT NOT NULL,
         atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
         PRIMARY KEY (id_usuario, chave)
       )`
     ).catch(e => console.error('ERRO ao criar progresso_usuario:', e.message));
   
     const seguro = fn => (req, res) => fn(req, res).catch(e => {
       console.error('ERRO NO PROGRESSO:', e);
       res.status(500).json({ erro: 'Erro no servidor. Tente de novo.' });
     });
   
     // Tudo o que esta conta já salvou.
     router.get('/', seguro(async (req, res) => {
       const eu = usuarioDaRequisicao(req);
       if (!eu) return res.status(401).json({ erro: 'Entre na sua conta para fazer isso.' });
       const { rows } = await db.query('SELECT chave, valor FROM progresso_usuario WHERE id_usuario = $1', [eu]);
       const dados = {};
       rows.forEach(l => { dados[l.chave] = l.valor; });
       res.json({ dados });
     }));
   
     // Salva (dados) e apaga (remover) vários itens de uma vez.
     router.put('/', seguro(async (req, res) => {
       const eu = usuarioDaRequisicao(req);
       if (!eu) return res.status(401).json({ erro: 'Entre na sua conta para fazer isso.' });
   
       const dados = req.body && typeof req.body.dados === 'object' && req.body.dados ? req.body.dados : {};
       const remover = Array.isArray(req.body && req.body.remover) ? req.body.remover : [];
       if (Object.keys(dados).length + remover.length > MAX_CHAVES) {
         return res.status(400).json({ erro: 'Itens demais de uma vez.' });
       }
   
       const falhas = [];
       for (const [chave, valor] of Object.entries(dados)) {
         if (!chaveValida(chave) || typeof valor !== 'string' || valor.length > MAX_VALOR) { falhas.push(chave); continue; }
         try {
           await db.query(
             `INSERT INTO progresso_usuario (id_usuario, chave, valor) VALUES ($1, $2, $3)
              ON CONFLICT (id_usuario, chave)
              DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = now()`, [eu, chave, valor]);
         } catch (e) { console.error('Falha ao salvar', chave, e.message); falhas.push(chave); }
       }
   
       const apagar = remover.filter(chaveValida);
       if (apagar.length) {
         await db.query('DELETE FROM progresso_usuario WHERE id_usuario = $1 AND chave = ANY($2::text[])', [eu, apagar]);
       }
       res.json({ ok: true, falhas });
     }));
   
     return router;
   };