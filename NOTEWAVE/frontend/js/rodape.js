// =====================================================
// NOTEWAVE — RODAPÉ  (js/rodape.js)
// Coloca o rodapé centralizado no fim de qualquer página.
// =====================================================
(function () {
    const COPYRIGHT = '© 2026 NoteWave — Aprenda. Pratique. Evolua.';
    const PROGRAMADORAS = [
      'AYLLA GOMES SILVA',
      'EMILLY VICTÓRIA OLIVEIRA CALDANO',
      'GIOVANNA FERREIRA CAMPOS'
    ];
  
    function montar() {
      // remove rodapés antigos para não duplicar
      document.querySelectorAll('.rodape, .rodape-nw').forEach(el => el.remove());
  
      if (!document.getElementById('nw-rodape-estilo')) {
        const estilo = document.createElement('style');
        estilo.id = 'nw-rodape-estilo';
        estilo.textContent = `
          .rodape-nw {
            position: relative;
            z-index: 2;
            flex: 0 0 100%;
            width: 100%;
            margin-top: auto;            /* cola o rodapé no fim da tela em páginas curtas */
            padding: 40px 20px 170px;    /* o espaço de baixo é onde ficam as ondas */
            text-align: center;
            font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
            color: #54738c;
          }
          .rodape-nw .rodape-copy {
            font-size: .85rem;
            font-weight: 600;
            margin: 0 0 8px;
          }
          .rodape-nw .rodape-dev {
            font-size: .72rem;
            letter-spacing: .6px;
            text-transform: uppercase;
            opacity: .8;
            margin: 0 0 4px;
          }
          .rodape-nw .rodape-nomes {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 4px 18px;
            font-size: .78rem;
            font-weight: 700;
            color: #073763;
          }
          body.dark-mode .rodape-nw { color: #94a3b8; }
          body.dark-mode .rodape-nw .rodape-nomes { color: #e2e8f0; }
  
          /* home: as ondas dela ficam no topo, então o rodapé não precisa de espaço extra */
          body:has(.hero) .rodape-nw { padding-bottom: 36px; }
  
          /* login: fundo escuro, ondas no fim da página */
          body:has(.brand-section) { position: relative; }
          body:has(.brand-section) .ondas { position: absolute; }
          body:has(.brand-section) .rodape-nw {
            padding-bottom: 150px;
            color: rgba(255, 255, 255, .85);
          }
          body:has(.brand-section) .rodape-nw .rodape-nomes { color: #ffffff; }
        `;
        document.head.appendChild(estilo);
      }
  
      const rodape = document.createElement('footer');
      rodape.className = 'rodape-nw';
      rodape.innerHTML =
        '<p class="rodape-copy">' + COPYRIGHT + '</p>' +
        '<p class="rodape-dev">Desenvolvido por</p>' +
        '<div class="rodape-nomes">' +
          PROGRAMADORAS.map(n => '<span>' + n + '</span>').join('') +
        '</div>';
  
      document.body.appendChild(rodape);
  
      // body em flex (alinhado em linha): força coluna para o rodapé ficar embaixo
      const e = getComputedStyle(document.body);
      if (e.display === 'flex' && e.flexDirection.indexOf('row') === 0) {
        document.body.style.flexDirection = 'column';
      }
    }
  
    if (document.body) montar();
    else document.addEventListener('DOMContentLoaded', montar);
  })();