const { Client } = require('pg');
const CONFIG = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : { host: 'localhost', port: 5432, user: 'postgres', password: '123456', database: 'tcc' };

async function existe(db, sql, args) { const r = await db.query(sql, args); return r.rowCount > 0; }

(async () => {
  const db = new Client(CONFIG);
  await db.connect();
  try {
    const col = n => existe(db,
      'SELECT 1 FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 AND column_name=$3',
      ['public', 'publicacoes', n]);

    if (!(await col('id_usuario'))) { await db.query('ALTER TABLE publicacoes ADD COLUMN id_usuario INTEGER NULL'); console.log('✔ id_usuario criada'); }
    else console.log('• id_usuario já existe');

    if (!(await col('imagem'))) { await db.query('ALTER TABLE publicacoes ADD COLUMN imagem VARCHAR(255) NULL'); console.log('✔ imagem criada'); }
    else console.log('• imagem já existe');

    console.log('Pronto!');
  } catch (e) { console.error('✖ Erro:', e.message); }
  finally { await db.end(); }
})();