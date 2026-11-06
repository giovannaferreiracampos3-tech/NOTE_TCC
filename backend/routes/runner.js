// routes/runner.js — saldo e partidas do Notinha Runner (PostgreSQL)
const express = require('express');

// db = pg.Pool
module.exports = function (db, autenticar) {
  const router = express.Router();
  const pool = db;
  const MAX_MOEDAS_PARTIDA = 200; // ajuste ao máximo que o jogo realmente dá

  const rota = f => (req, res) => f(req, res).catch(e => {
    console.error('[runner]', e);
    res.status(500).json({ erro: 'Erro no servidor.' });
  });
  // Aceita texto (coluna TEXT) ou objeto já parseado (coluna JSONB)
  const json = (t, padrao) => {
    if (t == null || t === '') return padrao;
    if (typeof t !== 'string') return t;
    try { return JSON.parse(t); } catch (e) { return padrao; }
  };
  const inteiro = (v, max) => Math.max(0, Math.min(max, parseInt(v, 10) || 0));

  router.get('/estado', autenticar, rota(async (req, res) => {
    const id = req.usuario.id;
    await pool.query('INSERT INTO runner_estado (id_usuario, saldo) VALUES ($1, 0) ON CONFLICT (id_usuario) DO NOTHING', [id]);
    const { rows } = await pool.query(
      'SELECT saldo, inventario, equipado FROM runner_estado WHERE id_usuario = $1', [id]);
    const e = rows[0];
    res.json({ saldo: Number(e.saldo), inventario: json(e.inventario, []), equipado: json(e.equipado, {}) });
  }));

  router.post('/partida', autenticar, rota(async (req, res) => {
    const id = req.usuario.id;
    const b = req.body || {};
    const moedas = inteiro(b.moedas, MAX_MOEDAS_PARTIDA);

    const conn = await pool.connect();
    try {
      await conn.query('BEGIN');
      await conn.query(
        'INSERT INTO runner_partidas (id_usuario, pontos, moedas, acertos, erros, estrelas, duracao_ms) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [id, inteiro(b.pontos, 1e6), moedas, inteiro(b.acertos, 100), inteiro(b.erros, 100),
         inteiro(b.estrelas, 3), inteiro(b.duracao_ms || b.duracao, 36e5)]);
      const { rows } = await conn.query(
        `INSERT INTO runner_estado (id_usuario, saldo) VALUES ($1, $2)
         ON CONFLICT (id_usuario) DO UPDATE SET saldo = runner_estado.saldo + EXCLUDED.saldo
         RETURNING saldo`,
        [id, moedas]);
      await conn.query('COMMIT');
      res.json({ saldo: Number(rows[0].saldo), moedasCreditadas: moedas, desafiosConcluidos: [] });
    } catch (err) {
      await conn.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      conn.release();
    }
  }));

  router.put('/equipar', autenticar, rota(async (req, res) => {
    const eq = JSON.stringify((req.body && req.body.equipado) || {});
    await pool.query(
      `INSERT INTO runner_estado (id_usuario, saldo, equipado) VALUES ($1, 0, $2)
       ON CONFLICT (id_usuario) DO UPDATE SET equipado = EXCLUDED.equipado`,
      [req.usuario.id, eq]);
    res.json({ ok: true, equipado: JSON.parse(eq) });
  }));

  return router;
};