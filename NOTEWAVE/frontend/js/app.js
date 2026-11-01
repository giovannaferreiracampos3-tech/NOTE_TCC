/* Notinha Runner — interface: abas, telas, HUD e resultado.
 * Conversa com o motor (game/engine.js) por callbacks e com o servidor só via api.js.
 */
(function (NW) {
  'use strict';

  const $ = function (s) { return document.querySelector(s); };
  const $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  const raiz = $('#nw-runner');
  const palco = $('#nwr-palco');
  const hud = $('#nwr-hud');
  const telas = {
    inicio: $('#tela-inicio'), instrucoes: $('#tela-instrucoes'),
    pausa: $('#tela-pausa'), resultado: $('#tela-resultado')
  };
  const TOTAL_RODADAS = 10;
  const NIVEL = 1;
  let engine = null;
  let jogando = false;
  function definirJogando(v) { jogando = v; raiz.classList.toggle('nwr--jogando', v); }

  // ---------- utilidades de tela ----------
  function mostrar(nome) {
    Object.keys(telas).forEach(function (k) { telas[k].hidden = (k !== nome); });
  }
  function esconderTodas() {
    Object.keys(telas).forEach(function (k) { telas[k].hidden = true; });
  }
  function atualizarSaldo(v) { $('#nwr-saldo').textContent = v; }

  async function carregarSaldo() {
    try { atualizarSaldo((await NW.api.obterCarteira()).saldo); }
    catch (e) { atualizarSaldo('—'); }
  }

  // ---------- tema (lido da NoteWave, sem opção própria) ----------
  function aplicarTema() {
    const t = NW.tema.atual();
    raiz.dataset.tema = t;
    if (engine) engine.definirTema(t);
    if (NW.lojaUI) NW.lojaUI.atualizarTema();
  }

  // ---------- abas ----------
  function irParaAba(nome) {
    if (jogando && nome !== 'jogar') pausarJogo();
    $$('.nwr-aba').forEach(function (b) {
      const ativa = b.dataset.aba === nome;
      b.classList.toggle('is-ativa', ativa);
      b.setAttribute('aria-selected', ativa ? 'true' : 'false');
    });
    $$('.nwr-painel').forEach(function (s) { s.hidden = (s.id !== 'aba-' + nome); });
    if (NW.lojaUI) NW.lojaUI.aoAbrir(nome);
  }

  // ---------- pauta (SVG) para perguntas de nota ----------
  function desenharPauta(svg, pos) {
    const NS = 'http://www.w3.org/2000/svg';
    svg.innerHTML = '';
    function el(tag, attrs) {
      const e = document.createElementNS(NS, tag);
      Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
      svg.appendChild(e); return e;
    }
    for (let i = 0; i < 5; i++) el('line', { x1: 8, x2: 142, y1: 20 + i * 10, y2: 20 + i * 10, class: 'pauta-linha' });
    const cx = 82, cy = 60 - pos * 5;
    if (pos === -2) el('line', { x1: cx - 15, x2: cx + 15, y1: cy, y2: cy, class: 'pauta-linha pauta-linha--forte' });
    const cima = pos < 4;                                           // haste para cima até a 3ª linha
    if (cima) el('line', { x1: cx + 7, x2: cx + 7, y1: cy - 1, y2: cy - 32, class: 'pauta-haste' });
    else      el('line', { x1: cx - 7, x2: cx - 7, y1: cy + 1, y2: cy + 32, class: 'pauta-haste' });
    el('ellipse', { cx: cx, cy: cy, rx: 8.5, ry: 6, transform: 'rotate(-20 ' + cx + ' ' + cy + ')', class: 'pauta-nota' });
  }

  function mostrarPergunta(q, n, total) {
    $('#hud-rodada').textContent = n;
    $('#hud-total').textContent = total;
    const pauta = $('#hud-pauta');
    if (q.tipo === 'nota') { desenharPauta(pauta, q.pos); pauta.removeAttribute('hidden'); }
    else { pauta.setAttribute('hidden', ''); }
    $('#hud-titulo').textContent = q.titulo;
    $('#hud-sub').textContent = q.dica;
    $('#hud-pergunta').classList.toggle('nwr-pergunta--longa', q.tipo === 'texto');
  }

  function atualizarHud(h) {
    $('#hud-rodada').textContent = h.rodada;
    $('#hud-total').textContent = h.total;
    $('#hud-pontos').textContent = h.pontos;
    $('#hud-moedas').textContent = h.moedas;
    $('#hud-estrelas').textContent = h.estrelas;
  }

  // ---------- fluxo da partida ----------
  function iniciarPartida() {
    NW.som.liberar();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    esconderTodas();
    hud.hidden = false;
    definirJogando(true);
    engine.iniciar(NW.perguntas.sortear(TOTAL_RODADAS, NIVEL));
  }

  function pausarJogo() {
    if (!jogando || engine.estado() !== 'jogando') return;
    engine.pausar();
    mostrar('pausa');
  }
  function continuarJogo() {
    telas.pausa.hidden = true;
    engine.continuar();
  }
  function sairDaPartida() {
    engine.parar();
    definirJogando(false);
    hud.hidden = true;
    mostrar('inicio');
  }

  async function terminarPartida(res) {
    definirJogando(false);
    hud.hidden = true;
    engine.parar();   // tira o Notinha do canvas: na tela de resultado ele aparece em destaque

    // preenche a tela de resultado
    const titulos = ['Vamos tentar de novo!', 'Boa tentativa!', 'Muito bem!', 'Parabéns!'];
    $('#res-titulo').textContent = titulos[res.estrelas];
    $('#res-pontos').textContent = res.pontos;
    $('#res-moedas').textContent = res.moedas;
    $('#res-acertos').textContent = res.acertos;
    $('#res-erros').textContent = res.erros;
    $$('#res-estrelas svg').forEach(function (s, i) { s.classList.toggle('is-cheia', i < res.estrelas); });
    const status = $('#res-status');
    status.textContent = 'Salvando sua partida…';
    $('#btn-de-novo').disabled = true; $('#btn-inicio').disabled = true;
    mostrar('resultado');

    // o saldo só muda depois da confirmação da partida
    try {
      const r = await NW.api.confirmarPartida(res);
      atualizarSaldo(r.saldo);
      status.textContent = r.moedasCreditadas > 0
        ? 'Você ganhou ' + r.moedasCreditadas + (r.moedasCreditadas === 1 ? ' moeda!' : ' moedas!')
        : 'Nenhuma moeda coletada desta vez.';
    } catch (e) {
      status.innerHTML = 'Não foi possível salvar a partida. <button class="nwr-link" id="btn-tentar-salvar">Tentar de novo</button>';
      $('#btn-tentar-salvar').addEventListener('click', function () { terminarPartidaSalvar(res); });
    }
    $('#btn-de-novo').disabled = false; $('#btn-inicio').disabled = false;
  }

  async function terminarPartidaSalvar(res) {
    const status = $('#res-status');
    status.textContent = 'Salvando sua partida…';
    try {
      const r = await NW.api.confirmarPartida(res);
      atualizarSaldo(r.saldo);
      status.textContent = 'Você ganhou ' + r.moedasCreditadas + ' moedas!';
    } catch (e) {
      status.innerHTML = 'Ainda sem conexão. <button class="nwr-link" id="btn-tentar-salvar">Tentar de novo</button>';
      $('#btn-tentar-salvar').addEventListener('click', function () { terminarPartidaSalvar(res); });
    }
  }

  // ---------- controles ----------
  function configurarControles() {
    // toque / clique em qualquer lugar do palco durante a partida
    palco.addEventListener('pointerdown', function (e) {
      if (!jogando || e.target.closest('button')) return;
      e.preventDefault();
      engine.pular();
    });
    $('#btn-pulo').addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); if (jogando) engine.pular(); });

    document.addEventListener('keydown', function (e) {
      if (!jogando) return;
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (!e.repeat) engine.pular();
      } else if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
        if (engine.estado() === 'jogando') pausarJogo();
        else if (engine.estado() === 'pausado') continuarJogo();
      }
    });
    document.addEventListener('keyup', function (e) {
      if (jogando && (e.code === 'Space' || e.code === 'ArrowUp')) e.preventDefault();
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden) pausarJogo(); });
    window.addEventListener('blur', pausarJogo);

    $('#btn-jogar').addEventListener('click', iniciarPartida);
    $('#btn-de-novo').addEventListener('click', iniciarPartida);
    $('#btn-inicio').addEventListener('click', function () { engine.parar(); mostrar('inicio'); });
    $('#btn-pausa').addEventListener('click', pausarJogo);
    $('#btn-continuar').addEventListener('click', continuarJogo);
    $('#btn-sair').addEventListener('click', sairDaPartida);
    $('#btn-instrucoes').addEventListener('click', function () { mostrar('instrucoes'); });
    $('#btn-fechar-instrucoes').addEventListener('click', function () { mostrar('inicio'); });

    const btnSom = $('#btn-som');
    function rotuloSom() {
      const m = NW.som.estaMudo();
      btnSom.textContent = m ? 'Som: desligado' : 'Som: ligado';
      btnSom.setAttribute('aria-pressed', m ? 'true' : 'false');
    }
    btnSom.addEventListener('click', function () { NW.som.alternar(); NW.som.liberar(); rotuloSom(); });
    rotuloSom();

    $$('.nwr-aba').forEach(function (b) { b.addEventListener('click', function () { irParaAba(b.dataset.aba); }); });
  }

  // ---------- inicialização ----------
  async function iniciar() {
    aplicarTema();
    NW.tema.observar(aplicarTema);
    configurarControles();
    carregarSaldo();

    // o caminho da imagem vem do HTML (data-sprite)
    // o sprite vem embutido (js/sprite-data.js); se não existir, tenta o caminho do HTML (data-sprite)
    const caminho = NW.SPRITE_DATA || new URL(raiz.dataset.sprite || '../imagem/runner/notinha-corrida.png', document.baseURI).href;
    raiz.style.setProperty('--nwr-sprite', 'url("' + caminho + '")');
    const sprite = await NW.Engine.carregarSprite(caminho);
    if (!sprite) console.warn('[Notinha Runner] sprite não carregou:', caminho.slice(0, 120));
    engine = NW.Engine.criar({
      canvas: $('#nwr-canvas'), sprite: sprite, tema: NW.tema.atual(),
      aoHud: atualizarHud, aoPergunta: mostrarPergunta, aoFim: terminarPartida
    });
    // loja, guarda-roupa e cenários: o que está equipado vai direto para o jogo
    try {
      await NW.lojaUI.iniciar({
        aoMudar: function (eq) { engine.definirVisual(eq); },
        atualizarSaldo: atualizarSaldo, irParaAba: irParaAba
      });
    } catch (e) { console.warn('[Notinha Runner] loja indisponível:', e); }

    // imagem da tela inicial (src definido no HTML); se faltar ou falhar, mostra o Notinha correndo
    const imgIni = $('#nwr-img-inicio'), reserva = $('#nwr-inicio-reserva');
    function usarReserva() { imgIni.hidden = true; reserva.hidden = false; }
    if (!imgIni.getAttribute('src')) usarReserva();
    else if (imgIni.complete && imgIni.naturalWidth === 0) usarReserva();
    else imgIni.addEventListener('error', usarReserva);

    mostrar('inicio');
    $('#btn-jogar').disabled = false;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})(window.NWRunner = window.NWRunner || {});