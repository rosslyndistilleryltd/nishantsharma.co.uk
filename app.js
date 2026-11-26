/* nishantsharma.co.uk — V29 "Atmosphere" runtime. No framework; Lenis (optional) for smooth scroll. */
(function(){
'use strict';
var D=document,W=window,H=D.documentElement;
var RM=W.matchMedia&&W.matchMedia('(prefers-reduced-motion: reduce)').matches;
var $=function(s,c){return (c||D).querySelector(s)},$$=function(s,c){return Array.prototype.slice.call((c||D).querySelectorAll(s))};
var clamp=function(v,a,b){return v<a?a:v>b?b:v},lerp=function(a,b,t){return a+(b-a)*t};
var ease=function(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2};
var vh=W.innerHeight,vw=W.innerWidth;
var ss=(function(){try{return W.sessionStorage}catch(e){return null}})();

/* ---------- split headings into words > chars (Mont-Fort SplitText) ---------- */
var SPLIT='.statement,.partcard h2,.ch h3,.venture h3,.close-quote blockquote,.nextp .nt,.card b,.mark .sub';
$$(SPLIT).forEach(function(el){
  if(el.dataset.split)return;el.dataset.split='1';var _txt=el.textContent.replace(/\s+/g,' ').trim();if(/^(H[1-6]|BLOCKQUOTE|A)$/.test(el.tagName))el.setAttribute('aria-label',_txt);else{var _sr=D.createElement('span');_sr.className='sr-only';_sr.textContent=_txt;el.appendChild(_sr);}
  (function walk(node){
    Array.prototype.slice.call(node.childNodes).forEach(function(n){
      if(n.nodeType===3){
        var frag=D.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function(tok){
          if(!tok)return;
          if(/^\s+$/.test(tok)){frag.appendChild(D.createTextNode(' '));return}
          var w=D.createElement('span');w.className='w';w.setAttribute('aria-hidden','true');
          tok.split('').forEach(function(ch){var c=D.createElement('span');c.className='c';c.textContent=ch;w.appendChild(c)});
          frag.appendChild(w);
        });
        node.replaceChild(frag,n);
      }else if(n.nodeType===1&&!n.classList.contains('w'))walk(n);
    });
  })(el);
});
/* ---------- hero letters ---------- */
$$('.mark h1 .l').forEach(function(l,i){l.style.setProperty('--i',i)});

/* ---------- smooth scroll ---------- */
var lenis=null;
var GS=W.gsap&&W.ScrollTrigger;
if(GS){gsap.registerPlugin(ScrollTrigger);H.classList.add('gs')}else H.classList.add('nogs');
if(!RM&&W.Lenis){
  try{lenis=new W.Lenis({duration:1.35,easing:function(t){return Math.min(1,1.001-Math.pow(2,-10*t))},smoothWheel:true,wheelMultiplier:.85,touchMultiplier:1.4})}catch(e){lenis=null}
  if(lenis&&GS){lenis.on('scroll',ScrollTrigger.update);gsap.ticker.add(function(t){lenis.raf(t*1000)});gsap.ticker.lagSmoothing(0)}
}
/* ---------- router: teaser + tabbed panels ---------- */
var panels=$$('.panel'),curP=$('.panel.on'),curtain=$('.curtain'),busy=false,pendingPanel=null,baseTitle=D.title;
function panelOf(el){return el&&(el.classList&&el.classList.contains('panel')?el:el.closest&&el.closest('.panel'))}
function setTabs(){$$('.tabs a').forEach(function(a){a.classList.toggle('act',curP&&a.getAttribute('href')==='#'+curP.id)})}
function swap(p,target){
  panels.forEach(function(x){x.classList.toggle('on',x===p)});curP=p;H.setAttribute('data-panel',p.id);lastYear=null;var hh=$('.hdr');hh&&hh.classList.remove('hide');
  D.title=p.id==='home'?baseTitle:p.dataset.title+' — Nishant Sharma';setTabs();
  if(lenis){lenis.scrollTo(0,{immediate:true,force:true})}W.scrollTo(0,0);
  measure();if(lenis&&lenis.resize)lenis.resize();
  if(GS)setTimeout(function(){ScrollTrigger.refresh();W.World&&W.World.panel()},30);else W.World&&W.World.panel();
  $$('.rv,.split,.dia,.edge,.structure',p).forEach(function(el){if(!el.classList.contains('in'))io.observe(el)});
  if(target&&target!==p)setTimeout(function(){measure();scrollToEl(target)},60);
  var h=$('h1,h2',p);if(h&&!target){h.setAttribute('tabindex','-1');h.focus({preventScroll:true})}
}
function show(p,target,instant){
  if(!p)return;
  if(busy){pendingPanel={p:p,target:target,instant:instant};return}
  if(p===curP){if(target&&target!==p)scrollToEl(target);else scrollToEl(D.body);return}
  if(instant||RM||!curtain){swap(p,target);return}
  busy=true;$('span',curtain).textContent=p.id==='home'?'Nishant Sharma':p.dataset.title;
  curtain.classList.remove('out');void curtain.offsetWidth;curtain.classList.add('in');
  setTimeout(function(){swap(p,target);curtain.classList.remove('in');curtain.classList.add('out');setTimeout(function(){curtain.classList.remove('out');busy=false;if(pendingPanel){var next=pendingPanel;pendingPanel=null;show(next.p,next.target,next.instant)}},820)},680);
}
function alias(hash){var id=(hash||'').replace(/^#/,'');return ({press:'archive',book:'archive',table:'photographs',top:'home',reach:'s-reach',ventures:'work',rosslyn:'ros',principles:'s-principles',contact:'contact'})[id]||id}
function route(hash,instant){
  var id=alias(hash);var el=id?D.getElementById(id):null;
  if(el&&!panelOf(el)){var t0=el;setTimeout(function(){measure();scrollToEl(t0)},80);return}
  if(!el)el=D.getElementById('home');
  show(panelOf(el),el,instant);
}
function scrollToEl(el){
  if(!el)return;
  if(el===D.body){lenis?lenis.scrollTo(0,{duration:1.2}):W.scrollTo({top:0,behavior:RM?'auto':'smooth'});return}
  if(lenis){lenis.scrollTo(el,{offset:0,duration:1.6})}else el.scrollIntoView({behavior:RM?'auto':'smooth'});
}
D.addEventListener('click',function(e){
  var a=e.target.closest&&e.target.closest('a[href^="#"]');if(!a)return;
  var id=a.getAttribute('href').slice(1);if(!id||id==='main')return;
  var t=D.getElementById(id);if(!t)return;var p=panelOf(t);if(!p){e.preventDefault();closeMenu();scrollToEl(t);return}
  e.preventDefault();closeMenu();
  try{history.pushState(null,'','#'+id)}catch(err){}
  show(p,t);
});
W.addEventListener('popstate',function(){route(location.hash)});
W.addEventListener('hashchange',function(){route(location.hash)});

/* ---------- preloader ---------- */
var pre=$('#pre');
function ready(){H.classList.add('ready');}
if(pre){
  var seen=ss&&ss.getItem('ns-pre');
  if(RM){pre.classList.add('gone');ready()}
  else{
    var yr=$('.yr',pre),bar=$('.bar i',pre),pl=$('.pl',pre);
    var places=['Dibrugarh','Jalandhar','Amritsar','Glasgow','Edinburgh'];
    var t0=performance.now(),dur=seen?1000:(vw<760?1600:2300),loaded=false; /* plays on every page load; a shorter version once already seen this session */
    var fontsP=(D.fonts&&D.fonts.ready)?D.fonts.ready:Promise.resolve();
    Promise.race([fontsP,new Promise(function(r){setTimeout(r,3000)})]).then(function(){loaded=true});
    (function tick(now){
      var p=clamp((now-t0)/dur,0,1);if(!loaded)p=Math.min(p,.9);
      var e=ease(p);
      yr.textContent=Math.round(lerp(1940,2026,e));
      bar.style.transform='scaleX('+e+')';
      pl.textContent=places[Math.min(places.length-1,Math.floor(e*places.length))];
      if(p<1)requestAnimationFrame(tick);
      else{setTimeout(function(){pre.classList.add('out');ready();try{ss&&ss.setItem('ns-pre','1')}catch(err){}setTimeout(function(){pre.classList.add('gone')},1400)},250)}
    })(t0);
    pre.addEventListener('click',function(){pre.classList.add('out');ready();setTimeout(function(){pre.classList.add('gone')},1300)});
  }
}else ready();

/* ---------- plates wait for their image ---------- */
$$('.plate').forEach(function(p){var im=$('img',p);if(!im)return;function ok(){p.classList.add('ok')}if(im.complete&&im.naturalWidth)ok();else{im.addEventListener('load',ok,{once:true});im.addEventListener('error',ok,{once:true})}});

/* ---------- reveals ---------- */
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -12% 0px',threshold:.01});
$$('.rv,.split,.dia,.edge,.structure').forEach(function(el){io.observe(el)});

/* ---------- menu ---------- */
var mb=$('.menu-btn');
function closeMenu(){if(H.classList.contains('menu-open')){H.classList.remove('menu-open');mb&&mb.setAttribute('aria-expanded','false');lenis&&lenis.start()}}
if(mb)mb.addEventListener('click',function(){
  var o=H.classList.toggle('menu-open');mb.setAttribute('aria-expanded',o?'true':'false');
  if(o){lenis&&lenis.stop();var f=$('.menu a');f&&setTimeout(function(){if(H.classList.contains('menu-open'))f.focus()},400)}else lenis&&lenis.start();
});
D.addEventListener('keydown',function(e){
  var menuOpen=H.classList.contains('menu-open');
  if(e.key==='Escape'&&menuOpen){closeMenu();mb&&mb.focus();return}
  if(e.key!=='Tab')return;
  var modal=lb&&!lb.hidden?lb:menuOpen?$('.menu'):null;if(!modal)return;
  var controls=$$('a[href],button:not([disabled]),input:not([disabled]),[tabindex="0"]',modal).filter(function(el){return el.getClientRects().length>0});
  if(menuOpen&&modal!==lb&&mb)controls.unshift(mb);
  if(!controls.length)return;
  var first=controls[0],last=controls[controls.length-1],active=D.activeElement;
  if(controls.indexOf(active)<0){e.preventDefault();(e.shiftKey?last:first).focus()}
  else if(e.shiftKey&&active===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&active===last){e.preventDefault();first.focus()}
});

/* ---------- chapter "read more" ---------- */
$$('.toggle').forEach(function(b){b.addEventListener('click',function(){
  var ch=b.closest('.ch');var o=ch.classList.toggle('open');b.setAttribute('aria-expanded',o?'true':'false');
  setTimeout(measure,950);
})});

/* ---------- sound: original cinematic score, loaded only on request ---------- */
var snd=$('.snd'),sc=snd&&$('canvas',snd),sx=sc&&sc.getContext('2d'),audio=null,soundOn=false,amp=0;
function soundState(on){
  soundOn=on;snd.setAttribute('aria-pressed',on?'true':'false');
  $('span',snd).textContent=on?'Sound on':'Sound off';
}
function startAudio(){
  var AC=W.AudioContext||W.webkitAudioContext;if(!AC)return false;
  try{
    var ac=new AC(),out=ac.createGain(),track=D.createElement('audio');
    track.src='assets/beyond-the-northern-light.m4a';track.loop=true;track.preload='none';
    track.hidden=true;track.setAttribute('aria-hidden','true');D.body.appendChild(track);
    var source=ac.createMediaElementSource(track);source.connect(out);
    out.gain.value=0;out.connect(ac.destination);
    audio={ac:ac,out:out,track:track,pauseTimer:null,request:0};
    track.addEventListener('error',function(){
      audio.request++;clearTimeout(audio.pauseTimer);track.pause();
      out.gain.cancelScheduledValues(ac.currentTime);out.gain.value=0;soundState(false);
    });
    return true;
  }catch(e){return false}
}
function playScore(){
  var a=audio,id=++a.request;
  clearTimeout(a.pauseTimer);
  return a.ac.resume().then(function(){
    if(id!==a.request||!soundOn||D.hidden)return;
    return a.track.play();
  }).then(function(){
    if(id!==a.request)return;
    if(!soundOn||D.hidden){a.track.pause();return}
    a.out.gain.cancelScheduledValues(a.ac.currentTime);
    a.out.gain.setTargetAtTime(.42,a.ac.currentTime,.7);
  }).catch(function(){if(id===a.request){a.track.pause();soundState(false)}});
}
if(snd){
  snd.addEventListener('click',function(){
    if(!audio&&!startAudio())return;
    soundState(!soundOn);
    if(soundOn){playScore();return}
    var a=audio,id=++a.request;
    a.out.gain.cancelScheduledValues(a.ac.currentTime);
    a.out.gain.setTargetAtTime(0,a.ac.currentTime,.18);
    clearTimeout(a.pauseTimer);
    a.pauseTimer=setTimeout(function(){if(id===a.request&&!soundOn){a.track.pause();a.ac.suspend().catch(function(){})}},1100);
  });
}
function drawWave(t){
  if(!sx)return;amp=lerp(amp,soundOn?1:.18,.06);
  var w=sc.width,h=sc.height;sx.clearRect(0,0,w,h);sx.strokeStyle='#de9a5e';sx.lineWidth=1.5;sx.beginPath();
  for(var x=0;x<=w;x++){var y=h/2+Math.sin(x*.42+t*.006)*Math.sin(x*.11+t*.002)*h*.38*amp;x?sx.lineTo(x,y):sx.moveTo(x,y)}
  sx.stroke();
}
if(sc){sc.width=56;sc.height=36}

/* ---------- atmosphere: fixed WebGL world ---------- */
var SC=[ // base, mist, glow, density, rain, stars, embers, hills
 [[.12,.03,.05],[.62,.34,.35],[.88,.68,.38],.9,0,0,0,1],  //0 dawn mist over tea hills (hero / home)
 [[.10,.045,.035],[.52,.38,.25],[.90,.70,.38],1,0,0,0,1], //1 Assam tea mist
 [[.13,.05,.03],[.60,.39,.22],[.94,.64,.32],.65,0,0,0,.45],//2 Punjab dust, low fields
 [[.025,.02,.075],[.17,.13,.30],[.62,.56,.72],.38,0,1,0,0],//3 crossing night
 [[.07,.05,.07],[.38,.33,.39],[.64,.58,.64],.85,1,0,0,0], //4 Glasgow rain
 [[.11,.03,.05],[.34,.14,.18],[.74,.54,.37],.55,0,0,0,.25],//5 Edinburgh night
 [[.08,.02,.02],[.38,.13,.08],[.96,.52,.22],.55,0,0,1,.5], //6 the fire, Dibrugarh
 [[.17,.035,.06],[.58,.27,.30],[.86,.66,.36],.75,0,0,0,0], //7 building, gold
 [[.16,.03,.05],[.32,.09,.13],[.64,.47,.27],.48,0,0,0,0]   //8 deep oxblood (work, house)
];
var gl=null,prog=null,U={},cv=null,cur=null,tgt=0,atmosEl=$('#atmos');
function initGL(){
  if(!atmosEl)return;
  cv=D.createElement('canvas');atmosEl.appendChild(cv);
  try{gl=cv.getContext('webgl',{antialias:false,alpha:false,premultipliedAlpha:false,powerPreference:'low-power'})}catch(e){gl=null}
  if(!gl){atmosEl.remove();return}
  var vs='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var fs=$('#fs').textContent;
  function sh(t,s){var o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){console.warn(gl.getShaderInfoLog(o));return null}return o}
  var a=sh(gl.VERTEX_SHADER,vs),b=sh(gl.FRAGMENT_SHADER,fs);if(!a||!b){gl=null;atmosEl.remove();return}
  prog=gl.createProgram();gl.attachShader(prog,a);gl.attachShader(prog,b);gl.linkProgram(prog);gl.useProgram(prog);
  var buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  var loc=gl.getAttribLocation(prog,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  ['uRes','uTime','uScroll','uBase','uMist','uGlow','uDens','uRain','uStars','uEmb','uHills'].forEach(function(n){U[n]=gl.getUniformLocation(prog,n)});
  cur=JSON.parse(JSON.stringify(SC[0]));
  sizeGL();requestAnimationFrame(function(){atmosEl.classList.add('on')});
}
function sizeGL(){if(!gl)return;var s=vw<700?.42:.55;cv.width=Math.max(2,Math.round(vw*s));cv.height=Math.max(2,Math.round(vh*s));gl.viewport(0,0,cv.width,cv.height)}
function drawGL(t,sy){
  if(!gl)return;var T=SC[tgt],k=RM?1:.035;
  for(var j=0;j<3;j++)for(var c=0;c<3;c++)cur[j][c]=lerp(cur[j][c],T[j][c],k);
  for(var q=3;q<8;q++)cur[q]=lerp(cur[q],T[q],k);
  gl.uniform2f(U.uRes,cv.width,cv.height);gl.uniform1f(U.uTime,RM?12:t*.001);gl.uniform1f(U.uScroll,sy/vh);
  gl.uniform3fv(U.uBase,cur[0]);gl.uniform3fv(U.uMist,cur[1]);gl.uniform3fv(U.uGlow,cur[2]);
  gl.uniform1f(U.uDens,cur[3]);gl.uniform1f(U.uRain,cur[4]);gl.uniform1f(U.uStars,cur[5]);gl.uniform1f(U.uEmb,cur[6]);gl.uniform1f(U.uHills,cur[7]);
  gl.drawArrays(gl.TRIANGLES,0,3);
}

/* ---------- globe ---------- */
var gc=$('#globe'),gx=null,LAND=[],PINS=[],gVis=false;
if(gc){
  try{var raw=atob(gc.getAttribute('data-land')),bytes=new Uint8Array(raw.length);for(var i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
    var i16=new Int16Array(bytes.buffer);for(var j=0;j<i16.length;j+=2)LAND.push([i16[j]/100*Math.PI/180,i16[j+1]/100*Math.PI/180])}catch(e){}
  try{PINS=JSON.parse(gc.getAttribute('data-pins')).map(function(p){return{n:p[0],la:p[1]*Math.PI/180,lo:p[2]*Math.PI/180,k:p[3]}})}catch(e){}
  new IntersectionObserver(function(es){gVis=es[0].isIntersecting},{rootMargin:'200px'}).observe(gc);
}
var R2D=Math.PI/180,LBL={'Dubai':1,'Mumbai':1,'Singapore':1,'Hong Kong':1,'Ontario':1,'Delhi':1};
function proj(la,lo,la0,lo0){var cl=Math.cos(la),dl=lo-lo0,c=Math.sin(la0)*Math.sin(la)+Math.cos(la0)*cl*Math.cos(dl);return[cl*Math.sin(dl),Math.cos(la0)*Math.sin(la)-Math.sin(la0)*cl*Math.cos(dl),c]}
function slerp(a,b,t){ // lat/lon arrays -> point
  var va=[Math.cos(a[0])*Math.cos(a[1]),Math.cos(a[0])*Math.sin(a[1]),Math.sin(a[0])],vb=[Math.cos(b[0])*Math.cos(b[1]),Math.cos(b[0])*Math.sin(b[1]),Math.sin(b[0])];
  var d=Math.acos(clamp(va[0]*vb[0]+va[1]*vb[1]+va[2]*vb[2],-1,1));if(d<1e-6)return a;var s=Math.sin(d),A=Math.sin((1-t)*d)/s,B=Math.sin(t*d)/s;
  var x=A*va[0]+B*vb[0],y=A*va[1]+B*vb[1],z=A*va[2]+B*vb[2];return[Math.atan2(z,Math.sqrt(x*x+y*y)),Math.atan2(y,x),d];
}
var gp=0;
function drawGlobe(t){
  if(!gx||!gVis)return;
  var dpr=Math.min(W.devicePixelRatio||1,2),r=gc.getBoundingClientRect(),w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);
  if(gc.width!==w||gc.height!==h){gc.width=w;gc.height=h}
  var cx=w/2,cy=h/2,R=Math.min(w,h)*.44,p=ease(gp);
  var lo0=lerp(-8,84,p)*R2D+(RM?0:Math.sin(t*.00015)*.04),la0=lerp(40,22,p)*R2D;
  gx.clearRect(0,0,w,h);
  var g=gx.createRadialGradient(cx-R*.3,cy-R*.35,R*.1,cx,cy,R*1.08);g.addColorStop(0,'rgba(107,92,134,.42)');g.addColorStop(.7,'rgba(43,35,70,.32)');g.addColorStop(1,'rgba(26,21,48,0)');
  gx.fillStyle=g;gx.beginPath();gx.arc(cx,cy,R*1.08,0,7);gx.fill();
  gx.strokeStyle='rgba(222,154,94,.28)';gx.lineWidth=dpr;gx.beginPath();gx.arc(cx,cy,R,0,7);gx.stroke();
  var ds=1.25*dpr*(R/320);
  for(var i=0;i<LAND.length;i++){var q=proj(LAND[i][0],LAND[i][1],la0,lo0);if(q[2]<=0)continue;
    gx.fillStyle='rgba(243,231,214,'+(0.12+q[2]*.5).toFixed(3)+')';var s=ds*(.55+q[2]*.6);gx.fillRect(cx+q[0]*R-s/2,cy-q[1]*R-s/2,s,s)}
  var home=PINS[0];if(!home)return;
  var arcP=clamp((gp-.12)/.6,0,1);
  PINS.forEach(function(pn,idx){
    if(idx===0)return;var tt=clamp(arcP*1.6-idx*.045,0,1);if(tt<=0)return;
    gx.setLineDash(pn.k==='planned'?[4*dpr,5*dpr]:[]);
    gx.strokeStyle=pn.k==='origin'?'rgba(246,177,68,.95)':'rgba(222,154,94,.55)';gx.lineWidth=(pn.k==='origin'?1.6:1)*dpr;gx.beginPath();var started=false;
    var N=48,dd=slerp([home.la,home.lo],[pn.la,pn.lo],.5)[2]||0;
    for(var k=0;k<=N*tt;k++){var u=k/N,sp=slerp([home.la,home.lo],[pn.la,pn.lo],u),lift=1+Math.sin(Math.PI*u)*.06*Math.min(1,dd*1.5),q=proj(sp[0],sp[1],la0,lo0);
      if(q[2]<-.05){started=false;continue}var X=cx+q[0]*R*lift,Y=cy-q[1]*R*lift;started?gx.lineTo(X,Y):(gx.moveTo(X,Y),started=true)}
    gx.stroke();gx.setLineDash([]);
  });
  var pulse=RM?.5:(t*.001)%1;
  gx.font=(11*dpr)+'px Baskervville, Georgia, serif';gx.textBaseline='middle';
  PINS.forEach(function(pn,idx){
    var q=proj(pn.la,pn.lo,la0,lo0);if(q[2]<=0)return;var X=cx+q[0]*R,Y=cy-q[1]*R;
    var vis=idx===0?1:clamp(arcP*1.6-idx*.045-.15,0,1);if(vis<=0)return;
    var col=pn.k==='origin'?'246,177,68':pn.k==='home'?'245,237,225':pn.k==='planned'?'192,128,129':'205,160,83';
    gx.fillStyle='rgba('+col+','+vis+')';gx.beginPath();gx.arc(X,Y,(pn.k==='home'||pn.k==='origin'?3.4:2.4)*dpr,0,7);gx.fill();
    if(pn.k==='home'||pn.k==='origin'){gx.strokeStyle='rgba('+col+','+((1-pulse)*.8*vis)+')';gx.beginPath();gx.arc(X,Y,(4+pulse*14)*dpr,0,7);gx.stroke()}
    var big=pn.k==='home'||pn.k==='origin'||pn.k==='planned';
    if(big||LBL[pn.n]){gx.fillStyle='rgba(243,231,214,'+(vis*(big?.95:.6)*Math.min(1,q[2]*1.6))+')';gx.fillText(pn.n.toUpperCase().split('').join(String.fromCharCode(8202)),X+8*dpr,Y-1)}
  });
}

/* ---------- flight (chapter V) ---------- */
var fl=$('.flight'),fpath=fl&&$('#fpath',fl),fplane=fl&&$('#fplane',fl),flen=fpath?fpath.getTotalLength():0;
if(fpath){fpath.style.strokeDasharray=flen;fpath.style.strokeDashoffset=flen}

/* ---------- gallery: tabs, drag reels, lightbox ---------- */
var reels=$$('.reel'),rbar=$('.reel-bar i'),reel=reels[0]||null;
function upBar(){if(!reel||!rbar)return;var m=reel.scrollWidth-reel.clientWidth,vwr=reel.clientWidth/Math.max(1,reel.scrollWidth);rbar.style.width=(vwr*100)+'%';rbar.style.transform='translateX('+((m?reel.scrollLeft/m:0)*(1/vwr-1)*100)+'%)'}
var drag=null;
reels.forEach(function(r){
  r.addEventListener('pointerdown',function(e){if(e.pointerType!=='mouse')return;drag={r:r,x:e.clientX,sl:r.scrollLeft,moved:false};r.classList.add('drag')});
  r.addEventListener('click',function(e){if(drag&&drag.moved){e.preventDefault();e.stopPropagation()}},true);
  r.addEventListener('scroll',upBar,{passive:true});
});
W.addEventListener('pointermove',function(e){if(!drag)return;var dx=e.clientX-drag.x;if(Math.abs(dx)>4)drag.moved=true;drag.r.scrollLeft=drag.sl-dx});
W.addEventListener('pointerup',function(){if(!drag)return;var d=drag;d.r.classList.remove('drag');setTimeout(function(){if(drag===d)drag=null},0)});
$$('.reel-ctl button').forEach(function(b){b.addEventListener('click',function(){reel&&reel.scrollBy({left:(b.dataset.dir==='1'?1:-1)*reel.clientWidth*.7,behavior:RM?'auto':'smooth'})})});
$$('.gt').forEach(function(t){t.addEventListener('click',function(){
  $$('.gt').forEach(function(x){var on=x===t;x.classList.toggle('act',on);x.setAttribute('aria-selected',on?'true':'false')});
  reels.forEach(function(r){var on=r.dataset.g===t.dataset.g;r.hidden=!on;if(on){reel=r;r.scrollLeft=0}});upBar();
})});
upBar();
var lb=$('#lb'),lbI=lb&&$('img',lb),lbC=lb&&$('figcaption',lb),lbSet=[],lbIx=0,lbPrev=null;
function lbShow(i){lbIx=(i+lbSet.length)%lbSet.length;var b=lbSet[lbIx],im=$('img',b),fc=b.parentNode.querySelector('figcaption');var lab=(b.getAttribute('aria-label')||'').replace(/^Open photograph: /,'');lbI.src=b.dataset.full;lbI.alt=im.alt||lab;lbC.textContent=fc?fc.textContent:(im.alt||lab)}
D.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('button.ph');if(!b||!lb)return;if(drag&&drag.moved)return;
  var scope=b.closest('[data-lbset]')||b.parentNode;lbSet=$$('button.ph:not(.dup)',scope);if(b.classList.contains('dup')){b=lbSet.filter(function(x){return x.dataset.full===b.dataset.full})[0]||lbSet[0]}lbPrev=b;lb.hidden=false;lenis&&lenis.stop();lbShow(lbSet.indexOf(b));$('.lb-x',lb).focus()});
function lbClose(){if(!lb||lb.hidden)return;lb.hidden=true;lbI.removeAttribute('src');lenis&&lenis.start();lbPrev&&lbPrev.focus()}
if(lb){$('.lb-x',lb).addEventListener('click',lbClose);$('.lb-p',lb).addEventListener('click',function(){lbShow(lbIx-1)});$('.lb-n',lb).addEventListener('click',function(){lbShow(lbIx+1)});
  lb.addEventListener('click',function(e){if(e.target===lb)lbClose()});
  D.addEventListener('keydown',function(e){if(lb.hidden)return;if(e.key==='Escape')lbClose();if(e.key==='ArrowLeft')lbShow(lbIx-1);if(e.key==='ArrowRight')lbShow(lbIx+1)})}

/* ---------- Mont-Fort motion: scrubbed char reveal, rise-in, zoom-out images, parallax ---------- */
function setupMotion(){
  if(!GS||RM){$$('.rv,.split,.dia,.edge,.structure').forEach(function(el){el.classList.add('in')});return}
  // headings write themselves in, letter by letter, scrubbed to the scroll
  $$(SPLIT).forEach(function(el){
    var cs=$$('.c',el);if(!cs.length)return;
    var inHero=el.closest('.hero');
    if(inHero){gsap.fromTo(cs,{opacity:0},{opacity:1,duration:.9,ease:'none',stagger:.035,delay:2.6});return}
    gsap.fromTo(cs,{opacity:.06},{opacity:1,ease:'none',stagger:.1,scrollTrigger:{trigger:el,start:'top 92%',end:'top 42%',scrub:1}});
  });
  // body copy rises 20px and fades (power2.out, stagger .15)
  ScrollTrigger.batch('.rv',{start:'top 92%',once:true,onEnter:function(b){gsap.fromTo(b,{y:20,opacity:0},{y:0,opacity:1,duration:1.6,ease:'power2.out',stagger:.15,overwrite:true})}});
  gsap.set('.rv',{opacity:0,y:20});
  // images settle from 110% (Mont-Fort "zoomOut")
  ScrollTrigger.batch('.plate:not(.art) img,figure.sec img,.crestbig,.mgrid .ph img,.vimg img,.rx-illus img,.rx-slide-img img,.placestrip .ph img',{start:'top 95%',once:true,onEnter:function(b){gsap.fromTo(b,{scale:1.1,opacity:0},{scale:1,opacity:1,duration:1.8,ease:'expo.out',stagger:.12})}});
  // rules draw in
  ScrollTrigger.batch('.ledger,.stats,.prin,.arms,.press ul,.honours,.videos,.cards,.tally,.parallel',{start:'top 90%',once:true,onEnter:function(b){b.forEach(function(x){x.classList.add('drawn')})}});
  // gentle parallax on blocks (yPercent 5 -> -5)
  $$('.nextp img,.ch-img figure').forEach(function(el){gsap.fromTo(el,{yPercent:5},{yPercent:-5,ease:'none',scrollTrigger:{trigger:el,start:'top bottom',end:'bottom top',scrub:true}})});
  $$('.dia,.edge,.structure').forEach(function(el){ScrollTrigger.create({trigger:el,start:'top 90%',once:true,onEnter:function(){el.classList.add('in')}})});
  // illustrations: curtain reveal, image stays whole
  ScrollTrigger.batch('.plate.art img',{start:'top 88%',once:true,onEnter:function(b){gsap.fromTo(b,{clipPath:'inset(100% 0% 0% 0%)'},{clipPath:'inset(0% 0% 0% 0%)',duration:1.7,ease:'expo.out',stagger:.15})}});
  gsap.set('.plate.art img',{clipPath:'inset(100% 0% 0% 0%)'});
  // album collage drifts in
  gsap.fromTo('.collage img',{y:60,opacity:0},{y:0,opacity:1,duration:1.6,ease:'power3.out',stagger:.15,scrollTrigger:{trigger:'.collage',start:'top 85%',once:true}});
  ScrollTrigger.refresh();
}

/* ---------- V29.4: illustration tilt + glare ---------- */
if(!RM&&W.matchMedia('(hover:hover)').matches){
  $$('.plate.art').forEach(function(p){
    var g=D.createElement('span');g.className='glare';p.appendChild(g);
    p.addEventListener('pointermove',function(e){var r=p.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
      p.style.transform='perspective(1400px) rotateY('+((x-.5)*7).toFixed(2)+'deg) rotateX('+((.5-y)*7).toFixed(2)+'deg) translateZ(0)';
      g.style.background='radial-gradient(circle at '+(x*100).toFixed(1)+'% '+(y*100).toFixed(1)+'%,rgba(255,236,200,.55),rgba(255,236,200,0) 55%)'});
    p.addEventListener('pointerleave',function(){p.style.transform=''});
  });
}
/* ---------- V29.4: album tabs + ambient backdrop ---------- */
var amb=$$('.album-amb img'),ambI=0,ambSrc='';
function setAmb(src){if(!amb.length||!src||src===ambSrc)return;ambSrc=src;var nx=amb[1-ambI];nx.onload=function(){nx.classList.add('on');amb[ambI].classList.remove('on');ambI=1-ambI};nx.src=src}
$$('.gi').forEach(function(t){t.addEventListener('click',function(){
  $$('.gi').forEach(function(x){var on=x===t;x.classList.toggle('act',on);x.setAttribute('aria-selected',on?'true':'false')});
  $$('.coll').forEach(function(c){var on=c.dataset.g===t.dataset.g;c.hidden=!on;
    if(on){var f=$('img',c);f&&setAmb(f.currentSrc||f.src);if(GS){gsap.fromTo($$('.mgrid figure',c),{y:30,opacity:0},{y:0,opacity:1,duration:1.2,ease:'power3.out',stagger:.05});ScrollTrigger.refresh()}}});
  measure();
})});
$$('.mgrid figure').forEach(function(f){f.addEventListener('pointerenter',function(){var i=$('img',f);i&&setAmb(i.currentSrc||i.src)})});
(function(){var f=$('.coll:not([hidden]) img');f&&setAmb(f.getAttribute('src'))})();

/* ---------- layout measure ---------- */
var hdr=$('.hdr'),prog_=$('.progress'),rail=$('.rail'),railLinks=$$('.rail a'),dial=$('.dial'),dy=dial&&$('.y',dial),dp=dial&&$('.p',dial);
var tabs=$$('.tabs a'),M={};
function top(el){var y=0;while(el){y+=el.offsetTop;el=el.offsetParent}return y}
function measure(){
  vh=W.innerHeight;vw=W.innerWidth;
  M.scenes=$$('[data-scene]').map(function(el){return{t:top(el),h:el.offsetHeight,s:+el.dataset.scene}});
  M.parts=$$('.part').map(function(el){return{t:top(el),h:el.offsetHeight}});
  M.story=(function(el){return el?{t:top(el),h:el.offsetHeight}:null})($('#story'));
  M.chs=$$('.ch[data-year]').map(function(el){return{t:top(el),y:el.dataset.year,p:el.dataset.place}});
  M.tabs=tabs.map(function(a){var el=D.getElementById(a.getAttribute('href').slice(1));return el?{t:top(el),h:el.offsetHeight,a:a}:null}).filter(Boolean);
  M.plates=$$('.plate').map(function(el){return{el:el,img:$('img',el)}});
  M.arch=$$('.arch img');
  M.reach=(function(el){return el?{t:top(el),h:el.offsetHeight}:null})($('.reach'));
  M.flight=fl?{t:top(fl),h:fl.offsetHeight}:null;
  M.rxh=(function(el){return el?{el:el,img:$('img',el)}:null})($('.rx-hero'));
  M.est=(function(el){return el?{el:el,track:$('.rx-track',el),bar:$('.rx-progress i',el)}:null})($('.rx-estate'));
  M.book=$('.b3');
  M.docH=D.documentElement.scrollHeight;
  sizeGL();
}
W.addEventListener('resize',function(){clearTimeout(measure._t);measure._t=setTimeout(measure,150)});
W.addEventListener('load',measure);
if(D.fonts&&D.fonts.ready)D.fonts.ready.then(measure);
measure();
$$('img').forEach(function(im){if(!im.complete)im.addEventListener('load',function(){clearTimeout(measure._l);measure._l=setTimeout(measure,200)},{once:true})});

/* ---------- main loop ---------- */
var lastY=-1,lastDir=0,yAcc=0,lastYear=null;
var lastFull=0,lastWave=0;
function frame(t){
  if(lenis&&!GS)lenis.raf(t);
  var y=W.pageYOffset||H.scrollTop,mid=y+vh*.5;
  /* idle: when the page is not moving, skip layout reads/writes (refresh every 500ms as a safety net) */
  if(y===lastY&&t-lastFull<500){if(t-lastWave>33){drawWave(t);lastWave=t}requestAnimationFrame(frame);return}
  lastFull=t;
  // header
  if(hdr){hdr.classList.toggle('solid',y>60);
    if(y!==lastY){var dir=y>lastY?1:-1;if(dir!==lastDir){yAcc=0;lastDir=dir}yAcc+=Math.abs(y-lastY);
      if(!H.classList.contains('menu-open')){if(dir>0&&y>vh*.8&&yAcc>40)hdr.classList.add('hide');else if(dir<0&&yAcc>20)hdr.classList.remove('hide')}}}
  if(prog_)prog_.style.transform='scaleX('+(y/Math.max(1,M.docH-vh))+')';
  // scene target
  for(var i=0;i<M.scenes.length;i++){var s=M.scenes[i];if(mid>=s.t&&mid<s.t+s.h)tgt=s.s}
  // tabs
  // rail + dial
  if(M.story){var inS=mid>M.story.t+vh*.3&&mid<M.story.t+M.story.h-vh*.4;rail&&rail.classList.toggle('show',inS);dial&&dial.classList.toggle('show',inS);
    M.parts.forEach(function(p,k){var pr=clamp((mid-p.t)/p.h,0,1),a=railLinks[k];if(!a)return;$('.tr i',a).style.transform='scaleY('+pr+')';a.classList.toggle('act',mid>=p.t&&mid<p.t+p.h)});
    var cy=null;M.chs.forEach(function(c){if(mid>=c.t-vh*.15){cy=c}});dial&&dial.classList.toggle('show',inS&&!!cy);
    if(cy&&dy&&cy.y!==lastYear){lastYear=cy.y;dy.textContent=cy.y;dp.textContent=cy.p}}
  if(!RM)M.arch.forEach(function(im){var r=(im.closest('.arch')||im.parentNode).getBoundingClientRect();if(r.bottom<0||r.top>vh)return;var c=(r.top+r.height/2-vh/2)/vh;im.style.transform='translateY('+(-8+c*-10).toFixed(2)+'%)'});
  // V29.4 scroll pieces
  if(M.rxh&&!RM){var hr=M.rxh.el.getBoundingClientRect();if(hr.bottom>0&&hr.top<vh){var hp=clamp(-hr.top/hr.height,0,1);M.rxh.img.style.transform='scale('+(1.15-hp*.12).toFixed(4)+') translateY('+(hp*8).toFixed(2)+'%)'}}
  if(M.est&&vw>700){var er=M.est.el.getBoundingClientRect(),span=er.height-vh;if(er.bottom>0&&er.top<vh&&span>0){var ep=clamp(-er.top/span,0,1),maxX=Math.max(0,M.est.track.scrollWidth-vw);M.est.track.style.transform='translate3d('+(-ep*maxX).toFixed(1)+'px,0,0)';M.est.bar.style.transform='scaleX('+ep+')'}}
  if(M.book&&!RM){var br=M.book.getBoundingClientRect();if(br.bottom>0&&br.top<vh){var bp=clamp(1-(br.top+br.height/2)/vh,0,1);M.book.style.transform='rotateY('+(-38+bp*48).toFixed(2)+'deg) rotateX('+(8-bp*6).toFixed(2)+'deg)'}}
  // globe progress
  if(M.reach){gp=clamp((y-M.reach.t)/(M.reach.h-vh),0,1)}
  // flight
  if(fpath&&M.flight){var fp=clamp((mid-M.flight.t+vh*.15)/(M.flight.h+vh*.1),0,1);if(RM)fp=1;if(!isFinite(fp)||!isFinite(flen))fp=0;fpath.style.strokeDashoffset=flen*(1-fp);
    var pt=fpath.getPointAtLength(flen*fp),pt2=fpath.getPointAtLength(Math.min(flen,flen*fp+1));fplane.setAttribute('transform','translate('+pt.x+','+pt.y+') rotate('+(Math.atan2(pt2.y-pt.y,pt2.x-pt.x)*180/Math.PI)+')')}
  lastY=y;
  if(t-lastWave>16){drawWave(t);lastWave=t}
  requestAnimationFrame(frame);
}
route(location.hash,true);
setupMotion();
(function(){var id=alias(location.hash);if(!id||id==='home')return;var el=D.getElementById(id);if(!el||el.classList.contains('panel'))return;
  var n=0;function settle(){measure();if(lenis){lenis.scrollTo(el,{immediate:true,force:true})}else el.scrollIntoView();if(++n<3)setTimeout(settle,700)}
  if(D.readyState==='complete')setTimeout(settle,300);else W.addEventListener('load',function(){setTimeout(settle,300)},{once:true});
  W.addEventListener('wheel',function(){n=9},{once:true,passive:true});W.addEventListener('touchstart',function(){n=9},{once:true,passive:true})})();
requestAnimationFrame(frame);
D.addEventListener('visibilitychange',function(){if(!audio)return;if(D.hidden){audio.request++;clearTimeout(audio.pauseTimer);audio.track.pause();audio.out.gain.cancelScheduledValues(audio.ac.currentTime);audio.out.gain.value=0;audio.ac.suspend().catch(function(){})}else if(soundOn){playScore()}});
var yEl=$('#yr');if(yEl)yEl.textContent=new Date().getFullYear();
})();

/* Gloaming & Muga: chapter light follows the active scene */
(function(){
  var G=['#E0915A','#D9B45A','#EBA13C','#AEB9EC','#BFC3CF','#F2B66E','#F27C3E','#F0C774','#DE9A5E'];
  var root=document.documentElement, last=-1, tick=false;
  function upd(){tick=false;var p=document.querySelector('.panel.on')||document.body;
    var els=p.querySelectorAll('[data-scene]'),y=window.innerHeight*.55,s=0;
    for(var i=0;i<els.length;i++){var e=els[i];if(e.offsetParent===null&&e!==p)continue;if(e.getBoundingClientRect().top<=y)s=+e.dataset.scene;}
    if(s!==last){last=s;root.style.setProperty('--glow',G[s]||G[0]);}}
  function q(){if(!tick){tick=true;requestAnimationFrame(upd);}}
  window.addEventListener('scroll',q,{passive:true});
  window.addEventListener('hashchange',function(){setTimeout(upd,400);});
  window.addEventListener('load',upd);
  setInterval(upd,1500);
})();
