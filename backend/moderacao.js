/* NoteWave – moderação por palavras-chave (roda NO SERVIDOR; o navegador pode ser burlado).
   Uso:  const { moderar } = require('./moderacao');
         const r = moderar({ título: '...', texto: '...' });
         if (!r.ok) return res.status(422).json({ erro: r.mensagem });

   As listas abaixo são um PONTO DE PARTIDA. Acrescente termos conforme a necessidade.
   Palavras são comparadas inteiras (assim "computador" não é bloqueado por conter "puto"). */

// ---------- listas (edite à vontade) ----------
const LISTAS = {
    ofensa: [
      'puta', 'puto', 'putaria', 'caralho', 'porra', 'buceta', 'cuzao', 'cu', 'foda', 'foder', 'fodase',
      'fdp', 'vsf', 'vtnc', 'arrombado', 'babaca', 'otario', 'idiota', 'imbecil', 'retardado', 'merda',
      'desgracado', 'vagabundo', 'vagabunda', 'piranha', 'lixo humano'
    ],
    discriminacao: ['viado', 'sapatao', 'traveco', 'crioulo', 'mongoloide'],
    sexual: ['porno', 'pornografia', 'xvideos', 'pornhub', 'nudes', 'nude', 'punheta', 'siririca', 'onlyfans', 'hentai', 'sexo explicito'],
    spam: [
      'ganhe dinheiro', 'dinheiro facil', 'renda extra', 'clique aqui', 'link na bio', 'chama no whatsapp',
      'chama no zap', 'pix', 'lucro garantido', 'investimento garantido', 'siga meu perfil', 'promocao imperdivel'
    ]
  };
  
  // Frases (regex sobre o texto normalizado)
  const FRASES = {
    violencia: [
      /\bcomo (se )?(matar|suicidar)\b/, /\bvou (te )?matar\b/, /\bmetodos? de suicidio\b/,
      /\bcomo fazer (uma )?bomba\b/, /\bmatem (todos|esse|essa)\b/
    ],
    drogas: [
      /\b(vendo|vende|compre|compra|entrego|entrega)\b.{0,40}\b(maconha|cocaina|crack|lsd|ecstasy|droga|drogas)\b/
    ]
  };
  
  const MENSAGENS = {
    ofensa: 'Seu texto contém linguagem ofensiva. Reescreva sem xingamentos para publicar.',
    discriminacao: 'Seu texto contém termos discriminatórios, que não são permitidos na comunidade.',
    sexual: 'Conteúdo sexual ou adulto não é permitido no Journal.',
    spam: 'Seu texto parece propaganda ou golpe. Propagandas não são permitidas.',
    violencia: 'Conteúdo que incentiva violência ou autoagressão não é permitido. Se você está passando por um momento difícil, procure alguém de confiança ou ligue 188 (CVV, 24h).',
    drogas: 'Venda ou oferta de drogas não é permitida.',
    contato: 'Não é permitido publicar links, e-mails ou telefones. Remova esses dados para continuar.',
    caps: 'Evite escrever tudo em MAIÚSCULAS. Reescreva em letras normais.'
  };
  
  // ---------- normalização ----------
  function normalizar(t) {
    let s = String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // "p u t a", "p.u.t.a", "p-u-t-a"  =>  "puta"
    s = s.replace(/\b(?:[a-z0-9@$][\s.\-_*]+){2,}[a-z0-9@$]\b/g, m => m.replace(/[\s.\-_*]+/g, ''));
    // leetspeak: 4->a, 3->e, 1->i, 0->o, 5/$->s, 7->t, @->a
    s = s.replace(/[@4]/g, 'a').replace(/3/g, 'e').replace(/[1!|]/g, 'i').replace(/0/g, 'o').replace(/[$5]/g, 's').replace(/7/g, 't');
    // letras repetidas: "puuuta" => "puta"
    s = s.replace(/([a-z])\1+/g, '$1');
    return s.replace(/\s+/g, ' ');
  }
  
  const escapar = w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const REGEX_LISTAS = Object.fromEntries(Object.entries(LISTAS).map(([cat, palavras]) => [
    cat,
    new RegExp('(^|[^a-z])(' + palavras.map(w => escapar(normalizar(w))).join('|') + ')(?:s|es)?(?=$|[^a-z])')
  ]));
  
  // Dados de contato / links: verificados no texto ORIGINAL
  const CONTATO = [
    /(https?:\/\/|www\.)/i,
    /\b[a-z0-9-]+\.(com|net|org|br|io|me|ly|gg|xyz|tk|app|dev)\b/i,
    /[^\s@]+@[^\s@]+\.[a-z]{2,}/i,
    /(\+?55)?\s?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/
  ];
  
  function verificarTexto(texto) {
    const original = String(texto || '');
    if (CONTATO.some(r => r.test(original))) return 'contato';
  
    const letras = original.replace(/[^A-Za-zÀ-ÿ]/g, '');
    if (letras.length > 40 && original.replace(/[^A-ZÀ-Þ]/g, '').length / letras.length > 0.7) return 'caps';
  
    const n = normalizar(original);
    for (const [cat, rx] of Object.entries(REGEX_LISTAS)) if (rx.test(n)) return cat;
    for (const [cat, lista] of Object.entries(FRASES)) if (lista.some(rx => rx.test(n))) return cat;
    return null;
  }
  
  /** campos: { 'título': '...', 'resumo': '...', 'texto': '...' } */
  function moderar(campos) {
    for (const [nome, texto] of Object.entries(campos)) {
      const cat = verificarTexto(texto);
      if (cat) return { ok: false, campo: nome, categoria: cat, mensagem: `${MENSAGENS[cat]} (Campo: ${nome})` };
    }
    return { ok: true };
  }
  
  module.exports = { moderar, normalizar };