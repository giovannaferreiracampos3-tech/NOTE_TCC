const { Pool } = require("pg");

const conexao = new Pool(
    process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL }
        : { host: "localhost", port: 5432, user: "postgres", password: "123456", database: "tcc" }
);

// Testa a conexão ao subir o servidor
conexao.query("SELECT 1", (erro) => {
    if (erro) {
        console.log("Erro ao conectar:", erro);
    } else {
        console.log("Conectado ao banco!");
    }
});

module.exports = conexao;