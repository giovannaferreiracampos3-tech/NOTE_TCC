document.addEventListener('DOMContentLoaded', () => {
  
    // 1. CARREGAR NOME DO USUÁRIO DO CADASTRO / LOCALSTORAGE
    const storedName = localStorage.getItem('noteWave_user') || 'Mariana';
    document.getElementById('userName').textContent = storedName;
  
    // 2. SISTEMA DE CROP DE FOTO DE PERFIL
    const avatarInput = document.getElementById('avatarInput');
    const cropModal = document.getElementById('cropModal');
    const imageToCrop = document.getElementById('imageToCrop');
    const btnCancelCrop = document.getElementById('btnCancelCrop');
    const btnConfirmCrop = document.getElementById('btnConfirmCrop');
    const avatarImage = document.getElementById('avatarImage');
    let cropper = null;
  
    // Carregar foto de perfil salva anteriormente
    const savedAvatar = localStorage.getItem('noteWave_avatar');
    if (savedAvatar) {
      avatarImage.src = savedAvatar;
    }
  
    // Quando o usuário seleciona uma imagem
    avatarInput.addEventListener('change', (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        const reader = new FileReader();
  
        reader.onload = (event) => {
          imageToCrop.src = event.target.result;
          cropModal.classList.add('active');
  
          // Inicializa o Cropper
          if (cropper) cropper.destroy();
          cropper = new Cropper(imageToCrop, {
            aspectRatio: 1, // Corte quadrado/circular
            viewMode: 1,
            autoCropArea: 0.8
          });
        };
        reader.readAsDataURL(file);
      }
    });
  
    // Cancelar Corte
    btnCancelCrop.addEventListener('click', () => {
      cropModal.classList.remove('active');
      avatarInput.value = ''; // Reseta input
      if (cropper) cropper.destroy();
    });
  
    // Confirmar Corte
    btnConfirmCrop.addEventListener('click', () => {
      if (cropper) {
        const canvas = cropper.getCroppedCanvas({
          width: 200,
          height: 200
        });
        const croppedDataUrl = canvas.toDataURL('image/png');
        
        // Atualiza a imagem na tela e salva no localStorage
        avatarImage.src = croppedDataUrl;
        localStorage.setItem('noteWave_avatar', croppedDataUrl);
  
        // Fecha o Modal
        cropModal.classList.remove('active');
        cropper.destroy();
        avatarInput.value = '';
      }
    });
  
  
    // 3. ESTATÍSTICAS E DADOS (Iniciando Zerados / Podem ser atualizados futuramente via API ou Aulas)
    
    // Função para atualizar a rosca de progresso (0% a 100%)
    function setProgress(percent) {
      const circle = document.getElementById('progressCircle');
      const progressText = document.getElementById('progressText');
      const radius = circle.r.baseVal.value;
      const circumference = 2 * Math.PI * radius; // 389.55
  
      const offset = circumference - (percent / 100) * circumference;
      circle.style.strokeDashoffset = offset;
      progressText.textContent = `${percent}%`;
    }
  
    // Função para marcar dias concluídos na semana
    // Exemplo de uso: markWeekDays(['seg', 'ter', 'qua']);
    function markWeekDays(completedDaysArray) {
      completedDaysArray.forEach(day => {
        const el = document.getElementById(`day-${day.toLowerCase()}`);
        if (el) el.classList.add('completed');
      });
    }
  
    // 4. MEDALHAS REAIS (mesmas chaves e regras da página medalhas.html)
const MEDALHAS = [
  {
    chave: 'medalha_clave_sol', modulo: 'modulo1', titulo: 'Clave de Sol', tam: 30,
    svg: '<path fill="currentColor" d="M54.5,9 C50.1,9 46.2,16.5 45.1,25.4 C38.3,29.8 33.2,36.5 33.2,46.1 C33.2,58.3 42.1,65.2 50.5,65.2 C59.2,65.2 65.5,58.1 65.5,48.5 C65.5,41.3 61.2,35.4 55.3,32.3 C53.2,23.1 55.4,12.5 58.1,9.8 C56.8,9.2 55.7,9 54.5,9 Z M51.5,59.5 C46.2,59.5 40.8,55.1 40.8,47.2 C40.8,40.5 45.1,34.9 51.2,32.8 C53.2,41.2 57.1,51.8 59.2,56.8 C57.2,58.7 54.5,59.5 51.5,59.5 Z M53.5,67 C48.5,67 44,70.5 44,75.5 C44,80.5 48.5,84.5 53.5,84.5 C58.5,84.5 62.5,80.5 62.5,75.5 C62.5,70.5 58.5,67 53.5,67 Z"/>'
  },
  {
    chave: 'medalha_clave_fa', modulo: 'modulo2', titulo: 'Clave de Fá', tam: 28,
    svg: '<path fill="currentColor" d="M35,25 C45,20 62,24 62,42 C62,56 50,66 42,75 L36,75 C44,65 54,55 54,43 C54,34 43,30 36,33 L35,25 Z M70,33 A 4 4 0 1 1 70,32.9 Z M70,47 A 4 4 0 1 1 70,46.9 Z"/>'
  },
  {
    chave: 'medalha_nota_por_nota', modulo: 'modulo3', titulo: 'Nota por Nota', tam: 30,
    svg: '<path fill="currentColor" d="M35,25 L75,15 L75,55 C70,52 62,52 58,56 C52,62 52,72 58,78 C64,84 74,84 80,78 C83,75 85,70 85,65 L85,25 L45,35 L45,65 C40,62 32,62 28,66 C22,72 22,82 28,88 C34,94 44,94 50,88 C53,85 55,80 55,75 L55,42 L35,47 Z"/>'
  },
  {
    chave: 'medalha_ritmo', modulo: 'modulo4', titulo: 'Ritmo e Pulsação', tam: 28,
    svg: '<path fill="currentColor" d="M50,15 L22,78 L78,78 Z M50,28 L68,70 L32,70 Z M47,42 L53,42 L51,62 L47,62 Z M50,67 A 2.5 2.5 0 1 1 50,66.9 Z"/>'
  },
  {
    chave: 'medalha_avancada', modulo: 'modulo5', titulo: 'Leitura Avançada', tam: 28,
    svg: '<path fill="currentColor" d="M25,20 L25,75 C25,83 35,83 35,75 L35,35 L75,35 L75,65 C75,73 85,73 85,65 L85,20 Z M35,45 L75,45 L75,49 L35,49 Z M35,57 L75,57 L75,61 L35,61 Z"/>'
  }
];

function renderizarMedalhas() {
  const grid = document.getElementById('badgesGrid');
  if (!grid) return;

  let progresso = {};
  try { progresso = JSON.parse(localStorage.getItem('progressoModulos')) || {}; } catch (e) {}

  let desbloqueadas = 0;
  grid.innerHTML = '';

  MEDALHAS.forEach(m => {
    const ativa = localStorage.getItem(m.chave) === 'true' || progresso[m.modulo] === 100;
    if (ativa) desbloqueadas++;

    const item = document.createElement('a');
    item.href = '../html/medalhas.html';
    item.className = 'badge-item' + (ativa ? '' : ' locked');
    item.title = ativa ? 'Desbloqueada' : 'Bloqueada';
    item.innerHTML = `
      <div class="badge-icon">
        <svg viewBox="0 0 100 100" style="width:${m.tam}px;height:${m.tam}px;">${m.svg}</svg>
      </div>
      <span>${m.titulo}</span>
    `;
    grid.appendChild(item);
  });

  return { desbloqueadas, total: MEDALHAS.length };
}

const resumo = renderizarMedalhas();
  
   // 5. SEQUÊNCIA DE ESTUDOS
const CHAVE_DIAS = 'noteWave_diasEstudo';

// Data no fuso local (toISOString usa UTC e erraria o dia à noite no Brasil)
function dataLocal(d = new Date()) {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// 6. PROGRESSO GERAL (4 atividades de 25% cada)
const VALOR_ATIVIDADE = 25;

function porcentagemClave(prefixo, listaDeLicoes) {
  if (!Array.isArray(listaDeLicoes) || listaDeLicoes.length === 0) return 0;

  const concluidas = listaDeLicoes.filter(
    licao => localStorage.getItem(`${prefixo}${licao.id}`)
  ).length;

  // Proporcional: cada lição feita faz a atividade crescer um pouco
  return (concluidas / listaDeLicoes.length) * VALOR_ATIVIDADE;
}

function porcentagemLeitura(chave) {
  return localStorage.getItem(chave) === 'true' ? VALOR_ATIVIDADE : 0;
}

function calcularProgressoGeral() {
  const sol = typeof licoesDeNotasSol !== 'undefined' ? licoesDeNotasSol : [];
  const fa  = typeof licoesDeNotasFa  !== 'undefined' ? licoesDeNotasFa  : [];

  const total =
    porcentagemLeitura('status_leitura_sol_concluida') +   // Leitura (Sol)
    porcentagemClave('status_sol_concluido_licao_', sol) + // Clave de Sol
    porcentagemLeitura('status_leitura_fa_concluida') +    // Leitura (Fá)
    porcentagemClave('status_fa_concluido_licao_', fa);    // Clave de Fá

  return Math.round(total);
}

function atualizarProgressoPerfil() {
  setProgress(calcularProgressoGeral());
}

atualizarProgressoPerfil();

// Atualiza ao voltar para a página pelo botão "voltar" do navegador
window.addEventListener('pageshow', atualizarProgressoPerfil);

function carregarDias() {
  try { return JSON.parse(localStorage.getItem(CHAVE_DIAS)) || []; }
  catch (e) { return []; }
}

function registrarVisitaHoje() {
  const dias = carregarDias();
  const hoje = dataLocal();
  if (!dias.includes(hoje)) {
    dias.push(hoje);
    localStorage.setItem(CHAVE_DIAS, JSON.stringify(dias.slice(-120)));
  }
  return dias;
}

// Conta quantos dias seguidos, de hoje para trás
function calcularSequencia(dias) {
  const set = new Set(dias);
  const d = new Date();
  let total = 0;
  while (set.has(dataLocal(d))) {
    total++;
    d.setDate(d.getDate() - 1);
  }
  return total;
}

function atualizarSequencia() {
  const dias = registrarVisitaHoje();
  const set = new Set(dias);
  const sequencia = calcularSequencia(dias);

  // Número e chama principal
  document.getElementById('streakDays').textContent = sequencia;
  const flame = document.querySelector('.flame-icon');
  if (flame) flame.classList.toggle('apagada', sequencia === 0);

  const sub = document.querySelector('.streak-subtext');
  if (sub) {
    sub.textContent = sequencia > 1 ? 'Continue assim!' : 'Boa! Volte amanhã para manter a sequência.';
  }

  // Semana atual (segunda a domingo)
  const ordem = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
  const hoje = new Date();
  const segunda = new Date(hoje);
  segunda.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));

  ordem.forEach((id, i) => {
    const data = new Date(segunda);
    data.setDate(segunda.getDate() + i);

    const item = document.getElementById(`day-${id}`);
    if (!item) return;
    const circulo = item.querySelector('.day-circle');

    const estudou = set.has(dataLocal(data));
    item.classList.toggle('completed', estudou);
    item.classList.toggle('today', dataLocal(data) === dataLocal(hoje));
    circulo.innerHTML = estudou
      ? '<i class="day-flame">🔥</i>'
      : '<i class="ph ph-check"></i>';
  });
}

atualizarSequencia();

  });