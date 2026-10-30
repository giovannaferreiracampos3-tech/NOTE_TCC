// =======================================================
// LÓGICA DO PAINEL INTERATIVO DE NOTAS (CLAVE DE FÁ)
// =======================================================
(function iniciarPautaInterativa() {
    const botoesNotas = document.querySelectorAll('.nota-selector');
    const nota = document.getElementById('nwNote');
    const ledger = document.getElementById('nwLedger');

    if (!nota || !ledger || botoesNotas.length === 0) return;

    const Y_BASE = 91;       // centro da 1ª linha (Sol na Clave de Fá)
    const MEIO_PASSO = 7.5;  // metade da distância entre duas linhas (15)

    const CORES = {
        'Dó': '#e63946', // vermelho
        'Ré': '#f4802a', // laranja
        'Mi': '#c99700', // dourado
        'Fá': '#2e9e5b', // verde
        'Sol': '#1d7fd6', // azul
        'Lá': '#7c4dcc', // roxo
        'Si': '#d6336c'  // rosa
    };
    const COR_PADRAO = '#075784';

    function corDoBotao(botao) {
        const nome = botao.textContent.trim().split(' ')[0];
        return CORES[nome] || COR_PADRAO;
    }

    function limparBotao(botao) {
        botao.style.removeProperty('background');
        botao.style.removeProperty('border-color');
        botao.style.removeProperty('color');
    }

    function pintarBotao(botao, cor) {
        botao.style.setProperty('background', cor, 'important');
        botao.style.setProperty('border-color', cor, 'important');
        botao.style.setProperty('color', '#ffffff', 'important');
    }

    // step 0 = Sol (1ª linha); cada +1 sobe uma posição (linha -> espaço -> linha)
    function mostrarNota(step, cor) {
        const y = Y_BASE - step * MEIO_PASSO;
        nota.style.transform = 'translateY(' + y + 'px)';

        const cabeca = nota.querySelector('ellipse');
        if (cabeca) cabeca.setAttribute('fill', cor);

        if (step <= -2) {            // Ré e Mi: linha suplementar abaixo
            ledger.setAttribute('y1', Y_BASE + 15);
            ledger.setAttribute('y2', Y_BASE + 15);
            ledger.style.display = '';
        } else if (step >= 10) {     // Dó central: linha suplementar acima
            ledger.setAttribute('y1', Y_BASE - 75);
            ledger.setAttribute('y2', Y_BASE - 75);
            ledger.style.display = '';
        } else {
            ledger.style.display = 'none';
        }
    }

    function selecionar(botao) {
        botoesNotas.forEach(btn => {
            btn.classList.remove('active');
            limparBotao(btn);
        });
        const cor = corDoBotao(botao);
        botao.classList.add('active');
        pintarBotao(botao, cor);
        mostrarNota(parseInt(botao.dataset.step, 10), cor);
    }

    botoesNotas.forEach(botao => {
        botao.addEventListener('click', function () {
            selecionar(this);
        });
    });

    selecionar(document.querySelector('.nota-selector.active') || botoesNotas[0]);
})();

// =======================================================
// LÓGICA DE CARREGAMENTO PARA AS LIÇÕES
// =======================================================
const botaoOriginal = document.getElementById("btnIrParaLicoes");

if (botaoOriginal) {
    const btnIrParaLicoes = botaoOriginal.cloneNode(true);
    botaoOriginal.parentNode.replaceChild(btnIrParaLicoes, botaoOriginal);

    btnIrParaLicoes.addEventListener("click", function (evento) {
        evento.preventDefault();
        evento.stopPropagation();

        const telaLoader = document.getElementById("waveLoaderScreen");
        const preenchimentoBarra = document.getElementById("waveBarFill");
        const textoLoader = document.getElementById("loaderHeadline");

        if (telaLoader) {
            telaLoader.style.setProperty("display", "flex", "important");
        }

        if (preenchimentoBarra) {
            preenchimentoBarra.style.width = "0%";
        }

        let progresso = 0;

        const intervaloLoading = setInterval(() => {
            progresso += 2;

            if (preenchimentoBarra) {
                preenchimentoBarra.style.width = progresso + "%";
            }

            if (textoLoader) {
                if (progresso >= 75) textoLoader.innerText = "Quase pronto para começar...";
                else if (progresso >= 50) textoLoader.innerText = "Ajustando a clave na 4ª linha...";
                else if (progresso >= 25) textoLoader.innerText = "Preparando o pentagrama...";
            }

            if (progresso >= 100) {
                clearInterval(intervaloLoading);
                if (textoLoader) {
                    textoLoader.innerText = "Navegando para as lições...";
                }
                setTimeout(() => window.location.href = "./atividades-nota.html", 400);
                localStorage.setItem("status_leitura_fá_concluida", "true");
            }
        }, 25);
    });
}