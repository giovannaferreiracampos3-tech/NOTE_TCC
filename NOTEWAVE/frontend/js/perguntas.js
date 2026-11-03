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
    
    // ======================================================
    // NOVAS PERGUNTAS — EXPANSÃO DO BANCO
    // ======================================================

    // ---- Leitura e escrita musical ----
    ['Como se chama o espaço entre duas linhas da pauta?', 'Espaço', 'Compasso', 1],
    ['Quantos espaços existem em uma pauta de cinco linhas?', '4 espaços', '5 espaços', 1],
    ['Qual é a função da clave?', 'Indicar a referência das notas na pauta', 'Indicar o andamento', 1],
    ['Onde fica o Dó central no pentagrama da clave de Sol?', 'Em uma linha suplementar abaixo da pauta', 'Na quinta linha', 1],
    ['Qual nota está na primeira linha da clave de Sol?', 'Mi', 'Sol', 1],
    ['Qual nota está na quinta linha da clave de Sol?', 'Fá', 'Mi', 1],
    ['Qual nota está na primeira linha da clave de Fá?', 'Sol', 'Fá', 1],
    ['Qual nota está na quinta linha da clave de Fá?', 'Lá', 'Dó', 1],
    ['Para que servem as linhas suplementares?', 'Representar notas fora da pauta', 'Separar os compassos', 1],
    ['O que indica a armadura de clave?', 'Os acidentes da tonalidade', 'A velocidade da música', 2],
    ['O que é uma partitura?', 'Representação escrita da música', 'Um instrumento musical', 1],
    ['Como se chama a distância entre duas notas musicais?', 'Intervalo', 'Compasso', 2],

    // ---- Figuras e duração ----
    ['Qual figura representa a menor duração entre estas opções?', 'Fusa', 'Mínima', 2],
    ['Quantas semínimas equivalem a uma mínima?', '2 semínimas', '3 semínimas', 1],
    ['Quantas mínimas equivalem a uma semibreve?', '2 mínimas', '3 mínimas', 1],
    ['Quantas colcheias equivalem a uma mínima?', '4 colcheias', '3 colcheias', 2],
    ['Quantas semicolcheias equivalem a uma mínima?', '8 semicolcheias', '4 semicolcheias', 2],
    ['Quantas fusas equivalem a uma semínima?', '16 fusas', '8 fusas', 2],
    ['Qual figura possui uma haste e uma bandeirola?', 'Colcheia', 'Semibreve', 1],
    ['Qual figura possui duas bandeirolas?', 'Semicolcheia', 'Semínima', 2],
    ['O que representa uma pausa musical?', 'Ausência de som por determinado tempo', 'Aumento do volume', 1],
    ['Qual pausa corresponde à duração de uma mínima?', 'Pausa de mínima', 'Pausa de colcheia', 1],
    ['O que acontece quando uma figura recebe um ponto de aumento?', 'Sua duração aumenta pela metade', 'Sua duração diminui pela metade', 2],

    // ---- Compassos e ritmo ----
    ['O que indica o número de cima de uma fórmula de compasso?', 'A quantidade de tempos', 'A velocidade da música', 2],
    ['O que indica o número de baixo de uma fórmula de compasso?', 'A figura que representa a unidade de tempo', 'A quantidade de instrumentos', 2],
    ['Qual figura representa a unidade de tempo no compasso 4/4?', 'Semínima', 'Semibreve', 2],
    ['Qual figura representa a unidade de tempo no compasso 3/8?', 'Colcheia', 'Mínima', 2],
    ['O compasso 6/8 possui quantas colcheias?', '6 colcheias', '8 colcheias', 2],
    ['Qual é a característica comum do compasso 2/4?', 'Dois tempos por compasso', 'Quatro tempos por compasso', 1],
    ['O que é anacruse?', 'Nota ou grupo de notas antes do primeiro tempo forte', 'Uma pausa no final da música', 2],
    ['O que é contratempo?', 'Som em parte fraca do tempo ou do compasso', 'Som sempre no primeiro tempo', 2],
    ['O que é síncope?', 'Deslocamento do acento rítmico esperado', 'A repetição de uma nota longa', 2],
    ['Qual é a função do metrônomo?', 'Marcar pulsos regulares', 'Afinar automaticamente o instrumento', 1],
    ['O que significa BPM?', 'Batidas por minuto', 'Notas por compasso', 1],
    ['Uma música com 120 BPM tem quantas batidas por minuto?', '120 batidas', '60 batidas', 1],

    // ---- Acidentes e tonalidades ----
    ['Qual acidente musical cancela o efeito de um acidente anterior?', 'Bequadro', 'Sustenido', 1],
    ['O sustenido duplo eleva a nota em quantos semitons?', 'Dois semitons', 'Um semitom', 2],
    ['O bemol duplo abaixa a nota em quantos semitons?', 'Dois semitons', 'Um semitom', 2],
    ['Qual é a relativa menor de Sol maior?', 'Mi menor', 'Lá menor', 2],
    ['Qual é a relativa menor de Fá maior?', 'Ré menor', 'Dó menor', 2],
    ['Qual tonalidade possui três sustenidos?', 'Lá maior', 'Fá maior', 2],
    ['Qual tonalidade possui dois bemóis?', 'Si bemol maior', 'Sol maior', 2],
    ['Qual nota recebe sustenido na tonalidade de Sol maior?', 'Fá', 'Dó', 2],
    ['Qual nota recebe bemol na tonalidade de Fá maior?', 'Si', 'Mi', 2],
    ['O que é uma escala musical?', 'Sequência organizada de notas', 'Conjunto de instrumentos', 1],
    ['Qual é o primeiro grau de uma escala?', 'Tônica', 'Dominante', 2],
    ['Qual é o quinto grau de uma escala?', 'Dominante', 'Subdominante', 2],

    // ---- Escalas e intervalos ----
    ['Quantos graus possui uma escala diatônica?', '7 graus', '5 graus', 2],
    ['Quantos semitons existem entre Mi e Fá?', '1 semitom', '2 semitons', 2],
    ['Quantos semitons existem entre Si e Dó?', '1 semitom', '2 semitons', 2],
    ['Qual é o intervalo entre Dó e Ré?', 'Segunda', 'Terça', 2],
    ['Qual é o intervalo entre Dó e Lá?', 'Sexta', 'Quinta', 2],
    ['Qual é o intervalo entre Dó e Si?', 'Sétima', 'Quarta', 2],
    ['Qual é o intervalo entre duas notas de mesmo nome e altura?', 'Uníssono', 'Oitava', 2],
    ['O que é uma escala menor natural?', 'Uma escala com padrão próprio de tons e semitons', 'Uma escala formada apenas por semitons', 2],
    ['Qual é a sequência de notas da escala de Dó maior?', 'Dó, Ré, Mi, Fá, Sol, Lá, Si', 'Dó, Ré, Fá, Sol, Lá, Si, Dó#', 1],
    ['Qual é a nota sensível da escala de Dó maior?', 'Si', 'Fá', 2],
    ['Qual é o terceiro grau da escala de Dó maior?', 'Mi', 'Sol', 2],
    ['Qual é o quarto grau da escala de Dó maior?', 'Fá', 'Ré', 2],

    // ---- Acordes e harmonia ----
    ['O que é um acorde maior?', 'Acorde com terça maior e quinta justa', 'Acorde formado apenas por segundas', 2],
    ['O que é um acorde menor?', 'Acorde com terça menor e quinta justa', 'Acorde com terça maior e quinta aumentada', 2],
    ['Qual é a tríade de Sol maior?', 'Sol, Si e Ré', 'Sol, Lá e Dó', 2],
    ['Qual é a tríade de Fá maior?', 'Fá, Lá e Dó', 'Fá, Sol e Si', 2],
    ['Qual é a tríade de Lá menor?', 'Lá, Dó e Mi', 'Lá, Ré e Fá', 2],
    ['O que é uma tríade?', 'Acorde formado por três notas', 'Escala formada por três notas', 2],
    ['O que é arpejo?', 'Notas de um acorde tocadas sucessivamente', 'Notas tocadas sempre ao mesmo tempo', 2],
    ['Qual é a função do baixo em muitos arranjos musicais?', 'Sustentar a região grave e a base harmônica', 'Executar somente a melodia aguda', 2],
    ['O que é progressão harmônica?', 'Sequência de acordes', 'Sequência de pausas', 2],
    ['Qual grau é chamado de subdominante?', 'Quarto grau', 'Segundo grau', 2],
    ['Qual grau é chamado de mediante?', 'Terceiro grau', 'Quinto grau', 2],
    ['O que é cadência musical?', 'Sequência harmônica que cria sensação de conclusão ou continuidade', 'Uma técnica de afinação', 2],

    // ---- Andamento e expressão ----
    ['O que significa Largo?', 'Muito lento e amplo', 'Muito rápido', 2],
    ['O que significa Presto?', 'Muito rápido', 'Muito lento', 2],
    ['O que significa Moderato?', 'Em velocidade moderada', 'Em velocidade extremamente rápida', 2],
    ['O que significa Accelerando?', 'Aumentar gradualmente a velocidade', 'Diminuir gradualmente a velocidade', 2],
    ['O que significa a expressão a tempo?', 'Retornar ao andamento anterior ou indicado', 'Parar a execução', 2],
    ['O que significa ppp na partitura?', 'Pianississimo, extremamente suave', 'Fortissimo, muito forte', 2],
    ['O que significa fff na partitura?', 'Fortississimo, extremamente forte', 'Pianissimo, muito suave', 2],
    ['O que é rubato?', 'Flexibilidade expressiva do tempo', 'Execução sem variação de intensidade', 2],
    ['O que significa Maestoso?', 'De maneira majestosa', 'De maneira triste', 2],
    ['O que significa Dolce?', 'De maneira doce e suave', 'De maneira agressiva', 2],
    ['O que significa Con brio?', 'Com vivacidade e energia', 'Sem expressão', 2],
    ['O que significa a indicação solo?', 'Um único intérprete em destaque', 'Toda a orquestra tocando', 1],

    // ---- Instrumentos e famílias ----
    ['Qual instrumento pertence à família das madeiras?', 'Flauta', 'Trombone', 1],
    ['Qual instrumento pertence à família dos metais?', 'Trompete', 'Clarinete', 1],
    ['Qual instrumento pertence à família da percussão?', 'Xilofone', 'Violoncelo', 1],
    ['Qual instrumento possui quatro cordas e é tocado com arco?', 'Viola', 'Flauta', 1],
    ['Qual instrumento é maior que o violino e menor que o violoncelo?', 'Viola', 'Contrabaixo', 2],
    ['Qual instrumento possui a região mais grave entre estes?', 'Contrabaixo', 'Violino', 1],
    ['Qual instrumento de sopro possui uma palheta simples?', 'Saxofone', 'Flauta transversal', 2],
    ['Qual instrumento possui palheta dupla?', 'Fagote', 'Trompete', 2],
    ['Qual instrumento é tocado com baquetas e possui teclas de madeira?', 'Xilofone', 'Violão', 1],
    ['Qual instrumento de percussão possui altura definida?', 'Tímpano', 'Prato', 2],
    ['Qual instrumento é conhecido por possuir pedais?', 'Piano', 'Clarinete', 1],
    ['Qual instrumento é tocado com as mãos e possui cordas dedilhadas?', 'Harpa', 'Trombone', 1],

    // ---- Voz e canto ----
    ['Qual é a voz masculina mais aguda?', 'Tenor', 'Baixo', 1],
    ['Qual é a voz masculina intermediária?', 'Barítono', 'Soprano', 2],
    ['Qual é a voz feminina intermediária?', 'Mezzo-soprano', 'Tenor', 2],
    ['O que é um dueto?', 'Apresentação realizada por dois intérpretes', 'Apresentação realizada por cinco intérpretes', 1],
    ['O que é um coral?', 'Grupo de pessoas que canta em conjunto', 'Grupo formado apenas por instrumentos de sopro', 1],
    ['O que é afinação vocal?', 'Ajustar a voz às alturas corretas das notas', 'Cantar sempre em volume alto', 1],
    ['O que é tessitura vocal?', 'Extensão de notas que uma voz consegue executar com conforto', 'Velocidade da voz', 2],
    ['O que é canto a cappella?', 'Canto sem acompanhamento instrumental', 'Canto acompanhado apenas por bateria', 2],
    ['O que é uníssono no canto?', 'Várias vozes cantando a mesma melodia na mesma altura', 'Vozes cantando melodias diferentes', 2],
    ['O que é vibrato?', 'Oscilação expressiva da altura de uma nota', 'Interrupção do som', 2],
    ['O que é respiração diafragmática?', 'Técnica de controle respiratório com participação do diafragma', 'Respirar apenas pela boca', 2],
    ['O que é falsete?', 'Registro vocal produzido com configuração diferente da voz modal', 'Uma pausa na música', 2],

    // ---- História e cultura musical ----
    ['Qual compositor é associado ao período Barroco?', 'Johann Sebastian Bach', 'Claude Debussy', 2],
    ['Qual compositor é associado ao período Clássico?', 'Wolfgang Amadeus Mozart', 'John Cage', 2],
    ['Qual compositor é uma referência do Romantismo?', 'Frédéric Chopin', 'Antonio Vivaldi', 2],
    ['Qual compositor brasileiro criou a obra "O Trenzinho do Caipira"?', 'Heitor Villa-Lobos', 'Carlos Gomes', 2],
    ['Qual gênero musical nasceu no Rio de Janeiro e tem forte relação com o samba?', 'Choro', 'Reggae', 2],
    ['Qual instrumento é muito associado ao choro brasileiro?', 'Cavaquinho', 'Trompa', 1],
    ['Qual gênero musical tem origem na Jamaica?', 'Reggae', 'Fado', 1],
    ['Qual gênero musical brasileiro tem forte presença da sanfona?', 'Forró', 'Flamenco', 1],
    ['Qual gênero musical surgiu nos Estados Unidos e tem forte tradição de improvisação?', 'Jazz', 'Fado', 2],
    ['Qual gênero musical brasileiro é tradicionalmente associado à Bahia e ao samba de roda?', 'Axé', 'Country', 2],
    ['Quem é conhecido como o Rei do Baião?', 'Luiz Gonzaga', 'Tom Jobim', 1],
    ['Quem compôs a música "Garota de Ipanema" junto com Vinicius de Moraes?', 'Tom Jobim', 'Chico Buarque', 2]

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