/* Notinha Runner — detecção do tema (claro/escuro) já usado pela NoteWave.
 * O jogo NÃO tem configuração própria de tema: ele só lê o que a plataforma definiu.
 * Se a NoteWave marca o tema de um jeito que não está listado aqui, ajuste SÓ a função atual().
 */
(function (NW) {
  'use strict';

  const CHAVES_STORAGE = ['tema', 'theme', 'nw-tema', 'nw-theme', 'nwTema', 'modo', 'darkMode'];
  const RE_ESCURO = /(^|[\s_-])(dark|escuro|noite|night)([\s_-]|$)/i;

  function atual() {
    const h = document.documentElement, b = document.body;

    // 1) atributos data-theme / data-tema
    const attr = h.getAttribute('data-theme') || b.getAttribute('data-theme') ||
                 h.getAttribute('data-tema') || b.getAttribute('data-tema');
    if (attr) return RE_ESCURO.test(attr) ? 'escuro' : 'claro';

    // 2) classes no <html> ou <body> (dark, dark-mode, modo-escuro, tema-escuro…)
    const cls = (h.className + ' ' + b.className);
    if (/(dark|escuro)/i.test(cls)) return 'escuro';

    // 3) valor salvo pela plataforma
    for (let i = 0; i < CHAVES_STORAGE.length; i++) {
      let v = null;
      try { v = localStorage.getItem(CHAVES_STORAGE[i]); } catch (e) {}
      if (v) return (RE_ESCURO.test(v) || /^(true|1)$/i.test(v)) ? 'escuro' : 'claro';
    }

    // 4) preferência do sistema
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
  }

  /** Chama cb(tema) sempre que o tema da plataforma mudar. */
  function observar(cb) {
    const avisar = function () { cb(atual()); };
    const mo = new MutationObserver(avisar);
    const opts = { attributes: true, attributeFilter: ['class', 'data-theme', 'data-tema'] };
    mo.observe(document.documentElement, opts);
    mo.observe(document.body, opts);
    window.addEventListener('storage', avisar);
    if (window.matchMedia) {
      const mq = matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', avisar);
    }
  }

  NW.tema = { atual: atual, observar: observar };
})(window.NWRunner = window.NWRunner || {});