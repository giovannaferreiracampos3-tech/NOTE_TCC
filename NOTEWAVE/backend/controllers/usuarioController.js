const usuarioModel = require("../../../TCC-NoteWave/backend/models/usuarioModel.js");

const usuarioController = {
    cadastrar: (req, res) => {
       const {nome, email, senha} = req.body;

       if(!nome || !email || !senha){
        return res.json({sucesso: false, mensagem: "Prencha todos os campos!"});
       }
       usuarioModel.cadastrar(nome, email, senha, (erro) => { 
           if(erro){
               return res.json({sucesso: false, mensagem: "Erro ao cadastrar usuario"});
           }

           res.json({sucesso: true, mensagem: "Usuario cadastrado com sucesso!"});
       });
    },

    login: (req, res) => {
        const {email, senha} = req.body;

        usuarioModel.login(email, senha, (erro, resultado) => {
            if(erro) {
                return res.json({sucesso: false, mensagem: "Erro no servidor!"});
            }

            if (resultado.lenght > 0){
                res.json({
                    sucesso:true,
                    mensagem: "Login realizado com sucesso!",
                    usuario: resultado[0]
            });
            } else {
                res.json({
                    sucesso: false,
                    mensagem:"Email ou senha incorretos"
                });
            }
        });
    }
};

const { OAuth2Client } = require("google-auth-library");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.post("/api/google-login", async (req, res) => {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: req.body.credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const { email, name, email_verified } = ticket.getPayload();

    if (!email_verified) {
      return res.status(401).json({ message: "E-mail do Google não verificado." });
    }

    // ADAPTE AO SEU BANCO: busca o usuário pelo e-mail; se não existir, cria
    let user = await buscarUsuarioPorEmail(email);
    if (!user) {
      user = await criarUsuario({
        username: name || email.split("@")[0],
        email,
        password: null // conta Google não tem senha local
      });
    }

    res.json({ message: "Login realizado com sucesso!", username: user.username });

  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Token do Google inválido." });
  }
});

module.exports = usuarioController;