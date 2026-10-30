// =======================================================
// 1. LÓGICA DA PAUTA INTERATIVA (TROCA DE NOTAS)
// =======================================================
(function iniciarPautaInterativa() {
    const botoesNotas = document.querySelectorAll('.nota-selector');
    const elementoNotaMiniatura = document.getElementById('miniNoteElement');

    // Previne erros caso o script tente rodar antes do HTML terminar de renderizar
    if (!elementoNotaMiniatura || botoesNotas.length === 0) {
        setTimeout(iniciarPautaInterativa, 50);
        return;
    }

    botoesNotas.forEach(botao => {
        botao.addEventListener('click', function() {
            // Remove o destaque visual ativo de todos os botões
            botoesNotas.forEach(btn => btn.classList.remove('active'));
            
            // Aplica o destaque azul apenas no botão que foi clicado
            this.classList.add('active');
            
            // Reseta a classe da nota para o valor base limpo
            elementoNotaMiniatura.className = "note";
            
            // Captura a coordenada armazenada no atributo data-pos e injeta na nota
            const novaPosicao = this.getAttribute('data-pos');
            elementoNotaMiniatura.classList.add(novaPosicao);
        });
    });
})();

// =======================================================
// 2. LÓGICA DE CARREGAMENTO MANUAL FORÇADO (3 SEGUNDOS)
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
            telaLoader.style.display = "flex";
        }

        if (preenchimentoBarra) {
            preenchimentoBarra.style.width = "0%";
        }

        let progresso = 0;

        const intervaloLoading = setInterval(() => {
            progresso += 1;
            
            if (preenchimentoBarra) {
                preenchimentoBarra.style.width = progresso + "%";
            }

            if (textoLoader) {
                if (progresso === 25) textoLoader.innerText = "Desenhando o pentagrama...";
                if (progresso === 50) textoLoader.innerText = "Posicionando a clave na 4ª linha...";
                if (progresso === 75) textoLoader.innerText = "Carregando faixas de áudio...";
            }

            if (progresso >= 100) {
                clearInterval(intervaloLoading);
                
                if (textoLoader) {
                    textoLoader.innerText = "Pronto! Entrando nas lições...";
                }

                setTimeout(() => window.location.href = "./atividades-nota.html", 500);
            }
        }, 30);
    });
}


// // Dentro do seu arquivo ../js/atividade-texto.js
// if (btnIrParaLicoes) {
//     btnIrParaLicoes.addEventListener("click", () => {
//         // Aponta para o arquivo que você salvou no Passo 1
//         window.location.href = "atividades-nota.html"; 
//     });
// }
