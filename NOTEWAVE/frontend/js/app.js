/* Notinha Runner — interface: abas, telas, HUD e resultado.
 * Conversa com o motor (engine.js) por callbacks e com o servidor só via api.js.
 */
(function (NW) {
  "use strict";

  const $ = function (s) { return document.querySelector(s); };
  const $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  const raiz = $("#nw-runner");
  const palco = $("#nwr-palco");
  const hud = $("#nwr-hud");
  const telas = {
    inicio: $("#tela-inicio"),
    instrucoes: $("#tela-instrucoes"),
    pausa: $("#tela-pausa"),
    resultado: $("#tela-resultado"),
  };
  const TOTAL_RODADAS = 10;
  const NIVEL = 1;
  let engine = null;
  let jogando = false;

  function definirJogando(v) {
    jogando = v;
    raiz.classList.toggle("nwr--jogando", v);
  }

  // ---------- utilidades de tela ----------
  function mostrar(nome) {
    Object.keys(telas).forEach(function (k) { telas[k].hidden = k !== nome; });
    if (nome !== "inicio") {
      telas[nome].tabIndex = -1;
      telas[nome].focus({ preventScroll: true });
    }
  }
  function esconderTodas() {
    Object.keys(telas).forEach(function (k) { telas[k].hidden = true; });
  }
  function atualizarSaldo(v) { $("#nwr-saldo").textContent = v; }

  async function carregarSaldo() {
    try { atualizarSaldo((await NW.api.obterCarteira()).saldo); }
    catch (e) { atualizarSaldo("—"); }
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
    if (jogando && nome !== "jogar") pausarJogo();
    $$(".nwr-aba").forEach(function (b) {
      const ativa = b.dataset.aba === nome;
      b.classList.toggle("is-ativa", ativa);
      b.setAttribute("aria-selected", ativa ? "true" : "false");
      b.tabIndex = ativa ? 0 : -1;
    });
    $$(".nwr-painel").forEach(function (s) { s.hidden = s.id !== "aba-" + nome; });
    if (NW.lojaUI) NW.lojaUI.aoAbrir(nome);
    if (NW.lojaUI) NW.lojaUI.aoAbrir(nome);
    if (NW.desafiosUI) NW.desafiosUI.aoAbrir(nome);
  }

  // ---------- pauta (SVG) para perguntas de nota ----------
  function desenharPauta(svg, pos) {
    const NS = "http://www.w3.org/2000/svg";
    svg.innerHTML = "";
    function el(tag, attrs) {
      const e = document.createElementNS(NS, tag);
      Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
      svg.appendChild(e);
      return e;
    }
    for (let i = 0; i < 5; i++)
      el("line", { x1: 8, x2: 142, y1: 20 + i * 10, y2: 20 + i * 10, class: "pauta-linha" });
    const cx = 82, cy = 60 - pos * 5;
    if (pos === -2)
      el("line", { x1: cx - 15, x2: cx + 15, y1: cy, y2: cy, class: "pauta-linha pauta-linha--forte" });
    if (pos < 4)
      el("line", { x1: cx + 7, x2: cx + 7, y1: cy - 1, y2: cy - 32, class: "pauta-haste" });
    else
      el("line", { x1: cx - 7, x2: cx - 7, y1: cy + 1, y2: cy + 32, class: "pauta-haste" });
    el("ellipse", {
      cx: cx, cy: cy, rx: 8.5, ry: 6,
      transform: "rotate(-20 " + cx + " " + cy + ")", class: "pauta-nota",
    });
  }

  function mostrarPergunta(q, n, total) {
    $("#hud-rodada").textContent = n;
    $("#hud-total").textContent = total;
    const pauta = $("#hud-pauta");
    if (q.tipo === "nota") {
      desenharPauta(pauta, q.pos);
      pauta.removeAttribute("hidden");
    } else {
      pauta.setAttribute("hidden", "");
    }
    $("#hud-titulo").textContent = q.titulo;
    $("#hud-sub").textContent = q.dica;
    $("#hud-pergunta").classList.toggle("nwr-pergunta--longa", q.tipo === "texto");
  }

  function atualizarHud(h) {
    $("#hud-rodada").textContent = h.rodada;
    $("#hud-total").textContent = h.total;
    $("#hud-pontos").textContent = h.pontos;
    $("#hud-moedas").textContent = h.moedas;
    $("#hud-estrelas").textContent = h.estrelas;
  }

    // ---------- moedas voando (ganhar / perder) ----------
    const reduzMovimento = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

   // moeda igual à do jogo (dourada, com ♪), girando
  function criarMoedaVoadora(tam) {
    const m = document.createElement("div");
    m.style.cssText =
      "position:fixed;left:0;top:0;z-index:9999;pointer-events:none;opacity:0;will-change:transform,opacity;" +
      "width:" + tam + "px;height:" + tam + "px;margin:" + (-tam / 2) + "px 0 0 " + (-tam / 2) + "px";
    const giro = document.createElement("div");
    giro.style.cssText = "width:100%;height:100%";
    giro.innerHTML =
      '<svg viewBox="-20 -20 40 40" width="100%" height="100%" aria-hidden="true">' +
      '<circle r="16" fill="#ffc928" stroke="#d79a00" stroke-width="2.5"/>' +
      '<circle r="9.9" fill="#ffe27a"/>' +
      '<text y="1" text-anchor="middle" dominant-baseline="central" font-size="17.6" font-weight="700" ' +
      'fill="#e8a800" font-family="Fredoka, \'Baloo 2\', Nunito, \'Segoe UI\', system-ui, sans-serif">\u266A</text>' +
      "</svg>";
    m.appendChild(giro);
    document.body.appendChild(m);
    // mesmo giro da moeda do chão (achata e volta)
    giro.animate(
      [{ transform: "scaleX(1)" }, { transform: "scaleX(.45)" }, { transform: "scaleX(1)" }],
      { duration: 1050, iterations: Infinity, delay: -Math.random() * 1050, easing: "ease-in-out" }
    );
    return m;
  }

  // converte um ponto do jogo (960x540) para a tela e devolve também a escala
  function pontoNaTela(x, y) {
    const r = $("#nwr-canvas").getBoundingClientRect();
    const k = Math.min(r.width / 960, r.height / 540);
    return {
      x: r.left + (r.width - 960 * k) / 2 + x * k,
      y: r.top + (r.height - 540 * k) / 2 + y * k,
      k: k
    };
  }
  
    function pulsarContador() {
      const chip = $("#hud-moedas").parentElement;
      if (chip && chip.animate && !reduzMovimento)
        chip.animate([{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }], { duration: 350, easing: "ease-out" });
    }
  
    function aoMoedas(e) {
      const alvo = $("#hud-moedas").getBoundingClientRect();
      const cx = alvo.left + alvo.width / 2, cy = alvo.top + alvo.height / 2;
      const ganhou = e.delta > 0, qtd = Math.min(8, Math.abs(e.delta));
      const carta = pontoNaTela(e.x, e.y);
      const tam = Math.max(22, 32 * carta.k);          // 32 = diâmetro da moeda no jogo
  
      if (ganhou) setTimeout(function () { NW.somMoedas.dinheiro(); pulsarContador(); }, reduzMovimento ? 0 : 450);
      else { NW.somMoedas.moedasCaindo(); pulsarContador(); }
      if (reduzMovimento) return;
  
      for (let i = 0; i < qtd; i++) {
        const m = criarMoedaVoadora(tam);
        let frames;
        if (ganhou) {
          // da carta até o contador, em arco
          const dx = cx - carta.x, dy = cy - carta.y;
          frames = [
            { transform: "translate(" + carta.x + "px," + carta.y + "px) scale(.6)", opacity: 0 },
            { transform: "translate(" + (carta.x + dx * 0.3 + (i - qtd / 2) * 14) + "px," + (carta.y + dy * 0.2 - 70) + "px) scale(1.1)", opacity: 1, offset: 0.35 },
            { transform: "translate(" + cx + "px," + cy + "px) scale(.8)", opacity: 1, offset: 0.9 },
            { transform: "translate(" + cx + "px," + cy + "px) scale(.4)", opacity: 0 }
          ];
        } else {
          // sai do contador, sobe um pouquinho e cai para fora da tela
          const lado = (Math.random() - 0.5) * 220, chao = window.innerHeight + 40;
          frames = [
            { transform: "translate(" + cx + "px," + cy + "px) scale(.8)", opacity: 0 },
            { transform: "translate(" + (cx + lado * 0.4) + "px," + (cy - 60 - Math.random() * 40) + "px) scale(1.1)", opacity: 1, offset: 0.25 },
            { transform: "translate(" + (cx + lado) + "px," + chao + "px) scale(1)", opacity: 1, offset: 0.95 },
            { transform: "translate(" + (cx + lado) + "px," + chao + "px) scale(1)", opacity: 0 }
          ];
        }
        const a = m.animate(frames, {
          duration: ganhou ? 800 : 950, delay: i * (ganhou ? 70 : 60),
          easing: ganhou ? "cubic-bezier(.3,.1,.3,1)" : "cubic-bezier(.4,0,.8,.6)", fill: "both"
        });
        a.onfinish = function () { m.remove(); };
      }
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
    if (!jogando || engine.estado() !== "jogando") return;
    engine.pausar();
    mostrar("pausa");
  }
  function continuarJogo() {
    telas.pausa.hidden = true;
    engine.continuar();
  }
  function sairDaPartida() {
    engine.parar();
    definirJogando(false);
    hud.hidden = true;
    mostrar("inicio");
  }

  function textoMoedas(n) {
    return n > 0
      ? "Você ganhou " + n + (n === 1 ? " NotaCoin!" : " NotaCoins!")
      : "Nenhuma moeda coletada desta vez.";
  }

  async function salvarPartida(res) {
    const status = $("#res-status");
    status.textContent = "Salvando sua partida…";
    try {
      const r = await NW.api.confirmarPartida(res);
      atualizarSaldo(r.saldo);
      status.textContent = textoMoedas(r.moedasCreditadas);
      if (r.desafiosConcluidos && r.desafiosConcluidos.length)
        status.textContent += " Desafio concluído! Resgate a recompensa na aba Desafios.";
    } catch (e) {
      status.innerHTML = 'Não foi possível salvar. <button type="button" class="nwr-link" id="btn-tentar-salvar">Tentar de novo</button>';
      $("#btn-tentar-salvar").addEventListener("click", function () { salvarPartida(res); });
    }
  }
  
  async function terminarPartida(res) {
    definirJogando(false);
    hud.hidden = true;
    engine.parar();
    const titulos = ["Vamos tentar de novo!", "Boa tentativa!", "Muito bem!", "Parabéns!"];
    $("#res-titulo").textContent = titulos[res.estrelas];
    $("#res-pontos").textContent = res.pontos;
    $("#res-moedas").textContent = res.moedas;
    $("#res-acertos").textContent = res.acertos;
    $("#res-erros").textContent = res.erros;
    $$("#res-estrelas svg").forEach(function (s, i) { s.classList.toggle("is-cheia", i < res.estrelas); });
    $("#btn-de-novo").disabled = true;
    $("#btn-inicio").disabled = true;
    mostrar("resultado");
    try {
      await salvarPartida(res);
    } catch (e) {
      console.error("[Notinha Runner] erro ao salvar a partida:", e);
      $("#res-status").textContent = "Não foi possível salvar a partida.";
    } finally {
      $("#btn-de-novo").disabled = false;
      $("#btn-inicio").disabled = false;
      $("#btn-inicio").focus({ preventScroll: true });
    }
  }
  // ---------- controles ----------
  function configurarControles() {
    palco.addEventListener("pointerdown", function (e) {
      if (!jogando || e.target.closest("button")) return;
      e.preventDefault();
      engine.pular();
    });
    $("#btn-pulo").addEventListener("pointerdown", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (jogando) engine.pular();
    });

    document.addEventListener("keydown", function (e) {
      if (!jogando) return;
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (!e.repeat) engine.pular();
      } else if ((e.code === "Escape" || e.code === "KeyP") && !e.repeat) {
        if (engine.estado() === "jogando") pausarJogo();
        else if (engine.estado() === "pausado") continuarJogo();
      }
    });
    document.addEventListener("keyup", function (e) {
      if (jogando && (e.code === "Space" || e.code === "ArrowUp")) e.preventDefault();
    });
    document.addEventListener("visibilitychange", function () { if (document.hidden) pausarJogo(); });
    window.addEventListener("blur", pausarJogo);

    $("#btn-jogar").addEventListener("click", iniciarPartida);
    $("#btn-de-novo").addEventListener("click", iniciarPartida);
    $("#btn-inicio").addEventListener("click", function () {
      engine.parar();
      mostrar("inicio");
    });
    $("#btn-pausa").addEventListener("click", pausarJogo);
    $("#btn-continuar").addEventListener("click", continuarJogo);
    $("#btn-sair").addEventListener("click", sairDaPartida);
    $("#btn-instrucoes").addEventListener("click", function () { mostrar("instrucoes"); });
    $("#btn-fechar-instrucoes").addEventListener("click", function () { mostrar("inicio"); });
    $("#btn-loja").addEventListener("click", function () { irParaAba("loja"); });

    const btnSom = $("#btn-som");
    function rotuloSom() {
      const m = NW.som.estaMudo();
      btnSom.textContent = m ? "Som: desligado" : "Som: ligado";
      btnSom.setAttribute("aria-pressed", m ? "true" : "false");
    }
    btnSom.addEventListener("click", function () {
      NW.som.alternar();
      NW.som.liberar();
      rotuloSom();
    });
    rotuloSom();

    $$(".nwr-aba").forEach(function (b) {
      b.addEventListener("click", function () { irParaAba(b.dataset.aba); });
    });
  }

  // ---------- inicialização ----------
  async function iniciar() {
    aplicarTema();
    NW.tema.observar(aplicarTema);
    configurarControles();
    carregarSaldo();

    // o sprite vem embutido (sprite-data.js); se não existir, usa o caminho do HTML (data-sprite)
    const caminho =
      NW.SPRITE_DATA ||
      new URL(raiz.dataset.sprite || "../imagem/runner/notinha-corrida.png", document.baseURI).href;
    raiz.style.setProperty("--nwr-sprite", 'url("' + caminho + '")');
    const sprite = await NW.Engine.carregarSprite(caminho);
    if (!sprite) console.warn("[Notinha Runner] sprite não carregou:", caminho.slice(0, 120));
    else if (NW.loja) NW.loja.analisarSprite(sprite);

    engine = NW.Engine.criar({
      canvas: $("#nwr-canvas"),
      sprite: sprite,
      tema: NW.tema.atual(),
      aoHud: atualizarHud,
      aoPergunta: mostrarPergunta,
      aoMoedas: aoMoedas,
      aoFim: terminarPartida,
    });

    // loja, guarda-roupa e cenários: o que está equipado vai direto para o jogo
    try {
      await NW.lojaUI.iniciar({
        aoMudar: function (eq) { engine.definirVisual(eq); },
        atualizarSaldo: atualizarSaldo,
        irParaAba: irParaAba,
      });
    } catch (e) {
      console.warn("[Notinha Runner] loja indisponível:", e);
    }

        // loja, guarda-roupa e cenários: o que está equipado vai direto para o jogo
        try {
          await NW.lojaUI.iniciar({
            aoMudar: function (eq) { engine.definirVisual(eq); },
            atualizarSaldo: atualizarSaldo,
            irParaAba: irParaAba,
          });
        } catch (e) {
          console.warn("[Notinha Runner] loja indisponível:", e);
        }
    
        // desafios diários
        try {
          NW.desafiosUI.iniciar({ atualizarSaldo: atualizarSaldo, irParaAba: irParaAba });
        } catch (e) {
          console.warn("[Notinha Runner] desafios indisponíveis:", e);
        }

    // imagem da tela inicial; se faltar ou falhar, mostra o Notinha correndo
    const imgIni = $("#nwr-img-inicio"), reserva = $("#nwr-inicio-reserva");
    function usarReserva() { imgIni.hidden = true; reserva.hidden = false; }
    if (!imgIni.getAttribute("src")) usarReserva();
    else if (imgIni.complete && imgIni.naturalWidth === 0) usarReserva();
    else imgIni.addEventListener("error", usarReserva);

    irParaAba("jogar");
    mostrar("inicio");
    $("#btn-jogar").disabled = false;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})((window.NWRunner = window.NWRunner || {}));