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

// === ALTERAR NOME / APELIDO ===
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formConfiguracoes');
    const inputNome = document.getElementById('nome');
    if (!form || !inputNome) return;

    // Mesma chave que o perfil.js usa para mostrar "Olá, ..."
    let nomeAtual = localStorage.getItem('noteWave_user') || '';
    inputNome.value = nomeAtual;

    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // evita recarregar a página

        const novoNome = inputNome.value.trim();

        if (novoNome === '') {
            alert('O nome não pode ficar vazio.');
            return;
        }

        // Só envia se realmente mudou
        if (novoNome === nomeAtual) return;

        try {
            const token = localStorage.getItem('token');

            // 1) Salva no banco de dados (backend na porta 5000, com o token do login)
            const resposta = await fetch('https://note-tcc-backend.vercel.app/api/usuario/nome', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ nome: novoNome })
            });

            if (!resposta.ok) throw new Error('Falha ao salvar no servidor');

            const dados = await resposta.json();

            // 2) Só atualiza o local depois que o banco confirmou
            localStorage.setItem('token', dados.token);          // token novo, com o nome atualizado
            localStorage.setItem('noteWave_user', dados.username);
            nomeAtual = dados.username;

            alert('Nome atualizado com sucesso!');
        } catch (erro) {
            console.error(erro);
            alert('Não foi possível salvar o nome. Tente novamente.');
        }
    });
});

// === APAGAR CONTA ===
document.addEventListener('DOMContentLoaded', () => {
    const btnAbrir = document.getElementById('btnApagarConta');
    const modal = document.getElementById('modalApagar');
    const inputSenha = document.getElementById('senhaApagar');
    const btnConfirmar = document.getElementById('btnConfirmarApagar');
    const btnCancelar = document.getElementById('btnCancelarApagar');
    if (!btnAbrir || !modal || !inputSenha || !btnConfirmar || !btnCancelar) return;

    function fechar() {
        modal.hidden = true;
        inputSenha.value = '';
        btnConfirmar.disabled = false;
    }

    btnAbrir.addEventListener('click', () => {
        modal.hidden = false;
        inputSenha.focus();
    });

    btnCancelar.addEventListener('click', fechar);

    // Clicar fora da janela ou apertar Esc também fecha
    modal.addEventListener('click', (e) => { if (e.target === modal) fechar(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) fechar(); });

    async function apagar() {
        const senha = inputSenha.value;
        if (!senha) {
            alert('Digite sua senha para confirmar.');
            return;
        }

        btnConfirmar.disabled = true;
        try {
            const resposta = await fetch('https://note-tcc-backend.vercel.app/api/usuario/conta', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                },
                body: JSON.stringify({ senha })
            });

            const dados = await resposta.json().catch(() => ({}));

            if (!resposta.ok) {
                alert(dados.message || 'Não foi possível apagar a conta.');
                btnConfirmar.disabled = false;
                return;
            }

            // Limpa tudo deste navegador, mas mantém a escolha de tema
            const tema = localStorage.getItem('theme');
            localStorage.clear();
            if (tema) localStorage.setItem('theme', tema);

            alert('Sua conta foi apagada. Sentiremos sua falta!');
            window.location.href = 'login.html';
        } catch (erro) {
            console.error(erro);
            alert('Não foi possível conectar ao servidor.');
            btnConfirmar.disabled = false;
        }
    }

    btnConfirmar.addEventListener('click', apagar);
    inputSenha.addEventListener('keydown', (e) => { if (e.key === 'Enter') apagar(); });
});