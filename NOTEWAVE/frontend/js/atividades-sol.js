/* =====================================================
   NOTEWAVE — CLAVE DE SOL
   PARTE 1: LIÇÕES, ÁUDIO, RESPOSTAS E PROGRESSO
   ===================================================== */

// 1. CAPTURAR O ID DA URL
const urlParams = new URLSearchParams(window.location.search);
const licaoId = parseInt(urlParams.get("id"), 10) || 1;

// Verifica se os dados das lições foram carregados.
if (typeof licoesDeNotasSol === "undefined") {
    throw new Error(
        "Os dados de licoesDeNotasSol não foram carregados antes deste script."
    );
}

const licaoAtual = licoesDeNotasSol.find(
    licao => licao.id === licaoId
);

// 2. CONTADORES PERSISTENTES — CLAVE DE SOL
let correctCount =
    parseInt(localStorage.getItem("musical_sol_correctCount"), 10) || 0;

let wrongCount =
    parseInt(localStorage.getItem("musical_sol_wrongCount"), 10) || 0;

let answered = false;
let acertouDePrimeira = true;
let tentativasErradasNestaLicao = 0;

// 3. EXECUÇÃO INICIAL
if (licaoAtual) {
    carregarEstruturaDinamica();
    atualizarProgressoGeral();
} else {
    document.body.innerHTML = `
        <h1 style="
            text-align: center;
            margin-top: 50px;
            font-family: sans-serif;
        ">
            ⚠️ Lição não encontrada!
        </h1>
    `;
}

// =====================================================
// CARREGAR A ESTRUTURA DA LIÇÃO
// =====================================================

function carregarEstruturaDinamica() {
    document.getElementById("lessonNumber").innerText =
        `Lição ${licaoAtual.id}`;

    document.getElementById("lessonTitle").innerText =
        licaoAtual.titulo;

    document.getElementById("helpText").innerText =
        licaoAtual.dica;

    const audioTrack = document.getElementById("audioTrack");
    const noteElement = document.getElementById("noteElement");
    const btnHelp = document.getElementById("btnHelp");
    const helpBox = document.getElementById("helpBox");
    const playBtn = document.getElementById("playBtn");
    const audioTime = document.getElementById("audioTime");

    audioTrack.src = licaoAtual.audioSrc;
    noteElement.className = "note " + licaoAtual.classePosicao;

    document.getElementById("correctCount").innerText = correctCount;
    document.getElementById("wrongCount").innerText = wrongCount;

    // Botão de ajuda
    btnHelp.onclick = () => {
        helpBox.style.display =
            helpBox.style.display === "none" ? "block" : "none";
    };

    // Reprodução do áudio
    playBtn.onclick = async () => {
        if (audioTrack.paused) {
            try {
                await audioTrack.play();
                playBtn.innerHTML =
                    "<span class='play-icon'>⏸</span>";
            } catch (erro) {
                console.error("Não foi possível reproduzir o áudio:", erro);
            }
        } else {
            audioTrack.pause();
            playBtn.innerHTML =
                "<span class='play-icon'>▶</span>";
        }
    };

    // Duração total
    audioTrack.onloadedmetadata = () => {
        const total = formatarTempo(audioTrack.duration);
        audioTime.innerText = `0:00 / ${total}`;
    };

    // Atualização do tempo
    audioTrack.ontimeupdate = () => {
        if (Number.isFinite(audioTrack.duration)) {
            const atual = formatarTempo(audioTrack.currentTime);
            const total = formatarTempo(audioTrack.duration);

            audioTime.innerText = `${atual} / ${total}`;
        }
    };

    // Quando o áudio terminar
    audioTrack.onended = () => {
        playBtn.innerHTML =
            "<span class='play-icon'>▶</span>";
    };

    // Alternativas de resposta
    const botoesDoHtml = document.querySelectorAll(".option-btn");

    botoesDoHtml.forEach((botao, index) => {
        const opcao = licaoAtual.opcoes[index];

        if (opcao !== undefined) {
            botao.innerText = opcao;
            botao.disabled = false;

            botao.onclick = () => {
                computarEscolha(botao, opcao);
            };
        } else {
            botao.disabled = true;
        }
    });

    // Botão de reiniciar progresso
    document.getElementById("resetBtn").onclick =
        reiniciarTodoOProgresso;
}

// =====================================================
// VALIDAR RESPOSTAS
// =====================================================

function computarEscolha(botaoClicado, respostaSelecionada) {
    if (answered) return;

    const feedbackPanel = document.getElementById("feedbackPanel");
    const feedbackIcon =
        feedbackPanel.querySelector(".feedback-icon");

    const feedbackTitle =
        document.getElementById("feedbackTitle");

    const feedbackMessage =
        document.getElementById("feedbackMessage");

    const actionBtn = document.getElementById("actionBtn");
    const todosOsBotoes = document.querySelectorAll(".option-btn");

    feedbackPanel.style.display = "flex";

    // RESPOSTA CORRETA
    if (respostaSelecionada === licaoAtual.notaCorreta) {
        answered = true;

        const chaveConclusao =
            `status_sol_concluido_licao_${licaoId}`;

        // Só contabiliza o acerto se ainda não concluiu esta lição
        // e acertou na primeira tentativa desta sessão.
        if (
            acertouDePrimeira &&
            !localStorage.getItem(chaveConclusao)
        ) {
            correctCount++;

            localStorage.setItem(
                "musical_sol_correctCount",
                correctCount
            );

            localStorage.setItem(chaveConclusao, "true");
        }

        document.getElementById("correctCount").innerText =
            correctCount;

        botaoClicado.id = "correct-choice";
        botaoClicado.style.backgroundColor = "#2ecc71";
        botaoClicado.style.color = "#ffffff";
        botaoClicado.style.opacity = "1";

        // Desabilita as outras alternativas
        todosOsBotoes.forEach(botao => {
            if (botao !== botaoClicado) {
                botao.disabled = true;
                botao.style.opacity = "0.5";
                botao.style.cursor = "not-allowed";
            }
        });

        feedbackPanel.className = "feedback-panel success";
        feedbackIcon.innerText = "✓";
        feedbackTitle.innerText = "Parabéns, você acertou! 🎉";

        if (acertouDePrimeira) {
            feedbackMessage.innerText =
                `Excelente! Você acertou de primeira a nota ` +
                `${licaoAtual.notaCorreta}!`;
        } else {
            feedbackMessage.innerText =
                `Você encontrou a nota ${licaoAtual.notaCorreta}. ` +
                "Como precisou de mais tentativas, seu progresso " +
                "geral não subiu nesta lição.";
        }

        actionBtn.innerText = "Próxima Lição";

        actionBtn.onclick = () => {
            const proximoId = licaoId + 1;

            const proximaExiste = licoesDeNotasSol.some(
                licao => licao.id === proximoId
            );

            if (proximaExiste) {
                window.location.href =
                    `atividades_sol.html?id=${proximoId}`;
            } else {
                abrirConclusaoFinal();
            }
        };

        atualizarProgressoGeral();

    } else {
        // RESPOSTA INCORRETA
        acertouDePrimeira = false;
        tentativasErradasNestaLicao++;

        wrongCount++;

        localStorage.setItem(
            "musical_sol_wrongCount",
            wrongCount
        );

        document.getElementById("wrongCount").innerText =
            wrongCount;

        botaoClicado.disabled = true;
        botaoClicado.style.backgroundColor = "#e74c3c";
        botaoClicado.style.color = "#ffffff";
        botaoClicado.style.opacity = "0.7";
        botaoClicado.style.cursor = "not-allowed";

        feedbackPanel.className = "feedback-panel danger";
        feedbackIcon.innerText = "❌";
        feedbackTitle.innerText = "Resposta incorreta! 🤔";

        feedbackMessage.innerText =
            "Essa não é a nota certa. Analise a pauta novamente " +
            "e tente outra alternativa!";

        actionBtn.innerText = "Tentar novamente";

        actionBtn.onclick = () => {
            feedbackPanel.style.display = "none";
        };
    }
}

// =====================================================
// CALCULAR O PROGRESSO GERAL
// =====================================================

function atualizarProgressoGeral() {
    const totalDeQuestoesDoCurso = licoesDeNotasSol.length;

    let questoesConcluidas = 0;

    licoesDeNotasSol.forEach(licao => {
        const chave =
            `status_sol_concluido_licao_${licao.id}`;

        if (localStorage.getItem(chave)) {
            questoesConcluidas++;
        }
    });

    const progressoCalculado = totalDeQuestoesDoCurso > 0
        ? Math.round(
            (questoesConcluidas / totalDeQuestoesDoCurso) * 100
        )
        : 0;

    document.getElementById("percentageValue").innerText =
        `${progressoCalculado}%`;

    document.getElementById("progressRing").style.setProperty(
        "--percent",
        progressoCalculado
    );
}

// =====================================================
// REINICIAR O PROGRESSO
// =====================================================

function reiniciarTodoOProgresso() {
    const confirmou = confirm(
        "Deseja realmente zerar todo o seu histórico " +
        "e desempenho da Clave de Sol?"
    );

    if (!confirmou) return;

    localStorage.removeItem("musical_sol_correctCount");
    localStorage.removeItem("musical_sol_wrongCount");

    licoesDeNotasSol.forEach(licao => {
        localStorage.removeItem(
            `status_sol_concluido_licao_${licao.id}`
        );
    });

    correctCount = 0;
    wrongCount = 0;

    window.location.href = "atividades_sol.html?id=1";
}

// =====================================================
// FORMATAR O TEMPO DO ÁUDIO
// =====================================================

function formatarTempo(segundos) {
    if (!Number.isFinite(segundos)) {
        return "0:00";
    }

    const minutos = Math.floor(segundos / 60);
    const segundosRestantes = Math.floor(segundos % 60);

    return `${minutos}:${
        segundosRestantes < 10 ? "0" : ""
    }${segundosRestantes}`;
}

// =====================================================
// TELA FINAL — CONCLUSÃO DA TRILHA
// =====================================================

function abrirConclusaoFinal() {
    const telaFinal = document.getElementById("finalOcean");

    if (!telaFinal) {
        alert(
            "Parabéns! Você concluiu a trilha de Clave de Sol!"
        );
        return;
    }

const totalTentativas = tentativasErradasNestaLicao + 1;

    const porcentagem = Math.round(
        (1 / totalTentativas) * 100
    );

 let estrelas = 0;

    if (porcentagem >= 80) {
        estrelas = 3;
    } else if (porcentagem >= 50) {
        estrelas = 2;
    } else if (porcentagem >= 25) {
        estrelas = 1;
    }

    const porcentagemEl =
        document.getElementById("finalPercentage");

    const mensagemEl =
        document.getElementById("starResultMessage");

    const tituloEl =
        document.getElementById("oceanResultTitle");

    const mensagemPrincipal =
        document.getElementById("oceanResultMessage");

    const retryBtn =
        document.getElementById("retryLessonBtn");

    const skipBtn =
        document.getElementById("skipLessonBtn");

    const medalBtn =
        document.getElementById("receiveMedalBtn");

    const skipConfirmation =
        document.getElementById("skipConfirmation");

    const medalReveal =
        document.getElementById("medalReveal");

    const resultStars =
        document.getElementById("resultStars");

    porcentagemEl.textContent = `${porcentagem}%`;

    const estrelasDoPainel =
        resultStars.querySelectorAll(".result-star");

    estrelasDoPainel.forEach((estrela, index) => {
        estrela.classList.toggle(
            "is-earned",
            index < estrelas
        );

        estrela.style.setProperty("--star-index", index);
    });

    resultStars.setAttribute(
        "aria-label",
        `${estrelas} ${
            estrelas === 1
                ? "estrela conquistada"
                : "estrelas conquistadas"
        }`
    );

retryBtn.hidden = true;
skipBtn.hidden = true;
medalBtn.hidden = true;

    skipConfirmation.hidden = true;
    medalReveal.hidden = true;
    medalReveal.classList.remove("is-earned");

    if (porcentagem <= 24) {
        tituloEl.textContent = "Vamos tentar de novo!";

        mensagemPrincipal.textContent =
            "Toda jornada musical tem suas ondas. " +
            "Você pode tentar novamente!";

        mensagemEl.textContent =
            "Ainda não conquistou estrelas. Refaça a lição " +
            "e continue praticando.";

        retryBtn.hidden = false;

    } else if (porcentagem <= 49) {
        tituloEl.textContent =
            "Você encontrou uma estrela! ⭐";

        mensagemPrincipal.textContent =
            "Uma pequena conquista também faz parte da sua jornada!";

        mensagemEl.textContent =
            "Você conquistou uma estrela. Que tal tentar " +
            "de novo para ganhar mais?";

        retryBtn.hidden = false;

    } else if (porcentagem <= 79) {
        tituloEl.textContent =
            "Duas estrelas na areia! ⭐⭐";

        mensagemPrincipal.textContent =
            "Você está chegando lá! Mais um pouco de prática " +
            "pode render sua medalha.";

        mensagemEl.textContent =
            "Você conquistou duas estrelas. Quer tentar " +
            "melhorar seu resultado ou pular?";

        retryBtn.hidden = false;
        skipBtn.hidden = false;

    } else {
        tituloEl.textContent =
            "Você arrasou nas ondas!";

        mensagemPrincipal.textContent =
            "Seu desempenho foi incrível. Você conquistou " +
            "as três estrelas!";

        mensagemEl.textContent =
            "Sua medalha está esperando por você. " +
            "Celebre essa conquista!";

        medalBtn.hidden = false;
    }

    // Reinicia a animação de abertura da tela
    telaFinal.classList.remove("is-active", "is-closing");

    void telaFinal.offsetWidth;

    telaFinal.setAttribute("aria-hidden", "false");
    telaFinal.classList.add("is-active");

    document.getElementById("feedbackPanel").style.display =
        "none";
}

/* =====================================================
   NOTEWAVE — RECOMPENSA MARINHA
   PARTE 2: ESTRELAS, TRANSIÇÃO E MEDALHA
   ===================================================== */

// =====================================================
// BOTÃO REFAZER LIÇÃO
// =====================================================

document.getElementById("retryLessonBtn")?.addEventListener(
    "click",
    () => {
        window.location.href =
            `atividades_sol.html?id=${licaoId}`;
    }
);

// =====================================================
// BOTÃO PULAR E CONFIRMAÇÃO
// =====================================================

document.getElementById("skipLessonBtn")?.addEventListener(
    "click",
    () => {
        document.getElementById("skipConfirmation").hidden = false;
    }
);

document.getElementById("cancelSkipBtn")?.addEventListener(
    "click",
    () => {
        document.getElementById("skipConfirmation").hidden = true;
    }
);

document.getElementById("confirmSkipBtn")?.addEventListener(
    "click",
    () => {
        window.location.href = "../html/trilha_de_aulas.html";
    }
);

// =====================================================
// BOTÃO RECEBER MEDALHA
// =====================================================

document.getElementById("receiveMedalBtn")?.addEventListener(
    "click",
    () => {
        const finalOcean = document.getElementById("finalOcean");
        const containerEstrelas =
            document.getElementById("duoEstrelasAnimadas");

        const telaEstrelas =
            document.getElementById("telaEstrelas");

        if (!containerEstrelas || !telaEstrelas) {
            console.error(
                "Não foi possível encontrar os elementos da recompensa."
            );
            return;
        }

        // Esconde a tela de conclusão
        if (finalOcean) {
            finalOcean.style.display = "none";
        }

        // Calcula as estrelas conforme as tentativas
        const totalTentativas =
            tentativasErradasNestaLicao + 1;

        const porcentagem = Math.round(
            (1 / totalTentativas) * 100
        );

        let estrelasConquistadas = 0;

        if (porcentagem >= 80) {
            estrelasConquistadas = 3;
        } else if (porcentagem >= 50) {
            estrelasConquistadas = 2;
        } else if (porcentagem >= 25) {
            estrelasConquistadas = 1;
        }

        // Limpa as estrelas anteriores
        containerEstrelas.innerHTML = "";

        // Cria três estrelas-do-mar
        for (let i = 0; i < 3; i++) {
            const estaPreenchida = i < estrelasConquistadas;

            const preenchimento = estaPreenchida
                ? `url(#gradienteDourado${i})`
                : "url(#gradienteVazado)";

            const contorno = estaPreenchida
                ? "#C78A13"
                : "rgba(190, 170, 125, 0.45)";

            const corDetalhes = estaPreenchida
                ? "#FFF0A6"
                : "rgba(255, 245, 215, 0.55)";

            const opacidade = estaPreenchida ? "1" : "0.45";

            const brilho = estaPreenchida ? "0.75" : "0.25";
            const brilhoDetalhes =
                estaPreenchida ? "0.65" : "0.2";

            const svgEstrelaDoMar = `
                <svg
                    class="duo-estrela-anim"
                    viewBox="0 0 500 500"
                    xmlns="http://www.w3.org/2000/svg"
                    style="opacity: ${opacidade}; overflow: visible;"
                    role="img"
                    aria-label="${
                        estaPreenchida
                            ? "Estrela-do-mar dourada conquistada"
                            : "Estrela-do-mar não conquistada"
                    }"
                >
                    <defs>
                        <linearGradient
                            id="gradienteDourado${i}"
                            x1="0%" y1="0%"
                            x2="100%" y2="100%"
                        >
                            <stop offset="0%" stop-color="#FFF8B0"/>
                            <stop offset="22%" stop-color="#FFE66D"/>
                            <stop offset="48%" stop-color="#FFC629"/>
                            <stop offset="72%" stop-color="#F5A900"/>
                            <stop offset="100%" stop-color="#D88708"/>
                        </linearGradient>

                        <linearGradient
                            id="gradienteVazado"
                            x1="0%" y1="0%"
                            x2="100%" y2="100%"
                        >
                            <stop offset="0%" stop-color="#FFF7D5"/>
                            <stop offset="100%" stop-color="#D8C9A2"/>
                        </linearGradient>

                        <filter
                            id="sombraEstrela${i}"
                            x="-25%" y="-25%"
                            width="150%" height="160%"
                        >
                            <feDropShadow
                                dx="0" dy="9" stdDeviation="7"
                                flood-color="#80500A"
                                flood-opacity="${
                                    estaPreenchida ? "0.30" : "0.10"
                                }"
                            />
                        </filter>

                        <linearGradient
                            id="brilhoEstrela${i}"
                            x1="0%" y1="0%"
                            x2="0%" y2="100%"
                        >
                            <stop
                                offset="0%"
                                stop-color="#FFFFFF"
                                stop-opacity="0.75"
                            />
                            <stop
                                offset="55%"
                                stop-color="#FFFFFF"
                                stop-opacity="0.12"
                            />
                            <stop
                                offset="100%"
                                stop-color="#FFFFFF"
                                stop-opacity="0"
                            />
                        </linearGradient>
                    </defs>

                    <!-- Sombra projetada -->
                    <path
                        d="M250 42
                           C276 125 315 150 405 168
                           C472 180 469 224 411 268
                           C353 309 340 342 360 421
                           C376 482 338 479 285 440
                           L250 414 L215 440
                           C162 479 124 482 140 421
                           C160 342 147 309 89 268
                           C31 224 28 180 95 168
                           C185 150 224 125 250 42 Z"
                        fill="#80500A"
                        opacity="${estaPreenchida ? "0.16" : "0.05"}"
                        transform="translate(0 8)"
                    />

                    <!-- Corpo da estrela-do-mar -->
                    <path
                        d="M250 30
                           C278 115 316 143 405 162
                           C473 176 465 220 408 263
                           C351 305 337 339 359 420
                           C375 479 338 473 285 435
                           L250 410 L215 435
                           C162 473 125 479 141 420
                           C163 339 149 305 92 263
                           C35 220 27 176 95 162
                           C184 143 222 115 250 30 Z"
                        fill="${preenchimento}"
                        stroke="${contorno}"
                        stroke-width="12"
                        stroke-linejoin="round"
                        filter="url(#sombraEstrela${i})"
                    />

                    <!-- Camada de brilho -->
                    <path
                        d="M250 48
                           C274 123 312 151 397 169
                           C445 180 444 207 402 241
                           C350 282 328 321 349 399
                           C356 426 343 441 315 421
                           L250 380 L185 421
                           C157 441 144 426 151 399
                           C172 321 150 282 98 241
                           C56 207 55 180 103 169
                           C188 151 226 123 250 48 Z"
                        fill="url(#brilhoEstrela${i})"
                        pointer-events="none"
                    />

                    <!-- Textura em relevo -->
                    <g fill="${corDetalhes}">
                        <circle cx="250" cy="112" r="15" opacity="0.95"/>
                        <circle
                            cx="250" cy="112" r="7"
                            fill="#FFFFFF"
                            opacity="${brilho}"
                        />

                        <circle cx="365" cy="205" r="14" opacity="0.9"/>
                        <circle
                            cx="365" cy="205" r="6"
                            fill="#FFFFFF"
                            opacity="${brilhoDetalhes}"
                        />

                        <circle cx="322" cy="355" r="15" opacity="0.95"/>
                        <circle
                            cx="322" cy="355" r="6"
                            fill="#FFFFFF"
                            opacity="${brilhoDetalhes}"
                        />

                        <circle cx="178" cy="355" r="15" opacity="0.95"/>
                        <circle
                            cx="178" cy="355" r="6"
                            fill="#FFFFFF"
                            opacity="${brilhoDetalhes}"
                        />

                        <circle cx="135" cy="205" r="14" opacity="0.9"/>
                        <circle
                            cx="135" cy="205" r="6"
                            fill="#FFFFFF"
                            opacity="${brilhoDetalhes}"
                        />

                        <circle cx="250" cy="285" r="8" opacity="0.75"/>
                        <circle cx="218" cy="235" r="6" opacity="0.8"/>
                        <circle cx="282" cy="235" r="6" opacity="0.8"/>
                    </g>

                    <!-- Reflexos luminosos -->
                    <g
                        fill="#FFFFFF"
                        opacity="${estaPreenchida ? "0.85" : "0.35"}"
                    >
                        <ellipse
                            cx="222" cy="91"
                            rx="8" ry="13"
                            transform="rotate(-28 222 91)"
                        />
                        <circle cx="345" cy="183" r="5"/>
                        <circle cx="302" cy="333" r="5"/>
                        <circle cx="159" cy="183" r="5"/>
                    </g>
                </svg>
            `;

            containerEstrelas.insertAdjacentHTML(
                "beforeend",
                svgEstrelaDoMar
            );
        }

        // IMPORTANTE: o evento do botão termina aqui.
        // Os eventos de transição ficam fora dele.
        telaEstrelas.style.display = "flex";
    }
);

// =====================================================
// BOTÃO CONTINUAR — TRANSIÇÃO DA ONDA
// =====================================================

document.getElementById("btnProximoEstrelas")?.addEventListener(
    "click",
    () => {
        const telaEstrelas =
            document.getElementById("telaEstrelas");

        const telaMedalha =
            document.getElementById("telaMedalha");

        if (!telaEstrelas || !telaMedalha) {
            console.error(
                "Não foi possível encontrar as telas da recompensa."
            );
            return;
        }

        const onda = document.createElement("div");
        onda.className = "onda-transicao";

        document.body.appendChild(onda);

        // Inicia a animação após a renderização
        requestAnimationFrame(() => {
            onda.classList.add("animar");
        });

        // Troca as telas quando a onda cobrir a tela
        setTimeout(() => {
            telaEstrelas.style.display = "none";
            telaMedalha.style.display = "flex";
        }, 800);

        // Remove a onda depois da animação
        setTimeout(() => {
            onda.remove();
        }, 1700);
    }
);

// =====================================================
// BOTÃO FINAL — SALVAR E ABRIR MEDALHAS
// =====================================================

document.getElementById("btnIrParaMedalhas")?.addEventListener(
    "click",
    () => {
        localStorage.setItem("medalha_clave_sol", "true");

        window.location.href =
            "../html/medalhas.html?recompensa=true&titulo=Clave%20de%20Sol";
    }
);

// =====================================================
// BOTÃO REFAZER LIÇÃO (VOLTA PARA A LIÇÃO 1)
// =====================================================

document.getElementById("retryLessonBtn")?.addEventListener(
    "click",
    () => {
        window.location.href = `atividades_sol.html?id=1`;
    }
);

// =====================================================
// BOTÃO FINAL — SALVAR E ABRIR MEDALHAS COM DESTAQUE DE SOL
// =====================================================

document.getElementById("btnIrParaMedalhas")?.addEventListener(
    "click",
    () => {
        localStorage.setItem("medalha_clave_sol", "true");

        window.location.href =
            "../html/medalhas.html?recompensa=true&titulo=Clave%20de%20Sol&destaque=sol";
    }
);

// =====================================================

// FUNÇÃO DE CONCLUSÃO FINAL DA CLAVE DE SOL (CORRIGIDA)

// =====================================================
 
function abrirConclusaoFinal() {

    const telaFinal = document.getElementById("finalOcean");
 
    if (!telaFinal) {

        alert("Parabéns! Você concluiu a trilha de Clave de Sol!");

        return;

    }
 
    // 1º Cálculo correto do Aproveitamento

    const totalRespostas = correctCount + wrongCount;

    const porcentagem = totalRespostas > 0 ? Math.round((correctCount / totalRespostas) * 100) : 0;
 
    // 2º Distribuição das Estrelas

    let estrelas = 0;

    if (porcentagem > 95) {

        estrelas = 3;

    } else if (porcentagem >= 50) {

        estrelas = 2;

    } else if (porcentagem >= 25) {

        estrelas = 1;

    } else {

        estrelas = 0;

    }
 
    const porcentagemEl = document.getElementById("finalPercentage");

    const tituloEl = document.getElementById("oceanResultTitle");

    const mensagemPrincipal = document.getElementById("oceanResultMessage");

    const retryBtn = document.getElementById("retryLessonBtn");

    const skipBtn = document.getElementById("skipLessonBtn");

    const medalBtn = document.getElementById("receiveMedalBtn");

    const skipConfirmation = document.getElementById("skipConfirmation");

    const resultStars = document.getElementById("resultStars");
 
    if (porcentagemEl) porcentagemEl.textContent = `${porcentagem}%`;
 
    // 3º Força a cor das estrelas via CSS inline (Filtro Cinza)

    if (resultStars) {

        resultStars.innerHTML = "";

        for (let i = 0; i < 3; i++) {

            if (i < estrelas) {

                // Estrela amarelinha (normal)

                resultStars.innerHTML += `<span class="result-star" style="filter: none; opacity: 1; display: inline-block; margin: 0 5px;">⭐</span>`;

            } else {

                // Estrela cinza (filtro grayscale aplicado)

                resultStars.innerHTML += `<span class="result-star" style="filter: grayscale(100%); opacity: 0.3; display: inline-block; margin: 0 5px;">⭐</span>`;

            }

        }

    }
 
    // 4º Mensagens dinâmicas

    if (porcentagem < 50) {

        if (tituloEl) tituloEl.textContent = "Fim da Trilha!";

        if (mensagemPrincipal) mensagemPrincipal.textContent = "Tente novamente :(";

    } else if (porcentagem >= 50 && porcentagem <= 95) {

        if (tituloEl) tituloEl.textContent = "Fim da Trilha!";

        if (mensagemPrincipal) mensagemPrincipal.textContent = "Quase lá! Continue os estudos :)";

    } else { 

        if (tituloEl) tituloEl.textContent = "Fim da Trilha!";

        if (mensagemPrincipal) mensagemPrincipal.textContent = "Parabéns!! Seu desempenho foi incrível!";

    }
 
    // 5º Oculta TUDO via style.display (Muito mais forte que a tag hidden)

    if (retryBtn) retryBtn.style.display = "none";

    if (skipBtn) skipBtn.style.display = "none";

    if (medalBtn) medalBtn.style.display = "none";

    if (skipConfirmation) skipConfirmation.style.display = "none";
 
    // 6º Lógica de Exibição dos Botões

    // Botão Refazer: Sempre aparece

    if (retryBtn) retryBtn.style.display = "inline-block";
 
    // Botão Pular: Aparece APENAS se for menor que 100%

    if (porcentagem < 100) {

        if (skipBtn) skipBtn.style.display = "inline-block";

    }
 
    // Botão Receber Medalha: Aparece APENAS se for maior que 95%

    if (porcentagem > 95) {

        if (medalBtn) medalBtn.style.display = "inline-block";

    }
 
    // Exibe a tela final com a animação

    telaFinal.classList.remove("is-active", "is-closing");

    void telaFinal.offsetWidth;

    telaFinal.setAttribute("aria-hidden", "false");

    telaFinal.classList.add("is-active");
 
    const feedbackPanel = document.getElementById("feedbackPanel");

    if (feedbackPanel) feedbackPanel.style.display = "none";

}
 