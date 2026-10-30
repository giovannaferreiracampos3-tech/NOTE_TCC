/* =====================================================
   NOTEWAVE — CLAVE DE FÁ
   Mesma estrutura, telas e desenhos da Clave de Sol
   ===================================================== */

// =====================================================
// 1. DADOS DA LIÇÃO
// =====================================================

const urlParams = new URLSearchParams(window.location.search);
const licaoId = parseInt(urlParams.get("id"), 10) || 1;

if (typeof licoesDeNotasFa === "undefined") {
    throw new Error(
        "Os dados de licoesDeNotasFa não foram carregados antes deste script."
    );
}

const licaoAtual = licoesDeNotasFa.find(licao => licao.id === licaoId);

// Contadores persistentes — Clave de Fá
let correctCount =
    parseInt(localStorage.getItem("musical_fa_correctCount"), 10) || 0;

let wrongCount =
    parseInt(localStorage.getItem("musical_fa_wrongCount"), 10) || 0;

let answered = false;
let acertouDePrimeira = true;
let tentativasErradasNestaLicao = 0;

// Resultado final (calculado uma vez e usado em todas as telas)
let estrelasFinais = 0;
let podeReceberMedalha = false;

// =====================================================
// 2. EXECUÇÃO INICIAL
// =====================================================

if (licaoAtual) {
    carregarEstruturaDinamica();
    atualizarProgressoGeral();
} else {
    document.body.innerHTML = `
        <h1 style="text-align:center; margin-top:50px; font-family:sans-serif;">
            ⚠️ Lição não encontrada!
        </h1>
    `;
}

function carregarEstruturaDinamica() {
    document.getElementById("lessonNumber").innerText = `Lição ${licaoAtual.id}`;
    document.getElementById("lessonTitle").innerText = licaoAtual.titulo;
    document.getElementById("helpText").innerText = licaoAtual.dica;

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

    btnHelp.onclick = () => {
        helpBox.style.display =
            helpBox.style.display === "none" ? "block" : "none";
    };

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
        audioTime.innerText = `0:00 / ${formatarTempo(audioTrack.duration)}`;
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

// =====================================================
// 3. VALIDAR RESPOSTAS
// =====================================================

function computarEscolha(botaoClicado, respostaSelecionada) {
    if (answered) return;

    const feedbackPanel = document.getElementById("feedbackPanel");
    const feedbackIcon = feedbackPanel.querySelector(".feedback-icon");
    const feedbackTitle = document.getElementById("feedbackTitle");
    const feedbackMessage = document.getElementById("feedbackMessage");
    const actionBtn = document.getElementById("actionBtn");
    const todosOsBotoes = document.querySelectorAll(".option-btn");

    feedbackPanel.style.display = "flex";

    // RESPOSTA CORRETA
    if (respostaSelecionada === licaoAtual.notaCorreta) {
        answered = true;

        const chaveConclusao = `status_fa_concluido_licao_${licaoId}`;

        if (acertouDePrimeira && !localStorage.getItem(chaveConclusao)) {
            correctCount++;
            localStorage.setItem("musical_fa_correctCount", correctCount);
            localStorage.setItem(chaveConclusao, "true");
        }

        document.getElementById("correctCount").innerText = correctCount;

        botaoClicado.id = "correct-choice";
        botaoClicado.style.backgroundColor = "#2ecc71";
        botaoClicado.style.color = "#ffffff";
        botaoClicado.style.opacity = "1";

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
                `Excelente! Você acertou de primeira a nota ${licaoAtual.notaCorreta}!`;
        } else {
            feedbackMessage.innerText =
                `Você encontrou a nota ${licaoAtual.notaCorreta}. ` +
                "Como precisou de mais tentativas, seu progresso geral não subiu nesta lição.";
        }

        actionBtn.innerText = "Próxima Lição";

        actionBtn.onclick = () => {
            const proximoId = licaoId + 1;
            const proximaExiste = licoesDeNotasFa.some(l => l.id === proximoId);

            if (proximaExiste) {
                window.location.href = `atividades-nota.html?id=${proximoId}`;
            } else {
                NoteWaveOnda.passar(() => abrirConclusaoFinal());
            }
        };

        atualizarProgressoGeral();

    } else {
        // RESPOSTA INCORRETA
        acertouDePrimeira = false;
        tentativasErradasNestaLicao++;
        wrongCount++;

        localStorage.setItem("musical_fa_wrongCount", wrongCount);
        document.getElementById("wrongCount").innerText = wrongCount;

        botaoClicado.disabled = true;
        botaoClicado.style.backgroundColor = "#e74c3c";
        botaoClicado.style.color = "#ffffff";
        botaoClicado.style.opacity = "0.7";
        botaoClicado.style.cursor = "not-allowed";

        feedbackPanel.className = "feedback-panel danger";
        feedbackIcon.innerText = "❌";
        feedbackTitle.innerText = "Resposta incorreta! 🤔";
        feedbackMessage.innerText =
            "Essa não é a nota certa. Analise a pauta novamente e tente outra alternativa!";
        actionBtn.innerText = "Tentar novamente";

        actionBtn.onclick = () => {
            feedbackPanel.style.display = "none";
        };
    }
}

// =====================================================
// 4. PROGRESSO GERAL
// =====================================================

function atualizarProgressoGeral() {
    const total = licoesDeNotasFa.length;
    let concluidas = 0;

    licoesDeNotasFa.forEach(licao => {
        if (localStorage.getItem(`status_fa_concluido_licao_${licao.id}`)) {
            concluidas++;
        }
    });

    const progresso = total > 0 ? Math.round((concluidas / total) * 100) : 0;

    document.getElementById("percentageValue").innerText = `${progresso}%`;
    document.getElementById("progressRing").style.setProperty("--percent", progresso);
}

// =====================================================
// 5. TELA FINAL — FIM DA TRILHA (igual à Clave de Sol)
// =====================================================

function abrirConclusaoFinal() {
    const telaFinal = document.getElementById("finalOcean");

    if (!telaFinal) {
        alert("Parabéns! Você concluiu a trilha de Clave de Fá!");
        return;
    }

    // Aproveitamento geral
    const totalRespostas = correctCount + wrongCount;
    const porcentagem = totalRespostas > 0
        ? Math.round((correctCount / totalRespostas) * 100)
        : 0;

    // Estrelas
    if (porcentagem > 95) {
        estrelasFinais = 3;
    } else if (porcentagem >= 50) {
        estrelasFinais = 2;
    } else if (porcentagem >= 25) {
        estrelasFinais = 1;
    } else {
        estrelasFinais = 0;
    }

    podeReceberMedalha = porcentagem > 95;

    const porcentagemEl = document.getElementById("finalPercentage");
    const tituloEl = document.getElementById("oceanResultTitle");
    const mensagemPrincipal = document.getElementById("oceanResultMessage");
    const retryBtn = document.getElementById("retryLessonBtn");
    const skipBtn = document.getElementById("skipLessonBtn");
    const medalBtn = document.getElementById("receiveMedalBtn");
    const skipConfirmation = document.getElementById("skipConfirmation");
    const resultStars = document.getElementById("resultStars");

    if (porcentagemEl) porcentagemEl.textContent = `${porcentagem}%`;

    // Estrelas do painel (amarelas = conquistadas, cinza = não conquistadas)
    if (resultStars) {
        resultStars.innerHTML = "";

        for (let i = 0; i < 3; i++) {
            if (i < estrelasFinais) {
                resultStars.innerHTML +=
                    `<span class="result-star" style="filter: none; opacity: 1; display: inline-block; margin: 0 5px;">⭐</span>`;
            } else {
                resultStars.innerHTML +=
                    `<span class="result-star" style="filter: grayscale(100%); opacity: 0.3; display: inline-block; margin: 0 5px;">⭐</span>`;
            }
        }
    }

    // Mensagens
    if (tituloEl) tituloEl.textContent = "Fim da Trilha!";

    if (mensagemPrincipal) {
        if (porcentagem < 50) {
            mensagemPrincipal.textContent = "Tente novamente :(";
        } else if (porcentagem <= 95) {
            mensagemPrincipal.textContent = "Quase lá! Continue os estudos :)";
        } else {
            mensagemPrincipal.textContent = "Parabéns!! Seu desempenho foi incrível!";
        }
    }

    // Botões (style.display é mais forte que o atributo hidden)
    if (retryBtn) retryBtn.style.display = "none";
    if (skipBtn) skipBtn.style.display = "none";
    if (medalBtn) medalBtn.style.display = "none";
    if (skipConfirmation) skipConfirmation.style.display = "none";

    // Refazer: sempre aparece
    if (retryBtn) {
        retryBtn.hidden = false;
        retryBtn.style.display = "inline-block";
    }

    // Pular: só se não for 100%
    if (porcentagem < 100 && skipBtn) {
        skipBtn.hidden = false;
        skipBtn.style.display = "inline-block";
    }

    // Receber medalha: só acima de 95%
    if (podeReceberMedalha && medalBtn) {
        medalBtn.hidden = false;
        medalBtn.style.display = "inline-block";
    }

    // Abre a tela com a animação
    telaFinal.classList.remove("is-active", "is-closing");
    void telaFinal.offsetWidth;
    telaFinal.setAttribute("aria-hidden", "false");
    telaFinal.classList.add("is-active");

    const feedbackPanel = document.getElementById("feedbackPanel");
    if (feedbackPanel) feedbackPanel.style.display = "none";
}

// =====================================================
// 6. BOTÕES DA TELA FINAL
// =====================================================

// Refazer: zera o progresso de Fá e volta para a lição 1
document.getElementById("retryLessonBtn")?.addEventListener("click", () => {
    reiniciarTodoOProgressoSemConfirmar();
});

// Pular: volta ao perfil e NÃO libera a medalha
document.getElementById("skipLessonBtn")?.addEventListener("click", () => {
    podeReceberMedalha = false;
    window.location.href = "../html/perfil.html";
});

// =====================================================
// 7. FIM DA LIÇÃO — ESTRELAS-DO-MAR (idênticas às de Sol)
// =====================================================

document.getElementById("receiveMedalBtn")?.addEventListener("click", () => {
    if (!podeReceberMedalha) return;

    const finalOcean = document.getElementById("finalOcean");
    const containerEstrelas = document.getElementById("duoEstrelasAnimadas");
    const telaEstrelas = document.getElementById("telaEstrelas");

    if (!containerEstrelas || !telaEstrelas) {
        console.error("Não foi possível encontrar os elementos da recompensa.");
        return;
    }

    if (finalOcean) {
        finalOcean.style.display = "none";
    }

    const estrelasConquistadas = estrelasFinais;

    containerEstrelas.innerHTML = "";

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
        const brilhoDetalhes = estaPreenchida ? "0.65" : "0.2";

        const svgEstrelaDoMar = `
            <svg
                class="duo-estrela-anim${i === 1 ? " estrela-central" : ""}"
                viewBox="0 0 500 500"
                xmlns="http://www.w3.org/2000/svg"
                style="opacity: ${opacidade}; overflow: visible;"
                role="img"
                aria-label="${estaPreenchida ? "Estrela-do-mar dourada conquistada" : "Estrela-do-mar não conquistada"}"
            >
                <defs>
                    <linearGradient id="gradienteDourado${i}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#FFF8B0"/>
                        <stop offset="22%" stop-color="#FFE66D"/>
                        <stop offset="48%" stop-color="#FFC629"/>
                        <stop offset="72%" stop-color="#F5A900"/>
                        <stop offset="100%" stop-color="#D88708"/>
                    </linearGradient>

                    <linearGradient id="gradienteVazado" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#FFF7D5"/>
                        <stop offset="100%" stop-color="#D8C9A2"/>
                    </linearGradient>

                    <filter id="sombraEstrela${i}" x="-25%" y="-25%" width="150%" height="160%">
                        <feDropShadow dx="0" dy="9" stdDeviation="7"
                            flood-color="#80500A"
                            flood-opacity="${estaPreenchida ? "0.30" : "0.10"}"/>
                    </filter>

                    <linearGradient id="brilhoEstrela${i}" x1="0%" y1="0%" x2="0%" y2="100%">
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

                <!-- Corpo da estrela-do-mar -->
                <path
                    d="M250 30 C278 115 316 143 405 162 C473 176 465 220 408 263 C351 305 337 339 359 420 C375 479 338 473 285 435 L250 410 L215 435 C162 473 125 479 141 420 C163 339 149 305 92 263 C35 220 27 176 95 162 C184 143 222 115 250 30 Z"
                    fill="${preenchimento}"
                    stroke="${contorno}"
                    stroke-width="12"
                    stroke-linejoin="round"
                    filter="url(#sombraEstrela${i})"
                />

                <!-- Camada de brilho -->
                <path
                    d="M250 48 C274 123 312 151 397 169 C445 180 444 207 402 241 C350 282 328 321 349 399 C356 426 343 441 315 421 L250 380 L185 421 C157 441 144 426 151 399 C172 321 150 282 98 241 C56 207 55 180 103 169 C188 151 226 123 250 48 Z"
                    fill="url(#brilhoEstrela${i})"
                    pointer-events="none"
                />

                <!-- Textura em relevo -->
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

                <!-- Reflexos luminosos -->
                <g fill="#FFFFFF" opacity="${estaPreenchida ? "0.85" : "0.35"}">
                    <ellipse cx="222" cy="91" rx="8" ry="13" transform="rotate(-28 222 91)"/>
                    <circle cx="345" cy="183" r="5"/>
                    <circle cx="302" cy="333" r="5"/>
                    <circle cx="159" cy="183" r="5"/>
                </g>
            </svg>
        `;

        containerEstrelas.insertAdjacentHTML("beforeend", svgEstrelaDoMar);
    }

    telaEstrelas.style.display = "flex";
});

// =====================================================
// 8. TRANSIÇÃO DA ONDA (estrelas → medalha)
// =====================================================

document.getElementById("btnProximoEstrelas")?.addEventListener("click", () => {
    const telaEstrelas = document.getElementById("telaEstrelas");
    const telaMedalha = document.getElementById("telaMedalha");

    if (!telaEstrelas || !telaMedalha) {
        console.error("Não foi possível encontrar as telas da recompensa.");
        return;
    }

    NoteWaveOnda.passar(() => {
        telaEstrelas.style.display = "none";
        telaMedalha.style.display = "flex";
    });
});

// =====================================================
// 9. NOVA CONQUISTA — SALVAR E ABRIR MEDALHAS
// =====================================================

document.getElementById("btnIrParaMedalhas")?.addEventListener("click", () => {
    // Sem o aproveitamento mínimo, a medalha não é gravada
    if (!podeReceberMedalha) {
        window.location.href = "../html/perfil.html";
        return;
    }

    localStorage.setItem("medalha_clave_fa", "true");

    window.location.href =
        "../html/medalhas.html?recompensa=true&titulo=Clave%20de%20F%C3%A1&destaque=fa";
});

// =====================================================
// 10. REINICIAR PROGRESSO
// =====================================================

function reiniciarTodoOProgresso() {
    const confirmou = confirm(
        "Deseja realmente zerar todo o seu histórico e desempenho da Clave de Fá?"
    );

    if (!confirmou) return;

    reiniciarTodoOProgressoSemConfirmar();
}

function reiniciarTodoOProgressoSemConfirmar() {
    localStorage.removeItem("musical_fa_correctCount");
    localStorage.removeItem("musical_fa_wrongCount");

    licoesDeNotasFa.forEach(licao => {
        localStorage.removeItem(`status_fa_concluido_licao_${licao.id}`);
    });

    correctCount = 0;
    wrongCount = 0;

    window.location.href = window.location.pathname + "?id=1";
}

// =====================================================
// 11. FORMATAR TEMPO DO ÁUDIO
// =====================================================

function formatarTempo(segundos) {
    if (!Number.isFinite(segundos)) return "0:00";

    const min = Math.floor(segundos / 60);
    const seg = Math.floor(segundos % 60);

    return `${min}:${seg < 10 ? "0" : ""}${seg}`;
}