require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const PORT = 5000;

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
console.log('GOOGLE_CLIENT_ID carregado:', GOOGLE_CLIENT_ID);

console.log('JWT_SECRET existe?', !!JWT_SECRET);
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET não definido');
}

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

app.use(cors());
app.use(express.json({ limit: '5mb' }));
const path = require('path');
const pastaFront = path.join(__dirname, '..', 'frontend');
console.log('Servindo front de:', pastaFront);
console.log('Existe?', require('fs').existsSync(pastaFront));
console.log('Login existe?', require('fs').existsSync(path.join(pastaFront, 'html', 'login.html')));
app.use(express.static(require('path').join(__dirname, '..', 'frontend')));

// ================================
// BANCO DE DADOS (PostgreSQL / Supabase)
// ================================
const usaSupabase = (process.env.DATABASE_URL || '').includes('supabase');

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: usaSupabase ? { rejectUnauthorized: false } : false
});

// Sem isso, uma conexão ociosa derrubada pelo servidor (comum no Supabase) pode derrubar o Node
db.on('error', (err) => console.error('Erro em conexão ociosa do PostgreSQL:', err.message));

db.connect((err, client, release) => {
    if (err) {
        console.error('Erro ao conectar no PostgreSQL:', err.message);
    } else {
        console.log('Conectado ao PostgreSQL com sucesso!');
        release();
    }
});

// ================================
// FUNÇÕES AUXILIARES
// ================================
function gerarToken(usuario) {
    return jwt.sign(
        { id: usuario.id_usuario ?? usuario.id, email: usuario.email },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

function autenticar(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) return res.status(401).json({ message: 'Token ausente.' });

    try {
        req.usuario = jwt.verify(token, JWT_SECRET);
        next();
    } catch (e) {
        return res.status(401).json({ message: 'Token inválido ou expirado.' });
    }
}

// ================================
// ROTA 1: CADASTRO
// ================================
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Preencha todos os campos!' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const existentes = await db.query('SELECT id_usuario FROM usuarios WHERE email = $1', [email]);
        if (existentes.rowCount > 0) {
            return res.status(400).json({ message: 'Este e-mail já está cadastrado!' });
        }

        try {
            const result = await db.query(
                'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING id_usuario',
                [username, email, hashedPassword]
            );

            console.log('Usuário salvo com sucesso:', username);
            const token = gerarToken({ id: result.rows[0].id_usuario, email });
            return res.status(201).json({
                message: 'Conta criada com sucesso!',
                username,
                token
            });
        } catch (err) {
            console.error('ERRO NO POSTGRES AO CADASTRAR:', err);
            if (err.code === '23505') { // unique_violation (corrida entre dois cadastros)
                return res.status(400).json({ message: 'Este e-mail já está cadastrado!' });
            }
            return res.status(500).json({ message: 'Erro no banco de dados.' });
        }
    } catch (error) {
        console.error('ERRO NO CADASTRO:', error);
        return res.status(500).json({ message: 'Erro no servidor' });
    }
});

// ================================
// ROTA 2: LOGIN
// ================================
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Preencha e-mail e senha!' });
    }

    try {
        const { rows } = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'E-mail não encontrado!' });
        }

        const usuario = rows[0];
        const senhaValida = await bcrypt.compare(password, usuario.senha);

        if (!senhaValida) {
            return res.status(401).json({ message: 'Senha incorreta!' });
        }

        console.log('Login realizado por:', usuario.nome);
        return res.status(200).json({
            message: 'Login realizado com sucesso!',
            username: usuario.nome,
            token: gerarToken(usuario)
        });
    } catch (err) {
        console.error('ERRO NO LOGIN:', err);
        return res.status(500).json({ message: 'Erro no servidor' });
    }
});

// ================================
// ROTA 3: LOGIN COM GOOGLE
// ================================
app.post('/api/google-login', async (req, res) => {
    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({ message: 'Credencial do Google ausente.' });
    }

    try {
        // O próprio Google confere a assinatura e a validade do token
        const respostaGoogle = await fetch(
            'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential)
        );
        const payload = await respostaGoogle.json();

        if (!respostaGoogle.ok) {
            throw new Error(payload.error_description || 'Token recusado pelo Google');
        }
        if (payload.aud !== GOOGLE_CLIENT_ID) {
            throw new Error('Token emitido para outro cliente');
        }
        if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
            throw new Error('Emissor do token inválido');
        }
        if (String(payload.email_verified) !== 'true') {
            return res.status(401).json({ message: 'E-mail do Google não verificado.' });
        }

        const email = payload.email;
        const nome = payload.name || email.split('@')[0];

        const { rows } = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);

        // Já existe: só entra
        if (rows.length > 0) {
            const usuario = rows[0];
            console.log('Login Google por:', usuario.nome);
            return res.status(200).json({
                message: 'Login com Google realizado com sucesso!',
                username: usuario.nome,
                token: gerarToken(usuario)
            });
        }

        // Não existe: cria a conta com senha aleatória
        const hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
        const result = await db.query(
            'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING id_usuario',
            [nome, email, hash]
        );

        console.log('Conta criada via Google:', nome);
        return res.status(201).json({
            message: 'Conta criada com Google!',
            username: nome,
            token: gerarToken({ id: result.rows[0].id_usuario, email })
        });
    } catch (error) {
        console.error('ERRO NO GOOGLE LOGIN:', error);
        // antes o catch não respondia nada e a requisição ficava pendurada
        return res.status(401).json({ message: 'Não foi possível entrar com o Google. Tente de novo.' });
    }
});

// ================================
// ROTA 4: RECUPERAR SENHA
// ================================
app.post('/api/recuperar-senha', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Informe o e-mail.' });
    }

    try {
        const { rowCount } = await db.query('SELECT id_usuario FROM usuarios WHERE email = $1', [email]);

        if (rowCount === 0) {
            return res.status(404).json({ message: 'E-mail não encontrado!' });
        }

        const tempPassword = crypto.randomBytes(4).toString('hex');
        const hash = await bcrypt.hash(tempPassword, 10);

        await db.query('UPDATE usuarios SET senha = $1 WHERE email = $2', [hash, email]);

        return res.status(200).json({
            message: 'Senha redefinida com sucesso!',
            tempPassword
        });
    } catch (e) {
        console.error('ERRO AO RECUPERAR SENHA:', e);
        return res.status(500).json({ message: 'Erro ao redefinir a senha.' });
    }
});

// ================================
// ROTA 5: PROGRESSO DA CONTA (usado pelo nw-sync.js)
// Tabela: progresso_usuario (id_usuario, chave, valor)
// ================================
const CHAVES_DA_CONTA = /^(status_|musical_|medalha_|notewave-caderno|noteWave_diasEstudo$|noteWave_missoesFeitas$|noteWave_tour_choice$|progressoModulos$|nw_runner)/;

app.get('/api/progresso', autenticar, async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT chave, valor FROM progresso_usuario WHERE id_usuario = $1',
            [req.usuario.id]
        );
        const dados = {};
        rows.forEach(l => { dados[l.chave] = l.valor; });
        return res.json({ dados });
    } catch (e) {
        console.error('ERRO AO LER PROGRESSO:', e);
        return res.status(500).json({ message: 'Erro ao carregar o progresso.' });
    }
});

app.put('/api/progresso', autenticar, async (req, res) => {
    const dados = (req.body && req.body.dados) || {};
    const remover = Array.isArray(req.body && req.body.remover) ? req.body.remover : [];
    const idUsuario = req.usuario.id;

    const conn = await db.connect();
    try {
        await conn.query('BEGIN');

        for (const chave of remover) {
            if (!CHAVES_DA_CONTA.test(chave)) continue;
            await conn.query(
                'DELETE FROM progresso_usuario WHERE id_usuario = $1 AND chave = $2',
                [idUsuario, chave]
            );
        }

        for (const [chave, valor] of Object.entries(dados)) {
            if (!CHAVES_DA_CONTA.test(chave)) continue;
            await conn.query(
                'DELETE FROM progresso_usuario WHERE id_usuario = $1 AND chave = $2',
                [idUsuario, chave]
            );
            await conn.query(
                'INSERT INTO progresso_usuario (id_usuario, chave, valor) VALUES ($1, $2, $3)',
                [idUsuario, chave, String(valor)]
            );
        }

        await conn.query('COMMIT');
        return res.json({ ok: true });
    } catch (e) {
        await conn.query('ROLLBACK').catch(() => {});
        console.error('ERRO AO SALVAR PROGRESSO:', e);
        return res.status(500).json({ message: 'Erro ao salvar o progresso.' });
    } finally {
        conn.release();
    }
});

// ================================
// ROTA DE TESTE DO TOKEN
// ================================
app.get('/api/me', autenticar, (req, res) => {
    res.json({ id: req.usuario.id, email: req.usuario.email });
});

// ================================
// ROTA: ALTERAR NOME / APELIDO
// (fica antes do router de doações, que está montado em /api inteiro)
// ================================
app.put('/api/usuario/nome', autenticar, async (req, res) => {
    try {
        const nome = String((req.body && req.body.nome) || '').trim().slice(0, 30);

        if (!nome) {
            return res.status(400).json({ message: 'O nome não pode ficar vazio.' });
        }

        const r = await db.query(
            'UPDATE usuarios SET nome = $1 WHERE id_usuario = $2',
            [nome, req.usuario.id]
        );

        if (!r.rowCount) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        // Mesmo formato de token do login (id + email), então todas as rotas continuam reconhecendo
        return res.json({
            message: 'Nome atualizado com sucesso!',
            username: nome,
            token: gerarToken({ id: req.usuario.id, email: req.usuario.email })
        });
    } catch (e) {
        console.error('ERRO AO ALTERAR NOME:', e);
        return res.status(500).json({ message: 'Não foi possível salvar o nome.' });
    }
});

// ================================
// ROUTERS (todos recebem o pg.Pool direto, sem .promise())
// ================================
app.use('/api/runner', require('./runnerApi')(db));

// Journal (artigos, reações, favoritos, comentários)
app.use('/api/journal', require('./journalApi')(db));

// Imagens de capa dos artigos publicados
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

// Foto de perfil
app.use('/api/usuarios', require('./fotoApi')(db, autenticar));

// Doações (usa vários prefixos: /donations, /donation-interests, /donation-comments...)
app.use('/api', require('./doacaoApi')(db));

// ================================
// INICIAR O SERVIDOR
// ================================
// ================================
// INICIAR O SERVIDOR
// ================================
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Servidor NoteWave rodando em http://localhost:${PORT}`);
    });
}

module.exports = app;