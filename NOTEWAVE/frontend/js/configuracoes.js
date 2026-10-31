// O modo escuro agora é controlado só pelo tema.js (carregado no <head>).
// O interruptor de Configurações chama NoteWaveTema.definir(...) direto no HTML.

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

// === BOTÃO REFAZER TOUR GUIADO ===
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