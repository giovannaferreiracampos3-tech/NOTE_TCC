// =====================================================
// NOTEWAVE — TOUR GUIADO (multipágina)
//
// Ordem do tour (segue o menu lateral):
//   Perfil -> Trilha de Aulas -> Caderno -> Jornal -> Doações
//   -> Notinha Runner -> Medalhas -> Configurações
//
// COMO FUNCIONA:
// - Cada página tem uma lista de passos em "tourRoutes".
// - No último passo de uma página, o botão leva o aluno
//   para a próxima página, e o tour continua lá sozinho.
// - Se um elemento (target) não existir na tela, o passo é
//   pulado automaticamente, então nada quebra.
// - Passos com "espera: true" apontam para elementos que só
//   aparecem depois que a página carrega dados (API, abas).
//   O tour espera até 4 s por eles; se não vierem, pula o passo.
// - Enquanto um passo é explicado, o resto da tela fica
//   desfocado e só o elemento destacado aparece nítido.
//
// DICA: se algum seletor não bater, coloque um atributo
// data-tour no elemento, por exemplo:
//   <div class="..." data-tour="sequencia">
//
// FOTOS: preencha o campo "imagem" de cada passo. Se vazio ou
// se o arquivo não existir, usa o mascote (oi.png) e, por
// último, nada.
// =====================================================

const tourRoutes = {

    // ---------------------------------------------
    // PERFIL
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
            description: 'Um resumo das medalhas que você já conquistou. Vamos ver todas elas em detalhe mais adiante no tour!',
            imagem: '../imagem/feliz.png'
        },
        {
            target: '.sidebar',
            title: 'Menu Lateral',
            description: 'Use o menu para navegar entre Perfil, Trilha de Aulas, Caderno, Jornal, Doações, Notinha Runner, Medalhas e Configurações a qualquer momento.',
            imagem: '../imagem/explicacao.png'
        }
    ],

    // ---------------------------------------------
    // TRILHA DE AULAS
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
    // CADERNO
    // (os passos do caderno por dentro só aparecem depois que
    // a capa foi escolhida; antes disso só o primeiro passo fala)
    // ---------------------------------------------
    caderno: [
        {
            target: '.cover-screen .cv-grid',
            title: 'Escolha a capa do seu caderno',
            description: 'Cada aluno tem um caderno de 100 páginas. Escolha a capa que mais gostar, escreva seu nome nela e clique em "Abrir caderno". Depois, em Configurações, você pode refazer este tour para conhecer o caderno por dentro.',
            imagem: '../imagem/oi.png'
        },
        {
            target: '.panel-head',
            title: 'Seu Caderno de Anotações',
            description: 'Aqui você registra o que aprende, o que ainda é difícil e as ideias que aparecem pelo caminho. Tudo fica guardado e só sai se você apagar.',
            imagem: '../imagem/oi.png'
        },
        {
            target: '#newNote',
            title: 'Nova anotação',
            description: 'Clique aqui para ir direto para a primeira página em branco. O que você escrever é salvo automaticamente, sem precisar apertar nenhum botão.',
            imagem: '../imagem/mao.png'
        },
        {
            target: '.book',
            title: 'As páginas do caderno',
            description: 'Cada página tem título, atividade, assunto, um espaço para escrever e as caixinhas "Dificuldades" e "Aprendi hoje". Use os botões de baixo para virar a página ou digite o número para ir direto.',
            imagem: '../imagem/explicacao.png'
        },
        {
            target: '#tabs',
            title: 'Abas de organização',
            description: 'Veja todas as páginas, só as que você já escreveu, ou agrupe tudo por atividade e por assunto para achar o que precisa mais rápido.',
            imagem: '../imagem/lamp.png'
        },
        {
            target: '.page .clear-btn',
            title: 'Apagar uma página',
            description: 'Antes de apagar, o caderno pede a sua confirmação. E a página não some de vez: ela vai para a Lixeira.',
            imagem: '../imagem/distraido.png'
        },
        {
            target: '[data-tab="lixeira"]',
            title: 'Lixeira',
            description: 'Aqui ficam as páginas apagadas. Você pode recuperar uma anotação quando quiser, ou excluir de vez se tiver certeza.',
            imagem: '../imagem/feliz.png'
        },
        {
            target: '.search',
            title: 'Busca',
            description: 'Digite uma palavra para encontrar suas anotações pelo título ou pelo texto. Os resultados aparecem na aba "Minhas anotações".',
            imagem: '../imagem/lamp.png'
        },
        {
            target: '#side',
            title: 'Categorias e últimas anotações',
            description: 'Clique em uma categoria para filtrar suas anotações e use a lista de últimas anotações para voltar rapidinho ao que escreveu por último.',
            imagem: '../imagem/explicacao.png'
        }
    ],

    // ---------------------------------------------
    // JORNAL
    // ---------------------------------------------
    journal: [
        {
            target: '.jr-head',
            title: 'Jornal NoteWave',
            description: 'Aqui você encontra leituras, descobertas e histórias de quem vive a música. É um espaço para aprender lendo e também para compartilhar o que você sabe.',
            imagem: '../imagem/oi.png'
        },
        {
            target: '#jrBusca',
            title: 'Busca',
            description: 'Digite uma palavra para encontrar publicações pelo título ou pelo conteúdo.',
            imagem: '../imagem/lamp.png'
        },
        {
            target: 'nav.jr-acoes',
            title: 'Navegando pelo Jornal',
            description: 'Use estes botões para ir ao Início, Explorar, Meus favoritos, Comunidade, Meus posts ou Publicar.',
            imagem: '../imagem/mao.png'
        },
        {
            target: '#jrDestaque .jr-card',
            espera: true,
            title: 'Artigo em destaque',
            description: 'O artigo em destaque aparece aqui. Clique no card para ler, reagir e deixar um comentário.',
            imagem: '../imagem/explicacao.png'
        },
        {
            target: '#jrDestaque .jr-fav',
            espera: true,
            title: 'Favoritar',
            description: 'Toque no marcador para salvar o artigo em "Meus favoritos" e reler quando quiser.',
            imagem: '../imagem/feliz.png'
        },
        {
            target: '#jrCatsHome',
            title: 'Categorias',
            description: 'Escolha uma categoria, como Teoria musical, Dicas de estudo ou Curiosidades, para ver só o que interessa.',
            imagem: '../imagem/lamp.png'
        },
        {
            target: '#jrRecentes',
            espera: true,
            title: 'Publicações recentes',
            description: 'As publicações mais novas da equipe e da comunidade aparecem aqui.',
            imagem: '../imagem/distraido.png'
        },
        {
            target: '[data-nav="publicar"]',
            title: 'Publique você também!',
            description: 'Tem uma dica, uma descoberta ou um relato? Clique em Publicar e escreva o seu texto para ajudar outros estudantes.',
            imagem: '../imagem/mao.png'
        },
        {
            target: '.jr-notinha',
            title: 'Cantinho do Notinha',
            description: 'O Notinha deixa uma dica de estudo para você. Clique em "Outra dica" para ver mais.',
            imagem: '../imagem/feliz.png'
        }
    ],

    // ---------------------------------------------
    // DOAÇÕES
    // ---------------------------------------------
    doacoes: [
        {
            target: '.dc-hero',
            title: 'NoteWave Doações',
            description: 'Aqui pessoas doam instrumentos musicais, de graça, para estudantes que sonham em aprender. Cada doação é uma nova chance de fazer música.',
            imagem: '../imagem/oi.png'
        },
        {
            target: '.dc-hero .dc-btn',
            title: 'Publicar uma doação',
            description: 'Tem um instrumento parado em casa? Clique aqui, conte como ele está e envie fotos. A doação é sempre gratuita: não é permitido vender nem cobrar.',
            imagem: '../imagem/mao.png'
        },
        {
            target: '.dc-stats',
            espera: true,
            title: 'Números da comunidade',
            description: 'Veja quantos instrumentos estão disponíveis, quantos estão em processo de doação e quantas doações já foram concluídas.',
            imagem: '../imagem/explicacao.png'
        },
        {
            target: '.dc-filtros',
            title: 'Pesquisa e filtros',
            description: 'Procure pelo nome do instrumento, filtre por município, categoria (cordas, sopro, percussão, teclas...) e pela situação da doação.',
            imagem: '../imagem/lamp.png'
        },
        {
            target: '.dc-grid .dc-card',
            espera: true,
            title: 'Cartão de doação',
            description: 'Cada cartão mostra a foto, o nome, a categoria e quem publicou. Clique em "Ver publicação" para ver os detalhes, fazer perguntas nos comentários e demonstrar interesse.',
            imagem: '../imagem/distraido.png'
        },
        {
            target: '[data-nav="minhas"]',
            espera: true,
            title: 'Minhas doações',
            description: 'Aqui você acompanha o que publicou, vê quem tem interesse e escolhe para quem doar. O telefone só é liberado depois que você autorizar.',
            imagem: '../imagem/explicacao.png'
        },
        {
            target: '#dcSino',
            espera: true,
            title: 'Notificações',
            description: 'O sininho avisa quando alguém comenta ou demonstra interesse, e quando sua solicitação é aceita.',
            imagem: '../imagem/feliz.png'
        }
    ],

    // ---------------------------------------------
    // NOTINHA RUNNER
    // ---------------------------------------------
    runner: [
        {
            target: '#nwr-palco',
            espera: true,
            title: 'Notinha Runner',
            description: 'Um jogo de corrida musical! O Notinha corre e você responde perguntas sobre música para ganhar pontos, estrelas e NotaCoins.',
            imagem: '../imagem/oi.png'
        },
        {
            target: '#btn-jogar',
            espera: true,
            title: 'Começar a jogar',
            description: 'Clique em Jogar para iniciar uma partida. Use a barra de espaço, a seta para cima ou toque na tela para pular e pegar as respostas certas.',
            imagem: '../imagem/mao.png'
        },
        {
            target: '#btn-instrucoes',
            espera: true,
            title: 'Como jogar',
            description: 'Ficou com dúvida nos controles ou nas regras? As instruções explicam tudo.',
            imagem: '../imagem/explicacao.png'
        },
        {
            target: '#btn-som',
            espera: true,
            title: 'Som',
            description: 'Ligue ou desligue o som do jogo quando quiser.',
            imagem: '../imagem/lamp.png'
        },
        {
            target: '#nwr-saldo',
            espera: true,
            title: 'Suas NotaCoins',
            description: 'Este é o seu saldo de NotaCoins. Você ganha moedas jogando e completando desafios, e gasta na loja.',
            imagem: '../imagem/feliz.png'
        },
        {
            target: '.nwr-aba',
            todos: true,
            espera: true,
            title: 'Abas do jogo',
            description: 'Use as abas para alternar entre jogar, a loja e os desafios diários.',
            imagem: '../imagem/mao.png'
        },
        {
            target: '.nwr-aba[data-aba="loja"]',
            espera: true,
            title: 'Loja',
            description: 'Gaste suas NotaCoins em acessórios, efeitos e cenários para deixar o Notinha com o seu estilo.',
            imagem: '../imagem/feliz.png'
        },
        {
            target: '.nwr-aba[data-aba="desafios"], .nwr-aba[data-aba="desafio"]',
            espera: true,
            title: 'Desafios diários',
            description: 'Todo dia há 3 desafios novos (fácil, médio e difícil), cada um com uma mini-aula. Conclua para resgatar recompensas, aumentar sua sequência de estudos e avançar no progresso geral.',
            imagem: '../imagem/explicacao.png'
        }
    ],

    // ---------------------------------------------
    // MEDALHAS
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
    // CONFIGURAÇÕES
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
const ordemTour = ['perfil', 'trilha', 'caderno', 'journal', 'doacoes', 'runner', 'medalhas', 'configuracoes'];

const paginasTour = {
    perfil:        { arquivo: 'perfil.html',          nome: 'Perfil' },
    trilha:        { arquivo: 'trilha_de_aulas.html', nome: 'Trilha de Aulas' },
    caderno:       { arquivo: 'caderno.html',         nome: 'Caderno' },
    journal:       { arquivo: 'journal.html',         nome: 'Jornal' },
    doacoes:       { arquivo: 'doacao.html',          nome: 'Doações' },
    runner:        { arquivo: 'notinha-runner.html',  nome: 'Notinha Runner' },
    medalhas:      { arquivo: 'medalhas.html',        nome: 'Medalhas' },
    configuracoes: { arquivo: 'configuracoes.html',   nome: 'Configurações' }
};

// Nome do arquivo (sem .html) -> chave em tourRoutes
const tourPaginas = {
    perfil: 'perfil',
    trilha_de_aulas: 'trilha',
    caderno: 'caderno',
    journal: 'journal',
    doacao: 'doacoes',
    'notinha-runner': 'runner',
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
        // Botão "Refazer Tour Guiado" (Configurações)
        const btnRestart = document.getElementById('btn-restart-tour');
        if (btnRestart) {
            btnRestart.addEventListener('click', () => comecarTourCompleto(pageKey));
        }

        // Continuação de um tour que JÁ foi iniciado (primeiro acesso ou "Refazer").
        // A marca é consumida na hora, então recarregar a página não repete o tour.
        const ativo = sessionStorage.getItem(CHAVE_TOUR_ATIVO);
        if (ativo === pageKey) {
            sessionStorage.removeItem(CHAVE_TOUR_ATIVO);
            setTimeout(() => aguardarPagina(pageKey, () => iniciarPassosDoTour(pageKey, true)), 500);
            return;
        }

        // Marca velha que não pertence a esta página: descarta
        if (ativo) sessionStorage.removeItem(CHAVE_TOUR_ATIVO);

        // Primeiro acesso do usuário. O convite aparece uma única vez.
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
// FUNDO DESFOCADO (só o elemento explicado fica nítido)
//
// Uma camada fixa com desfoque cobre a tela inteira, com um
// "buraco" recortado em volta do elemento destacado. Outra
// camada transparente, por baixo do balão, impede cliques
// no resto da página enquanto o tour está aberto.
// =====================================================

const VEU_FOLGA = 10; // respiro em volta do elemento, em px

let veuEl = null;
let travaEl = null;
let veuAlvos = [];
let veuUltimo = '';
let veuRaf = 0;

function injetarEstiloDoVeu() {
    if (document.getElementById('nw-tour-veu-estilo')) return;

    const estilo = document.createElement('style');
    estilo.id = 'nw-tour-veu-estilo';
    estilo.textContent = `
        .nw-tour-veu {
            position: fixed;
            inset: 0;
            z-index: 9998;
            pointer-events: none;
            background: rgba(7, 55, 99, 0.28);
            -webkit-backdrop-filter: blur(6px);
            backdrop-filter: blur(6px);
            animation: nwVeuEntra 0.3s ease-out both;
        }
        .nw-tour-trava {
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: transparent;
        }
        @keyframes nwVeuEntra {
            from { opacity: 0; }
            to   { opacity: 1; }
        }
        @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
            .nw-tour-veu { background: rgba(7, 55, 99, 0.6); }
        }
        @media (prefers-reduced-motion: reduce) {
            .nw-tour-veu { animation: none; }
        }
    `;
    document.head.appendChild(estilo);
}

function mostrarVeu() {
    if (veuEl) return;
    injetarEstiloDoVeu();

    veuEl = document.createElement('div');
    veuEl.className = 'nw-tour-veu';
    veuEl.setAttribute('aria-hidden', 'true');

    travaEl = document.createElement('div');
    travaEl.className = 'nw-tour-trava';
    travaEl.setAttribute('aria-hidden', 'true');

    document.body.appendChild(veuEl);
    document.body.appendChild(travaEl);

    veuUltimo = '';
    acompanharVeu();
}

function definirAlvosDoVeu(alvos) {
    veuAlvos = alvos || [];
    veuUltimo = '';
}

function removerVeu() {
    cancelAnimationFrame(veuRaf);
    if (veuEl) veuEl.remove();
    if (travaEl) travaEl.remove();
    veuEl = null;
    travaEl = null;
    veuAlvos = [];
    veuUltimo = '';
}

// Redesenha o buraco a cada quadro, para acompanhar o scroll suave
function acompanharVeu() {
    if (!veuEl) return;
    desenharVeu();
    veuRaf = requestAnimationFrame(acompanharVeu);
}

function desenharVeu() {
    const L = document.documentElement.clientWidth;
    const A = document.documentElement.clientHeight;
    const n = (v) => Math.round(v * 10) / 10;

    let d = `M0 0H${L}V${A}H0Z`;

    veuAlvos.forEach(el => {
        if (!el || !el.isConnected) return;

        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return;
        if (r.bottom < 0 || r.top > A || r.right < 0 || r.left > L) return;

        const x = n(r.left - VEU_FOLGA);
        const y = n(r.top - VEU_FOLGA);
        const w = n(r.width + VEU_FOLGA * 2);
        const h = n(r.height + VEU_FOLGA * 2);
        const k = n(Math.min(18, w / 2, h / 2));

        d += `M${n(x + k)} ${y}H${n(x + w - k)}A${k} ${k} 0 0 1 ${n(x + w)} ${n(y + k)}`
           + `V${n(y + h - k)}A${k} ${k} 0 0 1 ${n(x + w - k)} ${n(y + h)}`
           + `H${n(x + k)}A${k} ${k} 0 0 1 ${x} ${n(y + h - k)}`
           + `V${n(y + k)}A${k} ${k} 0 0 1 ${n(x + k)} ${y}Z`;
    });

    if (d === veuUltimo) return;
    veuUltimo = d;

    const valor = `path(evenodd, "${d}")`;
    veuEl.style.clipPath = valor;
    veuEl.style.webkitClipPath = valor;
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

// Imagem do passo não existe -> tenta o mascote -> se falhar, remove
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
                    <p>Quer fazer um tour pela plataforma? Vou te mostrar o Perfil, a Trilha de Aulas, o Caderno, o Jornal, as Doações, o Notinha Runner, as Medalhas e as Configurações.</p>
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

// Elemento realmente visível na tela (tem tamanho)
function elementoVisivel(el) {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
}

// Devolve os elementos a destacar neste passo
function acharAlvos(step) {
    if (step.alvosFn) {
        const lista = step.alvosFn();
        if (lista && lista.length) return lista;
    }

    // Passos com "espera: true" só valem se o elemento estiver visível
    // (conteúdo vindo da API ou dentro de uma aba que ainda abre).
    const buscar = (seletor) => {
        const l = Array.from(document.querySelectorAll(seletor));
        return step.espera ? l.filter(elementoVisivel) : l;
    };

    if (step.todos) {
        const lista = buscar(step.target);
        if (lista.length) return lista;
    } else {
        const um = buscar(step.target)[0];
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

// Espera a página montar seus elementos antes de começar o tour.
// Se a página tem passos com "espera", aguarda pelo menos um deles aparecer
// (até 4 s); depois segue e os que não vieram são pulados.
function aguardarPagina(pageKey, depois) {
    const todos = tourRoutes[pageKey] || [];
    const limite = Date.now() + 4000;
    const comEspera = todos.filter(s => s.espera);

    (function tentar() {
        const algum = todos.some(s => !s.semprefalar && !s.espera && acharAlvos(s).length);
        const esperaOk = !comEspera.length || comEspera.some(s => acharAlvos(s).length);
        if ((algum && esperaOk) || Date.now() > limite) {
            setTimeout(depois, 300); // folga para o resto terminar de montar
            return;
        }
        setTimeout(tentar, 200);
    })();
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
        removerVeu();
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
            removerVeu();

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

        // Desfoca o resto da tela; só os elementos do passo ficam nítidos
        mostrarVeu();
        definirAlvosDoVeu(alvos);

        // Se não achar o elemento, o balão ainda fala (a tela inteira fica desfocada)
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

    // Continuação do tour (primeiro acesso ou "Refazer o Tour")
    if (tourAtivoSessao === chave) {
        sessionStorage.removeItem(CHAVE_TOUR_ATIVO); // não repete em um F5
        setTimeout(() => aguardarPagina(chave, () => iniciarPassosDoTour(chave, true)), 500);
        return;
    }

    // Primeiro acesso absoluto do usuário na plataforma.
    // O convite só aparece no Perfil; só marcamos "pendente" lá, para que
    // abrir outra página (como o Caderno) antes não faça o convite sumir.
    if (!tourEscolhido && chave === 'perfil') {
        localStorage.setItem('notewave_tour_choice', 'pendente_modal');
        exibirBannerBoasVindas(chave);
    }
})();