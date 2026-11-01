/* Notinha Runner — camada de comunicação com o backend.
 *
 * ATENÇÃO (Etapas 1–3): o backend da NoteWave ainda não foi integrado, então este
 * arquivo usa um armazenamento LOCAL temporário só para o jogo funcionar de ponta a ponta.
 * Na Etapa 4 apenas ESTE arquivo muda: as funções passam a chamar o servidor (fetch),
 * que valida a partida e credita as moedas. O resto do jogo não precisa ser alterado.
 */
(function (NW) {
  'use strict';

  const MODO = 'local';                    // trocar para 'servidor' na Etapa 4
  const CHAVE = 'nw_runner_local_v1';      // temporário; some quando o backend entrar

  function padrao() {
    return { saldo: 0, partidas: [], inventario: [], equipado: { acessorios: {}, efeito: null, cenario: 'castelo' } };
  }
  function ler() {
    const base = padrao();
    try {
      const d = JSON.parse(localStorage.getItem(CHAVE)) || {};
      const eq = d.equipado || {};
      return {
        saldo: d.saldo | 0, partidas: d.partidas || [], inventario: d.inventario || [],
        equipado: { acessorios: eq.acessorios || {}, efeito: eq.efeito || null, cenario: eq.cenario || 'castelo' }
      };
    } catch (e) { return base; }
  }
  function gravar(d) {
    try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) { /* sem espaço/privado */ }
  }

  /** Saldo de moedas do usuário. */
  async function obterCarteira() {
    return { saldo: ler().saldo };
  }

  /**
   * Confirma uma partida terminada e credita as moedas.
   * partida = { pontos, moedas, acertos, erros, semResposta, estrelas, duracao_ms, respostas[] }
   * No servidor, o crédito será calculado a partir de "respostas" e dos eventos da partida,
   * nunca confiando no valor de moedas enviado pelo navegador.
   */
  async function confirmarPartida(partida) {
    const d = ler();
    const credito = Math.max(0, partida.moedas | 0);   // moedas nunca negativas
    d.saldo += credito;
    d.partidas.push(Object.assign({}, partida, { quando: new Date().toISOString() }));
    if (d.partidas.length > 50) d.partidas = d.partidas.slice(-50);
    gravar(d);
    return { saldo: d.saldo, moedasCreditadas: credito };
  }

  // ---------- loja ----------
  // No servidor (Etapa 4+), preço e posse dos itens serão sempre conferidos lá.
  function possui(d, it) { return it.preco === 0 || d.inventario.indexOf(it.id) >= 0; }

  /** Saldo, itens comprados e o que está equipado. */
  async function obterLoja() {
    const d = ler();
    return { saldo: d.saldo, inventario: d.inventario.slice(), equipado: d.equipado };
  }

  /** Compra um item (o preço vem do catálogo, nunca do navegador). */
  async function comprar(id) {
    const it = NW.loja.item(id);
    if (!it) throw new Error('item-invalido');
    const d = ler();
    if (possui(d, it)) throw new Error('ja-possui');
    if (d.saldo < it.preco) throw new Error('saldo-insuficiente');
    d.saldo -= it.preco;
    d.inventario.push(id);
    gravar(d);
    return { saldo: d.saldo, inventario: d.inventario.slice() };
  }

  /** Salva o visual equipado, aceitando só itens que o usuário possui. */
  async function equipar(eq) {
    const d = ler(), limpo = { acessorios: {}, efeito: null, cenario: 'castelo' };
    NW.loja.SLOTS.forEach(function (s) {
      const it = NW.loja.item((eq.acessorios || {})[s.id]);
      if (it && it.cat === 'acessorios' && it.slot === s.id && possui(d, it)) limpo.acessorios[s.id] = it.id;
    });
    const ef = NW.loja.item(eq.efeito);
    if (ef && ef.cat === 'efeitos' && possui(d, ef)) limpo.efeito = ef.id;
    const cen = NW.loja.item(eq.cenario);
    if (cen && cen.cat === 'cenarios' && possui(d, cen)) limpo.cenario = cen.id;
    d.equipado = limpo;
    gravar(d);
    return { equipado: limpo };
  }

  NW.api = { obterLoja: obterLoja, comprar: comprar, equipar: equipar, MODO: MODO, obterCarteira: obterCarteira, confirmarPartida: confirmarPartida };
})(window.NWRunner = window.NWRunner || {});