/* NoteWave Journal – DADOS DE EXEMPLO (Etapa 1).
   Na Etapa 2 estes dados passam a vir do backend (GET /api/journal/artigos).
   O conteúdo já usa a estrutura de BLOCOS prevista para o banco:
   titulo | subtitulo | paragrafo | lista | citacao | imagem | link.
   Texto simples aceita **negrito** e *itálico*; nunca HTML. */
   window.JOURNAL_CATEGORIAS = [
    { id: 'teoria', nome: 'Teoria musical', icone: 'ph-music-notes' },
    { id: 'dicas', nome: 'Dicas de estudo', icone: 'ph-lightbulb' },
    { id: 'curiosidades', nome: 'Curiosidades', icone: 'ph-sparkle' },
    { id: 'resenhas', nome: 'Resenhas', icone: 'ph-headphones' },
    { id: 'relatos', nome: 'Relatos', icone: 'ph-chat-circle-text' },
    { id: 'criacoes', nome: 'Criações', icone: 'ph-paint-brush' }
  ];
  window.JOURNAL_DICAS_NOTINHA = [
    'Estudar 15 minutos por dia rende mais do que 2 horas só no fim de semana. Constância vence!',
    'Você sabia? A palavra “pentagrama” vem do grego e significa “cinco linhas”.',
    'Errou uma nota? Respire e tente de novo, devagar. O ritmo vem depois da precisão.',
    'Cantar a nota em voz alta ajuda o ouvido a reconhecer cada som.',
    'Escrever o que aprendeu no Caderno ajuda a fixar o conteúdo.'
  ];
  window.JOURNAL_ARTIGOS = [
    { id: 1, destaque: true, origem: 'equipe', categoria: 'teoria', autor: 'Equipe NoteWave', data: '2026-10-28',
      titulo: 'Clave de Sol e Clave de Fá: por que existem duas?',
      resumo: 'Entenda como as claves organizam as notas na pauta e quando usar cada uma.',
      reacoes: { aprendi: 24, adorei: 11, inspirador: 5, excelente: 9 }, capa: null,
      blocos: [
        { tipo: 'paragrafo', texto: 'Quando olhamos uma partitura pela primeira vez, a **clave** é o primeiro símbolo que aparece. Ela diz *onde* cada nota mora na pauta.' },
        { tipo: 'titulo', texto: 'Clave de Sol' },
        { tipo: 'paragrafo', texto: 'Costuma ser usada para sons mais agudos, como a voz feminina, o violino e a mão direita do piano. Seu desenho gira em volta da segunda linha, que é a nota **Sol**.' },
        { tipo: 'titulo', texto: 'Clave de Fá' },
        { tipo: 'paragrafo', texto: 'Serve para sons mais graves. Os dois pontos do desenho ficam em volta da quarta linha, que é a nota **Fá**.' },
        { tipo: 'subtitulo', texto: 'Resumo rápido' },
        { tipo: 'lista', ordenada: false, itens: ['Sol: sons agudos', 'Fá: sons graves', 'O **Dó central** liga as duas claves'] },
        { tipo: 'citacao', texto: 'Cada nota é um passo; a melodia é o caminho que você constrói.', fonte: 'Equipe NoteWave' }
      ] },
    { id: 2, origem: 'comunidade', categoria: 'dicas', autor: 'violinista_azul', data: '2026-10-27',
      titulo: 'Como eu criei o hábito de estudar todo dia',
      resumo: 'Três pequenos truques que me ajudaram a manter a sequência de estudos.',
      reacoes: { aprendi: 8, adorei: 14, inspirador: 6, excelente: 2 }, capa: null,
      blocos: [
        { tipo: 'paragrafo', texto: 'No começo eu esquecia de estudar. O que mudou foi **escolher sempre o mesmo horário**.' },
        { tipo: 'lista', ordenada: true, itens: ['Deixar o instrumento à vista', 'Começar com só 10 minutos', 'Marcar o dia como feito'] }
      ] },
    { id: 3, origem: 'equipe', categoria: 'curiosidades', autor: 'Equipe NoteWave', data: '2026-10-24',
      titulo: 'De onde vêm os nomes das notas?',
      resumo: 'Dó, Ré, Mi, Fá, Sol, Lá, Si: uma história que começa em um hino medieval.',
      reacoes: { aprendi: 31, adorei: 7, inspirador: 3, excelente: 4 }, capa: null,
      blocos: [
        { tipo: 'paragrafo', texto: 'Os nomes vêm das primeiras sílabas de um hino em latim, usado para ensinar canto no século XI.' },
        { tipo: 'paragrafo', texto: 'O *Dó* chegou depois e substituiu o antigo “Ut”, que era difícil de cantar.' }
      ] },
    { id: 4, origem: 'comunidade', categoria: 'relatos', autor: 'teclas_do_mar', data: '2026-10-22',
      titulo: 'Meu primeiro recital (e como foi o nervosismo)',
      resumo: 'Contei o que senti antes de subir ao palco e o que faria diferente.',
      reacoes: { aprendi: 3, adorei: 19, inspirador: 12, excelente: 5 }, capa: null,
      blocos: [{ tipo: 'paragrafo', texto: 'Minhas mãos suavam, mas respirar fundo antes da primeira nota **ajudou muito**.' }] },
    { id: 5, origem: 'comunidade', categoria: 'resenhas', autor: 'ouvido_atento', data: '2026-10-20',
      titulo: 'Trilhas de filmes para quem está começando a ouvir música',
      resumo: 'Uma lista curta de trilhas sonoras para treinar o ouvido com calma.',
      reacoes: { aprendi: 5, adorei: 9, inspirador: 8, excelente: 6 }, capa: null,
      blocos: [{ tipo: 'paragrafo', texto: 'Ouça uma trilha prestando atenção em **um instrumento por vez**. Com o tempo, você começa a separar as camadas.' }] },
    { id: 6, origem: 'equipe', categoria: 'criacoes', autor: 'Equipe NoteWave', data: '2026-10-18',
      titulo: 'Desafio: invente uma melodia com apenas três notas',
      resumo: 'Um exercício criativo para soltar a imaginação e treinar a leitura.',
      reacoes: { aprendi: 6, adorei: 10, inspirador: 17, excelente: 3 }, capa: null,
      blocos: [
        { tipo: 'paragrafo', texto: 'Escolha **três notas** e crie uma frase curta. Repita, mude o ritmo e veja como ela se transforma.' },
        { tipo: 'lista', ordenada: false, itens: ['Escolha as notas', 'Invente o ritmo', 'Escreva na pauta do Caderno'] }
      ] }
  ];