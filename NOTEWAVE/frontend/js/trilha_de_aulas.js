// === 1. LEITURA E APLICAÇÃO IMEDIATA DO TEMA ===
// Lê o estado do LocalStorage e aplica ou remove a classe utilizando a propriedade condicional do toggle (Idêntico ao configuracoes.js)
const isDarkMode = localStorage.getItem('darkMode') === 'true' || localStorage.getItem('theme') === 'dark';
document.body.classList.toggle('dark-mode', isDarkMode);

// === 2. CONTROLE DA BARRA LATERAL (SIDEBAR) ===
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector(".sidebar");
    const sidebarToggler = document.querySelector(".sidebar-toggler");
    const menuToggler = document.querySelector(".menu-toggler");

    // Cláusula de segurança global para o escopo da sidebar
    if (!sidebar) return;

    const collapsedSidebarHeight = "56px";
    const fullSidebarHeight = "calc(100vh - 32px)";

    // Função interna isolada para gerenciar as dimensões do menu responsivo
    const toggleMenu = (isMenuActive) => {
        const toggleIcon = menuToggler?.querySelector("span");

        sidebar.style.height = isMenuActive ? `${sidebar.scrollHeight}px` : collapsedSidebarHeight;

        if (toggleIcon) {
            toggleIcon.innerText = isMenuActive ? "close" : "menu";
        }
    };

    // Ouvinte para recolher/expandir a barra lateral (Desktop)
    if (sidebarToggler) {
        sidebarToggler.addEventListener("click", () => {
            sidebar.classList.toggle("collapsed");
        });
    }

    // Ouvinte para abrir/fechar o menu em dispositivos móveis
    if (menuToggler) {
        menuToggler.addEventListener("click", () => {
            // Passa o retorno booleano do toggle diretamente como parâmetro
            const isMenuActive = sidebar.classList.toggle("menu-active");
            toggleMenu(isMenuActive);
        });
    }

    // Ouvinte para reajuste de tela (Responsividade)
    window.addEventListener("resize", () => {
        if (window.innerWidth >= 1024) {
            sidebar.style.height = fullSidebarHeight;
        } else {
            sidebar.classList.remove("collapsed");
            sidebar.style.height = "auto";
            toggleMenu(sidebar.classList.contains("menu-active"));
        }
    });
});

// === 3. TRILHA: CADA ETAPA SÓ ABRE DEPOIS QUE A ANTERIOR FOR CONCLUÍDA ===
// O estado de cada etapa vem do progresso da conta (chaves "status_..." e "medalha_...").
// Essas chaves são salvas no banco pelo nw-sync.js, então cada usuário tem a sua trilha.
const CHAVE_BOAS_VINDAS = 'status_boasvindas_concluida';
const TOTAL_LICOES = 14; // lições de notas em cada clave

const lerFlag = (chave) => localStorage.getItem(chave) === 'true';
const contarChaves = (regex) => {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
        if (regex.test(localStorage.key(i))) total++;
    }
    return total;
};

// Ordem igual à dos cartões em trilha_de_aulas.html (os cartões 6 e 7 seguem bloqueados).
const ETAPAS = [
    { // 1. Boas-vindas: conclui ao fechar o aviso "Entendido, Capitão!"
        href: null,
        feita: () => lerFlag(CHAVE_BOAS_VINDAS)
    },
    { // 2. A Clave de Fá (texto): conclui ao clicar em "ir para as lições"
        href: '../atividades/atividade-texto.html',
        feita: () => lerFlag('status_leitura_fa_concluida') || lerFlag('status_leitura_fá_concluida')
    },
    { // 3. Notas na Clave de Fá: conclui ao chegar na tela final das lições
        href: '../atividades/atividades-nota.html',
        feita: () => lerFlag('status_trilha_fa_finalizada') || lerFlag('medalha_clave_fa') ||
                     contarChaves(/^status_fa_concluido_licao_\d+$/) >= TOTAL_LICOES
    },
    { // 4. A Clave de Sol (texto)
        href: '../atividades/atividades-texto-sol.html',
        feita: () => lerFlag('status_leitura_sol_concluida')
    },
    { // 5. Notas na Clave de Sol
        href: '../atividades/atividades_sol.html',
        feita: () => lerFlag('status_trilha_sol_finalizada') || lerFlag('medalha_clave_sol') ||
                     contarChaves(/^status_sol_concluido_licao_\d+$/) >= TOTAL_LICOES
    },
    { // 6. Recife de Atividades: conclui com pelo menos 1 estrela em cada um dos 4 desafios
        href: '../html/atividades-mar.html',
        feita: () => ['ouvir', 'pauta', 'sobe', 'teoria']
            .every(a => (parseInt(localStorage.getItem('status_mar_' + a)) || 0) >= 1)
    }
];

// Estilos do estado "próxima etapa" e do aviso (ajuste as cores aqui se quiser).
const estilo = document.createElement('style');
estilo.textContent = `
  .timeline-item.available{border-color:#38bdf8;box-shadow:0 0 0 3px rgba(56,189,248,.28)}
  .timeline-item.available .step-number{background:linear-gradient(135deg,#1e3a8a,#3b82f6);color:#fff}
  .timeline-item.locked{cursor:not-allowed}
  .trilha-aviso{position:fixed;left:50%;bottom:32px;transform:translateX(-50%);background:#0b2a66;color:#fff;
    padding:12px 20px;border-radius:14px;font:600 14px Inter,sans-serif;box-shadow:0 10px 30px rgba(0,43,122,.3);z-index:9999}
`;
document.head.appendChild(estilo);

function avisarBloqueada() {
    document.querySelectorAll('.trilha-aviso').forEach(a => a.remove());
    const aviso = document.createElement('div');
    aviso.className = 'trilha-aviso';
    aviso.setAttribute('role', 'status');
    aviso.textContent = 'Conclua a etapa anterior para desbloquear esta.';
    document.body.appendChild(aviso);
    setTimeout(() => aviso.remove(), 2600);
}

document.addEventListener('DOMContentLoaded', () => {
    const itens = [...document.querySelectorAll('.timeline-item')];
    const welcomeModal = document.getElementById('welcomeModal');
    const closeBtn = document.getElementById('closeWelcomeModal');

    function abrirBoasVindas() {
        if (welcomeModal) welcomeModal.style.display = 'flex';
    }

    function fecharBoasVindas() {
        if (welcomeModal) welcomeModal.style.display = 'none';
        if (!lerFlag(CHAVE_BOAS_VINDAS)) {
            localStorage.setItem(CHAVE_BOAS_VINDAS, 'true'); // salvo na conta pelo nw-sync.js
            atualizarTrilha();
        }
    }

    function atualizarTrilha() {
        const feitas = ETAPAS.map(e => e.feita());
        // Quem concluiu uma etapa mais adiante necessariamente concluiu as anteriores
        // (cobre contas antigas, que já tinham avançado antes desta regra existir).
        const concluida = feitas.map((f, i) => f || feitas.slice(i + 1).some(Boolean));

        ETAPAS.forEach((etapa, i) => {
            const item = itens[i];
            if (!item) return;

            const feita = concluida[i];
            const liberada = i === 0 || concluida[i - 1];

            item.classList.toggle('completed', feita);
            item.classList.toggle('locked', !liberada);
            item.classList.toggle('available', liberada && !feita);
            item.setAttribute('aria-disabled', String(!liberada));
            item.removeAttribute('onclick'); // os links agora são definidos aqui

            const check = item.querySelector('.check-icon');
            if (check) check.style.display = feita ? '' : 'none';

            const seta = item.querySelector('.lesson-action i');
            if (seta) seta.className = liberada ? 'ph ph-caret-right' : 'ph ph-lock';

            item.style.cursor = liberada ? 'pointer' : 'not-allowed';
            item.onclick = !liberada
                ? avisarBloqueada
                : (etapa.href ? () => { window.location.href = etapa.href; } : abrirBoasVindas);
        });
    }

    atualizarTrilha();
    // Ao voltar de uma atividade pelo botão "voltar" do navegador, recalcula.
    window.addEventListener('pageshow', atualizarTrilha);

    // Modal de boas-vindas
    if (closeBtn) closeBtn.addEventListener('click', fecharBoasVindas);
    window.addEventListener('click', (e) => {
        if (e.target === welcomeModal) fecharBoasVindas(); // clicou fora do card
    });
});