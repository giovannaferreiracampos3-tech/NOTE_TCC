/* Notinha Runner — banco de perguntas
 * Para adicionar conteúdo novo: inclua itens em TEXTOS (ou crie um novo tipo)
 * e informe o campo "nivel". O jogo sorteia apenas perguntas do nível pedido.
 * Convenção: opcoes[0] é SEMPRE a resposta certa; o jogo embaralha o lado na tela.
 */
(function (NW) {
  'use strict';

  // Posição na pauta (clave de Sol): 0 = 1ª linha (Mi), cada +1 sobe uma linha/espaço.
  const NOTAS_CLAVE_SOL = [
    { pos: -2, nome: 'Dó' },  // Dó central (linha suplementar)
    { pos: -1, nome: 'Ré' },
    { pos: 0,  nome: 'Mi' },
    { pos: 1,  nome: 'Fá' },
    { pos: 2,  nome: 'Sol' },
    { pos: 3,  nome: 'Lá' },
    { pos: 4,  nome: 'Si' },
    { pos: 5,  nome: 'Dó' },
    { pos: 6,  nome: 'Ré' },
    { pos: 7,  nome: 'Mi' },
    { pos: 8,  nome: 'Fá' }
  ];

  // Perguntas de teoria em texto: [enunciado, certa, errada, nivel]
  const TEXTOS = [
    ['Quantas linhas tem a pauta?', '5 linhas', '4 linhas', 1],
    ['Qual figura dura 4 tempos?', 'Semibreve', 'Mínima', 1],
    ['Qual figura dura 2 tempos?', 'Mínima', 'Semínima', 1],
    ['Qual figura dura 1 tempo?', 'Semínima', 'Colcheia', 1],
    ['Quantas notas musicais existem?', '7 notas', '8 notas', 1],
    ['Qual nota vem depois do Dó?', 'Ré', 'Mi', 1],
    ['Qual nota vem antes do Sol?', 'Fá', 'Lá', 1],
    ['Qual símbolo indica silêncio?', 'Pausa', 'Clave', 1],
    ['Em qual linha a clave de Sol marca a nota Sol?', '2ª linha', '4ª linha', 1],
    ['Qual sequência está correta?', 'Dó Ré Mi', 'Dó Mi Ré', 1],
    ['Qual sinal sobe a nota meio tom?', 'Sustenido', 'Bemol', 1],
    ['Qual sinal abaixa a nota meio tom?', 'Bemol', 'Sustenido', 1],
    ['Quantos tempos tem um compasso 4/4?', '4 tempos', '3 tempos', 1],
    ['Qual figura vale metade da semínima?', 'Colcheia', 'Mínima', 1],
    ['Dó Ré Mi Fá Sol Lá Si forma qual escala?', 'Dó maior', 'Cromática', 1],
    ['Qual destes é um instrumento de percussão?', 'Tambor', 'Violino', 1]
  ];

  function embaralhar(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function perguntasDeNota() {
    return NOTAS_CLAVE_SOL.map(function (n) {
      const outras = NOTAS_CLAVE_SOL.filter(function (o) { return o.nome !== n.nome; });
      const errada = outras[Math.floor(Math.random() * outras.length)].nome;
      return {
        id: 'nota-' + n.pos,
        tipo: 'nota',
        nivel: 1,
        titulo: 'Clave de Sol',
        dica: 'Escolha a nota correta!',
        pos: n.pos,
        opcoes: [n.nome, errada]       // [certa, errada]
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

  /** Sorteia "qtd" perguntas sem repetir, misturando notas na pauta e teoria. */
  function sortear(qtd, nivel) {
    nivel = nivel || 1;
    const notas = embaralhar(perguntasDeNota().filter(function (q) { return q.nivel === nivel; }));
    const textos = embaralhar(perguntasDeTexto().filter(function (q) { return q.nivel === nivel; }));
    const nNotas = Math.min(notas.length, Math.ceil(qtd / 2));
    const escolhidas = notas.slice(0, nNotas).concat(textos.slice(0, qtd - nNotas));
    return embaralhar(escolhidas).slice(0, qtd);
  }

  NW.perguntas = { sortear: sortear, NOTAS_CLAVE_SOL: NOTAS_CLAVE_SOL };
})(window.NWRunner = window.NWRunner || {});