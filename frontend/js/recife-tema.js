// NoteWave - tema claro/escuro, cena do recife e vídeo de entrada.
// Carregue no <head>, sem defer, para o tema aplicar antes da página aparecer.
(function () {
    var R = document.documentElement, K = 'nw_tema';
    try { R.dataset.tema = localStorage.getItem(K) || (matchMedia('(prefers-color-scheme:dark)').matches ? 'escuro' : 'claro'); }
    catch (e) { R.dataset.tema = 'claro'; }
  
    var bolhas = [[180,9],[340,13],[520,11],[700,15],[900,10],[1080,14],[1260,12],[1440,16]].map(function (p, i) {
      return '<circle class="b" cx="' + p[0] + '" cy="880" r="' + (5 + i % 4 * 3) + '" style="animation-duration:' + p[1] + 's;animation-delay:-' + i * 2 + 's"/>';
    }).join('');
    var notas = [[260,18,'♪'],[620,22,'♫'],[1000,20,'♪'],[1380,24,'♫']].map(function (p, i) {
      return '<text class="nt" x="' + p[0] + '" y="880" style="animation-duration:' + p[1] + 's;animation-delay:-' + (i * 5 + 3) + 's">' + p[2] + '</text>';
    }).join('');
    var peixe = function (y, dur, atraso, cor) {
      return '<g class="peixe" style="animation-duration:' + dur + 's;animation-delay:-' + atraso + 's"><g transform="translate(0 ' + y + ')">' +
        '<ellipse rx="24" ry="13" class="' + cor + '"/><path d="M-22 0L-44 -13V13Z" class="' + cor + '"/><circle cx="11" cy="-3" r="2.8" fill="#06223f"/></g></g>';
    };
  
    var CENA = '<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
      '<linearGradient id="ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<radialGradient id="gl"><stop offset="0" stop-color="#fff3b0" stop-opacity=".9"/><stop offset=".4" stop-color="#ffc857" stop-opacity=".35"/><stop offset="1" stop-color="#ffc857" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="gb"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".35" stop-color="#a8ecff" stop-opacity=".65"/><stop offset="1" stop-color="#a8ecff" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="fx" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff6c8" stop-opacity=".85"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="wd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c4824a"/><stop offset=".55" stop-color="#8a5a2b"/><stop offset="1" stop-color="#5a3718"/></linearGradient>' +
      '<linearGradient id="wl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b3733a"/><stop offset="1" stop-color="#6b4120"/></linearGradient>' +
      '<linearGradient id="gd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#ffc857"/><stop offset="1" stop-color="#b8801f"/></linearGradient>' +
      '<linearGradient id="bk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2f86dc"/><stop offset=".6" stop-color="#1456a0"/><stop offset="1" stop-color="#0b3c7a"/></linearGradient>' +
      '<linearGradient id="vl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a3a8e"/><stop offset="1" stop-color="#241a52"/></linearGradient>' +
      '</defs>' +
      '<polygon class="ray" points="180,0 300,0 90,900 -60,900"/><polygon class="ray" style="animation-delay:-3s" points="700,0 860,0 760,900 560,900"/><polygon class="ray" style="animation-delay:-6s" points="1250,0 1380,0 1640,900 1440,900"/>' +
      bolhas + notas +
      peixe(260, 46, 5, 'f1') + peixe(420, 62, 30, 'f2') + peixe(560, 54, 18, 'f3') +
      '<path class="r3" d="M0 900V700Q200 640 400 700T800 690T1200 700T1600 660V900Z"/>' +
      /* baú ao fundo, com o livro brilhando dentro */
      '<g transform="translate(640 535) scale(1.8)">' +
      '<circle class="glow" cx="100" cy="10" r="215"/>' +
      '<path d="M6 42V-2Q6 -50 58 -50H142Q194 -50 194 -2V42Z" fill="url(#wl)" stroke="#3b2310" stroke-width="4"/>' +
      '<path d="M18 38V0Q18 -38 60 -38H140Q182 -38 182 0V38Z" fill="url(#vl)" stroke="#ffc857" stroke-width="2.5"/>' +
      '<path d="M6 42V-2Q6 -50 58 -50H142Q194 -50 194 -2V42" fill="none" stroke="url(#gd)" stroke-width="5"/>' +
      '<circle cx="14" cy="-4" r="2.6" fill="#fff3b0"/><circle cx="186" cy="-4" r="2.6" fill="#fff3b0"/><circle cx="30" cy="-36" r="2.6" fill="#fff3b0"/><circle cx="170" cy="-36" r="2.6" fill="#fff3b0"/>' +
      '<polygon class="feixe" points="64,10 136,10 290,-440 -90,-440"/>' +
      '<circle class="glow g2" cx="100" cy="-6" r="108"/>' +
      '<g transform="rotate(-4 100 30)"><rect x="58" y="-52" width="96" height="112" rx="6" fill="#fff8e1" stroke="#c9a85a" stroke-width="2"/>' +
      '<rect x="52" y="-54" width="96" height="112" rx="7" fill="url(#bk)" stroke="url(#gd)" stroke-width="4"/>' +
      '<rect x="52" y="-54" width="13" height="112" rx="4" fill="#0b3c7a"/><path d="M65 -52V56" stroke="#ffc857" stroke-width="1.5"/>' +
      '<rect x="71" y="-45" width="70" height="94" rx="4" fill="none" stroke="#ffc857" stroke-width="1.5"/>' +
      '<path d="M71 -45l9 0l-9 9ZM141 -45l-9 0l9 9ZM71 49l9 0l-9 -9ZM141 49l-9 0l9 -9Z" fill="url(#gd)"/>' +
      '<circle cx="106" cy="-24" r="14" fill="url(#gd)" stroke="#7a5212" stroke-width="1.5"/>' +
      '<text x="106" y="-16" text-anchor="middle" font-size="20" fill="#0b3c7a">♪</text>' +
      '<rect x="75" y="-2" width="62" height="30" rx="4" fill="#0b2f63" stroke="#ffc857" stroke-width="1.5"/>' +
      '<text x="106" y="10" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="8.5" fill="#ffe29a" textLength="46" lengthAdjust="spacingAndGlyphs">RECIFE DE</text>' +
      '<text x="106" y="22" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="8.5" fill="#ffe29a" textLength="54" lengthAdjust="spacingAndGlyphs">ATIVIDADES</text>' +
      '<path d="M76 40q7-7 14 0t14 0t14 0t14 0t14 0" stroke="#ffc857" stroke-width="2" fill="none"/></g>' +
      '<g fill="url(#gd)" stroke="#7a5212" stroke-width="1"><ellipse cx="26" cy="36" rx="11" ry="4.5"/><ellipse cx="44" cy="33" rx="10" ry="4"/><ellipse cx="164" cy="34" rx="11" ry="4.5"/><ellipse cx="148" cy="31" rx="9" ry="3.8"/><ellipse cx="180" cy="37" rx="9" ry="4"/></g>' +
      '<g fill="#fff" fill-opacity=".92"><circle cx="58" cy="32" r="4"/><circle cx="138" cy="30" r="3.6"/><circle cx="14" cy="38" r="3.2"/></g>' +
      '<rect x="0" y="36" width="200" height="104" rx="12" fill="url(#wd)" stroke="#3b2310" stroke-width="4"/>' +
      '<path d="M4 66H196M4 96H196M4 124H196" stroke="#3b2310" stroke-opacity=".4" stroke-width="2.5"/><path d="M60 38V64M120 68V94M80 98V122M150 98V122" stroke="#3b2310" stroke-opacity=".25" stroke-width="2"/>' +
      '<rect x="24" y="36" width="20" height="104" fill="url(#gd)" stroke="#7a5212" stroke-width="1.5"/><rect x="156" y="36" width="20" height="104" fill="url(#gd)" stroke="#7a5212" stroke-width="1.5"/>' +
      '<g fill="#7a5212"><circle cx="34" cy="50" r="2.6"/><circle cx="34" cy="76" r="2.6"/><circle cx="34" cy="102" r="2.6"/><circle cx="34" cy="128" r="2.6"/><circle cx="166" cy="50" r="2.6"/><circle cx="166" cy="76" r="2.6"/><circle cx="166" cy="102" r="2.6"/><circle cx="166" cy="128" r="2.6"/></g>' +
      '<rect x="-3" y="33" width="206" height="12" rx="5" fill="url(#gd)" stroke="#3b2310" stroke-width="3"/>' +
      '<rect x="-3" y="128" width="206" height="12" rx="5" fill="#5a3718" stroke="#3b2310" stroke-width="3"/>' +
      '<path d="M0 128V108Q16 112 22 128ZM200 128V108Q184 112 178 128Z" fill="url(#gd)" stroke="#7a5212" stroke-width="1.5"/>' +
      '<path d="M82 52H118V80Q118 94 100 100Q82 94 82 80Z" fill="url(#gd)" stroke="#3b2310" stroke-width="3"/>' +
      '<text x="100" y="82" text-anchor="middle" font-size="26" fill="#3b2310">♪</text>' +
      '<path d="M12 50H188" stroke="#fff" stroke-opacity=".28" stroke-width="3" stroke-linecap="round"/>' +
      '<g fill="#d8d2c4" stroke="#8d8676" stroke-width="1"><circle cx="64" cy="118" r="3.6"/><circle cx="72" cy="121" r="2.6"/><circle cx="126" cy="116" r="3"/><circle cx="12" cy="90" r="2.8"/></g>' +
      '<path class="cor k1" style="stroke-width:6" d="M184 36V12M184 24L174 6M184 18L194 2"/><path class="cor k3" style="stroke-width:5" d="M12 36V18M12 28L5 14"/>' +
      '<path class="kelp" style="stroke-width:5;animation-duration:3.5s" d="M192 140C180 120 200 108 188 90"/><path class="kelp" style="stroke-width:4;animation-duration:4s" d="M6 140C-4 124 12 114 2 100"/>' +
      '<path d="M-30 142q10-10 22-4l-4 9Z" fill="#ffd7c9" stroke="#c9795e" stroke-width="1.5"/>' +
      '<g fill="url(#gd)" stroke="#7a5212" stroke-width="1"><ellipse cx="-18" cy="132" rx="9" ry="3.6"/><ellipse cx="212" cy="134" rx="8" ry="3.4"/><ellipse cx="222" cy="138" rx="7" ry="3"/></g>' +
      '<path class="twk" style="animation-delay:-0s" transform="translate(34 -62) scale(1.1)" d="M0-8L2-2L8 0L2 2L0 8L-2 2L-8 0L-2-2Z"/>' +
      '<path class="twk" style="animation-delay:-1s" transform="translate(172 -48) scale(0.9)" d="M0-8L2-2L8 0L2 2L0 8L-2 2L-8 0L-2-2Z"/>' +
      '<path class="twk" style="animation-delay:-2s" transform="translate(104 -104) scale(1.3)" d="M0-8L2-2L8 0L2 2L0 8L-2 2L-8 0L-2-2Z"/>' +
      '<path class="twk" style="animation-delay:-1.4s" transform="translate(-14 -10) scale(0.8)" d="M0-8L2-2L8 0L2 2L0 8L-2 2L-8 0L-2-2Z"/>' +
      '<path class="twk" style="animation-delay:-0.6s" transform="translate(214 -14) scale(0.8)" d="M0-8L2-2L8 0L2 2L0 8L-2 2L-8 0L-2-2Z"/>' +
      '</g>' +
      '<path class="r2" d="M0 900V780Q250 730 520 790T1050 780T1600 770V900Z"/>' +
      /* corais, cristais e algas */
      '<path class="cor k1" d="M120 850V770M120 810L85 760M120 790L155 735"/><path class="cor k1" style="stroke-width:12" d="M300 860V800M300 830L274 790M300 815L326 775"/>' +
      '<path class="cor k3" d="M1250 850V760M1250 805L1212 752M1250 785L1290 728"/><path class="cor k2" d="M1480 860V790M1480 825L1452 782M1480 808L1508 770"/>' +
      '<rect x="1370" y="770" width="22" height="84" rx="11" class="f3"/><rect x="1398" y="790" width="20" height="64" rx="10" class="f3"/>' +
      '<g class="f2"><circle cx="430" cy="835" r="20"/><circle cx="462" cy="842" r="16"/><circle cx="404" cy="846" r="14"/></g>' +
      '<g class="f1"><circle cx="1090" cy="842" r="18"/><circle cx="1120" cy="848" r="14"/></g>' +
      '<polygon class="cr" points="1540,860 1562,770 1584,860"/><polygon class="cr" points="1568,860 1580,810 1596,860"/><polygon class="cr" points="40,860 62,780 84,860"/>' +
      '<path class="kelp" d="M60 900C30 830 90 780 55 700"/><path class="kelp" style="animation-delay:-2s" d="M210 900C180 840 235 800 205 740"/>' +
      '<path class="kelp" style="animation-delay:-1s" d="M1530 900C1500 830 1560 780 1525 700"/><path class="kelp" style="animation-delay:-3s" d="M990 900C965 850 1015 820 990 770"/>' +
      '<path class="r1" d="M0 900V850Q300 820 600 860T1200 850T1600 840V900Z"/></svg>';
  
    function intro() {
      var i = document.getElementById('intro');
      if (!i) return;
      try { if (sessionStorage.getItem('nw_intro')) return; } catch (e) {}
      var v = i.querySelector('video'), z = document.getElementById('introVazio'), p = i.querySelector('.pular'), src = v.dataset.src;
      function fim() { i.hidden = true; v.pause(); try { sessionStorage.setItem('nw_intro', '1'); } catch (e) {} }
      p.onclick = fim;
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !i.hidden) fim(); });
      i.hidden = false;
      if (src) { z.hidden = true; v.src = src; v.onended = fim; v.onerror = function () { v.hidden = true; z.hidden = false; }; v.play().catch(function () {}); }
      else v.hidden = true; // sem vídeo: mostra o aviso do espaço reservado
      p.focus();
    }
  
    document.addEventListener('DOMContentLoaded', function () {
      var d = document.createElement('div');
      d.className = 'recife'; d.setAttribute('aria-hidden', 'true'); d.innerHTML = CENA;
      document.body.prepend(d);
      var b = document.createElement('button');
      b.className = 'nw-tema'; b.type = 'button';
      function rot() { var e = R.dataset.tema === 'escuro'; b.textContent = e ? '☀️' : '🌙'; b.setAttribute('aria-label', e ? 'Ativar modo claro' : 'Ativar modo escuro'); }
      b.onclick = function () { R.dataset.tema = R.dataset.tema === 'escuro' ? 'claro' : 'escuro'; try { localStorage.setItem(K, R.dataset.tema); } catch (e) {} rot(); };
      rot();
      (document.querySelector('.top') || document.body).append(b);
      intro();
    });
  })();