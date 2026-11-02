const mysql = require('mysql2/promise');
const CONFIG = { host: 'localhost', user: 'root', password: '123456', database: 'tcc' };

async function existe(db, sql, args) { const [r] = await db.query(sql, args); return r.length > 0; }

(async () => {
  const db = await mysql.createConnection(CONFIG);
  try {
    const col = n => existe(db,
      'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=?',
      [CONFIG.database, 'publicacoes', n]);

    if (!(await col('id_usuario'))) { await db.query('ALTER TABLE publicacoes ADD COLUMN id_usuario INT NULL'); console.log('✔ id_usuario criada'); }
    else console.log('• id_usuario já existe');

    if (!(await col('imagem'))) { await db.query('ALTER TABLE publicacoes ADD COLUMN imagem VARCHAR(255) NULL'); console.log('✔ imagem criada'); }
    else console.log('• imagem já existe');

    console.log('Pronto!');
  } catch (e) { console.error('✖ Erro:', e.message); }
  finally { await db.end(); }
})();