const AUDIO_ONDA = "../audio/onda.mp3";
const VOLUME_ONDA = 0.7;

/* =========================================================
   NOTEWAVE — ONDA DE PASSAGEM (Clave de Sol e Clave de Fá)

   Uso:
     NoteWaveOnda.passar(() => {
         // roda quando a onda cobre a tela inteira:
         // é aqui que você troca de tela
     });
   ========================================================= */

   (function () {
    "use strict";

    // =====================================================
    // CONFIGURAÇÕES — ALTERE AQUI
    // =====================================================

    // 🔊 ÁUDIO DA ONDA: coloque seu arquivo em  audio/onda.mp3
    // (ou mude o caminho abaixo). Deixe "" para ficar sem som.
    const AUDIO_ONDA = "../audio/onda.mp3";

    // Volume do áudio, de 0 (mudo) a 1 (máximo)
    const VOLUME_ONDA = 0.7;

    // Duração da onda de cada camada, em segundos
    const DURACAO = 2.4;

    // Camadas da água: a primeira chega na frente (espuma),
    // as seguintes vêm atrás, cada vez mais escuras.
    const CAMADAS = [
        { cor: "#f4fdff", cor2: "#caf0f8", atraso: 0,    vel: 4.2, reverso: false, forma: "B", espuma: true },
        { cor: "#90e0ef", cor2: "#48cae4", atraso: 0.10, vel: 5.6, reverso: true,  forma: "A" },
        { cor: "#0096c7", cor2: "#0077b6", atraso: 0.22, vel: 4.8, reverso: false, forma: "B" },
        { cor: "#0077b6", cor2: "#023e8a", atraso: 0.36, vel: 6.6, reverso: true,  forma: "A" }
    ];

    // Formatos das ondas (A = mais calma, B = mais alta)
    const FORMAS = {
        A: {
            alto: 140,
            crista: "M0,70 C240,10 480,10 720,70 C960,130 1200,130 1440,70 C1680,10 1920,10 2160,70 C2400,130 2640,130 2880,70 L2880,140 L0,140 Z",
            borda:  "M0,70 C240,130 480,130 720,70 C960,10 1200,10 1440,70 C1680,130 1920,130 2160,70 C2400,10 2640,10 2880,70 L2880,0 L0,0 Z"
        },
        B: {
            alto: 160,
            crista: "M0,90 C200,20 520,20 720,80 C920,140 1240,140 1440,90 C1640,20 1960,20 2160,80 C2360,140 2680,140 2880,90 L2880,160 L0,160 Z",
            borda:  "M0,70 C200,140 520,140 720,80 C920,20 1240,20 1440,70 C1640,140 1960,140 2160,80 C2360,20 2680,20 2880,70 L2880,0 L0,0 Z"
        }
    };

    // =====================================================
    // MONTAGEM DAS CAMADAS
    // =====================================================

    function criarCamada(c) {
        const f = FORMAS[c.forma];
        const sentido = c.reverso ? "reverse" : "normal";

        return `
            <div class="nw-onda__camada${c.espuma ? " nw-onda__camada--espuma" : ""}"
                 style="--nw-cor:${c.cor}; --nw-cor2:${c.cor2}; --nw-delay:${c.atraso}s; --nw-dur:${DURACAO}s;">

                <svg class="nw-onda__crista" viewBox="0 0 2880 ${f.alto}"
                     preserveAspectRatio="none" aria-hidden="true"
                     style="height:${f.alto}px; animation-duration:${c.vel}s; animation-direction:${sentido};">
                    <path d="${f.crista}" fill="${c.cor}"/>
                </svg>

                <div class="nw-onda__corpo"></div>

                <svg class="nw-onda__borda" viewBox="0 0 2880 ${f.alto}"
                     preserveAspectRatio="none" aria-hidden="true"
                     style="height:${f.alto}px; animation-duration:${(c.vel * 1.3).toFixed(1)}s; animation-direction:${sentido};">
                    <path d="${f.borda}" fill="${c.cor2}"/>
                </svg>
            </div>
        `;
    }

    // =====================================================
    // ÁUDIO (com fade-out no final)
    // =====================================================

    function tocarSom(duracaoMs) {
        if (!AUDIO_ONDA) return;

        try {
            const audio = new Audio(AUDIO_ONDA);
            audio.volume = VOLUME_ONDA;
            audio.play().catch(() => {});

            setTimeout(() => {
                const passo = setInterval(() => {
                    if (audio.volume > 0.06) {
                        audio.volume = Math.max(0, audio.volume - VOLUME_ONDA / 7);
                    } else {
                        clearInterval(passo);
                        audio.pause();
                    }
                }, 100);
            }, Math.max(0, duracaoMs - 700));
        } catch (erro) {
            // Sem áudio, a onda continua normalmente
        }
    }

    // =====================================================
    // FUNÇÃO PÚBLICA
    // =====================================================

    function passar(aoCobrirTela, aoTerminar) {
        const reduzirMovimento =
            window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        // Sem animação (acessibilidade) ou onda já em andamento
        if (reduzirMovimento || document.querySelector(".nw-onda")) {
            if (aoCobrirTela) aoCobrirTela();
            if (aoTerminar) aoTerminar();
            return;
        }

        const overlay = document.createElement("div");
        overlay.className = "nw-onda";
        overlay.setAttribute("aria-hidden", "true");
        overlay.innerHTML = CAMADAS.map(criarCamada).join("");
        document.body.appendChild(overlay);

        const atrasoFinal = Math.max(...CAMADAS.map(c => c.atraso));
        const tempoTotal = (atrasoFinal + DURACAO) * 1000;
        const tempoMeio = (atrasoFinal + DURACAO * 0.5) * 1000;

        tocarSom(tempoTotal);

        // A última camada cobriu a tela: hora de trocar o conteúdo
        setTimeout(() => {
            if (aoCobrirTela) aoCobrirTela();
        }, tempoMeio);

        // A onda saiu por cima
        setTimeout(() => {
            overlay.remove();
            if (aoTerminar) aoTerminar();
        }, tempoTotal + 80);
    }

    window.NoteWaveOnda = { passar };
})();