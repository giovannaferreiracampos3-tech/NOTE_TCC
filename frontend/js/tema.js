/* NoteWave - modo escuro em UM lugar só.
   Use como PRIMEIRO item do <head>, SEM defer e SEM async:
     <script src="../js/tema.js"></script>

   - Aplica o tema antes da página aparecer (sem piscar).
   - Pinta o fundo do <html> de escuro na hora (sem tela branca entre páginas).
   - Desliga as transições durante o carregamento (sem "fade" do claro para o escuro).
   - Unifica as chaves 'theme' e 'darkMode' e oferece NoteWaveTema.definir(true/false). */
   (function () {
    var raiz = document.documentElement;
  
    /* ===== DIAGNÓSTICO TEMPORÁRIO (apagar este bloco depois de achar o bug) =====
       Registra no Console QUEM liga/desliga a classe 'dark-mode' e QUANDO. */
    (function () {
      var t0 = performance.now();
      function ms() { return Math.round(performance.now() - t0) + 'ms'; }
      ['add', 'remove', 'toggle'].forEach(function (m) {
        var original = DOMTokenList.prototype[m];
        DOMTokenList.prototype[m] = function () {
          if (arguments[0] === 'dark-mode') {
            var dono = this === document.documentElement.classList ? '<html>' :
                       (document.body && this === document.body.classList ? '<body>' : 'outro');
            var pilha = (new Error().stack || '').split('\n').slice(2, 4).join(' | ');
            console.log('[NoteWave tema] ' + dono + '.classList.' + m + '(' +
              Array.prototype.join.call(arguments, ', ') + ') em ' + ms() +
              ' [' + document.readyState + '] <- ' + pilha);
          }
          return original.apply(this, arguments);
        };
      });
      window.addEventListener('DOMContentLoaded', function () {
        console.log('[NoteWave tema] DOMContentLoaded em ' + ms() + ' | html="' +
          document.documentElement.className + '" body="' + document.body.className + '"');
      });
      window.addEventListener('load', function () {
        var pinturas = performance.getEntriesByType('paint').map(function (e) {
          return e.name + '=' + Math.round(e.startTime) + 'ms';
        }).join(', ');
        console.log('[NoteWave tema] load em ' + ms() + ' | primeira pintura: ' + pinturas);
      });
    })();
    /* ===== FIM DO DIAGNÓSTICO ===== */
    var COR_FUNDO = '#0a1330';
  
    function lerPreferencia() {
      try {
        var t = localStorage.getItem('theme');
        if (t === 'dark') return true;
        if (t === 'light') return false;
        return localStorage.getItem('darkMode') === 'true';
      } catch (e) {
        return false;
      }
    }
  
    function gravar(escuro) {
      try {
        localStorage.setItem('theme', escuro ? 'dark' : 'light');
        localStorage.setItem('darkMode', escuro ? 'true' : 'false');
      } catch (e) {}
    }
  
    function aplicar(escuro) {
      raiz.classList.toggle('dark-mode', escuro);
      raiz.style.backgroundColor = escuro ? COR_FUNDO : '';
      raiz.style.colorScheme = escuro ? 'dark' : '';
      if (document.body) document.body.classList.toggle('dark-mode', escuro);
    }
  
    var escuroAgora = lerPreferencia();
  
    // DIAGNÓSTICO: se o <body> já existe, este script foi carregado tarde demais
    // (fim do body, defer, etc.) e a página vai piscar no claro. Pode apagar este bloco depois.
    if (document.body) {
      console.warn('[NoteWave tema] ATENÇÃO: o tema.js carregou DEPOIS do início do <body>. ' +
        'Coloque <script src="../js/tema.js"></script> como PRIMEIRA linha do <head>, sem defer.');
    } else {
      console.log('[NoteWave tema] ok: carregou cedo (modo escuro = ' + escuroAgora + ')');
    }
    gravar(escuroAgora);
    aplicar(escuroAgora);
  
    if (escuroAgora) {
      // 1) Sem transições enquanto a página carrega: evita ver as cores "escorrendo" do claro para o escuro.
      var semTransicao = document.createElement('style');
      semTransicao.id = 'nw-sem-transicao';
      semTransicao.textContent = '*,*::before,*::after{transition:none!important}';
      (document.head || raiz).appendChild(semTransicao);
  
      function liberarTransicoes() {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            if (semTransicao.parentNode) semTransicao.parentNode.removeChild(semTransicao);
          });
        });
      }
      if (document.readyState === 'complete') liberarTransicoes();
      else window.addEventListener('load', liberarTransicoes);
  
      // 2) O <body> ainda não existe: marca assim que ele for criado.
      if (!document.body) {
        var obs = new MutationObserver(function () {
          if (document.body) {
            document.body.classList.add('dark-mode');
            obs.disconnect();
          }
        });
        obs.observe(raiz, { childList: true });
      }
    }
  
    // Voltar/avançar do navegador (página restaurada do cache) e outras abas
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) { escuroAgora = lerPreferencia(); aplicar(escuroAgora); }
    });
    window.addEventListener('storage', function (e) {
      if (e.key === 'theme') { escuroAgora = lerPreferencia(); aplicar(escuroAgora); }
    });
  
    window.NoteWaveTema = {
      escuro: function () { return escuroAgora; },
      definir: function (escuro) {
        escuroAgora = !!escuro;
        gravar(escuroAgora);
        aplicar(escuroAgora);
      }
    };
  })();