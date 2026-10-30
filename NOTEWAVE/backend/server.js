// ================================
// CONFIGURAÇÃO DO SERVIDOR E BANCO
// ================================
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');

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
        // Criptografa a senha antes de salvar no banco
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Mapeia "username" recebido do frontend para a coluna "nome" do MySQL
        const sql = 'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)';
        
        db.query(sql, [username, email, hashedPassword], (err, result) => {
            if (err) {
                console.error('ERRO NO MYSQL AO CADASTRAR:', err); // Exibe o erro real no terminal

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

        // Compara a senha digitada com o hash criptografado salvo no MySQL
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
// INICIAR O SERVIDOR
// ================================
app.listen(PORT, () => {
    console.log(`Servidor NoteWave rodando em http://localhost:${PORT}`);
});