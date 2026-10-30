// =====================================================
// NOTEWAVE — TOUR GUIADO (multipágina)
//
// Ordem do tour:
//   Perfil -> Medalhas -> Trilha de Aulas -> Configurações
//
// COMO FUNCIONA:
// - Cada página tem uma lista de passos em "tourRoutes".
// - No último passo de uma página, o botão leva o aluno
//   para a próxima página, e o tour continua lá sozinho.
// - Se um elemento (target) não existir na tela, o passo é
//   pulado automaticamente, então nada quebra.
//
// DICA: nas páginas Perfil, Medalhas e Trilha, o jeito mais
// seguro de apontar o tour é colocar um atributo data-tour
// no elemento, por exemplo:
//   <div class="..." data-tour="sequencia">
// Os seletores abaixo já tentam o data-tour primeiro e depois
// alguns nomes de classe prováveis.
//
// FOTOS: preencha o campo "imagem" de cada passo. Se vazio ou
// se o arquivo não existir, usa o mascote (nota.png) e, por
// último, um ♫.
// =====================================================

const tourRoutes = {

    // ---------------------------------------------
    // 1. PERFIL
    // ---------------------------------------------
    perfil: [
        {
            target: '[data-tour="perfil-topo"], .profile-header, .avatar-container',
            title: 'Seu Perfil de Estudante',
            description: 'Aqui ficam seus dados principais, sua foto de perfil e o seu nível atual no NoteWave.',
            imagem: '../imagem/oi.png'
        },
        {
            target: '[data-tour="sequencia"], .sequencia-estudos, .sequencia, .streak, #sequencia',
            texto: ['sequência de estudos', 'sequencia de estudos', 'sequência', 'sequencia', 'ofensiva'],
            semprefalar: true,
            title: 'Sequência de Estudos',
            description: 'Mostra quantos dias seguidos você estudou. Estude um pouquinho todo dia para manter a sequência acesa e não perder o ritmo!',
            imagem: '../imagem/explicacao.png'
        },
        {
            target: '[data-tour="sequencia-dias"], .sequencia-dias, .dias-semana, .streak-days, .calendario-sequencia, .dias-estudados',
            texto: ['sequência de estudos', 'sequencia de estudos', 'sequência', 'sequencia', 'ofensiva'],
            semprefalar: true,
            title: 'Seus Dias de Estudo',
            description: 'Aqui aparecem os dias em que você estudou. Cada dia marcado é um passo a mais na sua sequência: se pular um dia, ela recomeça, então tente não deixar a chama apagar!',
            imagem: '../imagem/distraido.png'
        },
        {
            target: '[data-tour="progresso"], .progresso-geral, .progress-card, .progress-bar, #progresso',
            texto: ['progresso geral', 'progresso'],
            semprefalar: true,
            title: 'Progresso Geral',
            description: 'Aqui você vê o quanto da trilha já completou. A barra avança a cada aula concluída.',
            imagem: '../imagem/explicacao.png'
        },
        {
            target: '[data-tour="medalhas-resumo"], .medalhas-resumo, .badges-preview, .medalhas-perfil',
            texto: ['medalhas'],
            semprefalar: true,
            title: 'Suas Medalhas',
            description: 'Um resumo das medalhas que você já conquistou. Vamos ver todas elas em detalhe na próxima tela!',
            imagem: '../imagem/feliz.png'
        },
        {
            target: '.sidebar',
            title: 'Menu Lateral',
            description: 'Use o menu para navegar entre Perfil, Trilha de Aulas, Medalhas e Configurações a qualquer momento.',
            imagem: '../imagem/explicacao.png'
        }
    ],

    // ---------------------------------------------
    // 2. MEDALHAS
    // ---------------------------------------------
    medalhas: [
        {
            target: '[data-tour="medalhas-grid"], .grid-medalhas, .conquistas, main h1',
            texto: ['medalhas', 'conquistas'],
            semprefalar: true,
            title: 'Sua Coleção de Medalhas',
            description: 'Cada medalha representa uma conquista na plataforma: completar aulas, manter a sequência de estudos, acertar exercícios e muito mais. Elas se dividem em dois tipos: conquistadas e bloqueadas.',
            imagem: '../imagem/mao.png'
        },
        {
            target: '[data-tour="medalha-conquistada"], .medalha.conquistada, .medalha.desbloqueada, .badge.earned, .medalha-card:not(.bloqueada):not(.locked)',
            texto: ['conquistada', 'desbloqueada'],
            todos: true,
            alvosFn: () => medalhasPorEstado(false),
            semprefalar: true,
            title: 'Medalhas Conquistadas',
            description: 'As medalhas coloridas já são suas! Cada uma é um sinal de que você chegou lá: elas ficam guardadas aqui para você rever sempre que quiser.',
            descricaoDinamica: (alvo) => {
                const nome = tituloDoElemento(alvo);
                return nome
                    ? `As medalhas coloridas já são suas! Por exemplo, "${nome}" já foi conquistada. Ela fica guardada aqui para você rever sempre que quiser.`
                    : null;
            },
            imagem: '../imagem/feliz.png'
        },
        {
            target: '[data-tour="medalha-bloqueada"], .medalha.bloqueada, .medalha-bloqueada, .badge.locked, .medalha-card.locked',
            texto: ['bloqueada', 'a desbloquear'],
            todos: true,
            alvosFn: () => medalhasPorEstado(true),
            semprefalar: true,
            title: 'Medalhas Bloqueadas',
            description: 'As medalhas apagadas ainda estão por vir. Elas funcionam como metas: continue estudando, completando aulas e mantendo sua sequência para desbloquear cada uma.',
            descricaoDinamica: (alvo) => {
                const nome = tituloDoElemento(alvo);
                return nome
                    ? `As medalhas apagadas ainda estão por vir. Por exemplo, "${nome}" é uma meta sua: continue estudando e mantendo a sequência para desbloqueá-la!`
                    : null;
            },
            imagem: '../imagem/explicacao.png'
        }
    ],

    // ---------------------------------------------
    // 3. TRILHA DE AULAS
    // ---------------------------------------------
    trilha: [
        {
            target: '[data-tour="trilha"], .trilha-container, .conteudo-principal, main',
            title: 'Trilha de Aprendizado',
            description: 'Aqui está o seu caminho de estudos. As aulas seguem uma sequência pensada para você evoluir passo a passo na teoria e na prática musical.',
            imagem: '../imagem/oi.png'
        },
        {
            target: '[data-tour="trilha-modulo"], .modulo, .module, .module-card, .trilha-modulo, .trilha-item',
            title: 'Módulos',
            description: 'A trilha é dividida em módulos. Cada módulo reúne aulas sobre um mesmo assunto, do básico ao mais avançado.',
            imagem: '../imagem/mao.png'
        },
        {
            // Exemplo de uma aula que o usuário pode fazer agora (a primeira liberada)
            target: '[data-tour="trilha-aula"], .aula:not(.bloqueada):not(.locked), .lesson:not(.locked), .nivel:not(.bloqueado), .trilha-aula:not(.bloqueada)',
            texto: ['aula 1', 'aula 01', 'lição 1', 'nível 1', 'nivel 1'],
            semprefalar: true,
            title: 'Exemplo: sua próxima aula',
            description: 'Veja uma aula que você já pode fazer! Clique nela para abrir o conteúdo, assistir, praticar e responder os exercícios. Ao concluir, a próxima aula é liberada e seu progresso aumenta.',
            descricaoDinamica: (alvo) => {
                const nome = tituloDoElemento(alvo);
                return nome
                    ? `Veja uma aula que você já pode fazer agora: "${nome}". Clique nela para abrir o conteúdo, praticar e responder os exercícios. Ao concluir, a próxima aula é liberada e seu progresso geral aumenta!`
                    : null;
            },
            imagem: '../imagem/distraido.png'
        },
        {
            target: '[data-tour="trilha-bloqueada"], .aula.bloqueada, .lesson.locked, .nivel.bloqueado, .bloqueado, .locked',
            title: 'Aulas Bloqueadas',
            description: 'Aulas com cadeado ainda não estão disponíveis. Termine as anteriores para liberar o próximo desafio.',
            imagem: '../imagem/feliz.png'
        }
    ],

    // ---------------------------------------------
    // 4. CONFIGURAÇÕES
    // ---------------------------------------------
    configuracoes: [
        {
            target: '.config-card-base',
            title: 'Configurações do Sistema',
            description: 'Aqui você gerencia sua conta, a aparência da plataforma e suas preferências. Vamos ver cada parte!',
            imagem: '../imagem/lamp.png'
        },
        {
            target: '#formConfiguracoes .config-section:nth-of-type(1)',
            title: 'Aparência',
            description: 'Ligue o Modo Escuro para deixar as cores mais confortáveis para estudar à noite. A escolha fica salva neste navegador.',
            imagem: '../imagem/mao.png'
        },
        {
            target: '#formConfiguracoes .config-section:nth-of-type(2)',
            title: 'Gerenciar Conta',
            description: 'Altere seu e-mail e sua senha aqui. Depois de preencher, clique em "Salvar Alterações" para confirmar.',
            imagem: '../imagem/explicacao.png'
        },
        {
            target: '#formConfiguracoes .config-section:nth-of-type(3)',
            title: 'Privacidade e Dados',
            description: 'Escolha quais cookies o NoteWave pode usar e leia os Termos de Uso, a Política de Privacidade e a LGPD.',
            imagem: '../imagem/lamp.png'
        },
        {
            target: '#formConfiguracoes .config-section:nth-of-type(4)',
            title: 'Central de Ajuda',
            description: 'Ficou com alguma dúvida sobre a plataforma ou sobre as aulas? Clique aqui para tirar suas dúvidas.',
            imagem: '../imagem/mao.png'
        },
        {
            target: '#btn-restart-tour',
            title: 'Refazer o Tour',
            description: 'Quando quiser, clique neste botão para rever todo este tutorial desde o começo.',
            imagem: '../imagem/explicacao.png'
        }
    ]
};

// Mascote usado no convite e como imagem reserva
const IMAGEM_BOAS_VINDAS = '../imagem/oi.png';



// Ordem das páginas do tour e arquivo de cada uma
const ordemTour = ['perfil', 'medalhas', 'trilha', 'configuracoes'];

const paginasTour = {
    perfil:        { arquivo: 'perfil.html',          nome: 'Perfil' },
    medalhas:      { arquivo: 'medalhas.html',        nome: 'Medalhas' },
    trilha:        { arquivo: 'trilha_de_aulas.html', nome: 'Trilha de Aulas' },
    configuracoes: { arquivo: 'configuracoes.html',   nome: 'Configurações' }
};

// Nome do arquivo (sem .html) -> chave em tourRoutes
const tourPaginas = {
    perfil: 'perfil',
    trilha_de_aulas: 'trilha',
    medalhas: 'medalhas',
    configuracoes: 'configuracoes'
};

// Guarda qual página deve continuar o tour (some ao fechar a aba)
const CHAVE_TOUR_ATIVO = 'notewave_tour_ativo';

// =====================================================
// FLUXO PRINCIPAL
// =====================================================

let tourJaConfigurado = false;

function initNoteWaveFlow(pageKey) {
    if (tourJaConfigurado) return;
    tourJaConfigurado = true;

    const configurar = () => {
        // OCASIÃO 2: botão "Refazer Tour Guiado" (Configurações)
        const btnRestart = document.getElementById('btn-restart-tour');
        if (btnRestart) {
            btnRestart.addEventListener('click', () => comecarTourCompleto(pageKey));
        }

        // Continuação de um tour que JÁ foi iniciado (primeiro acesso ou "Refazer").
        // A marca é consumida na hora, então recarregar a página não repete o tour.
        const ativo = sessionStorage.getItem(CHAVE_TOUR_ATIVO);
        if (ativo === pageKey) {
            sessionStorage.removeItem(CHAVE_TOUR_ATIVO);
            setTimeout(() => iniciarPassosDoTour(pageKey, true), 500);
            return;
        }

        // Marca velha que não pertence a esta página: descarta
        if (ativo) sessionStorage.removeItem(CHAVE_TOUR_ATIVO);

        // OCASIÃO 1: primeiro acesso do usuário. O convite aparece uma única vez.
        if (!localStorage.getItem('notewave_tour_choice')) {
            localStorage.setItem('notewave_tour_choice', 'visto');
            exibirBannerBoasVindas(pageKey);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', configurar);
    } else {
        configurar();
    }
}

// Começa sempre pelo Perfil
function comecarTourCompleto(pageKey) {
    const primeira = ordemTour[0];

    if (pageKey === primeira) {
        iniciarPassosDoTour(primeira, true);
    } else {
        sessionStorage.setItem(CHAVE_TOUR_ATIVO, primeira);
        window.location.href = paginasTour[primeira].arquivo;
    }
}

function irParaProximaPagina(pageKey) {
    const posicao = ordemTour.indexOf(pageKey);
    const proxima = ordemTour[posicao + 1];

    if (!proxima) {
        sessionStorage.removeItem(CHAVE_TOUR_ATIVO);
        return;
    }

    sessionStorage.setItem(CHAVE_TOUR_ATIVO, proxima);
    window.location.href = paginasTour[proxima].arquivo;
}

// =====================================================
// PEÇAS REUTILIZÁVEIS
// =====================================================

function montarFoto(src, alt) {
    return `
        <figure class="nw-tour-foto">
            ${src ? `<img src="${src}" alt="${alt || ''}">` : ''}
        </figure>
    `;
}

// Imagem do passo não existe -> tenta o mascote -> se falhar, mostra ♫
function tratarImagensQuebradas(container) {
    container.querySelectorAll('.nw-tour-foto img').forEach(img => {
        img.addEventListener('error', () => {
            if (!img.dataset.reserva && !img.src.endsWith(IMAGEM_BOAS_VINDAS.replace('..', ''))) {
                img.dataset.reserva = '1';
                img.src = IMAGEM_BOAS_VINDAS;
            } else {
                img.remove();
            }
        });
    });
}

// =====================================================
// CONVITE DE BOAS-VINDAS
// =====================================================

function exibirBannerBoasVindas(pageKey) {
    if (document.getElementById('modal-tour-welcome')) return;

    const html = `
        <div id="modal-tour-welcome" class="nw-tour-fundo">
            <div class="nw-tour-cena nw-tour-cena--convite" role="dialog" aria-modal="true" aria-labelledby="nw-welcome-titulo">
                ${montarFoto(IMAGEM_BOAS_VINDAS, 'NoteWave')}
                <div class="nw-tour-balao">
                    <h3 id="nw-welcome-titulo">Bem-vindo ao NoteWave!</h3>
                    <p>Quer fazer um tour pela plataforma? Vou te mostrar o Perfil, as Medalhas, a Trilha de Aulas e as Configurações.</p>
                    <div class="nw-tour-rodape">
                        <div class="nw-tour-acoes">
                            <button id="btn-skip-tour" class="nw-tour-btn nw-tour-btn--claro">Agora não</button>
                            <button id="btn-start-tour" class="nw-tour-btn">Iniciar tour</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    tratarImagensQuebradas(document.getElementById('modal-tour-welcome'));

    document.getElementById('btn-skip-tour').addEventListener('click', () => {
        localStorage.setItem('notewave_tour_choice', 'declined');
        removerModalWelcome();
    });

    document.getElementById('btn-start-tour').addEventListener('click', () => {
        localStorage.setItem('notewave_tour_choice', 'accepted');
        removerModalWelcome();
        comecarTourCompleto(pageKey);
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

// =====================================================
// PASSOS DO TOUR
// =====================================================

// Procura um elemento pelo texto visível (plano B quando o seletor não acha).
// Pega o texto e sobe até o "cartão" que o contém.
function acharPorTexto(palavras) {
    if (!palavras || !palavras.length) return null;

    const ignorar = 'script, style, .sidebar, .nw-tour-cena, .nw-tour-fundo';
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);

    while (walker.nextNode()) {
        const no = walker.currentNode;
        const texto = no.nodeValue.trim().toLowerCase();
        if (!texto || texto.length > 60) continue;
        if (!palavras.some(p => texto.includes(p.toLowerCase()))) continue;

        let el = no.parentElement;
        if (!el || el.closest(ignorar)) continue;
        if (el.offsetParent === null) continue; // escondido

        // sobe até um bloco com tamanho de "cartão" (no máximo 4 níveis)
        for (let i = 0; i < 4; i++) {
            const pai = el.parentElement;
            const grande = el.offsetWidth >= 140 && el.offsetHeight >= 70;
            if (grande || !pai || pai.tagName === 'MAIN' || pai.tagName === 'BODY') break;
            el = pai;
        }
        return el;
    }
    return null;
}

// Lê o nome de uma medalha/aula a partir do elemento destacado
function tituloDoElemento(el) {
    if (!el) return '';
    const cabecalho = el.querySelector('h1, h2, h3, h4, h5, strong, .titulo, .title, .nome');
    const bruto = (cabecalho ? cabecalho.textContent : el.textContent) || '';
    const texto = bruto.trim().replace(/\s+/g, ' ');
    return texto.length > 0 && texto.length <= 50 ? texto : '';
}

// Acha os cartões de medalha da página e separa conquistadas x bloqueadas
function medalhasPorEstado(bloqueadas) {
    const candidatos = Array.from(document.querySelectorAll(
        '[class*="medalha"], [class*="medal"], [class*="badge"], [class*="conquista"]'
    )).filter(el =>
        !el.closest('.sidebar, .nw-tour-cena, .nw-tour-fundo') &&
        el.offsetParent !== null &&
        el.offsetWidth >= 50 && el.offsetHeight >= 50
    );

    // Os cartões são os "irmãos" repetidos: pega o grupo com mais elementos
    const grupos = new Map();
    candidatos.forEach(el => {
        const pai = el.parentElement;
        if (!grupos.has(pai)) grupos.set(pai, []);
        grupos.get(pai).push(el);
    });

    let cartoes = [];
    grupos.forEach(lista => { if (lista.length > cartoes.length) cartoes = lista; });

    const ehBloqueada = (el) => {
        const marca = /bloq|lock|disabled|inativ|apagad|indispon|nao-conq|não-conq|pendente/i;
        if (marca.test(el.className)) return true;
        if (el.querySelector('[class*="lock"], [class*="bloq"], [class*="disabled"]')) return true;
        const alvos = [el, el.firstElementChild].filter(Boolean);
        return alvos.some(n => {
            const estilo = getComputedStyle(n);
            return estilo.filter.includes('grayscale') || parseFloat(estilo.opacity) < 0.85;
        });
    };

    return cartoes.filter(el => ehBloqueada(el) === bloqueadas).slice(0, 40);
}

// Devolve os elementos a destacar neste passo
function acharAlvos(step) {
    if (step.alvosFn) {
        const lista = step.alvosFn();
        if (lista && lista.length) return lista;
    }

    if (step.todos) {
        const lista = Array.from(document.querySelectorAll(step.target));
        if (lista.length) return lista;
    } else {
        const um = document.querySelector(step.target);
        if (um) return [um];
    }

    const porTexto = acharPorTexto(step.texto);
    return porTexto ? [porTexto] : [];
}

function acharAlvo(step) {
    return acharAlvos(step)[0] || null;
}

function removerBalaoPasso() {
    const balao = document.getElementById('tour-step-card');
    if (balao) balao.remove();
}

function limparDestaques() {
    document.querySelectorAll('.nw-tour-alvo').forEach(el => el.classList.remove('nw-tour-alvo'));
}

// Se o balão cobrir o elemento destacado, move o balão para o outro lado
function posicionarCena(cena, alvo) {
    cena.classList.remove('nw-esquerda');

    const cruza = (a, b) =>
        a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

    if (cruza(cena.getBoundingClientRect(), alvo.getBoundingClientRect())) {
        cena.classList.add('nw-esquerda');

        // Se também cobrir do lado esquerdo, volta ao padrão
        if (cruza(cena.getBoundingClientRect(), alvo.getBoundingClientRect())) {
            cena.classList.remove('nw-esquerda');
        }
    }
}

function iniciarPassosDoTour(pageKey, fazParteDoTour) {
    const todos = tourRoutes[pageKey] || [];

    // Entram os passos cujo elemento existe nesta tela (ou que sempre devem falar)
    const steps = todos.filter(s => s.semprefalar || acharAlvos(s).length);

    const proxima = ordemTour[ordemTour.indexOf(pageKey) + 1];

    // Nada para mostrar aqui: segue direto para a próxima página
    if (steps.length === 0) {
        if (fazParteDoTour) irParaProximaPagina(pageKey);
        return;
    }

    function encerrar() {
        limparDestaques();
        removerBalaoPasso();
        sessionStorage.removeItem(CHAVE_TOUR_ATIVO);
        document.removeEventListener('keydown', aoPressionarTecla);
    }

    function aoPressionarTecla(evento) {
        if (evento.key === 'Escape') encerrar();
    }

    function renderStep(index) {
        limparDestaques();
        removerBalaoPasso();

        if (index >= steps.length) {
            document.removeEventListener('keydown', aoPressionarTecla);

            // Continua o tour na próxima página (ou termina na última)
            if (fazParteDoTour && proxima) {
                irParaProximaPagina(pageKey);
            } else {
                encerrar();
            }
            return;
        }

        const step = steps[index];
        const alvos = acharAlvos(step);
        const alvo = alvos[0] || null;

        // Se não achar o elemento, o balão ainda fala (só não destaca nada)
        if (alvo) {
            alvos.forEach(el => el.classList.add('nw-tour-alvo'));
            alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        const descricao = (step.descricaoDinamica && step.descricaoDinamica(alvo)) || step.description;

        const ehUltimo = index + 1 === steps.length;
        const vaiParaOutraPagina = ehUltimo && fazParteDoTour && proxima;

        let textoBotao = 'Próximo';
        if (vaiParaOutraPagina) textoBotao = `Ir para ${paginasTour[proxima].nome}`;
        else if (ehUltimo) textoBotao = 'Finalizar';

        const pontos = steps
            .map((_, i) => `<span class="${i === index ? 'ativo' : ''}"></span>`)
            .join('');

        const html = `
            <div id="tour-step-card" class="nw-tour-cena nw-tour-cena--passo" role="dialog" aria-live="polite">
                ${montarFoto(step.imagem, step.title)}
                <div class="nw-tour-balao">
                    <span class="nw-tour-passo">♪ Passo ${index + 1} de ${steps.length}</span>
                    <span class="nw-tour-pagina">${paginasTour[pageKey].nome}</span>
                    <h3>${step.title}</h3>
                    <p>${descricao}</p>
                    <div class="nw-tour-rodape">
                        <div class="nw-tour-pontos">${pontos}</div>
                        <div class="nw-tour-acoes">
                            <button id="tour-btn-close" class="nw-tour-btn-sair">Sair</button>
                            <button id="tour-btn-next" class="nw-tour-btn">${textoBotao}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);

        const cena = document.getElementById('tour-step-card');
        tratarImagensQuebradas(cena);

        const btnProximo = document.getElementById('tour-btn-next');
        btnProximo.addEventListener('click', () => renderStep(index + 1));
        document.getElementById('tour-btn-close').addEventListener('click', encerrar);
        btnProximo.focus({ preventScroll: true });

        // Depois do scroll suave, garante que o balão não tape o destaque
        setTimeout(() => {
            if (alvo && document.body.contains(cena)) posicionarCena(cena, alvo);
        }, 550);
    }

    document.addEventListener('keydown', aoPressionarTecla);
    renderStep(0);
}

// =====================================================
// INÍCIO AUTOMÁTICO
// Descobre a página pelo nome do arquivo, então basta
// incluir tour.js (e tour.css) em cada página.
// =====================================================

(function iniciarAutomaticamente() {
    const arquivo = window.location.pathname.split('/').pop().replace('.html', '').toLowerCase();
    const chave = tourPaginas[arquivo];
    if (!chave) return;

    const tourEscolhido = localStorage.getItem('notewave_tour_choice');
    const tourAtivoSessao = sessionStorage.getItem(CHAVE_TOUR_ATIVO);

    // CASO 2: O usuário clicou em "Refazer o Tour Guiado" nas configurações
    if (tourAtivoSessao === chave) {
        sessionStorage.removeItem(CHAVE_TOUR_ATIVO); // Remove para não repetir em um F5 (refresh)
        setTimeout(() => iniciarPassosDoTour(chave, true), 500);
        return;
    }

    // CASO 1: É o primeiro acesso absoluto do usuário na plataforma
    if (!tourEscolhido) {
        // Marcamos logo para evitar duplicações caso recarregue rápido
        localStorage.setItem('notewave_tour_choice', 'pendente_modal'); 
        
        // Exibe o modal de boas-vindas apenas na página inicial (ex: perfil)
        if (chave === 'perfil') {
            exibirBannerBoasVindas(chave);
        }
    }
})();