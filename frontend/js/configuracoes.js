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

// === ALTERAR NOME / E-MAIL / SENHA ===
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formConfiguracoes');
    const inputNome = document.getElementById('nome');
    const inputEmail = document.getElementById('email');
    const inputSenha = document.getElementById('senha');
    const inputAtual = document.getElementById('senhaAtual');
    if (!form || !inputNome) return;

    const API = 'https://note-tcc-backend.vercel.app/api';

    // Mesma chave que o perfil.js usa para mostrar "Olá, ..."
    let nomeAtual = localStorage.getItem('noteWave_user') || '';
    inputNome.value = nomeAtual;

    async function enviar(caminho, corpo) {
        const r = await fetch(API + caminho, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify(corpo)
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.message || 'Não foi possível salvar.');
        if (d.token) localStorage.setItem('token', d.token);   // token novo, com os dados atualizados
        return d;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const novoNome = inputNome.value.trim();
        const novoEmail = inputEmail ? inputEmail.value.trim() : '';
        const novaSenha = inputSenha ? inputSenha.value : '';
        const senhaAtual = inputAtual ? inputAtual.value : '';

        if (novoNome === '') { alert('O nome não pode ficar vazio.'); return; }

        const mudouNome = novoNome !== nomeAtual;
        if (!mudouNome && !novoEmail && !novaSenha) return;   // nada para salvar

        if ((novoEmail || novaSenha) && !senhaAtual) {
            alert('Digite sua senha atual para trocar o e-mail ou a senha.');
            if (inputAtual) inputAtual.focus();
            return;
        }
        if (novaSenha && novaSenha.length < 8) {
            alert('A nova senha precisa ter pelo menos 8 caracteres.');
            return;
        }

        const feitos = [];
        try {
            if (mudouNome) {
                const d = await enviar('/usuario/nome', { nome: novoNome });
                localStorage.setItem('noteWave_user', d.username);
                nomeAtual = d.username;
                feitos.push('Nome atualizado.');
            }
            if (novoEmail) {
                await enviar('/usuario/conta/email', { email: novoEmail, senhaAtual });
                feitos.push('E-mail atualizado.');
                inputEmail.value = '';
            }
            if (novaSenha) {
                await enviar('/usuario/conta/senha', { novaSenha, senhaAtual });
                feitos.push('Senha alterada.');
                inputSenha.value = '';
            }
            if (inputAtual) inputAtual.value = '';
            alert(feitos.join('\n'));
        } catch (erro) {
            console.error(erro);
            alert((feitos.length ? feitos.join('\n') + '\n\n' : '') + erro.message);
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