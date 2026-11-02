/* Notinha Runner — banco de perguntas
 * Para adicionar conteúdo novo: inclua itens em TEXTOS e informe o "nivel".
 * Convenção: opcoes[0] é SEMPRE a resposta certa; o jogo embaralha o lado na tela.
 * Nível pedido = N: entram as perguntas de nível 1 até N.
 */
(function (NW) {
  'use strict';

  const NOMES = ['Dó', 'Ré', 'Mi', 'Fá', 'Sol', 'Lá', 'Si'];

  // Posição na pauta: 0 = 1ª linha, cada +1 sobe uma linha/espaço. -2 e -1 usam linha suplementar/espaço abaixo.
  // Clave de Sol: 1ª linha = Mi
  const NOTAS_CLAVE_SOL = [
    { pos: -2, nome: 'Dó',  nivel: 2 },  // Dó central
    { pos: -1, nome: 'Ré',  nivel: 2 },
    { pos: 0,  nome: 'Mi',  nivel: 1 },
    { pos: 1,  nome: 'Fá',  nivel: 1 },
    { pos: 2,  nome: 'Sol', nivel: 1 },
    { pos: 3,  nome: 'Lá',  nivel: 1 },
    { pos: 4,  nome: 'Si',  nivel: 1 },
    { pos: 5,  nome: 'Dó',  nivel: 1 },
    { pos: 6,  nome: 'Ré',  nivel: 1 },
    { pos: 7,  nome: 'Mi',  nivel: 1 },
    { pos: 8,  nome: 'Fá',  nivel: 1 }
  ];

  // Clave de Fá: 1ª linha = Sol
  const NOTAS_CLAVE_FA = [
    { pos: -2, nome: 'Mi',  nivel: 2 },
    { pos: -1, nome: 'Fá',  nivel: 2 },
    { pos: 0,  nome: 'Sol', nivel: 1 },
    { pos: 1,  nome: 'Lá',  nivel: 1 },
    { pos: 2,  nome: 'Si',  nivel: 1 },
    { pos: 3,  nome: 'Dó',  nivel: 1 },
    { pos: 4,  nome: 'Ré',  nivel: 1 },
    { pos: 5,  nome: 'Mi',  nivel: 1 },
    { pos: 6,  nome: 'Fá',  nivel: 1 },
    { pos: 7,  nome: 'Sol', nivel: 1 },
    { pos: 8,  nome: 'Lá',  nivel: 1 }
  ];

  // Teoria: [enunciado, certa, errada, nivel]
  const TEXTOS = [
    // ---- Básico: pauta, figuras e notas ----
    ['Quantas linhas tem a pauta?', '5 linhas', '4 linhas', 1],
    ['Qual figura dura 4 tempos?', 'Semibreve', 'Mínima', 1],
    ['Qual figura dura 2 tempos?', 'Mínima', 'Semínima', 1],
    ['Qual figura dura 1 tempo?', 'Semínima', 'Colcheia', 1],
    ['Quantas notas musicais existem?', '7 notas', '8 notas', 1],
    ['Qual nota vem depois do Dó?', 'Ré', 'Mi', 1],
    ['Qual nota vem depois do Ré?', 'Mi', 'Dó', 1],
    ['Qual nota vem antes do Sol?', 'Fá', 'Lá', 1],
    ['Qual nota vem antes do Si?', 'Lá', 'Dó', 1],
    ['Qual nota vem depois do Si?', 'Dó', 'Lá', 1],
    ['Qual símbolo indica silêncio?', 'Pausa', 'Clave', 1],
    ['Como se chama o conjunto de 5 linhas?', 'Pauta', 'Compasso', 1],
    ['Qual símbolo aparece no início da pauta?', 'Clave', 'Pausa', 1],
    ['Em qual linha a clave de Sol marca o Sol?', '2ª linha', '4ª linha', 1],
    ['Em qual linha a clave de Fá marca o Fá?', '4ª linha', '2ª linha', 1],
    ['Qual figura vale metade da semínima?', 'Colcheia', 'Mínima', 1],
    ['Qual linha vertical divide os compassos?', 'Barra de compasso', 'Clave', 1],
    ['Dó Ré Mi Fá Sol Lá Si forma qual escala?', 'Dó maior', 'Cromática', 1],

    // ---- Básico: sinais e compassos ----
    ['Qual sinal sobe a nota meio tom?', 'Sustenido', 'Bemol', 1],
    ['Qual sinal abaixa a nota meio tom?', 'Bemol', 'Sustenido', 1],
    ['Qual sinal cancela um sustenido ou bemol?', 'Bequadro', 'Ligadura', 2],
    ['Quantos tempos tem o compasso 4/4?', '4 tempos', '3 tempos', 1],
    ['Quantos tempos tem o compasso 3/4?', '3 tempos', '2 tempos', 1],
    ['Quantos tempos tem o compasso 2/4?', '2 tempos', '4 tempos', 1],
    ['Qual é o tempo forte do compasso 4/4?', '1º tempo', '2º tempo', 1],
    ['Quantas semínimas cabem numa semibreve?', '4 semínimas', '2 semínimas', 1],
    ['Quantas semínimas cabem numa mínima?', '2 semínimas', '4 semínimas', 1],
    ['Quantas colcheias cabem numa semínima?', '2 colcheias', '4 colcheias', 1],
    ['Quanto dura a pausa de semibreve?', '4 tempos', '2 tempos', 1],

    // ---- Básico: conceitos ----
    ['O que é melodia?', 'Sons em sequência', 'Sons ao mesmo tempo', 1],
    ['O que é harmonia?', 'Sons ao mesmo tempo', 'Sons em sequência', 1],
    ['O que é ritmo?', 'Organização dos sons no tempo', 'Nome das notas', 1],
    ['O que é o pulso da música?', 'A batida regular', 'A letra da canção', 1],
    ['Quem rege uma orquestra?', 'O maestro', 'O solista', 1],
    ['O que significa f na partitura?', 'Forte', 'Fraco', 1],
    ['O que significa p na partitura?', 'Piano (suave)', 'Forte', 1],

    // ---- Básico: instrumentos ----
    ['Qual destes é de percussão?', 'Tambor', 'Violino', 1],
    ['Qual instrumento tem teclas brancas e pretas?', 'Piano', 'Flauta', 1],
    ['Qual instrumento de cordas usa arco?', 'Violino', 'Trompete', 1],
    ['Qual destes é um instrumento de metal?', 'Trompete', 'Flauta doce', 1],
    ['Quantas cordas tem o violão?', '6 cordas', '4 cordas', 1],
    ['Quantas cordas tem o violino?', '4 cordas', '6 cordas', 1],
    ['Qual destes é da família das cordas?', 'Harpa', 'Oboé', 1],
    ['Qual instrumento é soprado e tem palheta?', 'Clarinete', 'Tambor', 1],

    // ---- Intermediário: valores e ritmo ----
    ['O que faz o ponto de aumento?', 'Soma metade do valor', 'Dobra o valor', 2],
    ['Quanto vale a mínima pontuada?', '3 tempos', '4 tempos', 2],
    ['Quanto vale a semínima pontuada?', '1 tempo e meio', '2 tempos', 2],
    ['O que faz a ligadura de prolongamento?', 'Soma a duração de notas iguais', 'Aumenta o volume', 2],
    ['Quantas semicolcheias cabem numa semínima?', '4 semicolcheias', '2 semicolcheias', 2],
    ['Quantas colcheias cabem numa mínima?', '4 colcheias', '2 colcheias', 2],
    ['Qual figura é mais curta?', 'Semicolcheia', 'Colcheia', 2],

    // ---- Intermediário: intervalos e escalas ----
    ['Quantos semitons tem um tom?', '2 semitons', '1 semitom', 2],
    ['Qual o intervalo entre Dó e Mi?', 'Terça', 'Quarta', 2],
    ['Qual o intervalo entre Dó e Fá?', 'Quarta', 'Sexta', 2],
    ['Qual o intervalo entre Dó e Sol?', 'Quinta', 'Terça', 2],
    ['Do Dó ao próximo Dó há uma...', 'Oitava', 'Sétima', 2],
    ['Quais notas formam o acorde de Dó maior?', 'Dó, Mi e Sol', 'Dó, Ré e Mi', 2],
    ['Quantas notas tem a escala pentatônica?', '5 notas', '7 notas', 2],
    ['Qual escala usa os 12 semitons?', 'Cromática', 'Pentatônica', 2],
    ['Qual o tom relativo menor de Dó maior?', 'Lá menor', 'Ré menor', 2],
    ['Qual nota é enarmônica de Dó sustenido?', 'Ré bemol', 'Ré sustenido', 2],
    ['Um acorde tem quantas notas?', 'Três ou mais', 'Apenas uma', 2],

    // ---- Intermediário: armadura de clave ----
    ['Quantos sustenidos tem Dó maior?', 'Nenhum', '1 sustenido', 2],
    ['Qual armadura tem Sol maior?', '1 sustenido (Fá#)', '1 bemol', 2],
    ['Qual armadura tem Fá maior?', '1 bemol (Si♭)', '1 sustenido', 2],
    ['Qual tom tem 2 sustenidos?', 'Ré maior', 'Sol maior', 2],
    ['Qual é o primeiro sustenido da armadura?', 'Fá#', 'Dó#', 2],
    ['Qual é o primeiro bemol da armadura?', 'Si♭', 'Mi♭', 2],

    // ---- Intermediário: andamento, dinâmica e expressão ----
    ['O que significa Allegro?', 'Rápido', 'Lento', 2],
    ['O que significa Adagio?', 'Lento', 'Rápido', 2],
    ['O que significa Andante?', 'Em passo de caminhada', 'Muito rápido', 2],
    ['O que significa Ritardando?', 'Ir desacelerando', 'Ir acelerando', 2],
    ['O que significa Crescendo?', 'Aumentar o volume aos poucos', 'Diminuir o volume', 2],
    ['O que significa Diminuendo?', 'Diminuir o volume aos poucos', 'Aumentar o volume', 2],
    ['O que significa ff?', 'Muito forte', 'Muito suave', 2],
    ['O que significa mf?', 'Meio forte', 'Muito forte', 2],
    ['O que é Staccato?', 'Notas curtas e destacadas', 'Notas ligadas', 2],
    ['O que é Legato?', 'Notas ligadas', 'Notas curtas', 2],
    ['O que faz a fermata?', 'Prolonga a nota', 'Pula o compasso', 2],
    ['O que significa Da Capo?', 'Voltar ao início', 'Ir ao final', 2],
    ['O que é a Coda?', 'Trecho final', 'Trecho inicial', 2],

    // ---- Instrumentos, vozes e orquestra ----
    ['O clarinete é da família das...', 'Madeiras', 'Metais', 2],
    ['O trombone é da família dos...', 'Metais', 'Madeiras', 2],
    ['Qual instrumento tem palheta dupla?', 'Oboé', 'Trompa', 2],
    ['Qual é o maior instrumento de cordas da orquestra?', 'Contrabaixo', 'Violino', 2],
    ['Quantos músicos formam um quarteto?', '4 músicos', '3 músicos', 2],
    ['Qual é a voz masculina mais grave?', 'Baixo', 'Tenor', 2],
    ['Qual é a voz feminina mais aguda?', 'Soprano', 'Contralto', 2],
    ['Quantas teclas tem um piano padrão?', '88 teclas', '76 teclas', 2],
    ['Qual a frequência do Lá de afinação?', '440 Hz', '400 Hz', 2],

    // ---- Compositores e obras ----
    ['Quem compôs a Nona Sinfonia?', 'Beethoven', 'Mozart', 2],
    ['Quem compôs "As Quatro Estações"?', 'Vivaldi', 'Bach', 2],
    ['Quem compôs "Eine kleine Nachtmusik"?', 'Mozart', 'Chopin', 2],
    ['Quem compôs "Bachianas Brasileiras"?', 'Villa-Lobos', 'Carlos Gomes', 2],
    ['Quem compôs a ópera "O Guarani"?', 'Carlos Gomes', 'Villa-Lobos', 2]
  ];

  function embaralhar(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function perguntasDeNota(lista, clave, prefixo) {
    return lista.map(function (n) {
      const outras = NOMES.filter(function (o) { return o !== n.nome; });
      return {
        id: prefixo + '-' + n.pos,
        tipo: 'nota',
        nivel: n.nivel,
        titulo: clave,
        dica: 'Escolha a nota correta!',
        pos: n.pos,
        opcoes: [n.nome, outras[Math.floor(Math.random() * outras.length)]]
      };
    });
  }

  function perguntasDeTexto() {
    return TEXTOS.map(function (t, i) {
      return {
        id: 'teoria-' + (i + 1),
        tipo: 'texto',
        nivel: t[3],
        titulo: t[0],
        dica: 'Pule na resposta certa!',
        opcoes: [t[1], t[2]]
      };
    });
  }

  /** Sorteia "qtd" perguntas sem repetir: cerca de 40% notas (metade Sol, metade Fá) e o resto teoria. */
  function sortear(qtd, nivel) {
    nivel = nivel || 1;
    const ok = function (q) { return q.nivel <= nivel; };
    const sol = embaralhar(perguntasDeNota(NOTAS_CLAVE_SOL, 'Clave de Sol', 'nota-sol').filter(ok));
    const fa  = embaralhar(perguntasDeNota(NOTAS_CLAVE_FA,  'Clave de Fá',  'nota-fa').filter(ok));
    const textos = embaralhar(perguntasDeTexto().filter(ok));

    const notas = [];
    for (let i = 0; i < Math.max(sol.length, fa.length); i++) {
      if (sol[i]) notas.push(sol[i]);
      if (fa[i]) notas.push(fa[i]);
    }
    const nNotas = Math.min(notas.length, Math.round(qtd * 0.4));
    let escolhidas = notas.slice(0, nNotas).concat(textos.slice(0, qtd - nNotas));
    // se faltar teoria, completa com notas restantes
    if (escolhidas.length < qtd) escolhidas = escolhidas.concat(notas.slice(nNotas, nNotas + qtd - escolhidas.length));
    // sem nada no nível pedido? usa o nível 1 para o jogo nunca ficar vazio
    if (!escolhidas.length && nivel !== 1) return sortear(qtd, 1);
    return embaralhar(escolhidas).slice(0, qtd);
  }

  NW.perguntas = { sortear: sortear, NOTAS_CLAVE_SOL: NOTAS_CLAVE_SOL, NOTAS_CLAVE_FA: NOTAS_CLAVE_FA };
})(window.NWRunner = window.NWRunner || {});