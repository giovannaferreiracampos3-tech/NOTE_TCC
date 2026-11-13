// Checa o papel NO BANCO a cada ação (não confia no token) e registra a moderação.
module.exports = db => ({
    async ehEquipe(id) {
      if (!id) return false;
      const { rows } = await db.query('SELECT papel FROM usuarios WHERE id_usuario = $1', [id]);
      return rows[0]?.papel === 'equipe';
    },
    async registrar(idModerador, acao, tipo, idAlvo, detalhe, motivo) {
      try {
        await db.query(
          'INSERT INTO moderacao_log (id_moderador, acao, tipo_alvo, id_alvo, motivo, detalhe) VALUES ($1,$2,$3,$4,$5,$6)',
          [idModerador, acao, tipo, idAlvo, motivo || null, String(detalhe || '').slice(0, 4000)]);
      } catch (e) { console.error('LOG MODERACAO:', e.message); }
    }
  });