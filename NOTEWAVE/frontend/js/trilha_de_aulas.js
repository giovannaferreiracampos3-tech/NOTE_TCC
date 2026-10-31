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

document.addEventListener("DOMContentLoaded", () => {
    // Seleciona o primeiro item da timeline (Boas-vindas)
    const welcomeItem = document.querySelector(".timeline-item"); 
    const welcomeModal = document.getElementById("welcomeModal");
    const closeBtn = document.getElementById("closeWelcomeModal");

    if (welcomeItem && welcomeModal) {
        // Ao clicar no card de boas-vindas da trilha
        welcomeItem.addEventListener("click", () => {
            welcomeModal.style.display = "flex";
        });
    }

    // Ao clicar no botão de fechar do modal
    if (closeBtn && welcomeModal) {
        closeBtn.addEventListener("click", () => {
            welcomeModal.style.display = "none";
        });
    }

    // Fecha se clicar fora do card
    window.addEventListener("click", (e) => {
        if (e.target === welcomeModal) {
            welcomeModal.style.display = "none";
        }
    });
});