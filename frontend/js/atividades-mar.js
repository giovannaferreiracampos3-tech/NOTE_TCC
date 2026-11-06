// NoteWave - Recife de Atividades (4 atividades, sons gerados no navegador)
const $ = id => document.getElementById(id);
const TOTAL = 8;
const NOMES = ['Dó','Ré','Mi','Fá','Sol','Lá','Si'];
const SEMI = [0,2,4,5,7,9,11];
const CLAVES = { sol: { base: 30, glifo: '𝄞', nome: 'Sol' }, fa: { base: 18, glifo: '𝄢', nome: 'Fá' } };
// d = passo diatônico (oitava*7 + índice da nota). Dó central = 28
const nome = d => NOMES[((d % 7) + 7) % 7];
const midi = d => 12 * (Math.floor(d / 7) + 1) + SEMI[((d % 7) + 7) % 7];
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);

// ---------- Áudio ----------
let ctx;
function tocar(d, quando = 0, dur = 0.9) {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const t = ctx.currentTime + quando;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = 440 * Math.pow(2, (midi(d) - 69) / 12);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.35, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.05);
  } catch (e) { /* sem áudio disponível */ }
}

// Encaixa a clave na pauta medindo a "tinta" do glifo (independe da fonte do sistema)
// topo/base = onde a tinta deve começar e terminar, em coordenadas do SVG
const ALVO_CLAVE = { sol: { topo: 38, base: 150 }, fa: { topo: 53, base: 105 } };
const FALLBACK_CLAVE = { sol: { size: 96, y: 100 }, fa: { size: 84, y: 102 } };
const _medidas = {};
function medeClave(clave) {
  if (_medidas[clave]) return _medidas[clave];
  let r = FALLBACK_CLAVE[clave];
  try {
    const alvo = ALVO_CLAVE[clave];
    const c = document.createElement('canvas').getContext('2d');
    c.font = `100px ${getComputedStyle(document.body).fontFamily}`;
    const m = c.measureText(CLAVES[clave].glifo);
    const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    if (h > 0) {
      const size = (alvo.base - alvo.topo) / h * 100;
      r = { size, y: alvo.base - m.actualBoundingBoxDescent * size / 100 };
    }
  } catch (e) { /* usa o fallback */ }
  return (_medidas[clave] = r);
}

// ---------- Pauta em SVG ----------
// passo 0 = primeira linha de baixo; cada passo = 8px
function pauta(clave, { nota, nota2, clicavel, onPick, cor } = {}) {
  const base = CLAVES[clave].base, X = 210, Y0 = 124;
  const y = s => Y0 - s * 8;
  let h = `<svg viewBox="0 0 360 190" role="img" aria-label="Pauta na clave de ${CLAVES[clave].nome}">`;
  for (let s = 0; s <= 8; s += 2) h += `<line x1="20" x2="340" y1="${y(s)}" y2="${y(s)}" stroke="#0b3c5d" stroke-width="2"/>`;
  const k = medeClave(clave);
  h += `<text x="28" y="${k.y}" font-size="${k.size}" fill="#0b3c5d">${CLAVES[clave].glifo}</text>`;
  const desenha = (s, c, x) => {
    let r = '';
    if (s <= -2) for (let k = -2; k >= s; k -= 2) r += `<line x1="${x - 18}" x2="${x + 18}" y1="${y(k)}" y2="${y(k)}" stroke="#0b3c5d" stroke-width="2"/>`;
    if (s >= 10) for (let k = 10; k <= s; k += 2) r += `<line x1="${x - 18}" x2="${x + 18}" y1="${y(k)}" y2="${y(k)}" stroke="#0b3c5d" stroke-width="2"/>`;
    return r + `<ellipse cx="${x}" cy="${y(s)}" rx="11" ry="8" fill="${c}" transform="rotate(-18 ${x} ${y(s)})"/>`;
  };
  if (nota != null) h += desenha(nota - base, cor || '#0b3c5d', X);
  if (nota2 != null) h += desenha(nota2 - base, '#1b9aaa', X + 60);
  if (clicavel) for (let s = -2; s <= 10; s++) {
    h += `<circle class="slot" data-s="${s}" cx="${X}" cy="${y(s)}" r="9" tabindex="0" role="button" aria-label="Posição ${s + 3} de 13, de baixo para cima"/>`;
  }
  const el = document.createElement('div');
  el.innerHTML = h + '</svg>';
  if (clicavel) el.querySelectorAll('.slot').forEach(c => {
    const go = () => onPick(base + +c.dataset.s);
    c.onclick = go;
    c.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
  });
  return el.firstChild;
}

// ---------- Atividades ----------
const faixa = clave => { const b = CLAVES[clave].base; return rnd(b - 2, b + 10); };
function quatro(correta) {
  const outras = shuffle(NOMES.filter(n => n !== correta)).slice(0, 3);
  return shuffle([correta, ...outras]);
}
const ATIVIDADES = {
  ouvir: {
    icone: '🎧', titulo: 'Ouça a Onda', desc: 'Escute uma nota e descubra o nome dela. Depois veja onde ela mora na pauta.',
    rodada() {
      const clave = Math.random() < .5 ? 'sol' : 'fa', d = faixa(clave);
      return {
        prompt: `Qual nota você ouviu? (Clave de ${CLAVES[clave].nome})`,
        stage: s => { botaoOuvir(s, () => tocar(d)); tocar(d, .2); },
        opcoes: quatro(nome(d)), certa: nome(d),
        revela: s => { s.append(pauta(clave, { nota: d, cor: '#2fa85a' })); },
        msg: `Era ${nome(d)}. Repare na posição dela: ${(d - CLAVES[clave].base) % 2 === 0 ? 'está sobre uma linha' : 'está em um espaço'}.`
      };
    }
  },
  pauta: {
    icone: '🐚', titulo: 'Pesque a Nota', desc: 'Toque na pauta o lugar certo da nota pedida. Cada nota tem mais de um lugar!',
    rodada() {
      const clave = Math.random() < .5 ? 'sol' : 'fa', alvo = nome(faixa(clave));
      return {
        prompt: `Toque uma posição de ${alvo} na clave de ${CLAVES[clave].nome}.`,
        stage: (s, responder) => s.append(pauta(clave, { clicavel: true, onPick: d => {
          tocar(d); responder(nome(d) === alvo, `Você tocou ${nome(d)}.`, pauta(clave, { nota: d, cor: nome(d) === alvo ? '#2fa85a' : '#e53e3e' }), alvo);
        } })),
        msg: `Dica: as notas seguem a ordem Dó Ré Mi Fá Sol Lá Si, subindo de linha para espaço.`
      };
    }
  },
  sobe: {
    icone: '🌊', titulo: 'Sobe ou Desce?', desc: 'Duas notas tocam em sequência. A melodia foi para cima ou para baixo?',
    rodada() {
      const a = rnd(26, 36); let b = a + rnd(1, 4) * (Math.random() < .5 ? -1 : 1);
      const tocarPar = () => { tocar(a); tocar(b, .7); };
      return {
        prompt: 'A segunda nota ficou mais aguda ou mais grave?',
        stage: s => { botaoOuvir(s, tocarPar); tocarPar(); },
        opcoes: ['Subiu', 'Desceu'], certa: b > a ? 'Subiu' : 'Desceu',
        msg: `${nome(a)} → ${nome(b)}: ${b > a ? 'notas mais agudas ficam mais acima' : 'notas mais graves ficam mais abaixo'} na pauta.`
      };
    }
  },
  teoria: {
    icone: '🏝️', titulo: 'Maré de Teoria', desc: 'Figuras musicais, compassos, sustenidos e dinâmica em perguntas rápidas.',
    rodada() {
      const q = shuffle(BANCO)[0];
      return { prompt: q[0], stage: s => { const p = document.createElement('div'); p.className = 'big'; p.textContent = q[1]; s.append(p); },
        opcoes: shuffle(q[2]), certa: q[2][0], msg: q[3] };
    }
  }
};
// [pergunta, símbolo/ilustração, [certa, erradas...], explicação]
const BANCO = [
  ['Quantos tempos dura uma semibreve?', '𝅝', ['4 tempos', '2 tempos', '1 tempo', '½ tempo'], 'A semibreve é a figura mais longa: vale 4 tempos.'],
  ['Qual figura vale 2 tempos?', '𝅗𝅥', ['Mínima', 'Semínima', 'Colcheia', 'Semibreve'], 'A mínima vale 2 tempos, metade da semibreve.'],
  ['Quantos tempos dura uma semínima?', '♩', ['1 tempo', '2 tempos', '4 tempos', '½ tempo'], 'A semínima é a unidade de tempo mais comum: vale 1 tempo.'],
  ['Qual é o nome desta figura?', '♪', ['Colcheia', 'Semínima', 'Mínima', 'Fusa'], 'A colcheia tem uma bandeirola e vale ½ tempo.'],
  ['O que o sustenido faz com a nota?', '♯', ['Sobe meio tom', 'Desce meio tom', 'Dobra a duração', 'Cancela o som'], 'O sustenido (♯) deixa a nota meio tom mais aguda.'],
  ['O que o bemol faz com a nota?', '♭', ['Desce meio tom', 'Sobe meio tom', 'Deixa mais forte', 'Deixa mais curta'], 'O bemol (♭) deixa a nota meio tom mais grave.'],
  ['No compasso 4/4, o número de cima indica…', '4/4', ['Quantos tempos há em cada compasso', 'A velocidade da música', 'A clave usada', 'O volume'], 'O número de cima diz quantos tempos cabem em cada compasso.'],
  ['Quantas linhas tem a pauta?', '═', ['5', '4', '6', '3'], 'A pauta tem 5 linhas e 4 espaços.'],
  ['O que significa a dinâmica f (forte)?', 'f', ['Tocar com som forte', 'Tocar bem devagar', 'Tocar com som suave', 'Parar de tocar'], 'f vem de forte. Seu oposto é p, de piano (suave).'],
  ['O que significa a dinâmica p (piano)?', 'p', ['Tocar com som suave', 'Tocar com som forte', 'Tocar rápido', 'Repetir o trecho'], 'p vem de piano: toque suave, como a maré baixa.'],
  ['A clave de Sol marca qual nota na 2ª linha?', '𝄞', ['Sol', 'Fá', 'Dó', 'Ré'], 'A espiral da clave de Sol circula a 2ª linha: é o Sol.'],
  ['A clave de Fá marca a nota Fá em qual linha?', '𝄢', ['4ª linha', '2ª linha', '1ª linha', '5ª linha'], 'Os dois pontinhos da clave de Fá ficam em volta da 4ª linha.'],
  ['O que é uma pausa?', '𝄽', ['Um símbolo de silêncio', 'Uma nota longa', 'Um tipo de clave', 'Um sinal de repetição'], 'A pausa marca silêncio, e o silêncio também faz parte da música.'],
  ['Depois de Si, qual nota vem na sequência?', 'Lá Si …', ['Dó (oitava acima)', 'Lá', 'Ré', 'Fá'], 'Depois do Si a sequência recomeça no Dó, uma oitava acima.']
];
function botaoOuvir(s, fn) {
  const b = document.createElement('button');
  b.className = 'listen'; b.textContent = '🔊 Ouvir';
  b.onclick = fn; s.append(b); b.focus();
}

// ---------- Fluxo ----------
let atual, rodada, n, acertos, respondeu;
const chave = id => 'status_mar_' + id; // prefixo status_ = salvo na conta pelo nw-sync.js
const estrelas = p => p >= 80 ? 3 : p >= 50 ? 2 : p >= 25 ? 1 : 0;
const melhor = id => +localStorage.getItem(chave(id)) || 0;
function ver(id) { ['hub', 'game', 'result'].forEach(x => $(x).hidden = x !== id); }

function hub() {
  ver('hub');
  let total = 0; $('cards').innerHTML = '';
  Object.entries(ATIVIDADES).forEach(([id, a]) => {
    const m = melhor(id); total += m;
    const c = document.createElement('button');
    c.className = 'card';
    c.innerHTML = `<span class="ico" aria-hidden="true">${a.icone}</span><h3>${a.titulo}</h3><p>${a.desc}</p><span class="best">${m ? '⭐'.repeat(m) : 'Ainda sem estrelas'}</span>`;
    c.onclick = () => iniciar(id);
    $('cards').append(c);
  });
  const feitas = Object.keys(ATIVIDADES).filter(id => melhor(id) === 3).length;
  $('medalHint').textContent = feitas === 4
    ? '🏅 Medalha Mestre do Recife conquistada!'
    : `🏅 Medalha Mestre do Recife: ${feitas} de 4 atividades com 3 estrelas`;
  $('totalStars').textContent = total;
}
function iniciar(id) { atual = id; n = 0; acertos = 0; ver('game'); proxima(); }
function proxima() {
  if (n >= TOTAL) return fim();
  respondeu = false; $('fb').hidden = true;
  rodada = ATIVIDADES[atual].rodada();
  $('prompt').textContent = rodada.prompt;
  $('tideFill').style.width = (n / TOTAL * 100) + '%';
  $('tide').setAttribute('aria-valuenow', n);
  $('hits').textContent = acertos + (acertos === 1 ? ' acerto' : ' acertos');
  const stage = $('stage'); stage.innerHTML = '';
  const op = $('options'); op.innerHTML = '';
  rodada.stage(stage, responder);
  (rodada.opcoes || []).forEach(t => {
    const b = document.createElement('button');
    b.className = 'opt'; b.textContent = t;
    b.onclick = () => { responder(t === rodada.certa, '', null, t, b); };
    op.append(b);
  });
}
function responder(ok, extra, reveladoSvg, escolha, botao) {
  if (respondeu) return; respondeu = true;
  if (ok) acertos++;
  document.querySelectorAll('.opt').forEach(b => {
    b.disabled = true;
    if (b.textContent === rodada.certa) b.classList.add('right');
  });
  if (botao && !ok) botao.classList.add('wrong');
  if (rodada.revela) rodada.revela($('stage'));
  if (reveladoSvg) { $('stage').innerHTML = ''; $('stage').append(reveladoSvg); }
  const fb = $('fb'); fb.className = 'fb ' + (ok ? 'good' : 'miss'); fb.hidden = false;
  $('fbTitle').textContent = ok ? 'Isso mesmo!' : 'Quase lá!';
  $('fbMsg').textContent = (extra ? extra + ' ' : '') + rodada.msg;
  n++;
  $('fbBtn').textContent = n >= TOTAL ? 'Ver resultado' : 'Continuar';
  $('fbBtn').onclick = proxima; $('fbBtn').focus();
}
function fim() {
  $('fb').hidden = true; ver('result');
  const p = Math.round(acertos / TOTAL * 100), e = estrelas(p);
  if (e > melhor(atual)) localStorage.setItem(chave(atual), e);
  const completo = Object.keys(ATIVIDADES).every(id => melhor(id) === 3);
  const nova = completo && localStorage.getItem('medalha_recife') !== 'true';
  if (completo) localStorage.setItem('medalha_recife', 'true');
  $('medalLink').hidden = !completo;
  $('resTitle').textContent = `${acertos} de ${TOTAL} (${p}%)`;
  $('resStars').innerHTML = [0, 1, 2].map(i => `<span class="${i < e ? '' : 'off'}">⭐</span>`).join('');
  $('resMsg').textContent = e === 3 ? 'Você pegou a onda perfeita! Tente outra atividade do recife.'
    : e >= 1 ? 'Bom mergulho! Mais uma rodada e as 3 estrelas aparecem.'
    : 'A maré subiu rápido. Cada tentativa treina o ouvido, tente de novo!';
    if (nova) $('resMsg').textContent = '🏅 Você conquistou a medalha Mestre do Recife! Três estrelas em todas as atividades.';
}
$('again').onclick = () => iniciar(atual);
$('toHub').onclick = hub;
$('quit').onclick = () => { if (confirm('Sair desta atividade? O progresso da rodada será perdido.')) hub(); };
hub();