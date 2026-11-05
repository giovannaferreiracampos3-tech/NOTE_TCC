// routes/runner.js — saldo e partidas do Notinha Runner
const express = require('express');

module.exports = function (db, autenticar) {
  const router = express.Router();
  const pool = db.promise();
  const MAX_MOEDAS_PARTIDA = 200; // ajuste ao máximo que o jogo realmente dá

  const rota = f => (req, res) => f(req, res).catch(e => {
    console.error('[runner]', e);
    res.status(500).json({ erro: 'Erro no servidor.' });
  });
  const json = (t, padrao) => { try { return t ? JSON.parse(t) : padrao; } catch (e) { return padrao; } };
  const inteiro = (v, max) => Math.max(0, Math.min(max, parseInt(v, 10) || 0));

  router.get('/estado', autenticar, rota(async (req, res) => {
    const id = req.usuario.id;
    await pool.query('INSERT IGNORE INTO runner_estado (id_usuario, saldo) VALUES (?, 0)', [id]);
    const [[e]] = await pool.query(
      'SELECT saldo, inventario, equipado FROM runner_estado WHERE id_usuario = ?', [id]);
    res.json({ saldo: e.saldo, inventario: json(e.inventario, []), equipado: json(e.equipado, {}) });
  }));

  router.post('/partida', autenticar, rota(async (req, res) => {
    const id = req.usuario.id;
    const b = req.body || {};
    const moedas = inteiro(b.moedas, MAX_MOEDAS_PARTIDA);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        'INSERT INTO runner_partidas (id_usuario, pontos, moedas, acertos, erros, estrelas, duracao_ms) VALUES (?,?,?,?,?,?,?)',
        [id, inteiro(b.pontos, 1e6), moedas, inteiro(b.acertos, 100), inteiro(b.erros, 100),
         inteiro(b.estrelas, 3), inteiro(b.duracao_ms || b.duracao, 36e5)]);
      await conn.query(
        'INSERT INTO runner_estado (id_usuario, saldo) VALUES (?, ?) ON DUPLICATE KEY UPDATE saldo = saldo + VALUES(saldo)',
        [id, moedas]);
      const [[e]] = await conn.query('SELECT saldo FROM runner_estado WHERE id_usuario = ?', [id]);
      await conn.commit();
      res.json({ saldo: e.saldo, moedasCreditadas: moedas, desafiosConcluidos: [] });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }));

  router.put('/equipar', autenticar, rota(async (req, res) => {
    const eq = JSON.stringify((req.body && req.body.equipado) || {});
    await pool.query(
      'INSERT INTO runner_estado (id_usuario, saldo, equipado) VALUES (?, 0, ?) ON DUPLICATE KEY UPDATE equipado = VALUES(equipado)',
      [req.usuario.id, eq]);
    res.json({ ok: true, equipado: JSON.parse(eq) });
  }));

  return router;
};