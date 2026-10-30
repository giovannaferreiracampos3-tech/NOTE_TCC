/* =====================================================
   NOTEWAVE — CLAVE DE FÁ
   PARTE 1: LIÇÕES, ÁUDIO, RESPOSTAS E PROGRESSO
   ===================================================== */

// 1. CAPTURAR O ID DA URL COM SEGURANÇA
const urlParams = new URLSearchParams(window.location.search);
const licaoId = parseInt(urlParams.get('id'), 10) || 1;

// Verifica se os dados das lições de Fá foram carregados.
if (typeof licoesDeNotasFa === "undefined") {
    throw new Error(
        "Os dados de licoesDeNotasFa não foram carregados antes deste script."
    );
}
 
// 2. EXTRAIR OS DADOS DA LIÇÃO CORRESPONDENTE (CLAVE DE FÁ)
const licaoAtual = licoesDeNotasFa.find(licao => licao.id === licaoId);
 
// Variáveis de estado globais e persistentemente salvas no LocalStorage (Atualizado para Fá)
let correctCount = parseInt(localStorage.getItem('musical_fa_correctCount'), 10) || 0;
let wrongCount = parseInt(localStorage.getItem('musical_fa_wrongCount'), 10) || 0;

let answered = false;
let acertouDePrimeira = true;
let tentativasErradasNestaLicao = 0;
 
// 3. EXECUÇÃO INICIAL
if (licaoAtual) {
    carregarEstruturaDinamica();
    atualizarProgressoGeral();
} else {
    document.body.innerHTML = "<h1 style='text-align:center; margin-top:50px; font-family:sans-serif;'>⚠️ Lição não encontrada!</h1>";
}
 
function carregarEstruturaDinamica() {
    document.getElementById("lessonNumber").innerText = `Lição ${licaoAtual.id}`;
    document.getElementById("lessonTitle").innerText = licaoAtual.titulo;
    document.getElementById("helpText").innerText = licaoAtual.dica;
 
    const audioTrack = document.getElementById("audioTrack");
    audioTrack.src = licaoAtual.audioSrc;
 
    const noteElement = document.getElementById("noteElement");
    noteElement.className = "note " + licaoAtual.classePosicao;
 
    document.getElementById('correctCount').innerText = correctCount;
    document.getElementById('wrongCount').innerText = wrongCount;
 
    const btnHelp = document.getElementById("btnHelp");
    const helpBox = document.getElementById("helpBox");
 
    btnHelp.onclick = () => {
        helpBox.style.display = helpBox.style.display === "none" ? "block" : "none";
    };
 
    const playBtn = document.getElementById("playBtn");
    const audioTime = document.getElementById("audioTime");
 
    playBtn.onclick = async () => {
        if (audioTrack.paused) {
            try {
                await audioTrack.play();
                playBtn.innerHTML = "<span class='play-icon'>⏸</span>";
            } catch (erro) {
                console.error("Não foi possível reproduzir o áudio:", erro);
            }
        } else {
            audioTrack.pause();
            playBtn.innerHTML = "<span class='play-icon'>▶</span>";
        }
    };
 
    audioTrack.onloadedmetadata = () => {
        const total = formatarTempo(audioTrack.duration);
        audioTime.innerText = `0:00 / ${total}`;
    };
 
    audioTrack.ontimeupdate = () => {
        if (Number.isFinite(audioTrack.duration)) {
            const atual = formatarTempo(audioTrack.currentTime);
            const total = formatarTempo(audioTrack.duration);
            audioTime.innerText = `${atual} / ${total}`;
        }
    };
 
    audioTrack.onended = () => {
        playBtn.innerHTML = "<span class='play-icon'>▶</span>";
    };
 
    const botoesDoHtml = document.querySelectorAll(".option-btn");
    botoesDoHtml.forEach((botao, index) => {
        const opcao = licaoAtual.opcoes[index];
        if (opcao !== undefined) {
            botao.innerText = opcao;
            botao.disabled = false;
            botao.onclick = () => computarEscolha(botao, opcao);
        } else {
            botao.disabled = true;
        }
    });
 
    document.getElementById("resetBtn").onclick = reiniciarTodoOProgresso;
}
 
// 4. LÓGICA DE VALIDAÇÃO
function computarEscolha(botaoClicado, respostaSelecionada) {
    if (answered) return;
 
    const feedbackPanel = document.getElementById("feedbackPanel");
    const feedbackIcon = feedbackPanel.querySelector(".feedback-icon");
    const feedbackTitle = document.getElementById("feedbackTitle");
    const feedbackMessage = document.getElementById("feedbackMessage");
    const actionBtn = document.getElementById("actionBtn");
    const todosOsBotoes = document.querySelectorAll(".option-btn");
 
    feedbackPanel.style.display = "flex";
 
    if (respostaSelecionada === licaoAtual.notaCorreta) {
        answered = true;
 
        const chaveConclusao = `status_fa_concluido_licao_${licaoId}`;

        if (acertouDePrimeira && !localStorage.getItem(chaveConclusao)) {
            correctCount++;
            localStorage.setItem('musical_fa_correctCount', correctCount);
            localStorage.setItem(chaveConclusao, 'true');
        }
 
        document.getElementById('correctCount').innerText = correctCount;
 
        botaoClicado.id = 'correct-choice';
        botaoClicado.style.backgroundColor = "#2ecc71";
        botaoClicado.style.color = "#ffffff";
        botaoClicado.style.opacity = "1";
 
        todosOsBotoes.forEach(btn => {
            if (btn !== botaoClicado) {
                btn.disabled = true;
                btn.style.opacity = "0.5";
                btn.style.cursor = "not-allowed";
            }
        });
 
        feedbackPanel.className = "feedback-panel success";
        feedbackIcon.innerText = "✓";
        feedbackTitle.innerText = "Parabéns, você acertou! 🎉";
 
        if (acertouDePrimeira) {
            feedbackMessage.innerText = `Excelente! Você acertou de primeira a nota ${licaoAtual.notaCorreta}! Seu progresso subiu.`;
        } else {
            feedbackMessage.innerText = `Você encontrou a nota ${licaoAtual.notaCorreta}. Como errou antes, seu progresso geral não subiu nesta lição.`;
        }
 
        actionBtn.innerText = "Próxima Lição";
 
        actionBtn.onclick = () => {
            const proximoId = licaoId + 1;
            const proximaExiste = licoesDeNotasFa.some(l => l.id === proximoId);
 
            if (proximaExiste) {
                window.location.href = `atividades-nota.html?id=${proximoId}`;
            } else {
                feedbackPanel.style.display = "none";
                abrirConclusaoFinal();
            }
        };
 
        atualizarProgressoGeral();
 
    } else {
        acertouDePrimeira = false;
        tentativasErradasNestaLicao++;
        wrongCount++;
        localStorage.setItem('musical_fa_wrongCount', wrongCount);
        document.getElementById('wrongCount').innerText = wrongCount;
 
        botaoClicado.disabled = true;
        botaoClicado.style.backgroundColor = "#e74c3c";
        botaoClicado.style.color = "#ffffff";
        botaoClicado.style.opacity = "0.7";
        botaoClicado.style.cursor = "not-allowed";
 
        feedbackPanel.className = "feedback-panel danger";
        feedbackIcon.innerText = "❌";
        feedbackTitle.innerText = "Resposta incorreta! 🤔";
        feedbackMessage.innerText = "Essa não é a nota certa. Analise a pauta novamente e tente outra alternativa!";
        actionBtn.innerText = "Tentar novamente";
 
        actionBtn.onclick = () => {
            feedbackPanel.style.display = "none";
        };
    }
}
 
// 5. CÁLCULO DINÂMICO DE PROGRESSO
function atualizarProgressoGeral() {
    const totalDeQuestoesDoCurso = licoesDeNotasFa.length;
    let questoesConcluidas = 0;
 
    licoesDeNotasFa.forEach(licao => {
        if (localStorage.getItem(`status_fa_concluido_licao_${licao.id}`)) {
            questoesConcluidas++;
        }
    });
 
    const progressoCalculado = totalDeQuestoesDoCurso > 0 
        ? Math.round((questoesConcluidas / totalDeQuestoesDoCurso) * 100) 
        : 0;

    document.getElementById('percentageValue').innerText = `${progressoCalculado}%`;
    document.getElementById('progressRing').style.setProperty('--percent', progressoCalculado);
}
 
function abrirConclusaoFinal() {
    const telaFinal = document.getElementById("finalOcean");

    if (!telaFinal) {
        alert("Parabéns! Você concluiu a trilha de Clave de Fá!");
        return;
    }

    const totalTentativas = tentativasErradasNestaLicao + 1;
    const porcentagem = Math.round((1 / totalTentativas) * 100);

    let estrelas = 0;
    if (porcentagem >= 80) {
        estrelas = 3;
    } else if (porcentagem >= 50) {
        estrelas = 2;
    } else if (porcentagem >= 25) {
        estrelas = 1;
    }

    const porcentagemEl = document.getElementById("finalPercentage");
    const mensagemEl = document.getElementById("starResultMessage");
    const tituloEl = document.getElementById("oceanResultTitle");
    const mensagemPrincipal = document.getElementById("oceanResultMessage");
    const retryBtn = document.getElementById("retryLessonBtn");
    const skipBtn = document.getElementById("skipLessonBtn");
    const medalBtn = document.getElementById("receiveMedalBtn");
    const skipConfirmation = document.getElementById("skipConfirmation");
    const medalReveal = document.getElementById("medalReveal");
    const resultStars = document.getElementById("resultStars");

    porcentagemEl.textContent = `${porcentagem}%`;

    // Desenha as estrelas no painel (com o padrão bonito igual ao de Sol)
    resultStars.innerHTML = "";
    for (let i = 0; i < 3; i++) {
        const preenchida = i < estrelas ? "is-earned" : "";
        resultStars.innerHTML += `<span class="result-star ${preenchida}">⭐</span>`;
    }

    // Oculta todos os botões e confirmações inicialmente
    if (retryBtn) retryBtn.hidden = true;
    if (skipBtn) skipBtn.hidden = true;
    if (medalBtn) medalBtn.hidden = true;
    if (skipConfirmation) skipConfirmation.hidden = true;
    if (medalReveal) medalReveal.hidden = true;

    // Lógica de exibição baseada nas estrelas conquistadas
    if (estrelas === 3) {
        // Apenas 3 estrelas: mostra a mensagem de sucesso e o botão de receber medalha
        tituloEl.textContent = "Você arrasou nas ondas!";
        mensagemPrincipal.textContent = "Seu desempenho foi incrível. Você conquistou as três estrelas!";
        mensagemEl.textContent = "Sua medalha está esperando por você. Celebre essa conquista!";
        
        if (medalBtn) medalBtn.hidden = false;
    } else if (estrelas === 2) {
        // 2 estrelas: mostra refazer e pular, mas SEM o botão de medalha
        tituloEl.textContent = "Duas estrelas na areia!";
        mensagemPrincipal.textContent = "Você está chegando lá! Mais um pouco de prática pode render sua medalha.";
        mensagemEl.textContent = "Você conquistou duas estrelas. Quer tentar melhorar seu resultado ou pular?";
        
        if (retryBtn) retryBtn.hidden = false;
        if (skipBtn) skipBtn.hidden = false;
    } else {
        // 0 ou 1 estrela: mostra apenas refazer
        tituloEl.textContent = "Vamos tentar de novo!";
        mensagemPrincipal.textContent = "Toda jornada musical tem suas ondas. Você pode tentar novamente!";
        mensagemEl.textContent = "Continue praticando! Cada tentativa faz parte da aprendizagem.";
        
        if (retryBtn) retryBtn.hidden = false;
    }

    telaFinal.classList.remove("is-active", "is-closing");
    void telaFinal.offsetWidth;
    telaFinal.setAttribute("aria-hidden", "false");
    telaFinal.classList.add("is-active");

    document.getElementById("feedbackPanel").style.display = "none";
}

// =====================================================
// NOTEWAVE — RECOMPENSA MARINHA (BOTÕES E FLUXO)
// =====================================================

document.getElementById("retryLessonBtn")?.addEventListener("click", () => {
    window.location.href = `atividades-nota.html?id=1{licaoId}`;
});

document.getElementById("skipLessonBtn")?.addEventListener("click", () => {
    document.getElementById("skipConfirmation").hidden = false;
});

document.getElementById("cancelSkipBtn")?.addEventListener("click", () => {
    document.getElementById("skipConfirmation").hidden = true;
});

document.getElementById("confirmSkipBtn")?.addEventListener("click", () => {
    window.location.href = "../html/trilha_de_aulas.html";
});

document.getElementById("receiveMedalBtn")?.addEventListener("click", () => {
    const finalOcean = document.getElementById("finalOcean");
    const containerEstrelas = document.getElementById("duoEstrelasAnimadas");
    const telaEstrelas = document.getElementById("telaEstrelas");

    if (!containerEstrelas || !telaEstrelas) return;

    if (finalOcean) {
        finalOcean.style.display = "none";
    }

    const totalTentativas = tentativasErradasNestaLicao + 1;
    const porcentagem = Math.round((1 / totalTentativas) * 100);
    let estrelasConquistadas = 0;

    if (porcentagem >= 80) {
        estrelasConquistadas = 3;
    } else if (porcentagem >= 50) {
        estrelasConquistadas = 2;
    } else if (porcentagem >= 25) {
        estrelasConquistadas = 1;
    }

    // Substitua a lógica de criação das estrelas no arquivo atividades-nota.js por esta:
containerEstrelas.innerHTML = "";

// Cria as 3 estrelas (a do meio [índice 1] fica maior, igualzinho à Clave de Sol)
for (let i = 0; i < 3; i++) {
    const estaPreenchida = i < estrelasConquistadas;

    const preenchimento = estaPreenchida
        ? `url(#gradienteDouradoFa${i})`
        : "url(#gradienteVazadoFa)";

    const contorno = estaPreenchida
        ? "#C78A13"
        : "rgba(190, 170, 125, 0.45)";

    const corDetalhes = estaPreenchida
        ? "#FFF0A6"
        : "rgba(255, 245, 215, 0.55)";

    const opacidade = estaPreenchida ? "1" : "0.45";
    const brilho = estaPreenchida ? "0.75" : "0.25";
    const brilhoDetalhes = estaPreenchida ? "0.65" : "0.2";

    const svgEstrelaDoMar = `
        <svg
            class="duo-estrela-anim"
            viewBox="0 0 500 500"
            xmlns="http://www.w3.org/2000/svg"
            style="opacity: ${opacidade}; overflow: visible;"
            role="img"
        >
            <defs>
                <linearGradient id="gradienteDouradoFa${i}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#FFF8B0"/>
                    <stop offset="22%" stop-color="#FFE66D"/>
                    <stop offset="48%" stop-color="#FFC629"/>
                    <stop offset="72%" stop-color="#F5A900"/>
                    <stop offset="100%" stop-color="#D88708"/>
                </linearGradient>

                <linearGradient id="gradienteVazadoFa" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#FFF7D5"/>
                    <stop offset="100%" stop-color="#D8C9A2"/>
                </linearGradient>

                <filter id="sombraEstrelaFa${i}" x="-25%" y="-25%" width="150%" height="160%">
                    <feDropShadow dx="0" dy="9" stdDeviation="7" flood-color="#80500A" flood-opacity="${estaPreenchida ? "0.30" : "0.10"}"/>
                </filter>

                <linearGradient id="brilhoEstrelaFa${i}" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.75"/>
                    <stop offset="55%" stop-color="#FFFFFF" stop-opacity="0.12"/>
                    <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
                </linearGradient>
            </defs>

            <!-- Sombra projetada -->
            <path
                d="M250 42 C276 125 315 150 405 168 C472 180 469 224 411 268 C353 309 340 342 360 421 C376 482 338 479 285 440 L250 414 L215 440 C162 479 124 482 140 421 C160 342 147 309 89 268 C31 224 28 180 95 168 C185 150 224 125 250 42 Z"
                fill="#80500A"
                opacity="${estaPreenchida ? "0.16" : "0.05"}"
                transform="translate(0 8)"
            />

            <!-- Corpo da estrela-do-mar idêntico ao de Sol -->
            <path
                d="M250 30 C278 115 316 143 405 162 C473 176 465 220 408 263 C351 305 337 339 359 420 C375 479 338 473 285 435 L250 410 L215 435 C162 473 125 479 141 420 C163 339 149 305 92 263 C35 220 27 176 95 162 C184 143 222 115 250 30 Z"
                fill="${preenchimento}"
                stroke="${contorno}"
                stroke-width="12"
                stroke-linejoin="round"
                filter="url(#sombraEstrelaFa${i})"
            />

            <!-- Camada de brilho -->
            <path
                d="M250 48 C274 123 312 151 397 169 C445 180 444 207 402 241 C350 282 328 321 349 399 C356 426 343 441 315 421 L250 380 L185 421 C157 441 144 426 151 399 C172 321 150 282 98 241 C56 207 55 180 103 169 C188 151 226 123 250 48 Z"
                fill="url(#brilhoEstrelaFa${i})"
                pointer-events="none"
            />

            <!-- Textura em relevo e pontinhos de luz iguaizinhos aos da Clave de Sol -->
            <g fill="${corDetalhes}">
                <circle cx="250" cy="112" r="15" opacity="0.95"/>
                <circle cx="250" cy="112" r="7" fill="#FFFFFF" opacity="${brilho}"/>

                <circle cx="365" cy="205" r="14" opacity="0.9"/>
                <circle cx="365" cy="205" r="6" fill="#FFFFFF" opacity="${brilhoDetalhes}"/>

                <circle cx="322" cy="355" r="15" opacity="0.95"/>
                <circle cx="322" cy="355" r="6" fill="#FFFFFF" opacity="${brilhoDetalhes}"/>

                <circle cx="178" cy="355" r="15" opacity="0.95"/>
                <circle cx="178" cy="355" r="6" fill="#FFFFFF" opacity="${brilhoDetalhes}"/>

                <circle cx="135" cy="205" r="14" opacity="0.9"/>
                <circle cx="135" cy="205" r="6" fill="#FFFFFF" opacity="${brilhoDetalhes}"/>

                <circle cx="250" cy="285" r="8" opacity="0.75"/>
                <circle cx="218" cy="235" r="6" opacity="0.8"/>
                <circle cx="282" cy="235" r="6" opacity="0.8"/>
            </g>
        </svg>
    `;
    containerEstrelas.insertAdjacentHTML("beforeend", svgEstrelaDoMar);
}

    telaEstrelas.style.display = "flex";
});

document.getElementById("btnProximoEstrelas")?.addEventListener("click", () => {
    const telaEstrelas = document.getElementById("telaEstrelas");
    const telaMedalha = document.getElementById("telaMedalha");

    if (!telaEstrelas || !telaMedalha) return;

    const onda = document.createElement("div");
    onda.className = "onda-transicao";
    document.body.appendChild(onda);

    requestAnimationFrame(() => {
        onda.classList.add("animar");
    });

    setTimeout(() => {
        telaEstrelas.style.display = "none";
        telaMedalha.style.display = "flex";
    }, 800);

    setTimeout(() => {
        onda.remove();
    }, 1700);
});

// =====================================================
// BOTÃO FINAL — SALVAR E ABRIR MEDALHAS COM DESTAQUE
// =====================================================

document.getElementById("btnIrParaMedalhas")?.addEventListener("click", () => {
    // 1. Salva no navegador que a medalha da clave de fá foi liberada
    localStorage.setItem("medalha_clave_fa", "true");

    // 2. Redireciona para a página de medalhas enviando o parâmetro de destaque
    window.location.href = "../html/medalhas.html?recompensa=true&titulo=Clave%20de%20F%C3%A1&destaque=fa";
});

// 7. REINICIAR PROGRESSO SEGURO
function reiniciarTodoOProgresso() {
    if (confirm("Deseja realmente zerar todo o seu histórico e desempenho da Clave de Fá?")) {
        reiniciarTodoOProgressoSemConfirmar();
    }
}
 
function reiniciarTodoOProgressoSemConfirmar() {
    localStorage.removeItem('musical_fa_correctCount');
    localStorage.removeItem('musical_fa_wrongCount');
 
    licoesDeNotasFa.forEach(licao => {
        localStorage.removeItem(`status_fa_concluido_licao_${licao.id}`);
    });
 
    window.location.href = window.location.pathname + "?id=1";
}
 
// 8. FORMATADOR DE TEMPO
function formatarTempo(segundos) {
    if (isNaN(segundos)) return "0:00";
    const min = Math.floor(segundos / 60);
    const seg = Math.floor(segundos % 60);
    return `${min}:${seg < 10 ? '0' : ''}${seg}`;
}