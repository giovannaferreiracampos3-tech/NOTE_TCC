(function () {
    function logado() {
      var t = localStorage.getItem('token');
      if (!t) return false;
      try {
        var p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (p.exp && p.exp * 1000 < Date.now()) return false;   // token vencido (7 dias)
      } catch (e) { return false; }
      return true;
    }
  
    function checar() {
      if (!logado()) {
        localStorage.removeItem('token');
        location.replace('login.html');
      }
    }
  
    checar();
  
    // Voltar pelo botão do navegador pode mostrar a página guardada em cache: confere de novo
    window.addEventListener('pageshow', function (e) { if (e.persisted) checar(); });
  
    // Clicar em "Sair": limpa o login e troca a página no histórico
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a.logout');
      if (!a) return;
      e.preventDefault();
      ['token', 'noteWave_user', 'noteWave_avatar'].forEach(function (k) { localStorage.removeItem(k); });
      location.replace('login.html');
    });
  })();