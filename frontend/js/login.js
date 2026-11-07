// ================================
// SESSÃO: abrir a tela de login = sair da conta anterior
// (envia o que faltava para o servidor e limpa o progresso daquele usuário do navegador)
// ================================
const saindoDaConta = window.NWSync ? window.NWSync.sair() : Promise.resolve();

// ================================
// INICIAR SESSÃO: guarda o token e baixa o progresso DESTA conta (lições, medalhas, caderno...)
// ================================
async function iniciarSessao(data, username) {
    await saindoDaConta;

    const token = data && (data.token || data.accessToken || data.jwt);
    if (token) {
        localStorage.setItem("token", token);
    } else {
        localStorage.removeItem("token");
        console.warn("[NoteWave] O servidor não devolveu um token no login. Sem ele, o Jornal e o progresso na conta não funcionam: o server.js precisa enviar { token }.");
    }
    localStorage.setItem("noteWave_user", username);

    if (!window.NWSync) {
        console.warn("[NoteWave] nw-sync.js não foi carregado no login.html: o progresso não será salvo na conta.");
        return;
    }
    try {
        await window.NWSync.entrar();
    } catch (erro) {
        console.error(erro);
        alert("Você entrou, mas não foi possível carregar seu progresso agora. Tente entrar de novo em instantes.");
    }
}

// ================================
// TROCAR ENTRE LOGIN E CADASTRO
// ================================
function switchTab(tabName) {
    const tabs = document.querySelectorAll(".tab-btn");
    const contents = document.querySelectorAll(".tab-content");

    tabs.forEach(tab => tab.classList.remove("active"));
    contents.forEach(content => content.classList.remove("active"));

    if (tabName === "login") {
        tabs[0].classList.add("active");
        document.getElementById("loginTab").classList.add("active");
    } else {
        tabs[1].classList.add("active");
        document.getElementById("registerTab").classList.add("active");
    }
}

// ================================
// MOSTRAR / OCULTAR SENHA
// ================================
function togglePasswordVisibility(inputId, icon) {
    const input = document.getElementById(inputId);

    if (input.type === "password") {
        input.type = "text";
        icon.classList.replace("ph-eye", "ph-eye-slash");
    } else {
        input.type = "password";
        icon.classList.replace("ph-eye-slash", "ph-eye");
    }
}

// ================================
// MODAL RECUPERAR SENHA
// ================================
function openForgotModal(event) {
    event.preventDefault();
    document.getElementById("forgotModal").classList.add("active");
}

function closeForgotModal() {
    document.getElementById("forgotModal").classList.remove("active");
}

// ================================
// CHECAR "LEMBRAR DE MIM" AO CARREGAR (só o e-mail, nunca a senha)
// ================================
document.addEventListener("DOMContentLoaded", () => {
    localStorage.removeItem("remember_pass"); // limpa senhas salvas por versões antigas

    const savedEmail = localStorage.getItem("remember_email");

    if (savedEmail) {
        document.getElementById("loginEmail").value = savedEmail;
        document.getElementById("rememberMe").checked = true;
    }
});

// ================================
// CADASTRO (NOVO USUÁRIO)
// ================================
document.getElementById("registerForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const username = document.getElementById("regUser").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;
    const acceptTerms = document.getElementById("regTerms").checked;

    if (!acceptTerms) {
        alert("Você precisa aceitar os Termos de Uso e a Política de Privacidade!");
        return;
    }

    try {
        const response = await fetch("https://note-tcc-backend.vercel.app/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || data.error);
            return;
        }

        await iniciarSessao(data, username);
        alert("Conta criada com sucesso!");

        // Vai direto para o perfil
        window.location.href = "perfil.html";

    } catch (error) {
        console.error(error);
        alert("Não foi possível conectar ao servidor. Verifique se o backend está rodando!");
    }
});

// ================================
// LOGIN (USUÁRIO JÁ CADASTRADO)
// ================================
document.getElementById("loginForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const rememberMe = document.getElementById("rememberMe").checked;

    try {
        const response = await fetch("https://note-tcc-backend.vercel.app/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || data.error);
            return;
        }

        if (rememberMe) {
            localStorage.setItem("remember_email", email);
        } else {
            localStorage.removeItem("remember_email");
        }
        localStorage.removeItem("remember_pass"); // limpa senhas salvas antes

        await iniciarSessao(data, data.username || data.user?.username);

        alert("Login realizado com sucesso!");
        window.location.href = "perfil.html";

    } catch (error) {
        console.error(error);
        alert("Não foi possível conectar ao servidor.");
    }
});

// ================================
// RECUPERAÇÃO DE SENHA
// ================================
document.getElementById("forgotForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("forgotEmail").value.trim();

    try {
        const response = await fetch("https://note-tcc-backend.vercel.app/api/recuperar-senha", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || data.error);
            return;
        }

        alert(data.message + (data.tempPassword ? `\n\nSua nova senha temporária: ${data.tempPassword}` : ""));
        closeForgotModal();

    } catch (error) {
        console.error(error);
        alert("Não foi possível conectar ao servidor.");
    }
});

// ================================
// LOGIN COM GOOGLE
// ================================
const GOOGLE_CLIENT_ID = "872496584799-n8mb7of1sjg6q89amhdk29mlfettfvfc.apps.googleusercontent.com";

function initGoogle() {
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential
    });

    ["googleBtnLogin", "googleBtnRegister"].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        google.accounts.id.renderButton(el, {
            theme: "outline",
            size: "large",
            text: id === "googleBtnLogin" ? "signin_with" : "signup_with",
            shape: "rectangular",
            width: 320,
            locale: "pt-BR"
        });
    });
}

async function handleGoogleCredential(googleResponse) {
    try {
        const response = await fetch("https://note-tcc-backend.vercel.app/api/google-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential: googleResponse.credential })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || data.error);
            return;
        }

        await iniciarSessao(data, data.username || data.user?.username);
        window.location.href = "perfil.html";

    } catch (error) {
        console.error(error);
        alert("Não foi possível conectar ao servidor.");
    }
}

// Gancho oficial do Google: chama initGoogle assim que a biblioteca carrega
window.onGoogleLibraryLoad = initGoogle;

// Se a biblioteca do Google já tiver carregado antes deste arquivo, inicia agora
if (window.google && window.google.accounts && window.google.accounts.id) {
    initGoogle();
}