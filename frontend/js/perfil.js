/* NoteWave – Perfil
   - Nome do usuário
   - Foto de perfil (recorte com Cropper.js, salva na conta pelo servidor)
   - Medalhas, sequência de estudos e progresso geral

   Se a API estiver em outro endereço, defina antes deste script:
     window.NW_API_BASE = 'https://note-tcc-backend.vercel.app/api'            */
     document.addEventListener('DOMContentLoaded', () => {
      const $ = id => document.getElementById(id);
      const ls = window.localStorage;
    
      // ---------------------------------------------------------------
      // 0. CONFIGURAÇÃO DA API
      // ---------------------------------------------------------------
      const API_BASE = window.NW_API_BASE
        || (window.NW_API_PROGRESSO ? window.NW_API_PROGRESSO.replace(/\/progresso\/?$/, '') : '')
        || 'https://note-tcc-backend.vercel.app/api';
      const HOST = API_BASE.replace(/\/api\/?$/, '');
      const fotoUrl = p => !p ? '' : /^https?:|^data:|^blob:/.test(p) ? p : HOST + p;
      const token = () => ls.getItem('token');
      const authHeaders = () => ({ Authorization: 'Bearer ' + token() });
    
      // ---------------------------------------------------------------
      // 1. NOME DO USUÁRIO
      // ---------------------------------------------------------------
      const nomeEl = $('userName');
      if (nomeEl) nomeEl.textContent = ls.getItem('noteWave_user') || 'Mariana';
    
      // ---------------------------------------------------------------
      // 2. FOTO DE PERFIL (recorte + salvar na conta)
      // ---------------------------------------------------------------
      const CHAVE_FOTO = 'noteWave_avatar';          // guarda só a URL da foto, para as páginas mostrarem rápido
      const avatarInput = $('avatarInput');
      const cropModal = $('cropModal');
      const imageToCrop = $('imageToCrop');
      const btnCancelCrop = $('btnCancelCrop');
      const btnConfirmCrop = $('btnConfirmCrop');
      const avatarImage = $('avatarImage');
      const fotoPadrao = avatarImage ? avatarImage.getAttribute('src') : null;
      let cropper = null;
    
      // Mostra a foto guardada (ou a imagem padrão da página, se não houver)
      function mostrarFoto() {
        if (!avatarImage) return;
        const f = ls.getItem(CHAVE_FOTO);
        if (f) avatarImage.src = fotoUrl(f);
        else if (fotoPadrao !== null) avatarImage.setAttribute('src', fotoPadrao);
      }
    
      // Confere com o servidor qual é a foto da conta (vale também para outro aparelho)
      async function buscarFotoDaConta() {
        if (!token()) return;
        try {
          const r = await fetch(API_BASE + '/usuarios/me/foto', { headers: authHeaders() });
          if (!r.ok) return;
          const { foto } = await r.json();
          if (foto) ls.setItem(CHAVE_FOTO, fotoUrl(foto));
          else ls.removeItem(CHAVE_FOTO);
          mostrarFoto();
        } catch (e) { /* servidor fora do ar: continua com a foto que já estava */ }
      }
    
      function fecharCropper() {
        if (cropModal) cropModal.classList.remove('active');
        if (avatarInput) avatarInput.value = '';
        if (cropper) { cropper.destroy(); cropper = null; }
      }
    
      if (avatarImage) {
        mostrarFoto();           // na hora, com o que já está no navegador
        buscarFotoDaConta();     // e depois confirma com o servidor
      }
    
      if (avatarInput && cropModal && imageToCrop && btnCancelCrop && btnConfirmCrop && avatarImage) {
    
        // Quando o usuário seleciona uma imagem
        avatarInput.addEventListener('change', e => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
    
          if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
            alert('Use uma imagem PNG, JPG ou WEBP.');
            avatarInput.value = '';
            return;
          }
          if (file.size > 8 * 1024 * 1024) {
            alert('A imagem é grande demais (máximo 8 MB).');
            avatarInput.value = '';
            return;
          }
    
          const reader = new FileReader();
          reader.onload = ev => {
            if (cropper) { cropper.destroy(); cropper = null; }
            imageToCrop.src = ev.target.result;
            cropModal.classList.add('active');
            cropper = new Cropper(imageToCrop, {
              aspectRatio: 1,      // corte quadrado/circular
              viewMode: 1,
              autoCropArea: 0.8
            });
          };
          reader.onerror = () => alert('Não consegui ler essa imagem. Tente outro arquivo.');
          reader.readAsDataURL(file);
        });
    
        // Cancelar corte
        btnCancelCrop.addEventListener('click', fecharCropper);
    
        // Confirmar corte: envia o recorte para o servidor
        btnConfirmCrop.addEventListener('click', () => {
          if (!cropper) return;
          if (!token()) { alert('Entre na sua conta para salvar a foto.'); return; }
    
          const canvas = cropper.getCroppedCanvas({ width: 200, height: 200 });
          const textoOriginal = btnConfirmCrop.textContent;
          btnConfirmCrop.disabled = true;
          btnConfirmCrop.textContent = 'Salvando…';
    
          canvas.toBlob(async blob => {
            try {
              if (!blob) throw new Error('Não foi possível preparar a imagem.');
    
              const fd = new FormData();
              fd.append('foto', blob, 'avatar.png');
    
              let r;
              try {
                r = await fetch(API_BASE + '/usuarios/me/foto', { method: 'PUT', headers: authHeaders(), body: fd });
              } catch (e) {
                throw new Error('Não foi possível falar com o servidor. Verifique se ele está ligado.');
              }
              const d = await r.json().catch(() => ({}));
              if (r.status === 401) throw new Error('Sua sessão expirou. Entre de novo para salvar a foto.');
              if (!r.ok) throw new Error(d.erro || 'Não foi possível salvar a foto.');
    
              const url = fotoUrl(d.foto);   // o nome do arquivo é novo a cada envio, então não há cache antigo
              ls.setItem(CHAVE_FOTO, url);
              avatarImage.src = url;
              // Avisa outros scripts da página (por exemplo, o menu lateral) que a foto mudou
              window.dispatchEvent(new CustomEvent('nw-avatar', { detail: { url } }));
    
              fecharCropper();
            } catch (e) {
              alert(e.message);
            } finally {
              btnConfirmCrop.disabled = false;
              btnConfirmCrop.textContent = textoOriginal;
            }
          }, 'image/png');
        });
      }
    
      // ---------------------------------------------------------------
      // 3. MEDALHAS (mesmas chaves e regras da página medalhas.html)
      // ---------------------------------------------------------------
      const ATIVIDADES_RECIFE = ['ouvir', 'pauta', 'sobe', 'teoria'];
    
      // Mestre do Recife: 3 estrelas em cada uma das 4 atividades
      function recifeCompleto() {
        return ATIVIDADES_RECIFE.every(id => Number(ls.getItem('status_mar_' + id)) === 3);
      }
    
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
          chave: 'medalha_recife', modulo: 'recife', titulo: 'Mestre do Recife', tam: 30,
          regra: recifeCompleto,
          svg: '<path fill="currentColor" d="M50,10 L61,37 L90,40 L68,60 L75,89 L50,74 L25,89 L32,60 L10,40 L39,37 Z"/>'
        }
      ];
    
      function renderizarMedalhas() {
        const grid = $('badgesGrid');
        if (!grid) return;
    
        let progresso = {};
        try { progresso = JSON.parse(ls.getItem('progressoModulos')) || {}; } catch (e) { /* sem progresso salvo */ }
    
        grid.innerHTML = '';
    
        MEDALHAS.forEach(m => {
          const ativa = ls.getItem(m.chave) === 'true'
            || progresso[m.modulo] === 100
            || (typeof m.regra === 'function' && m.regra());
    
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
      }
    
      // ---------------------------------------------------------------
      // 4. PROGRESSO GERAL (4 atividades de 25% cada)
      // ---------------------------------------------------------------
      const VALOR_ATIVIDADE = 25;
    
      // Rosca de progresso (0% a 100%)
      function setProgress(percent) {
        const circle = $('progressCircle');
        const progressText = $('progressText');
        if (!circle || !progressText) return;
        const radius = circle.r.baseVal.value;
        const circumference = 2 * Math.PI * radius;
    
        circle.style.strokeDasharray = circumference;
        circle.style.strokeDashoffset = circumference - (percent / 100) * circumference;
        progressText.textContent = `${percent}%`;
      }
    
      // Proporcional: cada lição feita faz a atividade crescer um pouco
      function porcentagemClave(prefixo, listaDeLicoes) {
        if (!Array.isArray(listaDeLicoes) || listaDeLicoes.length === 0) return 0;
        const concluidas = listaDeLicoes.filter(licao => ls.getItem(`${prefixo}${licao.id}`)).length;
        return (concluidas / listaDeLicoes.length) * VALOR_ATIVIDADE;
      }
    
      function porcentagemLeitura(chave) {
        return ls.getItem(chave) === 'true' ? VALOR_ATIVIDADE : 0;
      }
    
      function calcularProgressoGeral() {
        const sol = typeof licoesDeNotasSol !== 'undefined' ? licoesDeNotasSol : [];
        const fa = typeof licoesDeNotasFa !== 'undefined' ? licoesDeNotasFa : [];
    
        const total =
          porcentagemLeitura('status_leitura_sol_concluida') +    // Leitura (Sol)
          porcentagemClave('status_sol_concluido_licao_', sol) +  // Clave de Sol
          porcentagemLeitura('status_leitura_fa_concluida') +     // Leitura (Fá)
          porcentagemClave('status_fa_concluido_licao_', fa);     // Clave de Fá
    
        return Math.round(total);
      }
    
      function atualizarProgressoPerfil() {
        setProgress(calcularProgressoGeral());
      }
    
      // ---------------------------------------------------------------
      // 5. SEQUÊNCIA DE ESTUDOS
      // ---------------------------------------------------------------
      const CHAVE_DIAS = 'noteWave_diasEstudo';
    
      // Data no fuso local (toISOString usa UTC e erraria o dia à noite no Brasil)
      function dataLocal(d = new Date()) {
        const ano = d.getFullYear();
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const dia = String(d.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
      }
    
      function carregarDias() {
        try {
          const dias = JSON.parse(ls.getItem(CHAVE_DIAS));
          return Array.isArray(dias) ? dias : [];
        } catch (e) { return []; }
      }
    
      function registrarVisitaHoje() {
        const dias = carregarDias();
        const hoje = dataLocal();
        if (!dias.includes(hoje)) {
          dias.push(hoje);
          ls.setItem(CHAVE_DIAS, JSON.stringify(dias.slice(-120)));
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
        const numero = $('streakDays');
        if (numero) numero.textContent = sequencia;
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
    
          const item = $(`day-${id}`);
          if (!item) return;
          const circulo = item.querySelector('.day-circle');
          if (!circulo) return;
    
          const estudou = set.has(dataLocal(data));
          item.classList.toggle('completed', estudou);
          item.classList.toggle('today', dataLocal(data) === dataLocal(hoje));
          circulo.innerHTML = estudou
            ? '<i class="day-flame">🔥</i>'
            : '<i class="ph ph-check"></i>';
        });
      }
    
      // ---------------------------------------------------------------
      // 6. INICIAR
      // ---------------------------------------------------------------
      function atualizarTudo() {
        atualizarProgressoPerfil();
        atualizarSequencia();
        renderizarMedalhas();
      }
    
      atualizarTudo();
    
      // Atualiza ao voltar para a página pelo botão "voltar" do navegador
      window.addEventListener('pageshow', e => { if (e.persisted) atualizarTudo(); });
    });