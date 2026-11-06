// Mapeamento de qual módulo desbloqueia qual medalha
const regrasMedalhas = {
    'Primeiros Passos': 'modulo1',
    'Ritmo e Pulsação': 'modulo2',
    'Leitura Avançada': 'modulo3'
};

function atualizarMedalhas() {
    // Busca o progresso atualizado que foi salvo no localStorage
    const dadosProgresso = JSON.parse(localStorage.getItem('progressoModulos')) || { modulo1: 0, modulo2: 0, modulo3: 0 };
    
    const cardsMedalhas = document.querySelectorAll('.card-medalha');
    
    cardsMedalhas.forEach(card => {
        const nomeMedalha = card.querySelector('h3').textContent;
        const moduloCorrespondente = rulesMedalhas[nomeMedalha] || regrasMedalhas[nomeMedalha];
        
        if (moduloCorrespondente) {
            const progressoDoModulo = dadosProgresso[moduloCorrespondente];
            const iconeContainer = card.querySelector('.icone-medalha');
            const statusTexto = card.querySelector('.status');
            
            // Se o módulo está 100% concluído, desbloqueia a medalha
            if (progressoDoModulo === 100) {
                card.classList.remove('bloqueada');
                card.classList.add('ativa');
                statusTexto.textContent = 'Desbloqueado';
                
                // Define um ícone musical específico caso estivesse com cadeado
                if (nomeMedalha === 'Ritmo e Pulsação') {
                    iconeContainer.innerHTML = '<i class="fa-solid fa-drum"></i>';
                } else if (nomeMedalha === 'Leitura Avançada') {
                    iconeContainer.innerHTML = '<i class="fa-solid fa-book-open-reader"></i>';
                }
            } else {
                // Garante que permaneça bloqueada caso não tenha atingido 100%
                card.classList.remove('ativa');
                card.classList.add('bloqueada');
                statusTexto.textContent = 'Bloqueado';
                iconeContainer.innerHTML = '<i class="fa-solid fa-lock"></i>';
            }
        }
    });
}

// Captura os parâmetros da URL na página de medalhas
const urlParams = new URLSearchParams(window.location.search);
const destaque = urlParams.get("destaque");

if (destaque === "fa") {
    // Procure o elemento HTML/card correspondente à medalha da Clave de Fá na sua página de medalhas
    // (substitua '.card-medalha-fa' pela classe ou ID real que você usa para ela)
    const medalhaFa = document.querySelector(".card-medalha-fa"); 

    if (medalhaFa) {
        // Aplica o brilho amarelinho/dourado em volta
        medalhaFa.style.border = "4px solid #ffc94a";
        medalhaFa.style.boxShadow = "0 0 20px rgba(255, 201, 74, 0.8)";
        
        // Opcional: Se você tiver uma função que abre a descrição/modal da medalha, chame-a aqui:
        // abrirDescricaoMedalha('fa');
    }
}
 // Função para criar a explosão de confetes e notas musicais
 function dispararExplosaoConquista(cardElement) {
    const rect = cardElement.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    // Lista de caracteres/formas (Notas musicais e confetes)
    const elementos = ['🎵', '🎶', '⭐', '💙', '✨', '🔵', '🎵'];
    const quantidade = 35; // Quantidade de partículas

    for (let i = 0; i < quantidade; i++) {
        const particula = document.createElement('div');
        particula.classList.add('particula-explosao');
        
        particula.innerText = elementos[Math.floor(Math.random() * elementos.length)];
        
        particula.style.left = `${x}px`;
        particula.style.top = `${y}px`;

        const angulo = Math.random() * Math.PI * 2;
        const distancia = 70 + Math.random() * 150;
        const tx = Math.cos(angulo) * distancia;
        const ty = Math.sin(angulo) * distancia - 90;
        const rot = Math.random() * 720 - 360;

        particula.style.setProperty('--tx', `${tx}px`);
        particula.style.setProperty('--ty', `${ty}px`);
        particula.style.setProperty('--rot', `${rot}deg`);
        
        particula.style.fontSize = `${14 + Math.random() * 16}px`;

        document.body.appendChild(particula);

        setTimeout(() => {
            particula.remove();
        }, 1200);
    }
}

// Evento de clique atualizado para verificar a classe ativa
cards.forEach(card => {
    card.addEventListener("click", () => {
        const isAtiva = card.classList.contains('ativa');
        const titulo = card.dataset.titulo;

        if (isAtiva) {
            // Dispara a chuva de confetes e notas musicais passando o card
            dispararExplosaoConquista(card);

            conteudoModal.innerHTML = `
                <div class="modal-header">
                    <span class="tag-sucesso">Conquista Desbloqueada</span>
                    <h2>${titulo}</h2>
                </div>
                <div class="estrelas">⭐ ⭐ ⭐</div>
                <div class="modal-secao">
                    <h3>O que você conquistou?</h3>
                    <p>${card.dataset.conquistou || ''}</p>
                </div>
                <div class="modal-secao">
                  <h3>O que você aprendeu?</h3>
                  <p>${card.dataset.aprendeu || ''}</p>
                </div>
                <div class="modal-secao incentivo">
                    <p><strong>${card.dataset.incentivo || ''}</strong></p>
                </div>
            `;
        } else {
            conteudoModal.innerHTML = `
                <div class="modal-header">
                    <span class="tag-bloqueado">🔒 Medalha Bloqueada</span>
                    <h2>${titulo}</h2>
                </div>
                <div class="estrelas bloqueadas">☆ ☆ ☆</div>
                <div class="modal-secao">
                    <h3>Você ainda não conquistou esta medalha.</h3>
                    <p>Finalize a lição correspondente na trilha com aproveitamento superior a 50% para desbloqueá-la.</p>
                </div>
            `;
        }
        modal.classList.add("visivel");
    });
});

// Atualize o evento de clique nos cards para chamar a explosão se a medalha estiver desbloqueada
cards.forEach(card => {
    card.addEventListener("click", (e) => {
        const status = card.dataset.status;
        const titulo = card.dataset.titulo;

        if (status === "desbloqueado") {
            // Dispara a chuva de confetes e notas musicais
            dispararExplosaoConquista(e);

            conteudoModal.innerHTML = `
                <div class="modal-header">
                    <span class="tag-sucesso">Conquista Desbloqueada</span>
                    <h2>${titulo}</h2>
                </div>
                <div class="estrelas">⭐ ⭐ ⭐</div>
                <div class="modal-secao">
                    <h3>O que você conquistou?</h3>
                    <p>${card.dataset.conquistou || ''}</p>
                </div>
                <div class="modal-secao">
                  <h3>O que você aprendeu?</h3>
                  <p>${card.dataset.aprendeu || ''}</p>
                </div>
                <div class="modal-secao incentivo">
                    <p><strong>${card.dataset.incentivo || ''}</strong></p>
                </div>
            `;
            modal.classList.add("visivel");
        } else {
            // Comportamento normal para bloqueadas (sem explosão)
            conteudoModal.innerHTML = `
                <div class="modal-header">
                    <span class="tag-bloqueado">🔒 Medalha Bloqueada</span>
                    <h2>${titulo}</h2>
                </div>
                <div class="estrelas bloqueadas">☆ ☆ ☆</div>
                <div class="modal-secao">
                    <h3>Você ainda não conquistou esta medalha.</h3>
                    <p>Finalize a lição correspondente na trilha com aproveitamento superior a 50% para desbloqueá-la.</p>
                </div>
            `;
            modal.classList.add("visivel");
        }
    });
});

// Executa a verificação assim que a página de medalhas abre
document.addEventListener('DOMContentLoaded', atualizarMedalhas);