/* Notinha Runner — aba "Desafios" (interface).
 * Cada desafio tem uma "Missão musical" (desafios-missoes.js): clicar no desafio abre a mini-aula.
 * O cabeçalho mostra a sequência de estudos da NoteWave (mesma do perfil).
 */
(function (NW) {
    'use strict';
  
    const D = NW.desafios;
    const NIVEIS = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };
    const moedaHtml = '<span class="nwr-moeda" aria-hidden="true"></span>';
    const ICONE_FOGO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9.5z"/></svg>';
    const reduz = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  
    const R = {};
    let ctl = null, raiz = null, estado = null, ocupado = false, msg = '';
  
    function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function plural(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }
  
    function montar() {
      raiz = document.getElementById('aba-desafios');
      raiz.innerHTML =
        '<div class="nwr-des">' +
          '<header class="nwr-des__topo">' +
            '<div><h2>Desafios do dia</h2><p class="nwr-des__sub">Novos desafios em <b data-r="timer">—</b></p></div>' +
            '<div class="nwr-des__streak" data-r="streak"></div>' +
          '</header>' +
          '<ul class="nwr-des__lista" data-r="lista"></ul>' +
          '<div class="nwr-des__bonus" data-r="bonus" tabindex="-1"></div>' +
          '<p class="nwr-des__msg" data-r="msg"></p>' +
          '<div class="nwr-des__rodape"><button type="button" class="nwr-btn nwr-btn--suave nwr-btn--mini" data-jogar>Jogar agora</button></div>' +
          '<p class="nwr-sr" role="status" aria-live="polite" data-r="anuncio"></p>' +
        '</div>';
      raiz.querySelectorAll('[data-r]').forEach(function (el) { R[el.dataset.r] = el; });
      raiz.addEventListener('click', function (e) {
        const b = e.target.closest('[data-resgatar]');
        if (b) { resgatar(b.dataset.resgatar); return; }
        const m = e.target.closest('[data-missao]');
        if (m) { abrirMissao(m.dataset.missao); return; }
        if (e.target.closest('[data-jogar]')) { ctl.irParaAba('jogar'); return; }
        const li = e.target.closest('.nwr-des__item');
        if (li && !e.target.closest('button')) abrirMissao(li.dataset.ch);   // clicar no desafio abre a missão
      });
    }
  
    function restante() {
      const a = new Date(), f = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 1);
      const min = Math.max(1, Math.ceil((f - a) / 60000)), h = Math.floor(min / 60), m = min % 60;
      return h ? h + ' h ' + m + ' min' : m + ' min';
    }
  
    function abrirMissao(id) {
      if (!estado || !NW.missoes) return;
      const ch = D.doDia(estado.dia).filter(function (c) { return c.id === id; })[0];
      if (!ch) return;
      NW.missoes.abrir(ch, {
        dia: estado.dia,
        aoConcluir: function (r) {
          const metaOk = (estado.progresso[ch.id] | 0) >= ch.meta;
          msg = !r.novo
            ? 'Missão concluída de novo. Bom treino!'
            : metaOk
              ? 'Missão concluída! O desafio foi completado: clique em Resgatar.'
              : 'Missão concluída! Agora falta cumprir a meta jogando.';
          recarregar();
        }
      });
    }
  
    function desenhar() {
      if (!estado) return;
      const lista = D.doDia(estado.dia), resg = estado.resgatados;
      const seq = NW.estudo ? NW.estudo.sequencia() : estado.sequencia;
      R.timer.textContent = restante();
      R.streak.innerHTML = ICONE_FOGO + '<b>' + seq + '</b> ' + (seq === 1 ? 'dia de estudo seguido' : 'dias de estudo seguidos');
  
      R.lista.innerHTML = '';
      lista.forEach(function (ch) {
        const prog = Math.min(estado.progresso[ch.id] | 0, ch.meta);
        const feito = resg.indexOf(ch.id) >= 0;
        const def = NW.missoes && NW.missoes.definicao(ch.id);
        const missaoFeita = !!(NW.missoes && NW.missoes.feita(estado.dia, ch.id));
        const metaOk = prog >= ch.meta;
        const missaoOk = !def || missaoFeita;          // sem missão definida, não trava o desafio
        const pronto = metaOk && missaoOk;             // só fica verde com as duas coisas
        const li = document.createElement('li');
        li.className = 'nwr-des__item' + (feito ? ' is-feito' : pronto ? ' is-pronto' : '');
        li.dataset.ch = ch.id; li.tabIndex = -1;
        let acao;
        if (feito) acao = '<span class="nwr-tag nwr-tag--ok">Resgatado</span>';
        else if (pronto) acao = '<button type="button" class="nwr-btn nwr-btn--mini" data-resgatar="' + ch.id + '"' + (ocupado ? ' disabled' : '') + '>Resgatar</button>';
        else if (metaOk && !missaoOk) acao = '<span class="nwr-tag">Falta a missão</span>';
        else acao = '<span class="nwr-tag">Em andamento</span>';
        const missao = def
          ? '<div class="nwr-des__missao">' +
              '<div class="nwr-des__missao-txt"><span class="nwr-des__missao-ico" aria-hidden="true">' + def.icone + '</span>' +
                '<span><b>Missão musical:</b> ' + esc(def.titulo) + '</span></div>' +
              '<div class="nwr-des__missao-acoes">' +
                (missaoFeita ? '<span class="nwr-tag nwr-tag--ok">Concluída</span>' : '') +
                '<button type="button" class="nwr-btn nwr-btn--suave nwr-btn--mini" data-missao="' + ch.id + '">' +
                  (missaoFeita ? 'Praticar de novo' : 'Começar missão') + '</button>' +
              '</div>' +
            '</div>'
          : '';
        li.innerHTML =
          '<div class="nwr-des__info">' +
            '<span class="nwr-des__nivel nwr-des__nivel--' + ch.tier + '">' + NIVEIS[ch.tier] + '</span>' +
            '<strong class="nwr-des__titulo">' + esc(ch.titulo) + '</strong>' +
          '</div>' +
          '<div class="nwr-des__lado"><span class="nwr-preco">' + moedaHtml + '<b>+' + ch.recompensa + '</b></span>' + acao + '</div>' +
          '<div class="nwr-barra" role="progressbar" aria-valuemin="0" aria-valuemax="' + ch.meta + '" aria-valuenow="' + prog + '" aria-label="Progresso: ' + esc(ch.titulo) + '">' +
            '<div class="nwr-barra__trilho"><div class="nwr-barra__preenche" style="width:' + Math.round(prog / ch.meta * 100) + '%"></div></div>' +
            '<span class="nwr-barra__num">' + prog + '/' + ch.meta + '</span>' +
          '</div>' + missao;
        R.lista.appendChild(li);
      });
  
      const todos = lista.every(function (c) { return resg.indexOf(c.id) >= 0; });
      let acaoB;
      if (estado.bonus) acaoB = '<span class="nwr-tag nwr-tag--ok">Resgatado</span>';
      else if (todos) acaoB = '<button type="button" class="nwr-btn nwr-btn--mini" data-resgatar="bonus"' + (ocupado ? ' disabled' : '') + '>Resgatar bônus</button>';
      else acaoB = '<span class="nwr-tag">' + resg.length + '/' + lista.length + ' resgatados</span>';
      R.bonus.className = 'nwr-des__bonus' + (estado.bonus ? ' is-feito' : todos ? ' is-pronto' : '');
      R.bonus.innerHTML =
        '<div class="nwr-des__info"><strong class="nwr-des__titulo">Bônus do dia</strong>' +
        '<span class="nwr-des__sub">Resgate os 3 desafios e ganhe mais ' + moedaHtml + ' <b>' + D.BONUS + '</b></span></div>' +
        '<div class="nwr-des__lado">' + acaoB + '</div>';
  
      R.msg.textContent = msg;
      R.anuncio.textContent = msg;
    }
  
    function pulsarSaldo() {
      const chip = document.querySelector('.nwr-saldo');
      if (chip && chip.animate && !reduz)
        chip.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 400, easing: 'ease-out' });
    }
  
    function focar(id) {
      const alvo = id === 'bonus' ? R.bonus : raiz.querySelector('[data-ch="' + id + '"]');
      if (alvo) alvo.focus({ preventScroll: true });
    }
  
    async function resgatar(id) {
      if (ocupado) return;
      ocupado = true; msg = ''; desenhar();
      try {
        const r = await NW.api.resgatarDesafio(id);
        estado = r.estado;
        ctl.atualizarSaldo(r.saldo);
        msg = 'Você ganhou ' + plural(r.ganho, 'moeda', 'moedas') + '!';
        if (NW.somMoedas) NW.somMoedas.dinheiro();
        pulsarSaldo();
      } catch (e) {
        msg = e.message === 'ja-resgatado' ? 'Você já resgatou esta recompensa.'
    : e.message === 'missao-pendente' ? 'Conclua a missão musical antes de resgatar.'
    : 'Não foi possível resgatar agora. Tente de novo.';
      }
      ocupado = false; desenhar(); focar(id);
    }
  
    async function recarregar() {
      try { estado = await NW.api.obterDesafios(); } catch (e) { return; }
      desenhar();
    }
  
    function iniciar(opc) {
      ctl = opc;
      montar();
      recarregar();
      // atualiza o relógio e troca os desafios quando vira o dia
      setInterval(function () {
        if (!raiz || raiz.hidden || !estado) return;
        if (estado.dia !== D.chaveDia()) recarregar(); else R.timer.textContent = restante();
      }, 30000);
    }
  
    function aoAbrir(aba) {
      if (aba !== 'desafios' || !ctl) return;
      msg = '';
      recarregar();
    }
  
    NW.desafiosUI = { iniciar: iniciar, aoAbrir: aoAbrir };
  })(window.NWRunner = window.NWRunner || {});