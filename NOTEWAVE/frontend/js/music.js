// =====================================================
// NOTEWAVE — MÚSICA DE FUNDO  (js/music.js)
// - site.html (casca): toca a música sem nunca parar
// - página aberta direto: vai sozinha para dentro da casca
// - página dentro da casca: não faz nada
// =====================================================
(function () {
    // ---- CONFIGURE AQUI ----
    const ARQUIVO = '../audio/fundo.mp3';
    const CASCA   = '../html/site.html';
    const VOLUME  = 0.12; // 0 a 1
    const PAGINAS_DIREITA = ['perfil', 'trilha_de_aulas', 'medalhas', 'caderno', 'configuracoes'];
    // ------------------------
  
    const frame = document.getElementById('nw-app'); // só existe na casca
    const base = document.currentScript ? document.currentScript.src : location.href;
    const http = location.protocol.indexOf('http') === 0;
  
    function nomeDaPagina(url) {
      return String(url).split('?')[0].split('#')[0].split('/').pop().replace('.html', '').toLowerCase();
    }
  
    function dentroDaCasca() {
      try { return window.parent !== window && !!window.parent.document.getElementById('nw-app'); }
      catch (e) { return false; }
    }
  
    // 1) dentro do quadro: a casca já toca a música
    if (!frame && dentroDaCasca()) return;
  
    // 2) página aberta direto: manda para dentro da casca (evita o corte)
    if (!frame && window.parent === window && http) {
      const casca = new URL(CASCA, base);
      casca.searchParams.set('p', location.href);
      location.replace(casca.href);
      return;
    }
  
    if (!frame && !http) {
      console.warn('[música] Abra o site por um servidor (ex.: Live Server). Em file:// a música não consegue continuar entre as páginas.');
    }
  
    // ---------- áudio ----------
    const SRC = new URL(ARQUIVO, base).href;
  
    const ler = (k, p) => { try { return localStorage.getItem(k) ?? p; } catch (e) { return p; } };
    const gravar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  
    const audio = new Audio(SRC);
    audio.loop = true;
    audio.volume = VOLUME;
    audio.preload = 'auto';
  
    audio.addEventListener('error', () => {
      console.warn('[música] Não consegui carregar: ' + SRC + ' — confira o nome e a pasta do arquivo.');
    });
  
    let mudo = ler('nw_musica_off', '0') === '1';
    let tocando = false;
    let btn = null;
  
    audio.addEventListener('loadedmetadata', () => {
      const t = parseFloat(ler('nw_musica_t', '0'));
      if (t > 0 && t < audio.duration) audio.currentTime = t;
    });
  
    function tocar() {
      if (mudo || tocando) return;
      audio.play().then(() => { tocando = true; }).catch(() => {});
    }
  
    ['click', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, tocar));
    tocar();
  
    setInterval(() => { if (!audio.paused) gravar('nw_musica_t', audio.currentTime); }, 1000);
    window.addEventListener('pagehide', () => gravar('nw_musica_t', audio.currentTime));
  
    // ---------- botão ----------
    function posicionar(nome) {
      if (!btn) return;
      const direita = PAGINAS_DIREITA.indexOf(nome) !== -1;
      btn.style.left  = direita ? 'auto' : '18px';
      btn.style.right = direita ? '18px' : 'auto';
    }
  
    function criarBotao() {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.style.cssText =
        'position:fixed;bottom:18px;z-index:99990;width:46px;height:46px;' +
        'border:0;border-radius:50%;background:#ffc94a;color:#49300a;font-size:20px;' +
        'cursor:pointer;box-shadow:0 4px 0 #c98200;';
  
      const atualizar = () => {
        btn.textContent = mudo ? '🔇' : '🎵';
        btn.title = mudo ? 'Ligar música' : 'Desligar música';
        btn.setAttribute('aria-label', btn.title);
      };
  
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        mudo = !mudo;
        gravar('nw_musica_off', mudo ? '1' : '0');
        if (mudo) { audio.pause(); tocando = false; } else { tocar(); }
        atualizar();
      });
  
      atualizar();
      document.body.appendChild(btn);
      if (!frame) posicionar(nomeDaPagina(location.pathname));
    }
  
    if (document.body) criarBotao();
    else document.addEventListener('DOMContentLoaded', criarBotao);
  
    // ---------- modo casca ----------
    if (frame) {
      frame.addEventListener('load', () => {
        let doc, nome;
        try {
          doc = frame.contentDocument;
          nome = nomeDaPagina(frame.contentWindow.location.pathname);
        } catch (e) { return; }
  
        posicionar(nome);
  
        try {
          document.title = doc.title || 'NoteWave';
          sessionStorage.setItem('nw_ultima_pagina', frame.contentWindow.location.href);
          // limpa o ?p= da barra de endereço depois do primeiro carregamento
          if (location.search) history.replaceState(null, '', location.pathname);
        } catch (e) {}
  
        ['click', 'keydown', 'touchstart'].forEach(ev => doc.addEventListener(ev, tocar));
        tocar();
      });
  
      setInterval(() => {
        try {
          const d = frame.contentDocument;
          const emTour = d && d.querySelector('#tour-step-card, #modal-tour-welcome');
          if (btn) btn.style.display = emTour ? 'none' : '';
        } catch (e) {}
      }, 400);
  
      // qual página abrir: a pedida (?p=), a última visitada, ou a home
      function paginaInicial() {
        const pedida = new URLSearchParams(location.search).get('p');
        if (pedida) {
          try {
            const u = new URL(pedida, location.href);
            if (u.origin === location.origin && nomeDaPagina(u.pathname) !== 'site') return u.href;
          } catch (e) {}
        }
        return sessionStorage.getItem('nw_ultima_pagina') || 'home.html';
      }
  
      frame.src = paginaInicial();
    }
  })();