// === CONFIGURAÇÃO DOS PASSOS DO TOUR POR PÁGINA ===
const tourRoutes = {
    // 1. PÁGINA PERFIL
    perfil: [
        {
            target: '.profile-header, .avatar-container, h1',
            title: 'Seu Perfil de Estudante',
            description: 'Aqui você acompanha seus dados principais, foto de perfil e nível atual no NoteWave.'
        },
        {
            target: '.sidebar',
            title: 'Menu Lateral',
            description: 'Navegue entre seu Perfil, Trilha de Aulas, Medalhas e Configurações.'
        }
    ],

    // 2. PÁGINA TRILHA DE AULAS
    trilha: [
        {
            target: '.trilha-container, .conteudo-principal, main',
            title: 'Trilha de Aprendizado',
            description: 'Siga a sequência de módulos para evoluir passo a passo na teoria e prática musical.'
        }
    ],

    // 3. PÁGINA MEDALHAS
    medalhas: [
        {
            target: '.grid-medalhas, .conquistas, h1',
            title: 'Suas Conquistas',
            description: 'Acompanhe todas as medalhas e troféus desbloqueados conforme completa suas aulas.'
        }
    ],

    // 4. PÁGINA CONFIGURAÇÕES
    configuracoes: [
        {
            target: '.config-card-base', // Corrigido para o seletor que realmente existe no HTML da Giovanna
            title: 'Configurações do Sistema',
            description: 'Gerencie sua conta, ajuste o modo noturno, preferências de privacidade e refaça este tour a qualquer momento!'
        },
        {
            target: '#btn-restart-tour',
            title: 'Refazer o Tour',
            description: 'Clicando neste botão a qualquer momento, você poderá rever este tutorial da plataforma.'
        }
    ]
};

// === LÓGICA PRINCIPAL DO FLUXO ===
function initNoteWaveFlow(pageKey) {
    document.addEventListener('DOMContentLoaded', () => {
        const tourChoice = localStorage.getItem('notewave_tour_choice');

        // Se o usuário nunca escolheu (primeiro acesso)
        if (!tourChoice) {
            exibirBannerBoasVindas(pageKey);
        }

        // Evento para o botão de refazer o tour nas configurações
        const btnRestart = document.getElementById('btn-restart-tour');
        if (btnRestart) {
            btnRestart.addEventListener('click', () => {
                iniciarPassosDoTour(pageKey);
            });
        }
    });
}

// Criar Modal de Boas-Vindas / Aceite do Tour
function exibirBannerBoasVindas(pageKey) {
    if (document.getElementById('modal-tour-welcome')) return;

    const modalHTML = `
        <div id="modal-tour-welcome" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 12px; max-width: 450px; width: 100%; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); text-align: center; font-family: 'Inter', sans-serif;">
                <h2 style="margin-top: 0; color: #002b7a;">Bem-vindo ao NoteWave! 🎵</h2>
                <p style="color: #666; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
                    Gostaria de fazer um tour rápido pela plataforma para aprender a navegar pelas telas?
                </p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="btn-skip-tour" style="padding: 10px 16px; border: 1px solid #ccc; background: transparent; border-radius: 6px; cursor: pointer; font-weight: 600;">Agora não</button>
                    <button id="btn-start-tour" style="padding: 10px 16px; border: none; background: #2b4c7e; color: #fff; border-radius: 6px; cursor: pointer; font-weight: 600;">Iniciar Tour</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('btn-start-tour').addEventListener('click', () => {
        localStorage.setItem('notewave_tour_choice', 'accepted');
        removerModalWelcome();
        iniciarPassosDoTour(pageKey);
    });

    document.getElementById('btn-skip-tour').addEventListener('click', () => {
        localStorage.setItem('notewave_tour_choice', 'declined');
        removerModalWelcome();
    });
}

function removerModalWelcome() {
    const modal = document.getElementById('modal-tour-welcome');
    if (modal) modal.remove();
}

// Remover balão de passo anterior se existir
function removerBalaoPasso() {
    const balaoAntigo = document.getElementById('tour-step-card');
    if (balaoAntigo) balaoAntigo.remove();
}

// Iniciar destaque dos elementos na página ativa com card visual flutuante
function iniciarPassosDoTour(pageKey) {
    const steps = tourRoutes[pageKey];
    if (!steps || steps.length === 0) return;

    let currentStep = 0;

    function renderStep(index) {
        removerBalaoPasso();

        if (index >= steps.length) return;

        const step = steps[index];
        const targetEl = document.querySelector(step.target);

        if (!targetEl) {
            // Se o elemento alvo não existir na tela, pula para o próximo passo
            renderStep(index + 1);
            return;
        }

        // Rola até o elemento suavemente
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetEl.style.outline = '3px solid #2b4c7e';
        targetEl.style.transition = 'outline 0.3s ease';

        // Cria o card flutuante na tela
        const cardHTML = `
            <div id="tour-step-card" style="position: fixed; bottom: 30px; right: 30px; background: #ffffff; border-radius: 12px; max-width: 320px; width: 100%; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 10000; font-family: 'Inter', sans-serif; border-left: 5px solid #2b4c7e;">
                <span style="font-size: 11px; font-weight: 700; color: #2b4c7e; text-transform: uppercase;">Passo ${index + 1} de ${steps.length}</span>
                <h3 style="margin: 6px 0 8px 0; color: #333; font-size: 16px;">${step.title}</h3>
                <p style="color: #666; font-size: 13px; line-height: 1.4; margin-bottom: 16px;">${step.description}</p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <button id="tour-btn-close" style="background: transparent; border: none; color: #999; cursor: pointer; font-size: 12px;">Sair</button>
                    <button id="tour-btn-next" style="padding: 8px 14px; border: none; background: #2b4c7e; color: #fff; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px;">${index + 1 === steps.length ? 'Finalizar' : 'Próximo →'}</button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', cardHTML);

        // Ações dos botões do card
        document.getElementById('tour-btn-next').addEventListener('click', () => {
            targetEl.style.outline = 'none';
            removerBalaoPasso();
            renderStep(index + 1);
        });

        document.getElementById('tour-btn-close').addEventListener('click', () => {
            targetEl.style.outline = 'none';
            removerBalaoPasso();
        });
    }

    renderStep(currentStep);
}