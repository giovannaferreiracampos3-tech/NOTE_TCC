const usuarioModel = require("../../../TCC-NoteWave/backend/models/usuarioModel.js");

const usuarioController = {
    cadastrar: (req, res) => {
       const {nome, email, senha} = req.body;

       if(!nome || !email || !senha){
        return res.json({sucesso: false, mensagem: "Preencha todos os campos!"});
       }
       usuarioModel.cadastrar(nome, email, senha, (erro) => {
           if(erro){
               // 23505 = violação de unique no Postgres (e-mail já cadastrado, se houver UNIQUE em email)
               if(erro.code === "23505"){
                   return res.json({sucesso: false, mensagem: "Este e-mail já está cadastrado"});
               }
               console.error("ERRO AO CADASTRAR:", erro);
               return res.json({sucesso: false, mensagem: "Erro ao cadastrar usuario"});
           }

           res.json({sucesso: true, mensagem: "Usuario cadastrado com sucesso!"});
       });
    },

    login: (req, res) => {
        const {email, senha} = req.body;

        usuarioModel.login(email, senha, (erro, resultado) => {
            if(erro) {
                console.error("ERRO NO LOGIN:", erro);
                return res.json({sucesso: false, mensagem: "Erro no servidor!"});
            }

            if (resultado.length > 0){   // antes estava "lenght" (nunca era verdadeiro)
                const { senha: _senha, ...usuario } = resultado[0]; // não devolve a senha ao navegador
                res.json({
                    sucesso:true,
                    mensagem: "Login realizado com sucesso!",
                    usuario
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