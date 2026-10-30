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

module.exports = usuarioController;