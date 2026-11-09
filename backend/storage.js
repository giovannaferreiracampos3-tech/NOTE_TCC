// Guarda imagens no Supabase Storage (a Vercel não permite gravar arquivos em disco)
const URL_SB = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const CHAVE = process.env.SUPABASE_SERVICE_KEY || '';
const BUCKET = process.env.SUPABASE_BUCKET || 'imagens';
const PREFIXO = `${URL_SB}/storage/v1/object/public/${BUCKET}/`;

function cabecalhos(extra = {}) {
    const h = { apikey: CHAVE, ...extra };
    if (!CHAVE.startsWith('sb_')) h.Authorization = 'Bearer ' + CHAVE;
    return h;
}

async function enviar(caminho, buffer, tipo) {
    if (!URL_SB || !CHAVE) throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_KEY na Vercel.');
    const r = await fetch(`${URL_SB}/storage/v1/object/${BUCKET}/${caminho}`, {
        method: 'POST',
        headers: cabecalhos({ 'Content-Type': tipo }),
        body: buffer
    });
    if (!r.ok) throw new Error(`Falha ao enviar imagem (${r.status}): ${await r.text()}`);
    return PREFIXO + caminho;
}

async function apagarCaminho(caminho) {
    if (!caminho || !URL_SB || !CHAVE) return;
    try {
        await fetch(`${URL_SB}/storage/v1/object/${BUCKET}/${caminho}`, { method: 'DELETE', headers: cabecalhos() });
    } catch (e) { console.error('Falha ao apagar imagem:', e.message); }
}

const apagar = url => (url && url.startsWith(PREFIXO)) ? apagarCaminho(url.slice(PREFIXO.length)) : Promise.resolve();

module.exports = { enviar, apagar, apagarCaminho, PREFIXO };