/* NoteWave – sininho de notificações (doações + jornal), igual em todas as páginas internas */
(function () {
    'use strict';
    var API = 'https://note-tcc-backend.vercel.app/api';
    function token() { return localStorage.getItem('token'); }
    if (!token() || document.getElementById('nwSino')) return;
  
    // Se a página de doações ainda tiver o sininho antigo, remove (o novo já mostra tudo)
    var velho = document.querySelector('.dc-sino-wrap');
    if (velho) velho.remove();
  
    var css = [
      '.nw-sino-wrap{position:fixed;top:14px;right:20px;z-index:1500}',
      '.nw-sino{position:relative;width:48px;height:48px;border-radius:16px;border:2px solid rgba(255,255,255,.55);background:linear-gradient(135deg,#003399,#0a7bd8);color:#fff;font-size:23px;display:grid;place-items:center;cursor:pointer;box-shadow:0 6px 16px rgba(0,51,153,.35);transition:transform .15s;overflow:visible}',
      '.nw-sino::after{content:"";position:absolute;left:0;right:0;bottom:0;height:11px;border-radius:0 0 14px 14px;background:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 48 11%27 preserveAspectRatio=%27none%27%3E%3Cpath d=%27M0 6 Q6 0 12 6 T24 6 T36 6 T48 6 V11 H0Z%27 fill=%27%23ffffff%27 fill-opacity=%27.28%27/%3E%3C/svg%3E") center/100% 100% no-repeat;pointer-events:none}',
      '.nw-sino i{position:relative;z-index:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,.25))}',
      '.nw-sino:hover{transform:translateY(-2px)}',
      '.nw-sino:focus-visible{outline:3px solid #ffc947;outline-offset:2px}',
      '.nw-sino.balanca i{animation:nw-balanco 1.1s ease-in-out 2;transform-origin:50% 10%}',
      '@keyframes nw-balanco{0%,100%{transform:rotate(0)}20%{transform:rotate(16deg)}40%{transform:rotate(-14deg)}60%{transform:rotate(9deg)}80%{transform:rotate(-5deg)}}',
      '@media(prefers-reduced-motion:reduce){.nw-sino.balanca i{animation:none}}',
      '.nw-badge{position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:#e11d48;color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center;font-family:inherit}',
      '.nw-badge:empty{display:none}',
      '.nw-painel{position:absolute;top:56px;right:0;width:350px;max-width:calc(100vw - 32px);max-height:70vh;overflow:auto;background:#fff;border:1px solid #dbe7f5;border-radius:16px;box-shadow:0 18px 40px rgba(0,43,122,.2);font-family:Inter,system-ui,sans-serif}',
      '.nw-painel[hidden]{display:none}',
      '.nw-topo{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid #edf2f7;color:#1a1d20;font-size:15px}',
      '.nw-link{background:none;border:0;color:#003399;font-weight:600;font-size:12px;cursor:pointer;font-family:inherit}',
      '.nw-link:hover{text-decoration:underline}',
      '.nw-vazio{padding:28px 16px;text-align:center;color:#6c757d;font-size:14px;margin:0}',
      '.nw-item{display:flex;gap:12px;align-items:flex-start;padding:12px 16px;border-bottom:1px solid #edf2f7;text-decoration:none;color:#1a1d20;font-size:14px;line-height:1.4}',
      '.nw-item:last-child{border-bottom:0}',
      '.nw-item:hover{background:#f3f7fd}',
      '.nw-item.nova{background:#e8f1f8;font-weight:600}',
      '.nw-item i{font-size:20px;color:#003399;flex:none;margin-top:1px}',
      '.nw-item small{display:block;color:#6c757d;font-weight:400;font-size:12px;margin-top:2px}',
      'body.dark-mode .nw-sino{background:linear-gradient(135deg,#16213f,#1c3a6b);border-color:#38bdf8;color:#38bdf8;box-shadow:0 6px 16px rgba(0,0,0,.45)}',
      '.nw-topo b::before{content:"\\266A";color:#0a7bd8;margin-right:6px}',
      'body.dark-mode .nw-topo b::before{color:#38bdf8}',
      'body.dark-mode .nw-painel{background:#1c2541;border-color:#2e3a59}',
      'body.dark-mode .nw-topo{color:#f8fafc;border-color:#2e3a59}',
      'body.dark-mode .nw-link,body.dark-mode .nw-item i{color:#38bdf8}',
      'body.dark-mode .nw-item{color:#f8fafc;border-color:#2e3a59}',
      'body.dark-mode .nw-item:hover{background:#16213f}',
      'body.dark-mode .nw-item.nova{background:#16213f}',
      'body.dark-mode .nw-item small,body.dark-mode .nw-vazio{color:#94a3b8}',
      '@media(max-width:900px){.nw-sino-wrap{top:auto;bottom:84px;right:16px}.nw-painel{top:auto;bottom:56px}}'
    ].join('\n');
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  
    function el(tag, cls, txt) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (txt != null) e.textContent = txt;
      return e;
    }
    function chamar(caminho, metodo) {
      return fetch(API + caminho, { method: metodo || 'GET', headers: { Authorization: 'Bearer ' + token() } })
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); });
    }
    function quando(iso) {
      var d = new Date(iso);
      if (isNaN(d)) return '';
      return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
  
    var wrap = el('div', 'nw-sino-wrap');
    var btn = el('button', 'nw-sino'); btn.id = 'nwSino'; btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'true'); btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<i class="ph ph-bell"></i>';
    var badge = el('b', 'nw-badge'); btn.appendChild(badge);
    var painel = el('div', 'nw-painel'); painel.hidden = true;
    wrap.appendChild(btn); wrap.appendChild(painel); document.body.appendChild(wrap);
    
    var ultimoTotal = 0;
    var itens = [];
  
    function marcar(it) {
      if (it.lida) return;
      it.lida = true;
      var rota = it.origem === 'doacao' ? '/donation-notifications/' + it.id + '/lida' : '/journal/notificacoes/' + it.id + '/lida';
      chamar(rota, 'PUT').catch(function () {});
      setTimeout(desenhar, 0);
    }
    function marcarTodas() {
      Promise.all([
        chamar('/donation-notifications/lidas', 'PUT').catch(function () {}),
        chamar('/journal/notificacoes/lidas', 'PUT').catch(function () {})
      ]).then(function () { itens.forEach(function (i) { i.lida = true; }); desenhar(); });
    }
    function fechar() { painel.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
  
    function desenhar() {
        var n = itens.filter(function (i) { return !i.lida; }).length;
        if (n > ultimoTotal) {
          btn.classList.remove('balanca'); void btn.offsetWidth; btn.classList.add('balanca');
        }
        ultimoTotal = n;
        badge.textContent = n > 9 ? '9+' : (n || '');
      btn.setAttribute('aria-label', n ? 'Notificações (' + n + ' novas)' : 'Notificações');
      painel.textContent = '';
      var topo = el('div', 'nw-topo'); topo.appendChild(el('b', '', 'Notificações'));
      if (n) {
        var t = el('button', 'nw-link', 'Marcar todas como lidas'); t.type = 'button'; t.onclick = marcarTodas;
        topo.appendChild(t);
      }
      painel.appendChild(topo);
      if (!itens.length) { painel.appendChild(el('p', 'nw-vazio', 'Você não tem notificações.')); return; }
      itens.forEach(function (it) {
        var a = el('a', 'nw-item' + (it.lida ? '' : ' nova')); a.href = it.href;
        var ic = el('i', 'ph ' + (it.origem === 'doacao' ? 'ph-hand-heart' : 'ph-chat-circle-text'));
        var tx = el('div');
        tx.appendChild(el('span', '', it.texto));
        tx.appendChild(el('small', '', (it.origem === 'doacao' ? 'Doações' : 'Jornal') + ' · ' + quando(it.data)));
        a.appendChild(ic); a.appendChild(tx);
        a.onclick = function (e) {
          fechar(); marcar(it);
          if (a.href === location.href) { e.preventDefault(); location.reload(); } // já está nessa tela: recarrega
        };
        painel.appendChild(a);
      });
    }
  
    function carregar() {
      if (!token()) return;
      Promise.all([
        chamar('/donation-notifications').catch(function () { return []; }),
        chamar('/journal/notificacoes').catch(function () { return []; })
      ]).then(function (r) {
        var d = Array.isArray(r[0]) ? r[0] : [], j = Array.isArray(r[1]) ? r[1] : [];
        itens = d.map(function (n) {
          return { origem: 'doacao', id: n.id, texto: n.texto, data: n.data, lida: !!n.lida, href: '../html/doacao.html#/doacao/' + n.doacaoId };
        }).concat(j.map(function (n) {
          return { origem: 'journal', id: n.id, texto: n.texto, data: n.data, lida: !!n.lida, href: '../html/journal.html#/artigo/' + n.publicacaoId };
        })).sort(function (a, b) { return new Date(b.data) - new Date(a.data); }).slice(0, 30);
        desenhar();
      });
    }
  
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var abrir = painel.hidden;
      painel.hidden = !abrir; btn.setAttribute('aria-expanded', String(abrir));
      if (abrir) carregar();
    });
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) fechar(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechar(); });
    window.addEventListener('pageshow', function (e) { if (e.persisted) carregar(); });
    setInterval(function () { if (!document.hidden) carregar(); }, 30000);
  
    desenhar();
    carregar();
  })();