const express = require('express');
const jwt = require('jsonwebtoken');

// Carrega as regras do front (elas esperam um "window")
global.window = global.window || {};
require('./regras/desafios.js');
require('./regras/loja.js');
const NW = global.window.NWRunner;
const D = NW.desafios, LOJA = NW.loja;

const JWT_SECRET = process.env.JWT_SECRET || 'troque-este-segredo';

class Regra extends Error {}   // erro "de negócio": volta para o jogo como 400

module.exports = function (db) {
  const router = express.Router();

  // ---------- login ----------
  function auth(req, res, next) {
    const h = req.headers.authorization || '';
    const t = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!t) return res.status(401).json({ erro: 'nao-autenticado' });
    try { req.uid = jwt.verify(t, JWT_SECRET).id; next(); }
    catch (e) { res.status(401).json({ erro: 'sessao-invalida' }); }
  }
  router.use(auth);

  const rota = fn => async (req, res) => {
    try { res.json(await fn(req)); }
    catch (e) {
      if (e instanceof Regra) return res.status(400).json({ erro: e.message });
      console.error('[runner]', e);
      res.status(500).json({ erro: 'erro-servidor' });
    }
  };

  // ---------- estado do usuário (com trava de linha para não haver compra dupla) ----------
  const lerJson = (t, fb) => { try { const v = JSON.parse(t); return v == null ? fb : v; } catch (e) { return fb; } };
  const normEq = eq => ({ acessorios: (eq && eq.acessorios) || {}, efeito: (eq && eq.efeito) || null, cenario: (eq && eq.cenario) || 'castelo' });

  async function comEstado(id, fn) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('INSERT IGNORE INTO runner_estado (id_usuario) VALUES (?)', [id]);
      const [rows] = await conn.query('SELECT * FROM runner_estado WHERE id_usuario = ? FOR UPDATE', [id]);
      const r = rows[0];
      const d = {
        saldo: r.saldo | 0,
        inventario: lerJson(r.inventario, []),
        equipado: normEq(lerJson(r.equipado, {})),
        desafios: lerJson(r.desafios, null)
      };
      const saida = await fn(d, conn);
      await conn.query(
        'UPDATE runner_estado SET saldo=?, inventario=?, equipado=?, desafios=? WHERE id_usuario=?',
        [d.saldo, JSON.stringify(d.inventario), JSON.stringify(d.equipado), JSON.stringify(d.desafios), id]);
      await conn.commit();
      return saida;
    } catch (e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
  }

  // ---------- desafios (mesma lógica que estava no api.js local) ----------
  function garantirDia(d) {
    const hoje = D.chaveDia();
    let s = d.desafios || { streak: { n: 0, ultimo: null } };
    if (s.dia !== hoje) s = { dia: hoje, progresso: {}, resgatados: [], bonus: false, streak: s.streak || { n: 0, ultimo: null } };
    d.desafios = s;
    return s;
  }
  function sequenciaAtual(s) {
    const hoje = D.chaveDia(), st = s.streak || { n: 0, ultimo: null };
    return (st.ultimo === hoje || st.ultimo === D.diaAnterior(hoje)) ? st.n : 0;
  }
  function estadoDesafios(s) {
    return { dia: s.dia, progresso: Object.assign({}, s.progresso), resgatados: s.resgatados.slice(), bonus: !!s.bonus, sequencia: sequenciaAtual(s) };
  }
  function marcarDia(s) {
    const st = s.streak;
    if (st.ultimo === s.dia) return;
    st.n = (st.ultimo === D.diaAnterior(s.dia)) ? st.n + 1 : 1;
    st.ultimo = s.dia;
  }
  function registrarDesafios(d, partida) {
    const s = garantirDia(d), novos = [];
    D.doDia(s.dia).forEach(ch => {
      const antes = s.progresso[ch.id] | 0, depois = D.atualizar(ch, antes, partida);
      s.progresso[ch.id] = depois;
      if (antes < ch.meta && depois >= ch.meta) { novos.push(ch.titulo); marcarDia(s); }
    });
    return novos;
  }

  // ---------- partida: o servidor recalcula tudo, não confia no navegador ----------
  function sanear(b) {
    b = b || {};
    const resp = (Array.isArray(b.respostas) ? b.respostas : []).slice(0, 10).map(r => ({
      correta: r && r.correta === true ? true : (r && r.correta === false ? false : null)
    }));
    const acertos = resp.filter(r => r.correta === true).length;
    const erros = resp.filter(r => r.correta === false).length;
    const semResposta = resp.filter(r => r.correta === null).length;
    const duracao = b.duracao_ms | 0;
    // uma partida tem 10 rodadas e leva no mínimo ~50 s de corrida
    if (resp.length < 10 || duracao < 40000) throw new Regra('partida-invalida');
    const pontos = 2 * acertos - 2 * erros;
    const estrelas = pontos >= 16 ? 3 : pontos >= 10 ? 2 : pontos >= 2 ? 1 : 0;
    // máximo de moedas no chão = 160; mais 5 por acerto
    const moedas = Math.min(Math.max(0, b.moedas | 0), 160 + 5 * acertos);
    return { pontos, moedas, acertos, erros, semResposta, estrelas, duracao_ms: duracao, respostas: resp };
  }

  const possui = (d, it) => it.preco === 0 || d.inventario.indexOf(it.id) >= 0;

  // ================= ROTAS =================

  // saldo + loja
  router.get('/estado', rota(req => comEstado(req.uid, d => ({
    saldo: d.saldo, inventario: d.inventario.slice(), equipado: d.equipado
  }))));

  // fim de partida
  router.post('/partida', rota(req => comEstado(req.uid, async (d, conn) => {
    const p = sanear(req.body);
    d.saldo += p.moedas;
    const concluidos = registrarDesafios(d, p);
    await conn.query(
      'INSERT INTO runner_partidas (id_usuario, pontos, moedas, acertos, erros, estrelas, duracao_ms) VALUES (?,?,?,?,?,?,?)',
      [req.uid, p.pontos, p.moedas, p.acertos, p.erros, p.estrelas, p.duracao_ms]);
    return { saldo: d.saldo, moedasCreditadas: p.moedas, desafiosConcluidos: concluidos };
  })));

  // compra (preço vem do catálogo do servidor)
  router.post('/comprar', rota(req => comEstado(req.uid, d => {
    const it = LOJA.item(req.body && req.body.id);
    if (!it) throw new Regra('item-invalido');
    if (possui(d, it)) throw new Regra('ja-possui');
    if (d.saldo < it.preco) throw new Regra('saldo-insuficiente');
    d.saldo -= it.preco;
    d.inventario.push(it.id);
    return { saldo: d.saldo, inventario: d.inventario.slice() };
  })));

  // visual equipado (só itens que o usuário tem)
  router.put('/equipar', rota(req => comEstado(req.uid, d => {
    const eq = (req.body && req.body.equipado) || {};
    const limpo = { acessorios: {}, efeito: null, cenario: 'castelo' };
    LOJA.SLOTS.forEach(s => {
      const it = LOJA.item((eq.acessorios || {})[s.id]);
      if (it && it.cat === 'acessorios' && it.slot === s.id && possui(d, it)) limpo.acessorios[s.id] = it.id;
    });
    const ef = LOJA.item(eq.efeito);
    if (ef && ef.cat === 'efeitos' && possui(d, ef)) limpo.efeito = ef.id;
    const cen = LOJA.item(eq.cenario);
    if (cen && cen.cat === 'cenarios' && possui(d, cen)) limpo.cenario = cen.id;
    d.equipado = limpo;
    return { equipado: limpo };
  })));

  // desafios de hoje
  router.get('/desafios', rota(req => comEstado(req.uid, d => estadoDesafios(garantirDia(d)))));

  // missões musicais concluídas no navegador
  router.post('/desafios/missoes', rota(req => comEstado(req.uid, d => {
    const s = garantirDia(d), ids = Array.isArray(req.body && req.body.ids) ? req.body.ids : [];
    D.doDia(s.dia).forEach(ch => {
      if (ids.indexOf(ch.id) >= 0 && (s.progresso[ch.id] | 0) < ch.meta) { s.progresso[ch.id] = ch.meta; marcarDia(s); }
    });
    return estadoDesafios(s);
  })));

  // resgatar recompensa
  router.post('/desafios/resgatar', rota(req => comEstado(req.uid, d => {
    const id = req.body && req.body.id;
    const s = garantirDia(d), lista = D.doDia(s.dia);
    let ganho = 0;
    if (id === 'bonus') {
      if (!lista.every(c => s.resgatados.indexOf(c.id) >= 0)) throw new Regra('incompleto');
      if (s.bonus) throw new Regra('ja-resgatado');
      s.bonus = true; ganho = D.BONUS;
    } else {
      const ch = lista.filter(c => c.id === id)[0];
      if (!ch) throw new Regra('desafio-invalido');
      if ((s.progresso[id] | 0) < ch.meta) throw new Regra('incompleto');
      if (s.resgatados.indexOf(id) >= 0) throw new Regra('ja-resgatado');
      s.resgatados.push(id); ganho = ch.recompensa;
    }
    d.saldo += ganho;
    return { saldo: d.saldo, ganho, estado: estadoDesafios(s) };
  })));

  return router;
};