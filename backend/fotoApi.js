const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Recebe o pg.Pool e o middleware "autenticar" do server.js
module.exports = (db, autenticar) => {
    const router = express.Router();

    const PASTA = path.join(__dirname, 'uploads', 'avatars');
    fs.mkdirSync(PASTA, { recursive: true });

    const EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };

    const upload = multer({
        storage: multer.diskStorage({
            destination: PASTA,
            filename: (req, file, cb) => cb(null, `${req.usuario.id}-${Date.now()}${EXT[file.mimetype] || ''}`)
        }),
        limits: { fileSize: 2 * 1024 * 1024 },
        fileFilter: (req, file, cb) =>
            cb(EXT[file.mimetype] ? null : new Error('Use uma imagem PNG, JPG ou WEBP.'), !!EXT[file.mimetype])
    });

    function apagarArquivo(caminho) {
        if (!caminho || !caminho.startsWith('/uploads/avatars/')) return;
        fs.unlink(path.join(__dirname, caminho), () => {});
    }

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

            try {
                const antiga = await fotoAtual(req.usuario.id);
                const nova = '/uploads/avatars/' + req.file.filename;
                await db.query('UPDATE usuarios SET foto = $1 WHERE id_usuario = $2', [nova, req.usuario.id]);
                apagarArquivo(antiga);
                res.json({ foto: nova });
            } catch (e) {
                console.error('ERRO AO SALVAR FOTO:', e);
                apagarArquivo('/uploads/avatars/' + req.file.filename);
                res.status(500).json({ erro: 'Não foi possível salvar a foto.' });
            }
        });
    });

    // Remover a foto
    router.delete('/me/foto', autenticar, async (req, res) => {
        try {
            const antiga = await fotoAtual(req.usuario.id);
            await db.query('UPDATE usuarios SET foto = NULL WHERE id_usuario = $1', [req.usuario.id]);
            apagarArquivo(antiga);
            res.json({ foto: null });
        } catch (e) {
            console.error('ERRO AO REMOVER FOTO:', e);
            res.status(500).json({ erro: 'Não foi possível remover a foto.' });
        }
    });

    return router;
};