// =======================================================
// LÓGICA DO PAINEL INTERATIVO DE NOTAS E NAVEGAÇÃO
// =======================================================
(function iniciarPautaInterativa() {
    const botoesNotas = document.querySelectorAll('.nota-selector');
    const elementoNotaMiniatura = document.getElementById('miniNoteElement');

    if (!elementoNotaMiniatura || botoesNotas.length === 0) {
        return;
    }

    botoesNotas.forEach(botao => {
        botao.addEventListener('click', function() {
            botoesNotas.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            const novaPosicao = this.getAttribute('data-pos');
            elementoNotaMiniatura.className = "note";
            
            if (novaPosicao) {
                elementoNotaMiniatura.classList.add(novaPosicao);
            }
        });
    });
})();

// =======================================================
// LÓGICA DE CARREGAMENTO PARA AS LIÇÕES
// =======================================================
const botaoOriginal = document.getElementById("btnIrParaLicoes");

if (botaoOriginal) {
    const btnIrParaLicoes = botaoOriginal.cloneNode(true);
    botaoOriginal.parentNode.replaceChild(btnIrParaLicoes, botaoOriginal);

    btnIrParaLicoes.addEventListener("click", function(evento) {
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
                if (progresso === 25) textoLoader.innerText = "Preparando o pentagrama...";
                if (progresso === 50) textoLoader.innerText = "Ajustando a clave na 2ª linha...";
                if (progresso === 75) textoLoader.innerText = "Quase pronto para começar...";
            }

            if (progresso >= 100) {
                clearInterval(intervaloLoading);
                if (textoLoader) {
                    textoLoader.innerText = "Navegando para as lições...";
                }
                setTimeout(() => window.location.href = "./atividades_sol.html", 400);
            }
        }, 25);
    });
}