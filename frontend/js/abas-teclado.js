/* Notinha Runner — navegação por teclado nas abas (setas, Home e End).
 * Só move o foco e dispara o clique da aba, então funciona com a lógica que o app.js já tem. */
(function () {
    'use strict';
    var nav = document.querySelector('.nwr-abas');
    if (!nav) return;
    nav.addEventListener('keydown', function (e) {
      var abas = [].slice.call(nav.querySelectorAll('[role="tab"]'));
      var i = abas.indexOf(document.activeElement);
      if (i < 0) return;
      var j = e.key === 'ArrowRight' ? (i + 1) % abas.length
            : e.key === 'ArrowLeft'  ? (i - 1 + abas.length) % abas.length
            : e.key === 'Home' ? 0
            : e.key === 'End' ? abas.length - 1 : -1;
      if (j < 0) return;
      e.preventDefault();
      abas[j].focus();
      abas[j].click();
    });
  })();