/* Notinha Runner — comunicação com o servidor (progresso salvo na conta). */
(function (NW) {
  'use strict';

  const MODO = 'servidor';
  const BASE = window.NW_API_RUNNER || 'https://note-tcc-backend.vercel.app/api/runner';

  async function chamar(metodo, rota, corpo) {
    const r = await fetch(BASE + rota, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token') },
      body: corpo ? JSON.stringify(corpo) : undefined
    });
    let d = {};
    try { d = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error(d.erro || 'http-' + r.status);   // ex.: 'saldo-insuficiente', 'ja-resgatado'
    return d;
  }

  // ---------- carteira e partidas ----------
  async function obterCarteira() {
    const d = await chamar('GET', '/estado');
    return { saldo: d.saldo };
  }
  function confirmarPartida(partida) {
    return chamar('POST', '/partida', partida);
  }

  // ---------- loja ----------
  function obterLoja() { return chamar('GET', '/estado'); }
  function comprar(id) { return chamar('POST', '/comprar', { id: id }); }
  function equipar(eq) { return chamar('PUT', '/equipar', { equipado: eq }); }

  // ---------- desafios ----------
  // As missões musicais rodam no navegador; avisamos o servidor das que já foram feitas hoje.
  function missoesFeitasHoje() {
    const ids = [];
    if (!NW.estudo) return ids;
    const dia = NW.desafios.chaveDia();
    NW.desafios.doDia(dia).forEach(function (ch) { if (NW.estudo.feita(dia, ch.id)) ids.push(ch.id); });
    return ids;
  }
  async function obterDesafios() {
    const ids = missoesFeitasHoje();
    if (ids.length) return chamar('POST', '/desafios/missoes', { ids: ids });
    return chamar('GET', '/desafios');
  }
  async function resgatarDesafio(id) {
    const ids = missoesFeitasHoje();
    // o bônus não tem missão própria; os desafios só podem ser resgatados com a missão feita
    if (id !== 'bonus' && ids.indexOf(id) < 0) throw new Error('missao-pendente');
    if (ids.length) await chamar('POST', '/desafios/missoes', { ids: ids });
    return chamar('POST', '/desafios/resgatar', { id: id });
  }

  NW.api = {
    obterLoja: obterLoja, comprar: comprar, equipar: equipar, MODO: MODO,
    obterCarteira: obterCarteira, confirmarPartida: confirmarPartida,
    obterDesafios: obterDesafios, resgatarDesafio: resgatarDesafio
  };
})(window.NWRunner = window.NWRunner || {});