// ================================
// CONFIGURAÇÃO DO SERVIDOR E BANCO
// ================================
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const GOOGLE_CLIENT_ID = '872496584799-ki78h8mmt18uavfc2vp2b03u2584l9qi.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Conexão com o MySQL Workbench
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '123456', 
  database: 'tcc'
});

db.connect((err) => {
  if (err) {
    console.error('Erro ao conectar no MySQL:', err.message);
  } else {
    console.log('Conectado ao MySQL Workbench com sucesso!');
  }
});

// ================================
// ROTA 1: CADASTRO DE USUÁRIO (LGPD/BCRYPT)
// ================================
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Preencha todos os campos!' });
    }

    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const sql = 'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)';
        
        db.query(sql, [username, email, hashedPassword], (err, result) => {
            if (err) {
                console.error('ERRO NO MYSQL AO CADASTRAR:', err);

                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Este e-mail já está cadastrado!' });
                }
                return res.status(500).json({ message: 'Erro no banco de dados: ' + err.sqlMessage });
            }

            console.log('Usuário salvo com sucesso:', username);
            return res.status(201).json({ 
                message: 'Conta criada com sucesso!',
                username: username 
            });
        });
    } catch (error) {
        console.error('ERRO NO BCRYPT:', error);
        return res.status(500).json({ message: 'Erro ao processar a senha' });
    }
});

// ================================
// ROTA 2: LOGIN DE USUÁRIO
// ================================
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    const sql = 'SELECT * FROM usuarios WHERE email = ?';

    db.query(sql, [email], async (err, results) => {
        if (err) return res.status(500).json({ message: 'Erro no servidor' });

        if (results.length === 0) {
            return res.status(404).json({ message: 'E-mail não encontrado!' });
        }

        const usuario = results[0];

        const senhaValida = await bcrypt.compare(password, usuario.senha);

        if (!senhaValida) {
            return res.status(401).json({ message: 'Senha incorreta!' });
        }

        console.log(' Login realizado por:', usuario.nome);
        return res.status(200).json({ 
            message: 'Login realizado com sucesso!',
            username: usuario.nome 
        });
    });
});

// ================================
// ROTA 3: LOGIN / CADASTRO COM GOOGLE
// ================================
app.post('/api/google-login', async (req, res) => {
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: req.body.credential,
            audience: GOOGLE_CLIENT_ID
        });

        const { email, name, email_verified } = ticket.getPayload();

        if (!email_verified) {
            return res.status(401).json({ message: 'E-mail do Google não verificado.' });
        }

        db.query('SELECT * FROM usuarios WHERE email = ?', [email], async (err, results) => {
            if (err) return res.status(500).json({ message: 'Erro no servidor' });

            // Já tem conta: só entra
            if (results.length > 0) {
                console.log('Login Google por:', results[0].nome);
                return res.status(200).json({
                    message: 'Login realizado com sucesso!',
                    username: results[0].nome
                });
            }

            // Não tem conta: cria uma
            try {
                const nome = name || email.split('@')[0];
                const senhaAleatoria = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

                db.query(
                    'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
                    [nome, email, senhaAleatoria],
                    (err2) => {
                        if (err2) {
                            console.error('ERRO AO CRIAR USUÁRIO GOOGLE:', err2);
                            return res.status(500).json({ message: 'Erro no banco de dados: ' + err2.sqlMessage });
                        }
                        console.log('Usuário Google criado:', nome);
                        return res.status(201).json({
                            message: 'Conta criada com sucesso!',
                            username: nome
                        });
                    }
                );
            } catch (e) {
                console.error(e);
                return res.status(500).json({ message: 'Erro ao criar a conta.' });
            }
        });

    } catch (error) {
        console.error('ERRO GOOGLE:', error.message);
        return res.status(401).json({ message: 'Token do Google inválido.' });
    }
});

// ================================
// INICIAR O SERVIDOR
// ================================
app.listen(PORT, () => {
    console.log(`Servidor NoteWave rodando em http://localhost:${PORT}`);
});