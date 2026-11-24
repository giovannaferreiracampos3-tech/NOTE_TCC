// js/audio-notas.js — sintetiza as notas (sem precisar de arquivos mp3)
const NoteWaveAudio = (() => {
    const DURACAO = 2; // segundos

    const SEMITOM = { Do: 0, Re: 2, Mi: 4, Fa: 5, Sol: 7, La: 9, Si: 11 };

    // classePosicao (sem "position-") -> [nota, oitava]
    const POSICOES = {
        sol: {
            DoCentral: ["Do", 4], Re1: ["Re", 4], Mi1: ["Mi", 4], Fa1: ["Fa", 4],
            Sol1: ["Sol", 4], La1: ["La", 4], Si1: ["Si", 4],
            Do2: ["Do", 5], Re2: ["Re", 5], Mi2: ["Mi", 5], Fa2: ["Fa", 5],
            Sol2: ["Sol", 5], La2: ["La", 5], Si2: ["Si", 5]
        },
        fa: {
            Re1: ["Re", 2], Mi1: ["Mi", 2], Fa1: ["Fa", 2], Sol1: ["Sol", 2],
            La1: ["La", 2], Si1: ["Si", 2],
            Do2: ["Do", 3], Re2: ["Re", 3], Mi2: ["Mi", 3], Fa2: ["Fa", 3],
            Sol2: ["Sol", 3], La2: ["La", 3], Si2: ["Si", 3],
            DoCentral: ["Do", 4]
        }
    };

    let ctx = null;
    let nosAtivos = [];
    let timerFim = null;

    function frequencia(nota, oitava) {
        const midi = 12 * (oitava + 1) + SEMITOM[nota];
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    function parar() {
        clearTimeout(timerFim);
        nosAtivos.forEach(n => { try { n.stop(); } catch (e) {} });
        nosAtivos = [];
    }

    // Retorna true se conseguiu tocar
    function tocar(classePosicao, clave, aoTerminar) {
        const chave = String(classePosicao).replace("position-", "");
        const info = POSICOES[clave]?.[chave];
        if (!info) {
            console.error("Posição sem nota definida:", clave, classePosicao);
            return false;
        }

        parar();

        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === "suspended") ctx.resume();

        const freq = frequencia(info[0], info[1]);
        const agora = ctx.currentTime;

        const volume = ctx.createGain();
        volume.gain.setValueAtTime(0.0001, agora);
        volume.gain.exponentialRampToValueAtTime(0.5, agora + 0.02);
        volume.gain.exponentialRampToValueAtTime(0.0001, agora + DURACAO);
        volume.connect(ctx.destination);

        // Fundamental + harmônicos para soar mais como um instrumento
        [[1, "triangle", 1], [2, "sine", 0.35], [3, "sine", 0.15]].forEach(([mult, tipo, ganho]) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = tipo;
            osc.frequency.value = freq * mult;
            g.gain.value = ganho;
            osc.connect(g).connect(volume);
            osc.start(agora);
            osc.stop(agora + DURACAO);
            nosAtivos.push(osc);
        });

        timerFim = setTimeout(() => {
            nosAtivos = [];
            if (aoTerminar) aoTerminar();
        }, DURACAO * 1000);

        return true;
    }

    return { tocar, parar, DURACAO };
})();