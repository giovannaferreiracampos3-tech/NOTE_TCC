/* NoteWave - caderno de anotações de música */
(function(){
    "use strict";
    var KEY="notewave-caderno-v1", TOTAL=100;
    var NAVY="#0d2f7d";
    var ACTS=[
     {k:"aula",n:"Aula",c:"#fde5bd"},
     {k:"pratica",n:"Prática",c:"#cde3fb"},
     {k:"teoria",n:"Teoria",c:"#e5dbfa"},
     {k:"escuta",n:"Escuta",c:"#d1f0e5"},
     {k:"ensaio",n:"Ensaio",c:"#fbd9e0"},
     {k:"composicao",n:"Composição",c:"#f6efb6"}
    ];
    var CATS=[
     {k:"notas",n:"Notas musicais"},
     {k:"ritmo",n:"Ritmo e pulsação"},
     {k:"claves",n:"Clave de Sol e Fá"},
     {k:"harmonia",n:"Harmonia"},
     {k:"duvidas",n:"Dúvidas"},
     {k:"outros",n:"Outros"}
    ];
    var BUBBLES=["Vai dar certo!","Um passo de cada vez","Que som bonito!","Continue anotando!","Você está evoluindo!","Praticar faz a diferença"];

    function $(s,r){return (r||document).querySelector(s)}
    function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
    function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
    function pad(n){return (n<10?"0":"")+n}
    var d0=new Date();
    var TODAY=d0.getFullYear()+"-"+pad(d0.getMonth()+1)+"-"+pad(d0.getDate());
    function fmt(iso){return iso?iso.split("-").reverse().join("/"):""}
    function act(k){return ACTS.filter(function(a){return a.k===k})[0]}
    function cat(k){return CATS.filter(function(a){return a.k===k})[0]}

    /* ---------- desenhos ---------- */
    function spark(x,y,s,c){return '<path d="M'+x+' '+(y-s)+'Q'+x+' '+y+' '+(x+s)+' '+y+'Q'+x+' '+y+' '+x+' '+(y+s)+'Q'+x+' '+y+' '+(x-s)+' '+y+'Q'+x+' '+y+' '+x+' '+(y-s)+'Z" fill="'+c+'"/>'}
    function note(x,y,s,c){s=s||1;return '<g fill="'+c+'" stroke="'+c+'"><ellipse cx="'+x+'" cy="'+y+'" rx="'+(4.6*s)+'" ry="'+(3.4*s)+'" transform="rotate(-20 '+x+' '+y+')" stroke="none"/><path d="M'+(x+4.1*s)+' '+(y-.8*s)+'V'+(y-16*s)+'q'+(5*s)+' '+(1.5*s)+' '+(5.5*s)+' '+(8*s)+'" fill="none" stroke-width="'+(1.7*s)+'" stroke-linecap="round"/></g>'}
    function wave(y,amp,color,op,dx,h){
      var d="M-60 "+y+"Q-46.25 "+(y-amp)+" -32.5 "+y;
      for(var x=-5;x<=520;x+=27.5){d+="T"+x+" "+y}
      d+="V"+(h||80)+"H-60Z";
      return '<path transform="translate('+(dx||0)+' 0)" d="'+d+'" fill="'+color+'" fill-opacity="'+(op==null?1:op)+'"/>';
    }
    function star5(cx,cy,R,r,fill){
      var p=[];for(var i=0;i<10;i++){var a=-Math.PI/2+i*Math.PI/5,rr=i%2?r:R;p.push((cx+rr*Math.cos(a)).toFixed(1)+","+(cy+rr*Math.sin(a)).toFixed(1))}
      return '<polygon points="'+p.join(" ")+'" fill="'+fill+'" stroke="#e39a5c" stroke-width="1" stroke-linejoin="round"/>';
    }
    function mascotG(sp){
      var s="";
      if(sp){s+='<g stroke="#3b8cff" stroke-width="4" stroke-linecap="round" fill="none"><path d="M22 76l9 14M8 112l15 3M40 58l4 6"/><path d="M178 66l12-14M186 140l10 7M192 160l2 8"/></g>'+spark(190,92,8,"#3b8cff")}
      s+='<path d="M88 178L84 198M116 176L124 196" stroke="'+NAVY+'" stroke-width="15" stroke-linecap="round" fill="none"/>';
      s+='<ellipse cx="78" cy="207" rx="16" ry="9" fill="#0a2566"/><ellipse cx="134" cy="205" rx="17" ry="9" fill="#0a2566" transform="rotate(-12 134 205)"/>';
      s+='<path d="M50 144Q34 150 24 164" stroke="'+NAVY+'" stroke-width="15" stroke-linecap="round" fill="none"/><circle cx="20" cy="168" r="11" fill="'+NAVY+'"/><circle cx="10" cy="163" r="4.5" fill="'+NAVY+'"/><circle cx="12" cy="177" r="4.5" fill="'+NAVY+'"/>';
      s+='<path d="M148 134Q168 130 182 112" stroke="'+NAVY+'" stroke-width="15" stroke-linecap="round" fill="none"/><circle cx="187" cy="106" r="11" fill="'+NAVY+'"/><circle cx="195" cy="92" r="5.5" fill="'+NAVY+'"/><circle cx="199" cy="111" r="4.5" fill="'+NAVY+'"/>';
      s+='<path d="M120 82L121 34Q121 20 132 22Q154 27 170 42Q180 52 178 66Q166 52 150 47Q138 44 131 44L131 84Z" fill="'+NAVY+'"/>';
      s+='<circle cx="100" cy="128" r="58" fill="'+NAVY+'"/>';
      s+='<ellipse cx="82" cy="104" rx="20" ry="12" fill="#2a63c8" opacity=".28"/><ellipse cx="124" cy="152" rx="22" ry="13" fill="#2a63c8" opacity=".22"/><ellipse cx="70" cy="150" rx="12" ry="9" fill="#2a63c8" opacity=".2"/>';
      s+='<g transform="rotate(-6 100 122)" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round"><g stroke-width="4.5"><rect x="50" y="108" width="42" height="32" rx="13"/><rect x="104" y="108" width="42" height="32" rx="13"/><path d="M92 120Q98 116 104 120"/></g><g stroke-width="3.5"><path d="M60 128Q71 114 82 128"/><path d="M114 128Q125 114 136 128"/></g><path d="M84 150Q100 172 116 150Q100 156 84 150Z" fill="#2a63c8" stroke-width="3"/></g>';
      return s;
    }
    function mascot(cls,sp,vb){return '<svg class="'+(cls||"")+'" viewBox="'+(vb||"0 0 200 220")+'" aria-hidden="true">'+mascotG(sp)+'</svg>'}

    function catIcon(k){
      var c='stroke="#1c56b8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"';
      var b='<circle cx="13" cy="13" r="12" fill="#dcebff"/>';
      var i={
       notas:'<ellipse cx="10.5" cy="17.5" rx="3.6" ry="2.8" fill="#1c56b8" stroke="none"/><path d="M14 17V7l5 1.5" '+c+'/>',
       ritmo:'<path d="M5 13h3l2-5 3 10 2-5h6" '+c+'/>',
       claves:'<path d="M5 9h16M5 13h16M5 17h16" stroke="#1c56b8" stroke-width="1.2"/><circle cx="12" cy="15" r="2.4" fill="#1c56b8"/>',
       harmonia:'<ellipse cx="9" cy="18" rx="3" ry="2.3" fill="#1c56b8"/><ellipse cx="9" cy="12" rx="3" ry="2.3" fill="#1c56b8"/><ellipse cx="9" cy="6.5" rx="3" ry="2.3" fill="#1c56b8"/><path d="M12 18V5" '+c+'/>',
       duvidas:'<path d="M9.5 10a3.5 3.5 0 1 1 5 3.1c-1 .6-1.5 1.1-1.5 2.2" '+c+'/><circle cx="13" cy="19" r="1.2" fill="#1c56b8" stroke="none"/>',
       outros:'<path d="M13 5l2.2 5 5.3.5-4 3.6 1.2 5.3L13 16.6 8.3 19.4l1.2-5.3-4-3.6 5.3-.5z" fill="#1c56b8" stroke="none"/>'
      }[k];
      return '<svg viewBox="0 0 26 26" aria-hidden="true">'+b+i+'</svg>';
    }
    function actIcon(k){
      var c='stroke="#1b3a7a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"';
      return '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">'+({
       aula:'<path d="M3 7l9-4 9 4-9 4z" '+c+'/><path d="M7 10v5c2 2 8 2 10 0v-5" '+c+'/>',
       pratica:'<rect x="3" y="9" width="18" height="10" rx="2" '+c+'/><path d="M8 9v6M12 9v6M16 9v6" '+c+'/>',
       teoria:'<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" '+c+'/><path d="M9 9h6" '+c+'/>',
       escuta:'<path d="M5 15v-3a7 7 0 0 1 14 0v3" '+c+'/><rect x="3" y="14" width="4" height="6" rx="1.5" '+c+'/><rect x="17" y="14" width="4" height="6" rx="1.5" '+c+'/>',
       ensaio:'<path d="M12 3v12" '+c+'/><path d="M8 7a4 4 0 0 0 8 0" '+c+'/><path d="M9 21h6M12 15v6" '+c+'/>',
       composicao:'<path d="M4 20l1-4L16 5l3 3L8 19z" '+c+'/>'
      }[k]||'')+'</svg>';
    }

    /* faixa de mar no rodapé de cada página (varia por página) */
    function deco(n){
      var v=n%6, o="";
      o+=wave(40,5,"#d4e6fb",.95,0)+wave(47,5,"#a5c9f4",.95,-14);
      if(v===0){o+=note(60,30,1.1,"#1c56b8")+note(94,21,.9,"#5e9be6")+note(350,28,1,"#1c56b8")+spark(200,16,5,"#8fb8f0")+spark(300,20,4,"#8fb8f0")}
      if(v===1){o+=star5(96,40,11,5,"#f9c98b")+'<path d="M340 47L327 31Q340 20 353 31Z" fill="#fbd9a6" stroke="#e5b574" stroke-width="1.2"/><path d="M340 47V26M334 45l-6-12M346 45l6-12" stroke="#e5b574" stroke-width="1"/>'+spark(200,18,4,"#8fb8f0")}
      if(v===2){o+='<path d="M276 40H324L316 50H284Z" fill="#0d2f7d"/><path d="M300 40V9" stroke="#0d2f7d" stroke-width="2"/><path d="M302 11V38H327Z" fill="#fff"/><path d="M298 16V38H278Z" fill="#cfe5ff"/>'+note(120,26,.9,"#1c56b8")+spark(190,14,4,"#8fb8f0")}
      if(v===3){o+='<g><ellipse cx="112" cy="37" rx="12" ry="6.5" fill="#f9b987"/><path d="M123 37l9-6v12z" fill="#f9b987"/><circle cx="105" cy="35" r="1.4" fill="#0d2f7d"/></g><g><ellipse cx="318" cy="31" rx="10" ry="5.5" fill="#5e9be6"/><path d="M309 31l-8-5v10z" fill="#5e9be6"/><circle cx="324" cy="29.5" r="1.3" fill="#fff"/></g><g fill="none" stroke="#8fb8f0" stroke-width="1.4"><circle cx="134" cy="24" r="2.6"/><circle cx="140" cy="15" r="3.4"/><circle cx="296" cy="20" r="2.4"/></g>'}
      if(v===4){o+='<circle cx="220" cy="42" r="21" fill="#ffe4a1"/>'+spark(160,18,5,"#8fb8f0")+spark(290,14,4,"#8fb8f0")+spark(70,26,4,"#8fb8f0")}
      if(v===5){o+='<g fill="none" stroke="#1c56b8" stroke-width="2" stroke-linecap="round"><path d="M70 22q6-8 12 0q6-8 12 0"/><path d="M104 14q4-6 8 0q4-6 8 0"/></g><circle cx="360" cy="40" r="7" fill="#fff" stroke="#e5546b" stroke-width="3"/>'+note(250,28,1,"#5e9be6")}
      o+=wave(54,4.5,"#5e9be6",.97,7)+wave(61,4,"#2a62c4",1,-20);
      return '<svg class="deco" viewBox="0 0 440 66" preserveAspectRatio="xMidYMax meet" aria-hidden="true">'+o+'</svg>';
    }

    /* capas */
    function nameText(){return esc((S&&S.name)||"")}
    function coverSvg(kind,u){
      var t='font-family="Patrick Hand,cursive"';
      var label='<rect x="96" y="470" width="208" height="46" rx="11" fill="#fdf6e3"/><rect x="102" y="476" width="196" height="34" rx="8" fill="none" stroke="#a9cdf7" stroke-width="1.5" stroke-dasharray="4 4"/>'+note(122,498,.9,"#1c56b8")+'<text class="cv-name" x="214" y="499" text-anchor="middle" font-size="22" fill="#0c2a6b" '+t+'>'+nameText()+'</text>';
      var o='<svg viewBox="0 0 400 540" role="img" aria-label="Capa '+(kind==="mare"?"Maré Azul":"Recife de Notas")+'">';
      if(kind==="mare"){
        o+='<defs><linearGradient id="'+u+'g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b86e8"/><stop offset="1" stop-color="#12408f"/></linearGradient></defs>';
        o+='<rect width="400" height="540" fill="url(#'+u+'g)"/>';
        o+='<g stroke="#fff" stroke-opacity=".16" stroke-width="1.5"><path d="M0 150H400M0 160H400M0 170H400M0 180H400M0 190H400"/></g>';
        o+='<circle cx="200" cy="268" r="118" fill="#fff" fill-opacity=".12"/><circle cx="200" cy="268" r="92" fill="#fff" fill-opacity=".13"/>';
        o+='<text x="205" y="96" text-anchor="middle" font-size="60" fill="#fdf6e3" '+t+'>NoteWave</text><text x="205" y="128" text-anchor="middle" font-size="25" fill="#cfe5ff" '+t+'>caderno de música</text>';
        o+=spark(70,70,10,"#fdf6e3")+spark(340,112,8,"#cfe5ff")+spark(52,222,7,"#cfe5ff")+spark(352,230,9,"#fdf6e3");
        o+=note(60,170,1.5,"#cfe5ff")+note(330,176,1.7,"#fdf6e3")+note(92,320,1.2,"#a9cdf7")+note(318,318,1.3,"#a9cdf7");
        o+='<g transform="translate(103 162) scale(.97)">'+mascotG(true)+'</g>';
        o+=wave(376,9,"#7bb8fb",.92,0,540)+wave(396,9,"#4a93ec",1,-18,540)+wave(418,9,"#2a6fd2",1,10,540)+wave(444,8,"#1a4fb0",1,-8,540)+wave(468,8,"#0f3a8a",1,16,540);
        o+='<g fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2" stroke-linecap="round"><path d="M40 404q10-6 20 0M300 428q10-6 20 0M150 394q10-6 20 0"/></g>';
        o+=label;
      }else{
        o+='<defs><linearGradient id="'+u+'s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfeaff"/><stop offset="1" stop-color="#9ed3f7"/></linearGradient><linearGradient id="'+u+'w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5dbbea"/><stop offset="1" stop-color="#1b66b8"/></linearGradient></defs>';
        o+='<rect width="400" height="540" fill="url(#'+u+'s)"/><rect y="270" width="400" height="270" fill="url(#'+u+'w)"/>';
        o+='<circle cx="338" cy="84" r="52" fill="#ffe8a3" fill-opacity=".35"/><circle cx="338" cy="84" r="31" fill="#ffe8a3"/>';
        o+='<g fill="#fff" fill-opacity=".9"><ellipse cx="292" cy="170" rx="38" ry="12"/><ellipse cx="318" cy="160" rx="26" ry="14"/><ellipse cx="78" cy="204" rx="34" ry="10"/><ellipse cx="100" cy="196" rx="22" ry="11"/></g>';
        o+='<text x="34" y="100" font-size="58" fill="#0c2a6b" '+t+'>NoteWave</text><text x="36" y="132" font-size="25" fill="#1c56b8" '+t+'>caderno de música</text>';
        o+='<path d="M46 268H112L100 284H58Z" fill="#0d2f7d"/><path d="M80 268V206" stroke="#0d2f7d" stroke-width="2.5"/><path d="M83 210V264H114Z" fill="#fdf6e3"/><path d="M77 220V264H52Z" fill="#cfe5ff"/>'+note(94,248,.9,"#1c56b8");
        o+=note(214,178,1.3,"#1c56b8")+note(248,206,1,"#5e9be6")+spark(60,166,7,"#fff")+spark(236,254,6,"#fff");
        o+='<g transform="translate(104 188) scale(1.0)">'+mascotG(true)+'</g>';
        o+=wave(384,9,"#58b6ec",.92,0,540)+wave(406,9,"#3395e0",1,-16,540)+wave(430,9,"#1f72c8",1,12,540)+wave(456,8,"#14529f",1,-10,540)+wave(482,8,"#0d3a85",1,14,540);
        o+='<g fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"><circle cx="70" cy="404" r="5"/><circle cx="82" cy="394" r="3"/><circle cx="330" cy="420" r="6"/><circle cx="318" cy="408" r="3"/></g>';
        o+=label;
      }
      return o+'</svg>';
    }

    /* ---------- estado ---------- */
    var S=null;
    function seed(){
      function ts(d){return Date.parse(d+"T12:00:00")}
      return {cover:null,name:"Giovanna",pages:{
        "1":{title:"Acordes básicos",activity:"aula",category:"harmonia",date:"2026-10-18",updated:ts("2026-10-18"),example:true,
          body:"Acorde é a combinação de 3 ou mais notas tocadas juntas.\nTríade maior: 1ª nota + 3ª maior + 5ª.\nExemplo: Dó maior = Dó, Mi, Sol.\nTríade menor: a 3ª fica meio tom mais baixa (Dó menor = Dó, Mi bemol, Sol).",
          hard:"Trocar de acorde sem parar o ritmo.",learned:"A fundamental dá o nome ao acorde."},
        "2":{title:"Dúvidas de teoria",activity:"teoria",category:"duvidas",date:"2026-10-20",updated:ts("2026-10-20"),example:true,
          body:"Perguntas para levar à próxima aula:\n• Como identificar as notas no teclado?\n• Qual a diferença entre sustenido e bemol?\n• Por que algumas notas têm dois nomes?",
          hard:"Notas com dois nomes (enarmonia) ainda confundem.",learned:"As teclas pretas ficam em grupos de 2 e de 3."},
        "3":{title:"Clave de Fá",activity:"pratica",category:"claves",date:"2026-10-22",updated:ts("2026-10-22"),example:true,
          body:"A clave de Fá marca a nota Fá na quarta linha da pauta.\nÉ usada para sons graves (mão esquerda no piano, baixo, violoncelo).\nA clave de Sol marca a nota Sol na segunda linha, para sons mais agudos.",
          hard:"Ler as notas da mão esquerda sem olhar o teclado.",learned:"O Dó central fica entre as duas claves."},
        "4":{title:"Escalas e intervalos",activity:"teoria",category:"harmonia",date:"2026-10-24",updated:ts("2026-10-24"),example:true,
          body:"A escala maior tem um som mais alegre; a menor, um som mais triste.\nEscala de Dó maior: Dó Ré Mi Fá Sol Lá Si Dó.\nPadrão em tons e semitons: T T S T T T S.",
          hard:"Lembrar onde ficam os semitons (Mi–Fá e Si–Dó).",learned:"Intervalo é a distância entre duas notas."}
      }};
    }
    function load(){try{var r=localStorage.getItem(KEY);if(r){var o=JSON.parse(r);if(o&&o.pages)return o}}catch(e){}return null}
    var saveT=null, saveWarned=false;
    function save(){
      try{localStorage.setItem(KEY,JSON.stringify(S));return true}
      catch(e){
        if(!saveWarned){saveWarned=true;toast("Não foi possível salvar neste navegador. Verifique o espaço ou o modo privado.")}
        return false;
      }
    }
    function queueSave(){clearTimeout(saveT);saveT=setTimeout(save,200)}
    function flush(){clearTimeout(saveT);save()}
    window.addEventListener("pagehide",flush);
    window.addEventListener("beforeunload",flush);
    document.addEventListener("visibilitychange",function(){if(document.visibilityState==="hidden")flush()});
    /* pede ao navegador para não apagar os dados do caderno sozinho */
    if(navigator.storage&&navigator.storage.persist){try{navigator.storage.persist()}catch(e){}}

    S=load()||seed();
    S.trash=S.trash||[];

    var mq=window.matchMedia("(max-width: 819px)");
    var ui={view:S.cover?"book":"cover",tab:"todas",cur:3,q:"",cat:null,pick:S.cover||"mare",dir:"n"};

    function has(p){return !!(p&&((p.title||"").trim()||(p.body||"").trim()||(p.hard||"").trim()||(p.learned||"").trim()))}
    function written(){
      return Object.keys(S.pages).map(function(k){return Object.assign({n:+k},S.pages[k])}).filter(has);
    }
    function single(){return mq.matches}
    function leftOf(n){return single()?n:(n%2?n:n-1)}

    /* ---------- páginas ---------- */
    function pageHtml(n,side){
      var p=S.pages[n]||{};
      var a=act(p.activity);
      var tint=a?a.c:"#e3ecf8";
      var lines=["#cfdcf0","#c8e3ee","#d8d3f0","#cfe8dc","#e6dcc6"][n%5];
      var left=n%2===1;
      var cameo="";
      if(n%4===0||n%5===0){
        cameo='<div class="cameo '+(left?"pr":"pl")+'"><span class="bubble">'+esc(BUBBLES[(n*7)%BUBBLES.length])+'</span>'+mascot("",false)+'</div>';
      }
      var optsA='<option value=""'+(p.activity?"":" selected")+'>Atividade</option>'+ACTS.map(function(x){return '<option value="'+x.k+'"'+(p.activity===x.k?" selected":"")+'>'+x.n+'</option>'}).join("");
      var optsC='<option value=""'+(p.category?"":" selected")+'>Assunto</option>'+CATS.map(function(x){return '<option value="'+x.k+'"'+(p.category===x.k?" selected":"")+'>'+x.n+'</option>'}).join("");
      return '<article class="page '+side+'" data-page="'+n+'" style="--line:'+lines+'" aria-label="Página '+n+'">'+
       '<div class="pg-top"><label class="tag" style="--tagbg:'+tint+'">'+actIcon(p.activity||"aula")+'<span class="sr">Atividade</span><select data-p="'+n+'" data-f="activity" aria-label="Atividade da página '+n+'">'+optsA+'</select></label>'+
       '<div class="rt">'+(p.example?'<span class="ex-chip">exemplo</span>':'')+
       '<input class="pg-date" type="date" data-p="'+n+'" data-f="date" value="'+esc(p.date||TODAY)+'" aria-label="Data da página '+n+'">'+
       '<button class="clear-btn" type="button" data-clear="'+n+'">Apagar</button></div></div>'+
       '<input class="pg-title" data-p="'+n+'" data-f="title" maxlength="80" placeholder="Título da anotação" value="'+esc(p.title||"")+'" aria-label="Título da página '+n+'">'+
       '<label class="tag" style="--tagbg:#e3ecf8;align-self:flex-start">'+catIcon(p.category||"outros").replace('<svg ','<svg width="16" height="16" ')+'<span class="sr">Assunto</span><select data-p="'+n+'" data-f="category" aria-label="Assunto da página '+n+'">'+optsC+'</select></label>'+
       '<textarea class="lined" data-p="'+n+'" data-f="body" placeholder="Escreva aqui o que você estudou, ouviu ou praticou…" aria-label="Anotações da página '+n+'">'+esc(p.body||"")+'</textarea>'+
       '<div class="boxes"><label class="box hard"><span>'+'<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 9a3 3 0 1 1 4.3 2.7c-.9.5-1.3 1-1.3 2" fill="none" stroke="#1b3a7a" stroke-width="2.2" stroke-linecap="round"/><circle cx="12.5" cy="18" r="1.3" fill="#1b3a7a"/></svg>Dificuldades</span><textarea data-p="'+n+'" data-f="hard" placeholder="O que ficou difícil?">'+esc(p.hard||"")+'</textarea></label>'+
       '<label class="box learned"><span><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.4 5.6 6 .6-4.5 4 1.4 5.9L12 16.2 6.7 19.1l1.4-5.9-4.5-4 6-.6z" fill="#1b3a7a"/></svg>Aprendi hoje</span><textarea data-p="'+n+'" data-f="learned" placeholder="O que ficou claro?">'+esc(p.learned||"")+'</textarea></label></div>'+
       '<div class="pg-foot">'+deco(n)+'<span class="pg-num">'+n+'</span>'+cameo+'</div></article>';
    }
    function rings(){var s="";for(var i=0;i<14;i++)s+='<i class="ring"></i>';return '<div class="spine" aria-hidden="true">'+s+'</div>'}

    /* ---------- telas ---------- */
    var root=document.getElementById("root");

    function renderCover(){
      var opts=[{k:"mare",t:"Maré Azul",d:"Azul profundo, com a lua e as ondas da noite"},{k:"recife",t:"Recife de Notas",d:"Dia de sol, veleiro e o Wave boiando no mar"}];
      root.innerHTML='<section class="cover-screen">'+
       '<div class="cs-in gut"><div class="cs-head">'+mascot("",true)+'<div><h1>Escolha a capa do seu caderno</h1><p>São 100 páginas para anotar o que você aprende, o que ainda é difícil e as ideias que aparecem pelo caminho.</p></div></div>'+
       '<div class="cv-grid" role="radiogroup" aria-label="Capa do caderno">'+opts.map(function(o){
         return '<label class="cv-opt'+(ui.pick===o.k?" on":"")+'"><input type="radio" name="cover" value="'+o.k+'"'+(ui.pick===o.k?" checked":"")+'><span class="ok"><svg width="16" height="16" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span><div class="cover">'+coverSvg(o.k,"c"+o.k)+'</div><strong>'+o.t+'</strong><small>'+o.d+'</small></label>';
       }).join("")+'</div>'+
       '<div class="cs-actions"><label class="field">Nome na capa<input id="ownerName" maxlength="18" placeholder="Seu nome" value="'+esc(S.name||"")+'" autocomplete="off"></label><button class="btn primary" type="button" id="openBook">Abrir caderno</button></div></div></section>';
    }

    function barHtml(){
      return '<header class="bar"><div class="bar-in gut">'+
       '<label class="search"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="#0c2a6b" stroke-width="2.4"/><path d="M15.5 15.5L21 21" stroke="#0c2a6b" stroke-width="2.4" stroke-linecap="round"/></svg><span class="sr">Buscar</span><input id="search" type="search" placeholder="Buscar nas anotações…" value="'+esc(ui.q)+'" autocomplete="off"></label>'+
       '<div class="bar-r"><button class="icon-btn" type="button" id="bell" aria-label="Avisos"><svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z" fill="none" stroke="#0c2a6b" stroke-width="2" stroke-linejoin="round"/><path d="M10 21h4" stroke="#0c2a6b" stroke-width="2" stroke-linecap="round"/></svg></button></div>'+
       '</div></header>';
    }
    function footHtml(){
      var w=["Estude","Anote","Evolua","Conquiste"];
      return '<footer class="foot-in gut">'+w.map(function(x,i){return '<span class="w">'+(i?'<i class="sp"></i>':'')+x+'</span>'}).join("")+'</footer>';
    }
    function notebookIcon(){return '<svg class="nb" viewBox="0 0 54 62" aria-hidden="true"><rect x="8" y="3" width="42" height="56" rx="6" fill="#2f6fd0"/><rect x="8" y="3" width="42" height="56" rx="6" fill="none" stroke="#12408f" stroke-width="2"/><path d="M20 20h22M20 28h22M20 36h14" stroke="#cfe5ff" stroke-width="3" stroke-linecap="round"/><g fill="#e8eef9" stroke="#12408f" stroke-width="1.5"><rect x="2" y="9" width="14" height="5" rx="2.5"/><rect x="2" y="20" width="14" height="5" rx="2.5"/><rect x="2" y="31" width="14" height="5" rx="2.5"/><rect x="2" y="42" width="14" height="5" rx="2.5"/></g></svg>'}

    function mountBook(){
      root.innerHTML=barHtml()+'<div class="main-in gut"><section class="panel"><div class="panel-head">'+notebookIcon()+'<div><h1>Caderno de Anotações</h1><p>Registre suas ideias, dúvidas e tudo o que te ajuda a aprender e evoluir!</p></div><button class="btn primary" type="button" id="newNote"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M4 12h16" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>Nova anotação</button></div>'+
       '<div class="tabs" role="tablist" id="tabs"></div><div id="stage"></div></section><aside id="side" aria-label="Resumo do caderno"></aside></div>'+footHtml();
      renderTabs();renderStage();renderSide();
    }
    var TABS=[["todas","Todas"],["minhas","Minhas anotações"],["atividade","Por atividade"],["assunto","Por assunto"],["lixeira","Lixeira"]];
    function renderTabs(){
      $("#tabs").innerHTML=TABS.map(function(t){
        var n=(t[0]==="lixeira"&&S.trash.length)?" ("+S.trash.length+")":"";
        return '<button class="tab" type="button" role="tab" data-tab="'+t[0]+'" aria-selected="'+(ui.tab===t[0])+'">'+t[1]+n+'</button>';
      }).join("")+'<span class="grow"></span><button class="btn small" type="button" id="changeCover">Trocar capa</button>';
    }

    function noteCard(p){
      var a=act(p.activity),c=cat(p.category);
      var snip=(p.body||p.hard||p.learned||"").trim();
      return '<button class="card" type="button" data-open="'+p.n+'"><div class="meta">'+(a?'<span class="pill" style="background:'+a.c+'">'+a.n+'</span>':'')+(c?'<span class="pill">'+c.n+'</span>':'')+'<span>pág. '+p.n+'</span>'+(p.example?'<span class="ex-chip">exemplo</span>':'')+'</div><h3>'+esc((p.title||"").trim()||"Sem título")+'</h3>'+(snip?'<p>'+esc(snip)+'</p>':'')+'<div class="meta">'+fmt(p.date)+'</div></button>';
    }
    function emptyBox(msg){return '<div class="empty">'+mascot("",false)+'<div>'+msg+'</div></div>'}

    function renderStage(){
      var st=$("#stage");if(!st)return;
      if(ui.tab==="todas"){
        var n=ui.cur;
        if(single()){
          st.innerHTML='<div class="book single turn-'+ui.dir+'">'+rings()+pageHtml(n,n%2?"l":"r")+'</div>';
        }else{
          var l=leftOf(n);
          st.innerHTML='<div class="book turn-'+ui.dir+'">'+pageHtml(l,"l")+rings()+pageHtml(l+1,"r")+'</div>';
        }
        var lo=single()?n:leftOf(n), hi=single()?n:lo+1;
        var atStart=lo<=1, atEnd=hi>=TOTAL;
        st.innerHTML+='<div class="pager"><button class="btn" type="button" data-nav="-1"'+(atStart?" disabled":"")+'>← Anterior</button><div class="mid"><span>'+(single()?"Página "+lo:"Páginas "+lo+"–"+hi)+' de '+TOTAL+'</span><label class="sr" for="gotoPg">Ir para a página</label><input id="gotoPg" type="number" min="1" max="'+TOTAL+'" placeholder="ir p/" inputmode="numeric"></div><button class="btn" type="button" data-nav="1"'+(atEnd?" disabled":"")+'>Próxima →</button></div>';
        return;
      }
      if(ui.tab==="lixeira"){
        var th='<div class="banner"><span>Páginas apagadas ficam aqui até você excluir de vez.</span>'+(S.trash.length?'<button class="btn small danger" type="button" id="emptyTrash">Esvaziar lixeira</button>':'')+'</div>';
        th+=S.trash.length?'<div class="cards">'+S.trash.map(trashCard).join("")+'</div>':emptyBox("A lixeira está vazia. Quando você apagar uma página, ela aparece aqui para ser recuperada.");
        st.innerHTML=th;return;
      }
      var list=written();
      if(ui.tab==="minhas"){
        var q=ui.q.trim().toLowerCase();
        var res=list.filter(function(p){
          if(ui.cat&&p.category!==ui.cat)return false;
          if(!q)return true;
          return [p.title,p.body,p.hard,p.learned].join(" ").toLowerCase().indexOf(q)>-1;
        }).sort(function(a,b){return (b.updated||0)-(a.updated||0)});
        var h="";
        var ex=list.filter(function(p){return p.example}).length;
        if(ex)h+='<div class="banner"><span>'+ex+(ex===1?" anotação é um exemplo":" anotações são exemplos")+'. Edite ou apague à vontade.</span><button class="btn small danger" type="button" id="clearEx">Apagar exemplos</button></div>';
        var f="";
        if(ui.q.trim())f+='<span class="chip">Busca: '+esc(ui.q.trim())+'<button type="button" id="clearQ" aria-label="Limpar busca">×</button></span>';
        if(ui.cat)f+='<span class="chip">'+esc(cat(ui.cat).n)+'<button type="button" id="clearCat" aria-label="Limpar filtro de assunto">×</button></span>';
        if(f)h+='<div class="filters">Filtros: '+f+'</div>';
        if(!res.length)h+=emptyBox(list.length?"Nada encontrado com esses filtros.":"Você ainda não escreveu nada. Toque em <b>Nova anotação</b> para começar a primeira página.");
        else h+='<div class="cards">'+res.map(noteCard).join("")+'</div>';
        st.innerHTML=h;return;
      }
      var kind=ui.tab, groups=kind==="atividade"?ACTS:CATS, field=kind==="atividade"?"activity":"category";
      var out="";
      groups.concat([{k:"",n:kind==="atividade"?"Sem atividade":"Sem assunto"}]).forEach(function(g){
        var items=list.filter(function(p){return (p[field]||"")===g.k}).sort(function(a,b){return a.n-b.n});
        if(!g.k&&!items.length)return;
        out+='<section class="group"><h2>'+(kind==="atividade"&&g.k?actIcon(g.k).replace('width="16" height="16"','width="24" height="24"'):'')+g.n+'<small>'+items.length+(items.length===1?" anotação":" anotações")+'</small></h2>'+(items.length?'<div class="cards">'+items.map(noteCard).join("")+'</div>':'<p class="mute">Nenhuma anotação ainda.</p>')+'</section>';
      });
      st.innerHTML=out||emptyBox("Quando você escrever, as anotações aparecem agrupadas aqui.");
    }

    function renderSide(){
      var sd=$("#side");if(!sd)return;
      var list=written();
      var counts={};CATS.forEach(function(c){counts[c.k]=0});
      list.forEach(function(p){if(counts[p.category]!=null)counts[p.category]++});
      var last=list.slice().sort(function(a,b){return (b.updated||0)-(a.updated||0)}).slice(0,4);
      sd.innerHTML='<div class="widget"><h2><svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="#2f6fd0"/></svg>Categorias</h2>'+
       CATS.map(function(c){return '<button class="cat" type="button" data-cat="'+c.k+'" aria-pressed="'+(ui.cat===c.k)+'">'+catIcon(c.k)+'<span>'+c.n+'</span><span class="n">('+counts[c.k]+')</span></button>'}).join("")+'</div>'+
       '<div class="widget"><h2><svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="#2f6fd0" stroke-width="2.4"/><path d="M12 7v5l3.5 2" fill="none" stroke="#2f6fd0" stroke-width="2.4" stroke-linecap="round"/></svg>Últimas anotações</h2>'+
       (last.length?last.map(function(p){return '<button class="last" type="button" data-open="'+p.n+'"><b>'+esc((p.title||"").trim()||"Sem título")+'</b><small>'+fmt(p.date)+' · pág. '+p.n+'</small></button>'}).join(""):'<p class="mute">Suas anotações recentes aparecem aqui.</p>')+'</div>'+
       '<div class="sticky">Seu caderno, seu espaço, suas ideias!<svg viewBox="0 0 24 60" aria-hidden="true"><path d="M12 2l7 6v40l-7 10-7-10V8z" fill="#f2b84b" stroke="#2c4a8f" stroke-width="1.5" stroke-linejoin="round"/><path d="M5 8h14" stroke="#2c4a8f" stroke-width="1.5"/></svg></div>';
    }

    function render(){
      if(ui.view==="cover"){renderCover()}else{mountBook()}
    }

    /* ---------- ações ---------- */
    function toast(msg){
      var t=$(".toast");if(t)t.remove();
      t=document.createElement("div");t.className="toast";t.setAttribute("role","status");t.textContent=msg;document.body.appendChild(t);
      setTimeout(function(){t.remove()},2600);
    }

    /* ---------- card de confirmação ---------- */
    function confirmBox(o){
      var prev=document.activeElement;
      var m=document.createElement("div");
      m.className="nw-modal";
      m.innerHTML='<div class="nw-card" role="alertdialog" aria-modal="true" aria-labelledby="nwT" aria-describedby="nwD">'+
        '<div class="nw-ico">'+mascot("",false)+'</div>'+
        '<h2 id="nwT">'+esc(o.title)+'</h2><p id="nwD">'+esc(o.text)+'</p>'+
        '<div class="nw-actions">'+
        '<button type="button" class="nw-btn gold" data-m="no">'+esc(o.cancel||"Cancelar")+'</button>'+
        '<button type="button" class="nw-btn danger" data-m="yes">'+esc(o.ok||"Sim, apagar")+'</button>'+
        '</div></div>';
      document.body.appendChild(m);
      function close(){
        document.removeEventListener("keydown",key,true);
        m.remove();
        if(prev&&prev.focus&&document.contains(prev))prev.focus();
      }
      function key(e){
        if(e.key==="Escape"){e.stopPropagation();close()}
        else if(e.key==="Tab"){
          var bs=$$("button",m),i=bs.indexOf(document.activeElement);
          e.preventDefault();
          bs[(i+(e.shiftKey?-1:1)+bs.length)%bs.length].focus();
        }
      }
      m.addEventListener("click",function(e){
        var b=e.target.closest("button");
        if(b&&b.dataset.m==="yes"){close();o.onYes()}
        else if(b||e.target===m)close();
      });
      document.addEventListener("keydown",key,true);
      $('[data-m="no"]',m).focus();
    }

    /* ---------- lixeira ---------- */
    function toTrash(ns){
      ns.forEach(function(n){
        var p=S.pages[n];
        if(has(p))S.trash.unshift({n:+n,page:p,at:Date.now()});
        delete S.pages[n];
      });
      save();
    }
    function restore(i){
      var t=S.trash[i];if(!t)return;
      var n=t.n;
      if(has(S.pages[n])){
        n=1;while(n<=TOTAL&&has(S.pages[n]))n++;
        if(n>TOTAL){toast("Não há páginas livres para recuperar.");return}
      }
      t.page.updated=Date.now();
      S.pages[n]=t.page;
      S.trash.splice(i,1);
      save();renderTabs();renderStage();renderSide();
      toast(n===t.n?"Página "+n+" recuperada":"Recuperada na página "+n+" (a "+t.n+" estava ocupada)");
    }
    function trashCard(t,i){
      var p=t.page;
      var snip=(p.body||p.hard||p.learned||"").trim();
      return '<div class="card trash"><div class="meta"><span>pág. '+t.n+'</span><span>apagada em '+new Date(t.at).toLocaleDateString("pt-BR")+'</span></div>'+
        '<h3>'+esc((p.title||"").trim()||"Sem título")+'</h3>'+(snip?'<p>'+esc(snip)+'</p>':'')+
        '<div class="trash-actions"><button class="btn small primary" type="button" data-restore="'+i+'">Recuperar</button>'+
        '<button class="btn small danger" type="button" data-purge="'+i+'">Excluir de vez</button></div></div>';
    }

    function goPage(n,dir){
      n=Math.max(1,Math.min(TOTAL,n));
      ui.dir=dir||(n>=ui.cur?"n":"p");ui.cur=n;
    }
    function openPage(n){
      ui.tab="todas";goPage(n);renderTabs();renderStage();
      var pn=$(".panel");if(pn&&pn.scrollIntoView)pn.scrollIntoView({behavior:"smooth",block:"start"});
    }
    function newNote(){
      var n=1;while(n<=TOTAL&&has(S.pages[n]))n++;
      if(n>TOTAL){toast("As 100 páginas estão preenchidas.");return}
      ui.tab="todas";ui.q="";ui.cat=null;var s=$("#search");if(s)s.value="";
      goPage(n);renderTabs();renderStage();renderSide();
      var t=$('.page[data-page="'+n+'"] .pg-title');if(t)t.focus();
      toast("Página "+n+" pronta para escrever");
    }
    function onField(el){
      var n=el.dataset.p,f=el.dataset.f;
      var pg=S.pages[n]||(S.pages[n]={});
      pg[f]=el.value;
      var page=el.closest(".page");
      if(!pg.date){var di=$('[data-f="date"]',page);pg.date=(di&&di.value)||TODAY}
      pg.updated=Date.now();
      if(pg.example){delete pg.example;var ch=$(".ex-chip",page);if(ch)ch.remove()}
      if(f==="activity"){var a=act(el.value);el.closest(".tag").style.setProperty("--tagbg",a?a.c:"#e3ecf8")}
      queueSave();renderSide();
    }

    document.addEventListener("input",function(e){
      var el=e.target;
      if(el.dataset&&el.dataset.f){onField(el);return}
      if(el.id==="ownerName"){
        S.name=el.value;queueSave();
        $$(".cv-name").forEach(function(t){t.textContent=el.value});
        return;
      }
      if(el.id==="search"){
        ui.q=el.value;
        if(ui.q.trim()&&ui.tab!=="minhas")ui.tab="minhas";
        renderTabs();renderStage();
      }
    });
    document.addEventListener("change",function(e){
      var el=e.target;
      if(el.dataset&&el.dataset.f){flush();return}
      if(el.name==="cover"){
        ui.pick=el.value;
        $$(".cv-opt").forEach(function(l){l.classList.toggle("on",$("input",l).checked)});
        return;
      }
      if(el.id==="gotoPg"){
        var v=parseInt(el.value,10);
        if(v>=1&&v<=TOTAL){goPage(v);renderStage()}else{toast("Digite um número de 1 a "+TOTAL)}
      }
    });
    document.addEventListener("keydown",function(e){
      if(e.target.id==="gotoPg"&&e.key==="Enter"){e.target.blur()}
    });
    document.addEventListener("click",function(e){
      var t=e.target.closest("button");if(!t)return;
      if(t.id==="openBook"){
        S.cover=ui.pick;save();ui.view="book";ui.tab="todas";render();window.scrollTo(0,0);return;
      }
      if(t.id==="changeCover"){ui.view="cover";ui.pick=S.cover||ui.pick;render();window.scrollTo(0,0);return}
      if(t.id==="newNote"){newNote();return}
      if(t.id==="bell"){toast("Sem avisos novos por enquanto.");return}
      if(t.dataset.tab){ui.tab=t.dataset.tab;renderTabs();renderStage();return}
      if(t.dataset.nav){
        var d=parseInt(t.dataset.nav,10);
        var step=single()?1:2;
        var base=single()?ui.cur:leftOf(ui.cur);
        goPage(base+d*step,d>0?"n":"p");renderStage();return;
      }
      if(t.dataset.open){openPage(parseInt(t.dataset.open,10));return}
      if(t.dataset.cat){
        ui.cat=(ui.cat===t.dataset.cat)?null:t.dataset.cat;
        if(ui.cat)ui.tab="minhas";
        renderTabs();renderStage();renderSide();return;
      }
      if(t.id==="clearQ"){ui.q="";var s=$("#search");if(s)s.value="";renderStage();return}
      if(t.id==="clearCat"){ui.cat=null;renderStage();renderSide();return}

      if(t.id==="clearEx"){
        var exs=Object.keys(S.pages).filter(function(k){return S.pages[k].example});
        confirmBox({
          title:"Apagar os exemplos?",
          text:"As "+exs.length+" anotações de exemplo vão para a Lixeira. Você pode recuperá-las quando quiser.",
          cancel:"Manter",ok:"Sim, apagar",
          onYes:function(){toTrash(exs);renderTabs();renderStage();renderSide();toast("Exemplos movidos para a Lixeira")}
        });
        return;
      }
      if(t.dataset.clear){
        var cn=t.dataset.clear;
        if(!has(S.pages[cn])){toast("Esta página já está vazia.");return}
        var ct=(S.pages[cn].title||"").trim();
        confirmBox({
          title:"Apagar a página "+cn+"?",
          text:(ct?"“"+ct+"” vai":"O conteúdo desta página vai")+" para a Lixeira. Você pode recuperar quando quiser.",
          cancel:"Manter anotação",ok:"Sim, apagar",
          onYes:function(){toTrash([cn]);renderTabs();renderStage();renderSide();toast("Página "+cn+" movida para a Lixeira")}
        });
        return;
      }
      if(t.dataset.restore){restore(parseInt(t.dataset.restore,10));return}
      if(t.dataset.purge){
        var pi=parseInt(t.dataset.purge,10);
        confirmBox({
          title:"Excluir para sempre?",
          text:"Esta anotação será removida de vez e não poderá mais ser recuperada.",
          cancel:"Manter na lixeira",ok:"Excluir de vez",
          onYes:function(){S.trash.splice(pi,1);save();renderTabs();renderStage();toast("Anotação excluída")}
        });
        return;
      }
      if(t.id==="emptyTrash"){
        confirmBox({
          title:"Esvaziar a lixeira?",
          text:"As "+S.trash.length+" anotações da lixeira serão removidas de vez.",
          cancel:"Cancelar",ok:"Esvaziar",
          onYes:function(){S.trash=[];save();renderTabs();renderStage();toast("Lixeira esvaziada")}
        });
        return;
      }
    });

    /* abre na dupla com a anotação mais recente */
    (function(){
      var l=written().sort(function(a,b){return (b.updated||0)-(a.updated||0)})[0];
      if(l)ui.cur=l.n;
    })();
    if(mq.addEventListener)mq.addEventListener("change",function(){if(ui.view==="book"&&ui.tab==="todas")renderStage()});
    render();
})();