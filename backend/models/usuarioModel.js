const conexao = require("../database/conexao"); // precisa exportar um pg.Pool

const usuarioModel = {
    cadastrar: (nome, email, senha, callback) => {
        const sql = "INSERT INTO usuarios (nome, email, senha) VALUES ($1,$2,$3) RETURNING id_usuario";
        conexao.query(sql, [nome, email, senha], (err, r) => {
            if (err) return callback(err);
            // mesmo formato que o controller já recebia do mysql2
            callback(null, { insertId: r.rows[0].id_usuario, affectedRows: r.rowCount });
        });
    },

    login: (email, senha, callback) => {
        const sql = "SELECT * FROM usuarios WHERE email = $1 AND senha = $2";
        conexao.query(sql, [email, senha], (err, r) => {
            if (err) return callback(err);
            callback(null, r.rows); // array de usuários, como no mysql2
        });
    }
};

module.exports = usuarioModel;