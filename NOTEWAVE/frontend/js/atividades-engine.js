// Motor único das atividades de leitura de notas (Clave de Sol e Clave de Fá).
// Antes: dois JS quase idênticos. Agora: um motor + uma configuração por página (window.ATIV).
(() => {
    const C = window.ATIV; // { p:'sol'|'fa', dados, nome:'Clave de Sol', midi:{classe:número} }
    const $ = id => document.getElementById(id);
    const K = { ok: `musical_${C.p}_correctCount`, err: `musical_${C.p}_wrongCount`, st: i => `status_${C.p}_concluido_licao_${i}`, medalha: `medalha_clave_${C.p}` };
    const id = parseInt(new URLSearchParams(location.search).get('id')) || 1;
    const licao = C.dados.find(l => l.id === id);
    if (!licao) { document.body.innerHTML = "<h1 style='text-align:center;margin-top:50px'>⚠️ Lição não encontrada!</h1>"; return; }
    
    let ok = +localStorage.getItem(K.ok) || 0, err = +localStorage.getItem(K.err) || 0;
    let respondeu = false, primeira = true;
    const erradas = JSON.parse(sessionStorage.getItem(`erradas_${C.p}`) || '[]');
    const embaralha = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
    
    // ---------- Som (usa o MP3; se faltar, sintetiza a nota) ----------
    let ac;
    function sintetizar(m, d = 1.2) {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
      o.type = 'triangle'; o.frequency.value = 440 * Math.pow(2, (m - 69) / 12);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.35, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + d);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + .05);
    }
    const efeito = acertou => { try { sintetizar(acertou ? 84 : 48, .35); } catch (e) {} };
    const fmt = s => isNaN(s) ? '0:00' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const dicaHtml = t => t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/^Dica:\s*/i, '');
    
    // ---------- Montagem da lição ----------
    const audio = $('audioTrack'), playBtn = $('playBtn');
    $('lessonNumber').textContent = `Lição ${id} de ${C.dados.length}`;
    $('lessonTitle').textContent = licao.titulo;
    $('helpText').innerHTML = dicaHtml(licao.dica);
    $('noteElement').className = 'note ' + licao.classePosicao;
    $('correctCount').textContent = ok; $('wrongCount').textContent = err;
    audio.src = licao.audioSrc;
    $('btnHelp').onclick = () => { const h = $('helpBox'); h.style.display = h.style.display === 'none' ? 'block' : 'none'; };
    playBtn.onclick = () => {
      if (audio.error || audio.dataset.falhou) return sintetizar(C.midi[licao.classePosicao]);
      if (audio.paused) audio.play().then(() => playBtn.innerHTML = "<span class='play-icon'>⏸</span>").catch(() => { audio.dataset.falhou = 1; sintetizar(C.midi[licao.classePosicao]); });
      else { audio.pause(); playBtn.innerHTML = "<span class='play-icon'>▶</span>"; }
    };
    audio.onerror = () => { audio.dataset.falhou = 1; };
    audio.onloadedmetadata = () => $('audioTime').textContent = `0:00 / ${fmt(audio.duration)}`;
    audio.ontimeupdate = () => $('audioTime').textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration)}`;
    audio.onended = () => playBtn.innerHTML = "<span class='play-icon'>▶</span>";
    
    const botoes = [...document.querySelectorAll('.option-btn')];
    embaralha(licao.opcoes).forEach((t, i) => { if (botoes[i]) { botoes[i].textContent = t; botoes[i].onclick = () => escolher(botoes[i], t); } });
    $('resetBtn').onclick = () => confirm(`Zerar todo o seu progresso na ${C.nome}?`) && zerar();
    progresso();
    
    document.addEventListener('keydown', e => {   // teclas 1–4 escolhem; Enter avança
      if (e.key >= '1' && e.key <= '4' && botoes[e.key - 1] && !respondeu) botoes[e.key - 1].click();
      else if (e.key === 'Enter' && $('feedbackPanel').style.display === 'flex') $('actionBtn').click();
    });
    
    // ---------- Resposta ----------
    function escolher(btn, resp) {
      if (respondeu) return;
      const fb = $('feedbackPanel'); fb.style.display = 'flex';
      const acertou = resp === licao.notaCorreta;
      efeito(acertou);
      if (acertou) {
        respondeu = true;
        if (primeira && !localStorage.getItem(K.st(id))) { ok++; localStorage.setItem(K.ok, ok); localStorage.setItem(K.st(id), 'true'); }
        $('correctCount').textContent = ok;
        btn.classList.add('right');
        botoes.forEach(b => { if (b !== btn) b.disabled = true; });
        fb.className = 'feedback-panel success'; $('feedbackIcon').textContent = '✓';
        $('feedbackTitle').textContent = 'Isso mesmo! 🌊';
        $('feedbackMessage').textContent = primeira
          ? `Você acertou ${licao.notaCorreta} de primeira. Seu progresso subiu!`
          : `Você encontrou ${licao.notaCorreta}. Como houve erro antes, o progresso desta lição não subiu.`;
        $('actionBtn').textContent = id < C.dados.length ? 'Próxima lição' : 'Ver resultado';
        $('actionBtn').onclick = () => id < C.dados.length ? location.href = `${location.pathname}?id=${id + 1}` : onda(encerrar);
        progresso();
      } else {
        if (primeira) { erradas.push(licao.titulo); sessionStorage.setItem(`erradas_${C.p}`, JSON.stringify(erradas)); }
        primeira = false; err++; localStorage.setItem(K.err, err); $('wrongCount').textContent = err;
        btn.disabled = true; btn.classList.add('wrong');
        fb.className = 'feedback-panel danger'; $('feedbackIcon').textContent = '🌀';
        $('feedbackTitle').textContent = 'A maré levou essa! Tente de novo.';
        $('feedbackMessage').innerHTML = `Dica: ${dicaHtml(licao.dica)}`;
        $('actionBtn').textContent = 'Tentar novamente'; $('actionBtn').onclick = () => fb.style.display = 'none';
      }
    }
    function pct() { let n = 0; for (let i = 1; i <= C.dados.length; i++) if (localStorage.getItem(K.st(i))) n++; return Math.round(n / C.dados.length * 100); }
    function progresso() { const p = pct(); $('percentageValue').textContent = p + '%'; $('progressRing').style.setProperty('--percent', p); }
    
    // ---------- Tela final (todas as telas da Clave de Sol, agora iguais nas duas claves) ----------
    const onda = fn => {
        if (window.NoteWaveOnda && typeof NoteWaveOnda.passar === 'function') NoteWaveOnda.passar(fn);
        else { console.error('NoteWaveOnda não carregou. Confira o caminho de onda-transicao.js'); fn(); }
      };
    const FAIXAS = [
      ['Vamos tentar de novo!', 'Toda jornada musical tem suas ondas. Você pode tentar novamente!', 'Ainda não conquistou estrelas. Refaça a trilha e continue praticando.'],
      ['Você encontrou uma estrela! ⭐', 'Uma pequena conquista também faz parte da sua jornada!', 'Você conquistou uma estrela. Que tal tentar de novo para ganhar mais?'],
      ['Duas estrelas na areia! ⭐⭐', 'Você está chegando lá! Mais um pouco de prática pode render sua medalha.', 'Você conquistou duas estrelas. Quer tentar melhorar seu resultado ou pular?'],
      ['Você arrasou nas ondas!', 'Seu desempenho foi incrível. Você conquistou as três estrelas!', 'Sua medalha está esperando por você. Celebre essa conquista!']];
    const estrelaDoMar = on => `<svg class="duo-estrela-anim" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" style="opacity:${on ? 1 : .4}" aria-hidden="true"><path d="M 250,30 C 285,130 330,150 430,170 C 490,182 480,240 410,290 C 345,335 340,360 370,460 C 388,520 330,520 250,450 C 170,520 112,520 130,460 C 160,360 155,335 90,290 C 20,240 10,182 70,170 C 170,150 215,130 250,30 Z" fill="${on ? '#023e8a' : 'rgba(255,224,204,.3)'}" stroke="${on ? '#0077b6' : 'rgba(176,190,197,.4)'}" stroke-width="14" stroke-linejoin="round"/>${[[250,120],[370,220],[325,380],[175,380],[130,220]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="12" fill="${on ? '#ffe0cc' : 'transparent'}" opacity=".8"/>`).join('')}</svg>`;


    function encerrar() {
  const tela = $('finalOcean'), tot = ok + err;
  const p = tot ? Math.round(ok / tot * 100) : 0;
  const est = p > 95 ? 3 : p >= 50 ? 2 : p >= 25 ? 1 : 0;
  // style.display vence o display do .ocean-button; só o atributo hidden não bastaria
  const mostra = (el, v) => { el.hidden = !v; el.style.display = v ? 'inline-flex' : 'none'; };

  document.querySelector('.app-container').style.display = 'none';
  $('feedbackPanel').style.display = 'none';
  $('finalPercentage').textContent = p + '%';

  $('resultStars').innerHTML = [0, 1, 2].map(i =>
    `<span class="result-star${i < est ? ' is-earned' : ''}" style="${i < est ? '' : 'filter:grayscale(100%);opacity:.3;'}">⭐</span>`).join('');
  $('resultStars').setAttribute('aria-label', `${est} ${est === 1 ? 'estrela conquistada' : 'estrelas conquistadas'}`);

  const [msg, sub] = p < 50
    ? ['Tente novamente :(', 'Refaça a trilha e continue praticando.']
    : p <= 95
      ? ['Quase lá! Continue os estudos :)', 'Quer tentar melhorar seu resultado ou pular?']
      : ['Parabéns!! Seu desempenho foi incrível!', 'Sua medalha está esperando por você. Celebre essa conquista!'];
  const rev = est < 3 && erradas.length ? ` Para rever: ${[...new Set(erradas)].slice(0, 3).join('; ')}.` : '';
  $('oceanResultTitle').textContent = 'Fim da Trilha!';
  $('oceanResultMessage').textContent = msg;
  $('starResultMessage').textContent = sub + rev;

  mostra($('retryLessonBtn'), true);       // Refazer: sempre
  mostra($('skipLessonBtn'), p < 100);     // Pular: só se não for 100%
  mostra($('receiveMedalBtn'), p > 95);    // Medalha: só acima de 95%
  $('skipConfirmation').hidden = true;
  $('medalReveal').hidden = true;

  tela.style.display = 'flex'; tela.classList.remove('is-active', 'is-closing'); void tela.offsetWidth;
  tela.setAttribute('aria-hidden', 'false'); tela.classList.add('is-active');

  $('retryLessonBtn').onclick = zerar;
  $('skipLessonBtn').onclick = () => $('skipConfirmation').hidden = false;
  $('cancelSkipBtn').onclick = () => $('skipConfirmation').hidden = true;
  $('confirmSkipBtn').onclick = () => location.href = '../html/trilha_de_aulas.html';
  $('receiveMedalBtn').onclick = () => onda(() => {
    tela.style.display = 'none'; tela.classList.remove('is-active');
    $('duoEstrelasAnimadas').innerHTML = [0, 1, 2].map(i => estrelaDoMar(i < est)).join('');
    $('telaEstrelas').style.display = 'flex';
  });
  $('btnProximoEstrelas').onclick = () => onda(() => { $('telaEstrelas').style.display = 'none'; $('telaMedalha').style.display = 'flex'; });
  $('btnIrParaMedalhas').onclick = () => {
    localStorage.setItem(K.medalha, 'true');
    onda(() => location.href = `../html/medalhas.html?recompensa=true&titulo=${encodeURIComponent(C.nome)}&destaque=${C.p}`);
  };
}


    function zerar() {
      [K.ok, K.err].forEach(k => localStorage.removeItem(k));
      C.dados.forEach(l => localStorage.removeItem(K.st(l.id)));
      sessionStorage.removeItem(`erradas_${C.p}`);
      location.href = location.pathname + '?id=1';
    }
    })();