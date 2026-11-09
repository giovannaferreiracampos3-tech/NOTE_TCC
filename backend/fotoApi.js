const express = require('express');
const multer = require('multer');
const nuvem = require('./storage');

// Recebe o pg.Pool e o middleware "autenticar" do server.js
module.exports = (db, autenticar) => {
    const router = express.Router();

    const EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };

    // Confere o conteúdo REAL do arquivo, não só o tipo informado
    function tipoReal(b) {
        if (!b || b.length < 12) return null;
        if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg';
        if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) return 'image/png';
        if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
        return null;
    }

    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 2 * 1024 * 1024 },
        fileFilter: (req, file, cb) =>
            cb(EXT[file.mimetype] ? null : new Error('Use uma imagem PNG, JPG ou WEBP.'), !!EXT[file.mimetype])
    });

    // O banco guarda "/uploads/avatars/arquivo.png"; o server.js redireciona para o Supabase
    const apagarFoto = caminho =>
        caminho && caminho.startsWith('/uploads/avatars/')
            ? nuvem.apagarCaminho(caminho.slice('/uploads/'.length))
            : Promise.resolve();

    async function fotoAtual(id) {
        const { rows } = await db.query('SELECT foto FROM usuarios WHERE id_usuario = $1', [id]);
        return rows[0] ? rows[0].foto : null;
    }

    // Foto do usuário logado
    router.get('/me/foto', autenticar, async (req, res) => {
        try {
            res.json({ foto: await fotoAtual(req.usuario.id) });
        } catch (e) {
            console.error('ERRO AO LER FOTO:', e);
            res.status(500).json({ erro: 'Não foi possível carregar a foto.' });
        }
    });

    // Salvar ou trocar a foto
    router.put('/me/foto', autenticar, (req, res) => {
        upload.single('foto')(req, res, async err => {
            if (err) {
                return res.status(400).json({
                    erro: err.code === 'LIMIT_FILE_SIZE' ? 'A imagem passa de 2 MB.' : err.message
                });
            }
            if (!req.file) return res.status(400).json({ erro: 'Envie uma imagem.' });

            const mime = tipoReal(req.file.buffer);
            if (!mime) return res.status(400).json({ erro: 'Use uma imagem PNG, JPG ou WEBP.' });

            const nome = `avatars/${req.usuario.id}-${Date.now()}${EXT[mime]}`;
            try {
                const antiga = await fotoAtual(req.usuario.id);
                await nuvem.enviar(nome, req.file.buffer, mime);
                const nova = '/uploads/' + nome;
                await db.query('UPDATE usuarios SET foto = $1 WHERE id_usuario = $2', [nova, req.usuario.id]);
                await apagarFoto(antiga);
                res.json({ foto: nova });
            } catch (e) {
                console.error('ERRO AO SALVAR FOTO:', e);
                await nuvem.apagarCaminho(nome);
                res.status(500).json({ erro: 'Não foi possível salvar a foto.' });
            }
        });
    });

    // Remover a foto
    router.delete('/me/foto', autenticar, async (req, res) => {
        try {
            const antiga = await fotoAtual(req.usuario.id);
            await db.query('UPDATE usuarios SET foto = NULL WHERE id_usuario = $1', [req.usuario.id]);
            await apagarFoto(antiga);
            res.json({ foto: null });
        } catch (e) {
            console.error('ERRO AO REMOVER FOTO:', e);
            res.status(500).json({ erro: 'Não foi possível remover a foto.' });
        }
    });

    return router;
};