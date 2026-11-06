// Mostra o progresso da medalha "Mestre do Recife" como 4 moedas no cabeçalho do hub.
(function () {
    var box = document.getElementById('moedas'), hint = document.getElementById('medalHint');
    if (!box || !hint) return;
    var IDS = [['ouvir', 'Ouça a Onda'], ['pauta', 'Pesque a Nota'], ['sobe', 'Sobe ou Desce?'], ['teoria', 'Maré de Teoria']];
    var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"/></svg>';
    function nivel(id) { try { return +localStorage.getItem('status_mar_' + id) || 0; } catch (e) { return 0; } }
    function pinta() {
      var f = 0; box.innerHTML = '';
      IDS.forEach(function (x) {
        var ok = nivel(x[0]) === 3, m = document.createElement('span');
        m.className = 'moeda' + (ok ? ' on' : ''); m.title = x[1] + (ok ? ': 3 estrelas' : ': ainda sem 3 estrelas');
        m.innerHTML = STAR; box.append(m); if (ok) f++;
      });
      box.parentNode.classList.toggle('completo', f === IDS.length);
    }
    pinta();
    new MutationObserver(pinta).observe(hint, { childList: true, characterData: true, subtree: true });
  })();