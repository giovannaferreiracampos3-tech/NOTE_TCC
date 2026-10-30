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
  
    // Função para desbloquear medalhas por ID (1 a 5)
    function unlockBadge(badgeId) {
      const badge = document.getElementById(`badge-${badgeId}`);
      if (badge) {
        badge.classList.remove('locked');
        // Troca ícone se for de cadeado
        if (badgeId === 4) badge.querySelector('.badge-icon i').className = 'ph ph-metronome';
        if (badgeId === 5) badge.querySelector('.badge-icon i').className = 'ph ph-book-open-text';
      }
    }
  
    // ESTADO INICIAL (ZERADO POR PADRÃO CONFORME SOLICITADO)
    document.getElementById('streakDays').textContent = "0";
    setProgress(0); // 0% de progresso inicial
  
    /* 
      Exemplo de como ativar conforme o usuário progredir:
      
      // Se quiser testar valores ativos, basta descomentar as linhas abaixo:
      // document.getElementById('streakDays').textContent = "12";
      // setProgress(65);
      // markWeekDays(['seg', 'ter', 'qua', 'qui', 'sex']);
      // unlockBadge(1);
      // unlockBadge(2);
      // unlockBadge(3);
    */
  });