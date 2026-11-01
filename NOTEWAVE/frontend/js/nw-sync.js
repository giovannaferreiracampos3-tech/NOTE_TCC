/* nw-sync.js – NoteWave – progresso salvo na conta (banco de dados), não no navegador.

   Como funciona, sem mexer nos outros scripts:
   - Toda vez que uma página grava (localStorage.setItem) um dado de progresso, ele também é enviado
     para a conta do usuário no servidor (PUT /api/progresso).
   - No login, os dados da conta são baixados para o navegador ANTES de abrir o perfil.
   - Ao entrar em outra conta (ou sair), os dados da conta anterior são apagados do navegador.

   Carregue este arquivo logo no começo de TODAS as páginas (depois do tema.js, antes dos demais scripts):
     <script src="../js/nw-sync.js"></script>
   Se a API estiver em outro endereço, defina antes: window.NW_API_PROGRESSO = 'http://.../api/progresso' */
   (() => {
    const API = window.NW_API_PROGRESSO || 'http://localhost:5000/api/progresso';
  
    // Chaves que pertencem à CONTA (a mesma lista do servidor, em progressoApi.js).
    // Tema, modo escuro e música de fundo ficam de fora: são preferências do aparelho.
    const DA_CONTA = /^(status_|musical_|medalha_|notewave-caderno|noteWave_diasEstudo$|noteWave_avatar$|noteWave_tour_choice$|progressoModulos$|nw_runner)/;
  
    const ls = window.localStorage;
    const gravar = Storage.prototype.setItem;     // versões originais, que não disparam envio
    const apagar = Storage.prototype.removeItem;
    const token = () => ls.getItem('token');
    const cabecalhos = () => ({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() });
  
    let fila = { dados: {}, remover: new Set() };
    let timer = null;
    let pausado = false;
  
    const chavesDaConta = () => {
      const r = {};
      for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i);
        if (DA_CONTA.test(k)) r[k] = ls.getItem(k);
      }
      return r;
    };
  
    function agendar() { clearTimeout(timer); timer = setTimeout(() => enviar(), 600); }
  
    // Intercepta as gravações de progresso e as manda para o servidor.
    Storage.prototype.setItem = function (k, v) {
      gravar.call(this, k, v);
      if (this === ls && !pausado && token() && DA_CONTA.test(k)) {
        fila.dados[k] = String(v); fila.remover.delete(k); agendar();
      }
    };
    Storage.prototype.removeItem = function (k) {
      apagar.call(this, k);
      if (this === ls && !pausado && token() && DA_CONTA.test(k)) {
        delete fila.dados[k]; fila.remover.add(k); agendar();
      }
    };
  
    async function enviar(ultimaChance) {
      clearTimeout(timer);
      if (!token()) return;
      const dados = fila.dados, remover = [...fila.remover];
      if (!Object.keys(dados).length && !remover.length) return;
      fila = { dados: {}, remover: new Set() };
      const corpo = JSON.stringify({ dados, remover });
      try {
        const r = await fetch(API, {
          method: 'PUT', headers: cabecalhos(), body: corpo,
          keepalive: !!ultimaChance && corpo.length < 60000   // deixa terminar mesmo se a página fechar
        });
        if (r.status === 401) { console.warn('[NoteWave] Sessão expirada: entre de novo para salvar o progresso.'); return; }
        if (!r.ok) throw new Error('HTTP ' + r.status);
      } catch (e) {
        // Não perde nada: devolve para a fila e tenta de novo daqui a pouco.
        Object.entries(dados).forEach(([k, v]) => { if (!(k in fila.dados) && !fila.remover.has(k)) fila.dados[k] = v; });
        remover.forEach(k => { if (!(k in fila.dados)) fila.remover.add(k); });
        if (!ultimaChance) timer = setTimeout(() => enviar(), 5000);
      }
    }
  
    addEventListener('pagehide', () => enviar(true));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') enviar(true); });
  
    // Chamado pelo login logo depois de entrar: troca os dados do navegador pelos da conta.
    async function entrar() {
      if (!token()) { console.warn('[NoteWave] Sem token: o progresso não será salvo na conta.'); return; }
      const locais = chavesDaConta();
  
      // 1) Baixa primeiro: se o servidor falhar, nada é apagado.
      const r = await fetch(API, { headers: cabecalhos() });
      if (!r.ok) throw new Error('Não foi possível carregar seu progresso (HTTP ' + r.status + ').');
      const dados = (await r.json()).dados || {};
      const contaTemDados = Object.keys(dados).length > 0;
  
      pausado = true;
      try {
        // 2) Primeira vez que este navegador usa a sincronização: guarda uma cópia do que já existia.
        const primeiraVez = !ls.getItem('nw_legacy_decidido');
        if (primeiraVez && Object.keys(locais).length) gravar.call(ls, 'nw_legacy_backup', JSON.stringify(locais));
  
        // 3) Limpa os dados da conta anterior e carrega os desta conta.
        Object.keys(locais).forEach(k => apagar.call(ls, k));
        Object.entries(dados).forEach(([k, v]) => gravar.call(ls, k, v));
  
        // 4) Progresso antigo do navegador (de antes da sincronização): pergunta de quem é.
        if (primeiraVez) {
          gravar.call(ls, 'nw_legacy_decidido', '1');
          if (!contaTemDados && Object.keys(locais).length) {
            const meu = confirm(
              'Encontramos progresso salvo neste navegador (lições, medalhas, caderno).\n\n' +
              'OK = esse progresso é MEU: guardar nesta conta.\n' +
              'Cancelar = começar do zero nesta conta.');
            if (meu) {
              pausado = false;
              Object.entries(locais).forEach(([k, v]) => ls.setItem(k, v));   // vai para a fila de envio
              await enviar();
            }
          }
        }
      } finally { pausado = false; }
    }
  
    // Ao sair (ou ao abrir a tela de login): envia o que faltava e limpa os dados da conta do navegador.
    async function sair() {
      await enviar();
      pausado = true;
      try {
        Object.keys(chavesDaConta()).forEach(k => apagar.call(ls, k));
        apagar.call(ls, 'token');
      } finally { pausado = false; }
    }
  
    // Recupera o progresso antigo do navegador (backup feito no primeiro login) para a conta atual.
    async function importarLegado() {
      const bruto = ls.getItem('nw_legacy_backup');
      if (!bruto) { console.warn('[NoteWave] Não há backup para importar.'); return; }
      Object.entries(JSON.parse(bruto)).forEach(([k, v]) => ls.setItem(k, v));
      await enviar();
      console.log('[NoteWave] Progresso antigo importado para esta conta. Recarregue a página.');
    }
  
    window.NWSync = { entrar, sair, importarLegado, enviar };
  })();