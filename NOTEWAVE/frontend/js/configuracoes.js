// === 1. LEITURA E APLICAÇÃO IMEDIATA DO TEMA ===
// Lê o estado do LocalStorage de forma direta (retorna true se for igual a 'true')
const isDarkMode = localStorage.getItem('darkMode') === 'true';

// Aplica ou remove a classe utilizando a propriedade condicional do toggle (Evita IF/ELSE)
document.body.classList.toggle('dark-mode', isDarkMode);

// === 2. CONTROLE DO SWITCH (INTERRUPTOR) ===
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');

    // Cláusula de segurança (Early Return): Se o elemento não existir na página, encerra a execução
    if (!themeToggle) return;

    // Alinha a posição visual do switch com o tema recuperado do banco local
    themeToggle.checked = isDarkMode;

    // Ouve quando o usuário interage com o switch
    themeToggle.addEventListener('change', () => {
        const shouldEnableDark = themeToggle.checked;
        
        // Atualiza a classe no body e salva o estado de forma simplificada
        document.body.classList.toggle('dark-mode', shouldEnableDark);
        localStorage.setItem('darkMode', shouldEnableDark);
    });
});

// --- LÓGICA DA PÁGINA TIRAR DÚVIDAS ---
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('helpSearchInput');
    const searchBtn = document.getElementById('btnSearchHelp');
    const tagButtons = document.querySelectorAll('.tag-btn');

    // Executa apenas se o campo de busca existir na página atual
    if (searchInput && searchBtn) {
        
        // Função para disparar a busca
        const executarBusca = (termo) => {
            const query = termo.trim();
            if (query !== '') {
                console.log(`Buscando por: ${query}`);
                // Aqui podemos adicionar a filtragem dos cards de FAQ a seguir
            }
        };

        // Evento de clique no botão "Buscar"
        searchBtn.addEventListener('click', () => {
            executarBusca(searchInput.value);
        });

        // Evento de pressionar a tecla "Enter" no input
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                executarBusca(searchInput.value);
            }
        });

        // Evento de clique nas Tags Rápidas
        tagButtons.forEach(button => {
            button.addEventListener('click', () => {
                const termoTag = button.getAttribute('data-search');
                searchInput.value = termoTag;
                executarBusca(termoTag);
            });
        });
    }
});

// === 5. BOTÃO REFAZER TOUR GUIADO ===
document.addEventListener('DOMContentLoaded', () => {
    const restartTourBtn = document.getElementById('btn-restart-tour');

    if (restartTourBtn) {
        restartTourBtn.addEventListener('click', () => {
            const confirma = confirm("Deseja refazer o Tour Guiado do NoteWave?");
            if (confirma) {
                // Reseta a escolha do tour no localStorage
                localStorage.removeItem('notewave_tour_choice');
                localStorage.removeItem('notewave_tour_completed');

                // Redireciona para a tela inicial do tour (ex: Perfil ou Trilha de Aulas)
                window.location.href = '../html/perfil.html';
            }
        });
    }
});