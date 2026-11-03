/* Notinha Runner — desafios diários (regras e sorteio).
 * O mesmo dia gera sempre os mesmos 3 desafios (sorteio feito a partir da data).
 * Para mudar recompensas ou criar desafios novos, mexa só aqui.
 */
(function (NW) {
    'use strict';
  
    const RECOMPENSAS = { facil: 10, medio: 20, dificil: 35 };
    const BONUS = 25;                       // por resgatar os 3 desafios do dia
    const NIVEIS = ['facil', 'medio', 'dificil'];
  
    // modo 'soma' = acumula durante o dia; 'max' = vale o melhor resultado de uma partida
    const MODELOS = [
      { tipo: 'partidas',  tier: 'facil',   modo: 'soma', metas: [2, 3],  texto: function (n) { return 'Jogue ' + n + ' partidas'; } },
      { tipo: 'moedas',    tier: 'facil',   modo: 'soma', metas: [20, 30], texto: function (n) { return 'Ganhe ' + n + ' moedas jogando'; } },
      { tipo: 'acertos',   tier: 'facil',   modo: 'soma', metas: [6, 8],  texto: function (n) { return 'Acerte ' + n + ' perguntas'; } },
  
      { tipo: 'acertos',   tier: 'medio',   modo: 'soma', metas: [14, 16], texto: function (n) { return 'Acerte ' + n + ' perguntas'; } },
      { tipo: 'pontos',    tier: 'medio',   modo: 'max',  metas: [10, 12], texto: function (n) { return 'Faça ' + n + ' pontos em uma partida'; } },
      { tipo: 'sequencia', tier: 'medio',   modo: 'max',  metas: [3, 4],  texto: function (n) { return 'Acerte ' + n + ' perguntas seguidas'; } },
      { tipo: 'estrelas',  tier: 'medio',   modo: 'max',  metas: [2],     texto: function () { return 'Ganhe 2 estrelas em uma partida'; } },
  
      { tipo: 'estrelas',  tier: 'dificil', modo: 'max',  metas: [3],     texto: function () { return 'Ganhe 3 estrelas em uma partida'; } },
      { tipo: 'semErros',  tier: 'dificil', modo: 'soma', metas: [1],     texto: function () { return 'Termine uma partida sem errar nada'; } },
      { tipo: 'sequencia', tier: 'dificil', modo: 'max',  metas: [6, 8],  texto: function (n) { return 'Acerte ' + n + ' perguntas seguidas'; } },
      { tipo: 'partidas',  tier: 'dificil', modo: 'soma', metas: [5],     texto: function (n) { return 'Jogue ' + n + ' partidas'; } }
    ];
  
    // ---------- datas (horário do aparelho) ----------
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function chaveDia(data) {
      const t = data || new Date();
      return t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate());
    }
    function diaAnterior(chave) {
      const p = chave.split('-').map(Number);
      return chaveDia(new Date(p[0], p[1] - 1, p[2] - 1));
    }
  
    // ---------- sorteio repetível ----------
    function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
    function aleatorio(seed) {
      let a = seed;
      return function () {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
  
    /** Os 3 desafios de um dia (fácil, médio, difícil; nunca dois do mesmo tipo). */
    function doDia(chave) {
      const r = aleatorio(hash('notewave-desafios-' + chave)), usados = {}, saida = [];
      NIVEIS.forEach(function (tier) {
        const opcoes = MODELOS.filter(function (m) { return m.tier === tier && !usados[m.tipo]; });
        const m = opcoes[Math.floor(r() * opcoes.length)];
        usados[m.tipo] = true;
        const meta = m.metas[Math.floor(r() * m.metas.length)];
        saida.push({ id: m.tipo + '-' + tier, tipo: m.tipo, tier: tier, modo: m.modo, meta: meta, titulo: m.texto(meta), recompensa: RECOMPENSAS[tier] });
      });
      return saida;
    }
  
    // ---------- progresso a partir do resultado de uma partida ----------
    function maiorSequencia(respostas) {
      let melhor = 0, atual = 0;
      (respostas || []).forEach(function (r) { atual = r.correta === true ? atual + 1 : 0; if (atual > melhor) melhor = atual; });
      return melhor;
    }
    function valorDe(tipo, p) {
      switch (tipo) {
        case 'partidas':  return 1;
        case 'acertos':   return p.acertos | 0;
        case 'moedas':    return Math.max(0, p.moedas | 0);
        case 'pontos':    return Math.max(0, p.pontos | 0);
        case 'estrelas':  return p.estrelas | 0;
        case 'sequencia': return maiorSequencia(p.respostas);
        case 'semErros':  return ((p.erros | 0) === 0 && (p.semResposta | 0) === 0) ? 1 : 0;
        default:          return 0;
      }
    }
    /** Novo progresso do desafio "ch" depois de uma partida. */
    function atualizar(ch, antes, partida) {
      const v = valorDe(ch.tipo, partida);
      return ch.modo === 'soma' ? antes + v : Math.max(antes, v);
    }
  
    NW.desafios = { BONUS: BONUS, RECOMPENSAS: RECOMPENSAS, chaveDia: chaveDia, diaAnterior: diaAnterior, doDia: doDia, atualizar: atualizar };
  })(window.NWRunner = window.NWRunner || {});