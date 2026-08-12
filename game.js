/* PUZZLE MASTER 6.0 — чистый пиксель-арт, пины в IndexedDB, мягкий звук. */
document.addEventListener('DOMContentLoaded', function () {
'use strict';
function $(i){return document.getElementById(i)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function st(){return window.gameSettings||{}}
function fmt(n){return n.toLocaleString('ru-RU')}
var STAR='<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.26 6.6.56-5 4.4 1.5 6.5L12 16.9 5.99 19.7l1.5-6.5-5-4.4 6.6-.56z"/></svg>';

/* ---------- МЯГКИЙ AUDIO-СИНТЕЗ ---------- */
var audio={ctx:null,on:true,musOn:true,nodes:null,
init:function(){if(this.ctx)return;try{this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.m=this.ctx.createGain();this.m.gain.value=.4;this.m.connect(this.ctx.destination)}catch(e){}},
res:function(){if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume()},
t:function(f,d,tp,v,w,slide){if(!this.ctx)return;var o=this.ctx.createOscillator(),g=this.ctx.createGain();o.connect(g);g.connect(this.m);o.type=tp||'sine';var t=this.ctx.currentTime+(w||0);o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+d);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+d);o.start(t);o.stop(t+d+.02)},
pop:function(){if(this.on){this.res();this.t(520,.09,'sine',.09,0,180);this.t(1400,.03,'triangle',.03)}},
playClick:function(){if(this.on){this.res();this.t(760,.05,'sine',.05,0,500)}},
playPickup:function(){if(this.on){this.res();this.t(320,.08,'sine',.06,0,520)}},
playSnap:function(){if(this.on){this.res();this.t(660,.12,'sine',.09);this.t(990,.18,'sine',.06,.06);this.t(1320,.22,'sine',.04,.12)}},
playError:function(){if(this.on){this.res();this.t(150,.12,'sine',.07,0,110)}},
playCoin:function(){if(this.on){this.res();this.t(1000,.06,'sine',.05);this.t(1500,.1,.05? .05:.05,'sine',.04,.05)}},
playBoost:function(){if(this.on){this.res();this.t(300,.2,'sine',.07,0,720)}},
playVictory:function(){if(!this.on)return;this.res();var m=[[523,0],[659,.12],[784,.24],[988,.36],[1319,.5]];for(var i=0;i<m.length;i++)this.t(m[i][0],.5,'sine',.08,m[i][1])},
startMusic:function(){if(!this.musOn||!this.ctx||this.nodes)return;this.res();var g=this.ctx.createGain();g.gain.value=.028;g.connect(this.m);var ns=[130.81,164.81,196,261.63].map(function(f){var o=this.ctx.createOscillator(),og=this.ctx.createGain();o.connect(og);og.connect(g);o.type='sine';o.frequency.value=f;og.gain.value=.25;var l=this.ctx.createOscillator(),lg=this.ctx.createGain();l.connect(lg);lg.connect(o.frequency);l.frequency.value=.12+Math.random()*.2;lg.gain.value=2;o.start();l.start();return{o:o,l:l}},this);this.nodes={g:g,n:ns}},
stopMusic:function(){if(!this.nodes)return;this.nodes.n.forEach(function(x){try{x.o.stop();x.l.stop()}catch(e){}});this.nodes.g.disconnect();this.nodes=null},
setSFX:function(v){this.on=v},setMusic:function(v){this.musOn=v;if(v)this.startMusic();else this.stopMusic()}};
document.addEventListener('touchstart',function(){audio.init();audio.res()},{once:true});
document.addEventListener('click',function(){audio.init();audio.res()},{once:true});

/* ---------- СОСТОЯНИЕ ---------- */
var PX={active:false,size:0,targets:null,done:null,palette:[],counts:[],byColor:[],selected:0,total:0,doneCount:0,
canvas:null,ctx:null,base:null,bctx:null,cell:0,scale:1,offX:0,offY:0,viewW:0,viewH:0,dirty:true,fx:[],fxRaf:null,
tool:'brush',bombArmed:false,lastCell:null,pinch:null,pan:null,swipe:false,side:64,lastMode:false,coinAcc:0,name:'',rec:null,saveTick:0};
var MP={active:false,conn:null,peer:null,isHost:false,code:null,grid:4,oppPct:0,oppFinished:false,myFinished:false,jt:null};
var currentLevel=null,gridSize=4,pieces=[],placedCount=0,moves=0,zTop=10,dragging=null,areaRect=null;
var boardX=0,boardY=0,boardSize=0,cellSize=0,sourceCanvas=null,boardCache=null,hintOn=false,combo=0,lastPlace=0;
var timerInt=null,elapsedMs=0,lastTick=0,paused=false,fxCanvas=null,fxCtx=null,fxParts=[],fxRaf=null;
var currentCategory='all',CUSTOM_CACHE=[],PX_PINS=[],PINS_CACHE=[];

/* ---------- ЭКОНОМИКА ---------- */
var DEF_SET={sfx:true,music:true,vibration:true,targetglow:true};
function getSettings(){var s={};try{s=JSON.parse(localStorage.getItem('pm_settings')||'{}')}catch(e){}return Object.assign({},DEF_SET,s)}
function updateSetting(k,v){var s=getSettings();s[k]=v;localStorage.setItem('pm_settings',JSON.stringify(s));applySettings(s)}
window.updateSetting=updateSetting;
function applySettings(s){audio.setSFX(s.sfx);audio.setMusic(s.music);window.gameSettings=s}
function loadSettingsUI(){var s=getSettings();var a=$('setting-sfx'),b=$('setting-music'),c=$('setting-vibration'),d=$('setting-targetglow');if(a)a.checked=s.sfx;if(b)b.checked=s.music;if(c)c.checked=s.vibration;if(d)d.checked=s.targetglow;applySettings(s)}
function vibrate(p){if(st().vibration&&navigator.vibrate)navigator.vibrate(p)}
function getCoins(){return parseInt(localStorage.getItem('pm_coins')||'0',10)||0}
function setCoins(n){localStorage.setItem('pm_coins',String(n));updateCoinsUI()}
function addCoins(n){setCoins(getCoins()+n)}
function spendCoins(n){if(getCoins()<n){toast('Недостаточно монет');return false}setCoins(getCoins()-n);audio.playCoin();return true}
function isGod(){return localStorage.getItem('pm_god')==='1'}
function getBoosters(){var b={bomb:0,bucket:0,lens:0};try{b=Object.assign(b,JSON.parse(localStorage.getItem('pm_boost')||'{}'))}catch(e){}if(isGod()){b.bomb=999;b.bucket=999;b.lens=999}return b}
function setBoosters(b){localStorage.setItem('pm_boost',JSON.stringify(b))}
var PRICE={bomb:150,bucket:300,lens:100};
function updateCoinsUI(){var c=fmt(getCoins());['coin-count-menu','coin-count-pixel','coin-count-settings','pxg-coins'].forEach(function(id){var e=$(id);if(e)e.textContent=c});
var b=getBoosters(),g=isGod();
var e1=$('bs-bomb-n');if(e1)e1.textContent=g?'∞':b.bomb;var e2=$('bs-bucket-n');if(e2)e2.textContent=g?'∞':b.bucket;var e3=$('bs-lens-n');if(e3)e3.textContent=g?'∞':b.lens;
var s1=$('shop-bomb-n');if(s1)s1.textContent='×'+(g?'∞':b.bomb);var s2=$('shop-bucket-n');if(s2)s2.textContent='×'+(g?'∞':b.bucket);var s3=$('shop-lens-n');if(s3)s3.textContent='×'+(g?'∞':b.lens);
var gb=$('god-badge');if(gb)gb.classList.toggle('hidden',!g)}
function toast(t,gold){var x=$('toast');if(!x)return;x.textContent=t;x.classList.toggle('gold',!!gold);x.classList.remove('hidden');clearTimeout(toast._t);toast._t=setTimeout(function(){x.classList.add('hidden')},3200)}
function buyBooster(n){if(isGod()){toast('Dev Mode: бустеры бесконечны',true);return}if(spendCoins(PRICE[n])){var b=getBoosters();b[n]++;setBoosters(b);updateCoinsUI();audio.playBoost();toast('Куплено')}}
function resetProgress(){if(confirm('Сбросить всё?')){localStorage.removeItem('pm_progress');localStorage.removeItem('pm_coins');localStorage.removeItem('pm_boost');localStorage.removeItem('pm_god');LEVELS.forEach(function(l){l.stars=0;l.completed=false;l.locked=l.id>3});updateCoinsUI();updateMenuStats();showScreen('screen-menu');toast('Сброшено')}}
function applyPromo(){var inp=$('promo-input');var v=(inp?inp.value:'').trim().toLowerCase();
if(v==='goodofax'){setCoins(getCoins()+999999);localStorage.setItem('pm_god','1');setBoosters({bomb:999,bucket:999,lens:999});updateCoinsUI();audio.playVictory();vibrate([60,60,60,60,120]);toast('God Mode Activated! Welcome, Goodofax',true);if(inp)inp.value=''}
else{audio.playError();toast('Неверный промокод')}}
window.applyPromo=applyPromo;

/* ---------- НАВИГАЦИЯ ---------- */
function showScreen(id){audio.playClick();
var s=document.querySelectorAll('.screen');for(var i=0;i<s.length;i++)s[i].classList.remove('active');
var t=$(id);if(t)t.classList.add('active');
PX.active=!!(t&&t.id==='screen-pixel-game');
if(PX.active)pxLoopStart();
if(id==='screen-menu'){updateMenuStats();updateCoinsUI()}
if(id==='screen-gallery')renderGallery();
if(id==='screen-pixel')renderPins();
if(id==='screen-settings'){loadSettingsUI();updateCoinsUI()}}
window.showScreen=showScreen;
function runAction(t){var a=t.getAttribute('data-action'),g=t.getAttribute('data-arg')||'';
switch(a){
case 'nav':showScreen(g);break;
case 'gadd':addCustomPhoto();break;
case 'cat':currentCategory=g;audio.playClick();renderGallery();break;
case 'level':selectLevelById(g);break;
case 'pdel':delPhoto(g);break;
case 'diff':startGame(parseInt(g,10));break;
case 'mopen':openMulti();break;case 'mleave':leaveMulti();break;case 'mcreate':mpCreate();break;case 'mjoin':mpJoin();break;case 'mstart':mpStart();break;
case 'pause':pauseGame();break;case 'resume':resumeGame();break;case 'restart':restartGame();break;case 'quit':quitToMenu();break;case 'hint':toggleHint();break;case 'next':nextLevel();break;
case 'pxphoto':pixelPhoto();break;
case 'pxsearch':pxSearch();break;
case 'pxpin':pinFromSearch(parseInt(g,10));break;
case 'pxopenpin':openPin(g);break;
case 'pxdelpin':delPin(g);break;
case 'pxquit':pxQuit();break;
case 'tool':pxTool(g);break;
case 'zin':pxZoom(1.25);break;case 'zout':pxZoom(0.8);break;case 'pfit':pxFit();break;
case 'bs':boosterTap(g);break;
case 'swatch':PX.selected=parseInt(g,10);audio.playClick();renderPxPalette();break;
case 'buy':buyBooster(g);break;
case 'promo':applyPromo();break;
case 'reset':resetProgress();break}}
document.addEventListener('click',function(e){var t=e.target.closest?e.target.closest('[data-action]'):null;if(t)runAction(t)});

/* ---------- INDEXEDDB (универсальный) ---------- */
function idbOpen(){return new Promise(function(res,rej){var rq=indexedDB.open('puzzleMasterDB',1);rq.onupgradeneeded=function(e){var db=e.target.result;if(!db.objectStoreNames.contains('photos'))db.createObjectStore('photos',{keyPath:'id'});if(!db.objectStoreNames.contains('pins'))db.createObjectStore('pins',{keyPath:'id'})};rq.onsuccess=function(e){res(e.target.result)};rq.onerror=function(e){rej(e.target.error)}})}
function idbPut(store,rec){return idbOpen().then(function(db){return new Promise(function(res,rej){var tx=db.transaction(store,'readwrite');tx.objectStore(store).put(rec);tx.oncomplete=function(){db.close();res()};tx.onerror=function(){db.close();rej(tx.error)}})})}
function idbAll(store){return idbOpen().then(function(db){return new Promise(function(res,rej){var tx=db.transaction(store,'readonly');var rq=tx.objectStore(store).getAll();rq.onsuccess=function(){db.close();res(rq.result||[])};rq.onerror=function(){db.close();rej(rq.error)}})})}
function idbDel(store,id){return idbOpen().then(function(db){return new Promise(function(res,rej){var tx=db.transaction(store,'readwrite');tx.objectStore(store).delete(id);tx.oncomplete=function(){db.close();res()};tx.onerror=function(){db.close();rej(tx.error)}})})}

/* ---------- ПАЗЛЫ: ГАЛЕРЕЯ ---------- */
var LEVELS=[
{id:1,name:'Горный рассвет',category:'nature',image:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=800&h=800&fit=crop',locked:false,stars:0,completed:false},
{id:2,name:'Лесное озеро',category:'nature',image:'https://images.unsplash.com/photo-1439066615861-d1af74d74000?q=80&w=800&h=800&fit=crop',locked:false,stars:0,completed:false},
{id:3,name:'Закат',category:'nature',image:'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=800&h=800&fit=crop',locked:false,stars:0,completed:false},
{id:4,name:'Аврора',category:'nature',image:'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=800&h=800&fit=crop',locked:true,stars:0,completed:false},
{id:5,name:'Неон',category:'cyber',image:'https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?q=80&w=800&h=800&fit=crop',locked:true,stars:0,completed:false},
{id:6,name:'Мегаполис',category:'cyber',image:'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=800&h=800&fit=crop',locked:true,stars:0,completed:false},
{id:7,name:'Лев',category:'animals',image:'https://images.unsplash.com/photo-1546182990-dffeafbe841d?q=80&w=800&h=800&fit=crop',locked:true,stars:0,completed:false},
{id:8,name:'Лиса',category:'animals',image:'https://images.unsplash.com/photo-1474511320723-9a56873867b5?q=80&w=800&h=800&fit=crop',locked:true,stars:0,completed:false},
{id:9,name:'Туманность',category:'space',image:'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=800&h=800&fit=crop',locked:true,stars:0,completed:false},
{id:10,name:'Земля',category:'space',image:'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&h=800&fit=crop',locked:true,stars:0,completed:false}];
var CATS=[{id:'all',name:'Все'},{id:'nature',name:'Природа'},{id:'cyber',name:'Город'},{id:'animals',name:'Животные'},{id:'space',name:'Космос'},{id:'custom',name:'Мои фото'}];
function getLevels(){var s={};try{s=JSON.parse(localStorage.getItem('pm_progress')||'{}')}catch(e){}return LEVELS.map(function(l){return s[l.id]?Object.assign({},l,s[l.id]):l})}
function saveLevelProgress(id,d){if(typeof id!=='number')return;var s={};try{s=JSON.parse(localStorage.getItem('pm_progress')||'{}')}catch(e){}s[id]=Object.assign({},s[id],d);localStorage.setItem('pm_progress',JSON.stringify(s))}
function unlockNextLevels(id){var i=-1;for(var k=0;k<LEVELS.length;k++)if(LEVELS[k].id===id)i=k;if(i<0)return;for(var j=1;j<=2;j++)if(LEVELS[i+j])saveLevelProgress(LEVELS[i+j].id,{locked:false})}
function getTotalStars(){return getLevels().reduce(function(s,l){return s+(l.stars||0)},0)}
function getTotalCompleted(){return getLevels().filter(function(l){return l.completed}).length}
function updateMenuStats(){var a=$('total-stars');if(a)a.textContent=getTotalStars();var b=$('total-completed');if(b)b.textContent=getTotalCompleted()}
function renderGallery(){var tabs=$('category-tabs');if(!tabs)return;tabs.innerHTML='';
CATS.forEach(function(c){var b=document.createElement('button');b.className='category-tab'+(c.id===currentCategory?' active':'');b.textContent=c.name;b.setAttribute('data-action','cat');b.setAttribute('data-arg',c.id);tabs.appendChild(b)});
if(currentCategory==='custom'){renderCustomPhotos();return}
var grid=$('levels-grid');grid.innerHTML='';
getLevels().filter(function(l){return currentCategory==='all'||l.category===currentCategory}).forEach(function(lv,i){
var card=document.createElement('div');card.className='level-card'+(lv.locked?' locked':'');card.style.animationDelay=(i*.04)+'s';
var img=document.createElement('img');img.className='level-card-img';img.loading='lazy';img.src=lv.image;
var ov=document.createElement('div');ov.className='level-card-overlay';var stars='';
for(var s=1;s<=3;s++)stars+=STAR.replace('<svg','<svg class="'+((lv.stars||0)>=s?'filled':'')+'"');
ov.innerHTML='<div><div class="level-card-name">'+lv.name+'</div><div class="level-card-stars">'+stars+'</div></div>';
card.appendChild(img);card.appendChild(ov);
if(!lv.locked){card.setAttribute('data-action','level');card.setAttribute('data-arg','L'+lv.id)}
grid.appendChild(card)})}
function selectLevelById(a){if(a.charAt(0)==='L'){var id=parseInt(a.slice(1),10);var lv=getLevels().filter(function(l){return l.id===id})[0];if(lv)selectLevel(lv)}
else{var rec=CUSTOM_CACHE[parseInt(a.slice(1),10)];if(rec)selectLevel({id:'photo-'+rec.id,name:rec.name,category:'custom',image:URL.createObjectURL(rec.blob),locked:false,stars:0,completed:false})}}
function selectLevel(lv){audio.playClick();currentLevel=lv;var p=$('difficulty-preview-img');if(p)p.src=lv.image;var n=$('difficulty-level-name');if(n)n.textContent=lv.name;showScreen('screen-difficulty')}
function renderCustomPhotos(){var grid=$('levels-grid');grid.innerHTML='';CUSTOM_CACHE=[];
idbAll('photos').then(function(list){list.sort(function(a,b){return b.createdAt-a.createdAt});
if(!list.length){grid.innerHTML='<p class="hint-text" style="grid-column:1/-1;text-align:center;padding:30px 0">Пусто. Нажми камеру наверху.</p>';return}
list.forEach(function(rec,i){CUSTOM_CACHE.push(rec);
var card=document.createElement('div');card.className='level-card';
var img=document.createElement('img');img.className='level-card-img';img.src=rec.thumb||IMG_FALLBACK;
var ov=document.createElement('div');ov.className='level-card-overlay';ov.innerHTML='<div class="level-card-name">'+rec.name+'</div>';
var del=document.createElement('button');del.className='photo-delete';del.setAttribute('data-action','pdel');del.setAttribute('data-arg',String(rec.id));
del.innerHTML='<svg class="ic" viewBox="0 0 24 24"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>';
card.appendChild(img);card.appendChild(ov);card.appendChild(del);
card.setAttribute('data-action','level');card.setAttribute('data-arg','C'+i);
grid.appendChild(card)})}).catch(function(){})}
function delPhoto(id){if(confirm('Удалить фото?'))idbDel('photos',parseInt(id,10)).then(function(){audio.playClick();renderCustomPhotos()})}
function addCustomPhoto(){audio.playClick();$('photo-input').click()}
$('photo-input').addEventListener('change',function(e){var f=e.target.files[0];e.target.value='';if(!f)return;
var url=URL.createObjectURL(f),img=new Image();
img.onload=function(){var side=Math.min(img.width,img.height);
var full=document.createElement('canvas');full.width=1080;full.height=1080;
full.getContext('2d').drawImage(img,(img.width-side)/2,(img.height-side)/2,side,side,0,0,1080,1080);
var th=document.createElement('canvas');th.width=240;th.height=240;th.getContext('2d').drawImage(full,0,0,240,240);
full.toBlob(function(blob){URL.revokeObjectURL(url);
idbPut('photos',{id:Date.now(),name:(f.name||'Фото').replace(/\.[^/.]+$/,'').slice(0,22)||'Фото',createdAt:Date.now(),thumb:th.toDataURL('image/jpeg',.7),blob:blob}).then(function(){audio.pop();vibrate(30);toast('Фото сохранено');currentCategory='custom';showScreen('screen-gallery')}).catch(function(){toast('Ошибка сохранения')})},'image/jpeg',.85)};
img.onerror=function(){URL.revokeObjectURL(url);toast('Ошибка чтения')};img.src=url});

/* ---------- ПАЗЛЫ: ДВИЖОК ---------- */
var DRAG_LIFT=48,COMBO_W=6000,FX_MAX=220;
function snapRadius(){return clamp(cellSize*.35,15,40)}
function startGame(g){audio.playClick();initGame({grid:g,level:currentLevel,mp:false})}
function loadSourceImage(url,cb){var img=new Image();img.crossOrigin='anonymous';
img.onload=function(){var nw=img.naturalWidth,nh=img.naturalHeight,side=Math.min(nw,nh),S=720;var c=document.createElement('canvas');c.width=S;c.height=S;c.getContext('2d').drawImage(img,(nw-side)/2,(nh-side)/2,side,side,0,0,S,S);cb(c)};
img.onerror=function(){var S=720,c=document.createElement('canvas');c.width=S;c.height=S;var x=c.getContext('2d');x.fillStyle='#1E2130';x.fillRect(0,0,S,S);for(var i=0;i<24;i++){x.beginPath();x.arc(Math.random()*S,Math.random()*S,30+Math.random()*90,0,7);x.fillStyle='hsla('+(225+Math.random()*40)+',45%,'+(30+Math.random()*30)+'%,.5)';x.fill()}cb(c)};
img.src=url}
function initGame(o){gridSize=o.grid;currentLevel=o.level;PX.lastMode=false;
if(!o.mp){try{localStorage.setItem('pm_lastGrid',String(gridSize))}catch(e){}}
moves=0;placedCount=0;combo=0;
var gm=$('game-moves');if(gm)gm.textContent='0';var gt=$('game-timer');if(gt)gt.textContent='00:00';var gc=$('game-combo');if(gc)gc.classList.add('hidden');
hintOn=true;toggleHint(true);
MP.active=!!o.mp;MP.oppPct=0;MP.oppFinished=false;MP.myFinished=false;
var mb=$('mp-bars');if(mb)mb.classList.toggle('hidden',!MP.active);var ma=$('mp-alert');if(ma)ma.classList.add('hidden');updateMPBars(0);
showScreen('screen-game');
var area=$('game-area');area.classList.remove('done');
var old=area.querySelectorAll('.piece,.float-text');for(var i=0;i<old.length;i++)old[i].parentNode.removeChild(old[i]);
pieces=[];fxParts=[];
loadSourceImage(currentLevel.image,function(src){sourceCanvas=src;layoutGame();spawnPieces();startTimer();if(audio.musOn&&!MP.active)audio.startMusic()})}
function layoutGame(){var area=$('game-area'),tray=$('tray'),wrap=$('board-wrap'),cv=$('board-canvas');
var aW=area.clientWidth,aH=area.clientHeight,trayH=clamp(Math.round(aH*.32),140,240);tray.style.height=trayH+'px';
boardSize=Math.max(160,Math.min(aW-16,aH-trayH-26));cellSize=boardSize/gridSize;
var dpr=Math.min(2,window.devicePixelRatio||1);
cv.width=Math.round(boardSize*dpr);cv.height=Math.round(boardSize*dpr);cv.style.width=boardSize+'px';cv.style.height=boardSize+'px';cv.getContext('2d').setTransform(dpr,0,0,dpr,0,0);
wrap.style.width=boardSize+'px';wrap.style.height=boardSize+'px';boardX=wrap.offsetLeft;boardY=wrap.offsetTop;
fxCanvas=$('fx-canvas');fxCtx=fxCanvas.getContext('2d');fxCanvas.width=aW;fxCanvas.height=aH;
buildCache(dpr);
for(var i=0;i<pieces.length;i++){var p=pieces[i];p.w=cellSize;p.h=cellSize;p.el.style.width=cellSize+'px';p.el.style.height=cellSize+'px';
if(p.placed){p.x=boardX+p.col*cellSize;p.y=boardY+p.row*cellSize}else{p.x=clamp(p.x,0,aW-cellSize);p.y=clamp(p.y,0,aH-cellSize)}
setPT(p,false)}
drawBoard(null,0)}
function buildCache(dpr){boardCache=document.createElement('canvas');boardCache.width=Math.round(boardSize*dpr);boardCache.height=Math.round(boardSize*dpr);
var c=boardCache.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='rgba(255,255,255,.03)';c.fillRect(0,0,boardSize,boardSize);
c.strokeStyle='rgba(255,255,255,.08)';c.lineWidth=1;
for(var i=1;i<gridSize;i++){var p=i*cellSize;c.beginPath();c.moveTo(p,0);c.lineTo(p,boardSize);c.stroke();c.beginPath();c.moveTo(0,p);c.lineTo(boardSize,p);c.stroke()}}
function drawBoard(hl,a){var c=$('board-canvas').getContext('2d');c.clearRect(0,0,boardSize,boardSize);
if(boardCache)c.drawImage(boardCache,0,0,boardSize,boardSize);
if(hl&&st().targetglow){var x=hl.c*cellSize,y=hl.r*cellSize;a=clamp(a,0,1);c.save();
c.fillStyle='rgba(110,231,183,'+(0.06+a*.12)+')';c.fillRect(x+1,y+1,cellSize-2,cellSize-2);
c.strokeStyle='rgba(110,231,183,'+(0.3+a*.6)+')';c.lineWidth=1.5+a*1.5;c.shadowColor='rgba(110,231,183,.8)';c.shadowBlur=5+a*12;
c.strokeRect(x+2,y+2,cellSize-4,cellSize-4);c.restore()}}
function spawnPieces(){var area=$('game-area'),tray=$('tray'),aW=area.clientWidth,aH=area.clientHeight,trayTop=tray.offsetTop;
var dpr=Math.min(2,window.devicePixelRatio||1),res=clamp(Math.round(cellSize*dpr),24,220);
for(var r=0;r<gridSize;r++)for(var c=0;c<gridSize;c++){
var pc=document.createElement('canvas');pc.width=res;pc.height=res;var sw=sourceCanvas.width/gridSize;
pc.getContext('2d').drawImage(sourceCanvas,c*sw,r*sw,sw,sw,0,0,res,res);
var div=document.createElement('div');div.className='piece';div.style.width=cellSize+'px';div.style.height=cellSize+'px';div.appendChild(pc);
var maxX=Math.max(0,aW-cellSize),minY=Math.min(aH-cellSize,trayTop+4),maxY=Math.max(minY,aH-cellSize-4);
var piece={row:r,col:c,x:clamp(Math.random()*maxX,0,maxX),y:clamp(minY+Math.random()*(maxY-minY),0,aH-cellSize),w:cellSize,h:cellSize,placed:false,el:div};
div.style.zIndex=String(++zTop);attachPiece(div,piece);area.appendChild(div);setPT(piece,false);pieces.push(piece)}}
function setPT(p,d){p.el.style.transform='translate3d('+p.x+'px,'+p.y+'px,0)'+(d?' scale(1.1)':'')}
function attachPiece(div,piece){
div.addEventListener('touchstart',function(e){if(piece.placed||paused)return;e.preventDefault();beginDrag(piece,e.touches[0].clientX,e.touches[0].clientY)},{passive:false});
div.addEventListener('mousedown',function(e){if(piece.placed||paused)return;e.preventDefault();beginDrag(piece,e.clientX,e.clientY)})}
function beginDrag(p,cx,cy){areaRect=$('game-area').getBoundingClientRect();dragging={piece:p,offX:(cx-areaRect.left)-p.x,offY:(cy-areaRect.top)-p.y};
p.el.classList.add('dragging');p.el.style.zIndex=String(++zTop);audio.playPickup();vibrate(8)}
function moveDrag(cx,cy){if(!dragging)return;var p=dragging.piece,aW=$('game-area').clientWidth,aH=$('game-area').clientHeight;
p.x=clamp((cx-areaRect.left)-dragging.offX,0,aW-p.w);p.y=clamp((cy-areaRect.top)-dragging.offY-DRAG_LIFT,0,aH-p.h);setPT(p,true);
var tx=boardX+p.col*cellSize,ty=boardY+p.row*cellSize,d=Math.hypot(p.x-tx,p.y-ty),zone=cellSize*1.4;
if(d<zone)drawBoard({r:p.row,c:p.col},1-d/zone);else drawBoard(null,0)}
function endDrag(){if(!dragging)return;var p=dragging.piece;dragging=null;p.el.classList.remove('dragging');
moves++;var gm=$('game-moves');if(gm)gm.textContent=moves;
var tx=boardX+p.col*cellSize,ty=boardY+p.row*cellSize;
if(Math.hypot(p.x-tx,p.y-ty)<=snapRadius()){p.placed=true;p.x=tx;p.y=ty;p.el.classList.add('placed');
p.el.style.transition='transform 110ms ease';setPT(p,false);setTimeout(function(){p.el.style.transition=''},140);
placedCount++;onPlaceFX(p);
var pct=Math.round(placedCount/(gridSize*gridSize)*100);
if(MP.active){updateMPBars(pct);mpSend({type:'progress',pct:pct})}
if(placedCount===gridSize*gridSize)setTimeout(finishPuzzle,300)}
else{combo=0;var gc=$('game-combo');if(gc)gc.classList.add('hidden');setPT(p,false)}
drawBoard(null,0)}
document.addEventListener('touchmove',function(e){if(!dragging)return;e.preventDefault();moveDrag(e.touches[0].clientX,e.touches[0].clientY)},{passive:false});
document.addEventListener('touchend',endDrag);document.addEventListener('touchcancel',endDrag);
document.addEventListener('mousemove',function(e){if(dragging)moveDrag(e.clientX,e.clientY)});
document.addEventListener('mouseup',endDrag);
function onPlaceFX(p){var cx=p.x+p.w/2,cy=p.y+p.h/2,now=performance.now();
combo=(now-lastPlace<COMBO_W)?combo+1:1;lastPlace=now;var m=Math.min(combo,5);
fxBurst(cx,cy,8+m*4,2.6+m*.4);fxRing(cx,cy,'rgba(143,160,255,.8)',2.5+m*.6);shakeBoard();
if(combo>=2){floatText(cx,cy-8,'серия ×'+combo,'combo');var b=$('game-combo');if(b){b.textContent='· ×'+combo;b.classList.remove('hidden')}vibrate([12,18,12])}else vibrate([8,24,8]);
audio.playSnap()}
function fxRing(x,y,c,p){if(fxParts.length>FX_MAX)fxParts.splice(0,10);fxParts.push({type:2,x:x,y:y,r:4,vr:2.2+p,life:0,max:22,color:c});fxStart()}
function fxBurst(x,y,n,p){var cols=['#8FA0FF','#E8EAF2','#6EE7B7','#B7BFF9'];
for(var i=0;i<n;i++){if(fxParts.length>FX_MAX)fxParts.splice(0,10);var a=Math.random()*Math.PI*2,sp=(.5+Math.random())*p;
fxParts.push({type:Math.random()<.35?1:0,x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-1.5,g:.12,life:0,max:30+Math.random()*20,size:1.5+Math.random()*3,rot:Math.random()*6.28,vrot:(Math.random()-.5)*.4,color:cols[Math.floor(Math.random()*cols.length)]})}
fxStart()}
function fxStart(){if(!fxRaf)fxRaf=requestAnimationFrame(fxStep)}
function fxStep(){if(!fxCtx)return;fxCtx.clearRect(0,0,fxCanvas.width,fxCanvas.height);var alive=[];
for(var i=0;i<fxParts.length;i++){var p=fxParts[i];p.life++;if(p.life>=p.max)continue;var t=1-p.life/p.max;
if(p.type===2){p.r+=p.vr;fxCtx.save();fxCtx.globalAlpha=t*.8;fxCtx.strokeStyle=p.color;fxCtx.lineWidth=2*t+.5;fxCtx.beginPath();fxCtx.arc(p.x,p.y,p.r,0,Math.PI*2);fxCtx.stroke();fxCtx.restore()}
else{p.x+=p.vx;p.y+=p.vy;p.vy+=p.g;p.vx*=.985;p.rot+=p.vrot;fxCtx.save();fxCtx.globalAlpha=t;fxCtx.fillStyle=p.color;fxCtx.translate(p.x,p.y);
if(p.type===1){fxCtx.rotate(p.rot);fxCtx.fillRect(-p.size/2,-p.size/4,p.size,p.size/2)}else{fxCtx.beginPath();fxCtx.arc(0,0,p.size/2,0,Math.PI*2);fxCtx.fill()}fxCtx.restore()}
alive.push(p)}
fxParts=alive;if(fxParts.length)fxRaf=requestAnimationFrame(fxStep);else{fxRaf=null;fxCtx.clearRect(0,0,fxCanvas.width,fxCanvas.height)}}
function floatText(x,y,t,c){var d=document.createElement('div');d.className='float-text'+(c?' '+c:'');d.textContent=t;d.style.left=x+'px';d.style.top=y+'px';$('game-area').appendChild(d);d.addEventListener('animationend',function(){if(d.parentNode)d.parentNode.removeChild(d)})}
function shakeBoard(){var w=$('board-wrap');if(!w)return;w.classList.remove('shake');void w.offsetWidth;w.classList.add('shake')}
function startTimer(){stopTimer();elapsedMs=0;paused=false;lastTick=performance.now();
timerInt=setInterval(function(){var n=performance.now();if(!paused)elapsedMs+=n-lastTick;lastTick=n;var s=Math.floor(elapsedMs/1000);var gt=$('game-timer');if(gt)gt.textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')},250)}
function stopTimer(){if(timerInt){clearInterval(timerInt);timerInt=null}}
function fmtTime(s){return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function pauseGame(){audio.playClick();paused=true;var p=$('screen-pause');if(p)p.classList.add('active')}
function resumeGame(){audio.playClick();paused=false;var p=$('screen-pause');if(p)p.classList.remove('active')}
function restartGame(){audio.playClick();var p=$('screen-pause');if(p)p.classList.remove('active');stopTimer();audio.stopMusic();var w=MP.active;mpReset();if(w){showScreen('screen-menu');return}initGame({grid:gridSize,level:currentLevel,mp:false})}
function quitToMenu(){audio.playClick();stopTimer();audio.stopMusic();paused=false;mpSend({type:'bye'});mpReset();PX.active=false;
var p=$('screen-pause');if(p)p.classList.remove('active');var v=$('screen-victory');if(v)v.classList.remove('active');showScreen('screen-menu')}
function toggleHint(f){if(typeof f==='boolean')hintOn=f;else{hintOn=!hintOn;audio.playClick()}var h=$('hint-overlay');if(h)h.classList.toggle('hidden',!hintOn);var b=$('btn-hint');if(b)b.style.opacity=hintOn?'1':'.45'}
function finishPuzzle(){stopTimer();audio.stopMusic();audio.playVictory();vibrate([50,80,50,80,50]);
var c=$('board-canvas').getContext('2d');c.clearRect(0,0,boardSize,boardSize);c.drawImage(sourceCanvas,0,0,boardSize,boardSize);$('game-area').classList.add('done');
for(var b=0;b<3;b++)setTimeout(function(){fxBurst(boardX+Math.random()*boardSize,boardY+Math.random()*boardSize,22,4.5)},b*180);
var sec=Math.floor(elapsedMs/1000),total=gridSize*gridSize,reward=gridSize*15;
if(MP.active){MP.myFinished=true;mpSend({type:'finish',time:sec});var w=!MP.oppFinished;addCoins(reward);showEnd(w?'Победа':'Поражение',w?'Вы собрали первыми!':'Соперник быстрее.',0,reward);return}
var stars=1;if(moves<=total*1.7&&sec<=total*9)stars=3;else if(moves<=total*2.6&&sec<=total*16)stars=2;
if(currentLevel&&typeof currentLevel.id==='number'){saveLevelProgress(currentLevel.id,{stars:Math.max(currentLevel.stars||0,stars),completed:true});unlockNextLevels(currentLevel.id)}
addCoins(reward);showEnd('Победа','',stars,reward)}
function showEnd(title,sub,stars,reward){var t=$('victory-title');if(t)t.textContent=title;var s=$('victory-sub');if(s)s.textContent=sub;
var vt=$('victory-time');if(vt)vt.textContent=fmtTime(Math.floor(elapsedMs/1000));var vm=$('victory-moves');if(vm)vm.textContent=moves;
var box=$('victory-stars');if(box){box.innerHTML='';box.style.display=stars?'flex':'none';
for(var i=1;i<=3;i++)box.innerHTML+=STAR.replace('<svg','<svg class="'+(i<=stars?'filled':'')+'"')}
var rw=$('victory-reward');if(rw){rw.classList.remove('hidden');var rn=$('victory-reward-n');if(rn)rn.textContent='+'+fmt(reward)}
var nb=$('victory-next-btn');if(nb)nb.style.display=(MP.active||PX.lastMode)?'none':'flex';
var v=$('screen-victory');if(v)v.classList.add('active');startConfetti();updateCoinsUI()}
function nextLevel(){audio.playClick();var v=$('screen-victory');if(v)v.classList.remove('active');
var lv=getLevels(),i=-1;for(var k=0;k<lv.length;k++)if(lv[k].id===currentLevel.id)i=k;var n=i>=0?lv[i+1]:null;
if(n&&!n.locked)selectLevel(n);else showScreen('screen-gallery')}
function startConfetti(){var cv=$('confetti-canvas');if(!cv)return;var c=cv.getContext('2d');cv.width=innerWidth;cv.height=innerHeight;
var cols=['#8FA0FF','#E8EAF2','#6EE7B7','#B7BFF9','#5560E8'],ps=[];
for(var i=0;i<130;i++)ps.push({x:Math.random()*cv.width,y:-Math.random()*cv.height,vx:(Math.random()-.5)*6,vy:2+Math.random()*4,size:3+Math.random()*7,rot:Math.random()*360,vr:(Math.random()-.5)*10,color:cols[Math.floor(Math.random()*cols.length)],round:Math.random()>.5});
var fr;function an(){c.clearRect(0,0,cv.width,cv.height);var al=false;
for(var i=0;i<ps.length;i++){var p=ps[i];p.x+=p.vx;p.y+=p.vy;p.vy+=.09;p.rot+=p.vr;if(p.y<cv.height+40)al=true;
c.save();c.translate(p.x,p.y);c.rotate(p.rot*Math.PI/180);c.fillStyle=p.color;
if(p.round){c.beginPath();c.arc(0,0,p.size/2,0,Math.PI*2);c.fill()}else c.fillRect(-p.size/2,-p.size/4,p.size,p.size/2);c.restore()}
if(al)fr=requestAnimationFrame(an)}
an();setTimeout(function(){cancelAnimationFrame(fr);c.clearRect(0,0,cv.width,cv.height)},5000)}

/* ---------- МУЛЬТИПЛЕЕР ---------- */
var MP_A='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function mpGen(){var s='';for(var i=0;i<4;i++)s+=MP_A[Math.floor(Math.random()*MP_A.length)];return s}
function mpId(c){return 'puzzle-master-ru-'+c}
function openMulti(){if(typeof Peer==='undefined'){toast('Нужен интернет при запуске');return}showScreen('screen-multi');
var l=$('multi-lobby');if(l)l.classList.remove('hidden');var r=$('multi-room');if(r)r.classList.add('hidden');var s=$('multi-status');if(s)s.textContent=''}
function leaveMulti(){mpSend({type:'bye'});mpReset();showScreen('screen-menu')}
function mpCreate(){audio.playClick();var s=$('multi-status');if(s)s.textContent='Создание…';MP.code=mpGen();MP.isHost=true;MP.peer=new Peer(mpId(MP.code),{debug:0});mpBind();
var ch=$('multi-grid-chips');if(ch){var c=ch.querySelectorAll('.chip');for(var i=0;i<c.length;i++)c[i].onclick=function(){var a=ch.querySelectorAll('.chip');for(var k=0;k<a.length;k++)a[k].classList.remove('active');this.classList.add('active');MP.grid=parseInt(this.getAttribute('data-grid'),10);audio.playClick()}}}
function mpBind(){MP.peer.on('open',function(){var l=$('multi-lobby');if(l)l.classList.add('hidden');var r=$('multi-room');if(r)r.classList.remove('hidden');
var mc=$('multi-code');if(mc)mc.textContent=MP.code;var rs=$('multi-room-status');if(rs)rs.textContent='Ожидание соперника…';var sb=$('multi-start-btn');if(sb)sb.classList.add('hidden');
if(window.QRCode)QRCode.toCanvas($('multi-qr'),MP.code,{width:150,margin:1,color:{dark:'#E8EAF2',light:'#0B0C12'}}).catch(function(){})});
MP.peer.on('connection',function(c){MP.conn=c;mpSetup();var rs=$('multi-room-status');if(rs)rs.textContent='Соперник подключён';var sb=$('multi-start-btn');if(sb)sb.classList.remove('hidden')});
MP.peer.on('error',function(err){if(err&&err.type==='unavailable-id'){try{MP.peer.destroy()}catch(e){}MP.code=mpGen();MP.peer=new Peer(mpId(MP.code),{debug:0});mpBind()}else{var s=$('multi-status');if(s)s.textContent='Ошибка сети'}})}
function mpJoin(){audio.playClick();var code=($('multi-code-input').value||'').trim().toUpperCase();
if(code.length!==4){var s=$('multi-status');if(s)s.textContent='Код из 4 символов';return}
var s2=$('multi-status');if(s2)s2.textContent='Подключение…';MP.isHost=false;MP.code=code;MP.peer=new Peer({debug:0});
MP.jt=setTimeout(function(){if(!MP.conn||!MP.conn.open){var s3=$('multi-status');if(s3)s3.textContent='Не удалось подключиться';try{MP.peer.destroy()}catch(e){}var r=$('multi-room');if(r)r.classList.add('hidden');var l=$('multi-lobby');if(l)l.classList.remove('hidden')}},8000);
MP.peer.on('open',function(){MP.conn=MP.peer.connect(mpId(code),{reliable:true});
MP.conn.on('open',function(){clearTimeout(MP.jt);mpSetup();var l=$('multi-lobby');if(l)l.classList.add('hidden');var r=$('multi-room');if(r)r.classList.remove('hidden');
var mc=$('multi-code');if(mc)mc.textContent=code;var gc=$('multi-grid-chips');if(gc)gc.style.display='none';var sb=$('multi-start-btn');if(sb)sb.classList.add('hidden');
var rs=$('multi-room-status');if(rs)rs.textContent='Ожидание старта…'})});
MP.peer.on('error',function(err){clearTimeout(MP.jt);var r=$('multi-room');if(r)r.classList.add('hidden');var l=$('multi-lobby');if(l)l.classList.remove('hidden');
var s=$('multi-status');if(s)s.textContent=err&&err.type==='peer-unavailable'?'Комната не найдена':'Ошибка'})}
function mpSetup(){MP.conn.on('data',mpData);MP.conn.on('close',function(){if(MP.active)mpAlert('Соперник вышел');MP.conn=null;MP.active=false;var mb=$('mp-bars');if(mb)mb.classList.add('hidden')})}
function mpSend(d){if(MP.conn&&MP.conn.open){try{MP.conn.send(d)}catch(e){}}}
function mpData(d){if(!d||typeof d!=='object')return;
if(d.type==='start'&&!MP.isHost){var b=new Blob([d.image],{type:'image/jpeg'});initGame({grid:d.grid,level:{id:'mp',name:'Versus',category:'mp',image:URL.createObjectURL(b),locked:false},mp:true})}
else if(d.type==='progress'){MP.oppPct=d.pct;var o=$('mp-opp');if(o)o.style.width=d.pct+'%';var op=$('mp-opp-pct');if(op)op.textContent=d.pct+'%'}
else if(d.type==='finish'){MP.oppFinished=true;if(!MP.myFinished)mpAlert('Соперник собрал!')}
else if(d.type==='bye'){if(MP.active)mpAlert('Соперник вышел');MP.active=false;var mb=$('mp-bars');if(mb)mb.classList.add('hidden')}}
function updateMPBars(p){var y=$('mp-you');if(y)y.style.width=p+'%';var yp=$('mp-you-pct');if(yp)yp.textContent=p+'%'}
function mpAlert(t){var a=$('mp-alert');if(!a)return;a.textContent=t;a.classList.remove('hidden');setTimeout(function(){a.classList.add('hidden')},4000)}
function mpStart(){if(!MP.conn||!MP.conn.open)return;audio.playClick();
var pool=getLevels().filter(function(l){return !l.locked});var lv=pool[Math.floor(Math.random()*pool.length)]||LEVELS[0];
var img=new Image();img.crossOrigin='anonymous';
img.onload=function(){var side=Math.min(img.naturalWidth,img.naturalHeight);var c=document.createElement('canvas');c.width=560;c.height=560;
c.getContext('2d').drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,560,560);
c.toBlob(function(bl){bl.arrayBuffer().then(function(ab){mpSend({type:'start',grid:MP.grid,image:ab});initGame({grid:MP.grid,level:{id:'mp',name:lv.name,category:'mp',image:URL.createObjectURL(bl),locked:false},mp:true})})},'image/jpeg',.72)};
img.onerror=function(){var rs=$('multi-room-status');if(rs)rs.textContent='Ошибка картинки'};img.src=lv.image}
function mpReset(){clearTimeout(MP.jt);MP.active=false;MP.oppPct=0;MP.oppFinished=false;MP.myFinished=false;
if(MP.conn){try{MP.conn.close()}catch(e){}MP.conn=null}if(MP.peer){try{MP.peer.destroy()}catch(e){}MP.peer=null}
var gc=$('multi-grid-chips');if(gc)gc.style.display='flex'}
window.addEventListener('beforeunload',function(){mpSend({type:'bye'})});

/* ---------- ПИКСЕЛЬ: ПОИСК ПИНОВ ---------- */
var U='https://images.unsplash.com/photo-';
var PIN_DB={
aesthetic:[U+'1519681393784-d120267933ba?q=80&w=800&h=800&fit=crop',U+'1507525428034-b723cf961d3e?q=80&w=800&h=800&fit=crop',U+'1490750967868-88aa4486c946?q=80&w=800&h=800&fit=crop',U+'1471922694854-ff1b63b20054?q=80&w=800&h=800&fit=crop'],
nature:[U+'1506905925346-21bda4d32df4?q=80&w=800&h=800&fit=crop',U+'1441974231531-c6227db76b6e?q=80&w=800&h=800&fit=crop',U+'1470071459604-3b5ec3a7fe05?q=80&w=800&h=800&fit=crop',U+'1501785888041-af3ef285b470?q=80&w=800&h=800&fit=crop'],
cyberpunk:[U+'1514924013411-cbf25faa35bb?q=80&w=800&h=800&fit=crop',U+'1480714378408-67cf0d13bc1b?q=80&w=800&h=800&fit=crop',U+'1519501025264-65ba15a82390?q=80&w=800&h=800&fit=crop',U+'1477959858617-67f85cf4f1df?q=80&w=800&h=800&fit=crop'],
space:[U+'1462331940025-496dfbfc7564?q=80&w=800&h=800&fit=crop',U+'1446776811953-b23d57bd21aa?q=80&w=800&h=800&fit=crop',U+'1451187580459-43490279c0fa?q=80&w=800&h=800&fit=crop',U+'1419242902214-272b3f66ee7a?q=80&w=800&h=800&fit=crop'],
animals:[U+'1546182990-dffeafbe841d?q=80&w=800&h=800&fit=crop',U+'1518791841217-8f162f1e1131?q=80&w=800&h=800&fit=crop',U+'1543466835-00a7907e9de1?q=80&w=800&h=800&fit=crop',U+'1474511320723-9a56873867b5?q=80&w=800&h=800&fit=crop'],
food:[U+'1504674900247-0877df9cc836?q=80&w=800&h=800&fit=crop',U+'1512621776951-a57141f2eefd?q=80&w=800&h=800&fit=crop',U+'1567620905732-2d1ec7ab7445?q=80&w=800&h=800&fit=crop',U+'1565299624946-b28f40a0ae38?q=80&w=800&h=800&fit=crop']};
var PIN_KEYS={aesthetic:['aesthetic','эстет','anime','аниме','vaporwave','lofi','girl','девуш','flower','цвет','night','ночь'],
nature:['nature','природ','forest','лес','mountain','гор','sea','ocean','море','океан','beach','пляж'],
cyberpunk:['cyber','кибер','city','город','neon','неон','tokyo','токио','street'],
space:['space','космос','star','звезд','galaxy','галак','planet','планет'],
animals:['animal','живот','cat','кот','dog','собак','fox','лис','lion','лев','panda'],
food:['food','еда','pizza','пицц','burger','бургер','sweet','десерт','coffee','кофе']};
function pxSearch(){var q=($('px-search-input').value||'').trim().toLowerCase();if(!q)return;audio.playClick();
var key=null;
for(var k in PIN_KEYS){for(var i=0;i<PIN_KEYS[k].length;i++)if(q.indexOf(PIN_KEYS[k][i])>=0){key=k;break}if(key)break}
var urls=key?PIN_DB[key]:PIN_DB.aesthetic.concat(PIN_DB.space);
var box=$('px-results');box.innerHTML='';box.classList.remove('hidden');PX_PINS=[];
urls.forEach(function(u,i){PX_PINS.push(u);
var b=document.createElement('button');b.className='px-pin';b.setAttribute('data-action','pxpin');b.setAttribute('data-arg',String(i));
var img=document.createElement('img');img.loading='lazy';img.src=u.replace('w=800&h=800','w=200&h=200');
b.appendChild(img);box.appendChild(b)});
toast('Пинов найдено: '+urls.length)}
function pinFromSearch(i){var url=PX_PINS[i];if(!url)return;audio.playClick();toast('Генерация пина…');
var img=new Image();img.crossOrigin='anonymous';
img.onload=function(){var rec=makePin(img,PX.side,'Пин '+(PINS_CACHE.length+1));
idbPut('pins',rec).then(function(){renderPins()}).catch(function(){});
startFromRec(rec)};
img.onerror=function(){toast('Не удалось загрузить')};img.src=url}
$('px-search-input').addEventListener('keydown',function(e){if(e.key==='Enter')pxSearch()});

/* ---------- ПИКСЕЛЬ: КВАНТОВАНИЕ ---------- */
function medianCut(samples,K){
function bounds(b){var mx=[0,0,0],mn=[255,255,255];for(var i=0;i<b.length;i++){var p=b[i];for(var c=0;c<3;c++){if(p[c]>mx[c])mx[c]=p[c];if(p[c]<mn[c])mn[c]=p[c]}}return{r:mx[0]-mn[0],g:mx[1]-mn[1],b:mx[2]-mn[2]}}
var buckets=[samples];
while(buckets.length<K){var bi=-1,bs=-1;
for(var i=0;i<buckets.length;i++){var b=buckets[i];if(b.length<2)continue;var bd=bounds(b);var sc=Math.max(bd.r,bd.g,bd.b)*b.length;if(sc>bs){bs=sc;bi=i}}
if(bi<0)break;var bk=buckets.splice(bi,1)[0];var bd2=bounds(bk);var ch=bd2.r>=bd2.g&&bd2.r>=bd2.b?0:bd2.g>=bd2.b?1:2;
bk.sort(function(a,b){return a[ch]-b[ch]});var mid=bk.length>>1;buckets.push(bk.slice(0,mid),bk.slice(mid))}
return buckets.map(function(b){var s=[0,0,0];for(var i=0;i<b.length;i++){s[0]+=b[i][0];s[1]+=b[i][1];s[2]+=b[i][2]}var n=b.length||1;return[Math.round(s[0]/n),Math.round(s[1]/n),Math.round(s[2]/n)]})}
function makePin(img,side,name){
var c=document.createElement('canvas');c.width=side;c.height=side;
var x=c.getContext('2d');x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';
var s=Math.min(img.naturalWidth||img.width,img.naturalHeight||img.height);
x.drawImage(img,(img.naturalWidth-s)/2,(img.naturalHeight-s)/2,s,s,0,0,side,side);
var d=x.getImageData(0,0,side,side).data,px=new Array(side*side);
for(var i=0;i<side*side;i++)px[i]=[d[i*4],d[i*4+1],d[i*4+2]];
var sm=new Array(side*side);
for(var r=0;r<side;r++)for(var cc=0;cc<side;cc++){var sr=0,sg=0,sb=0,n=0;
for(var dr=-1;dr<=1;dr++)for(var dc=-1;dc<=1;dc++){var rr=r+dr,c2=cc+dc;if(rr<0||c2<0||rr>=side||c2>=side)continue;var q=px[rr*side+c2];sr+=q[0];sg+=q[1];sb+=q[2];n++}
sm[r*side+cc]=[sr/n,sg/n,sb/n]}
var samples=[],step=Math.max(1,Math.floor(side*side/15000));
for(var i2=0;i2<side*side;i2+=step)samples.push(sm[i2]);
var K=clamp(Math.round(6+side/16),8,16);
var pal=medianCut(samples,K);
var targets=[];
for(var r2=0;r2<side;r2++){targets.push([]);
for(var c3=0;c3<side;c3++){var col=sm[r2*side+c3],bi=0,bd=1e9;
for(var m=0;m<pal.length;m++){var q2=(col[0]-pal[m][0])*(col[0]-pal[m][0])+(col[1]-pal[m][1])*(col[1]-pal[m][1])+(col[2]-pal[m][2])*(col[2]-pal[m][2]);if(q2<bd){bd=q2;bi=m}}
targets[r2].push(bi)}}
var remap=[];for(var p2=0;p2<pal.length;p2++)remap.push(p2);
for(var a2=0;a2<pal.length;a2++)for(var b2=a2+1;b2<pal.length;b2++){
if(remap[b2]!==b2)continue;var ra=remap[a2];
var dd=(pal[a2][0]-pal[b2][0])*(pal[a2][0]-pal[b2][0])+(pal[a2][1]-pal[b2][1])*(pal[a2][1]-pal[b2][1])+(pal[a2][2]-pal[b2][2])*(pal[a2][2]-pal[b2][2]);
if(dd<900)remap[b2]=ra}
for(var r3=0;r3<side;r3++)for(var c4=0;c4<side;c4++)targets[r3][c4]=remap[targets[r3][c4]];
var passes=side>=96?2:1;
for(var ps2=0;ps2<passes;ps2++){var copy=targets.map(function(row){return row.slice()});
for(var r4=1;r4<side-1;r4++)for(var c5=1;c5<side-1;c5++){var freq={};
for(var dr2=-1;dr2<=1;dr2++)for(var dc2=-1;dc2<=1;dc2++){var v=targets[r4+dr2][c5+dc2];freq[v]=(freq[v]||0)+1}
var bestV=copy[r4][c5],bestN=0;for(var k2 in freq)if(freq[k2]>bestN){bestN=freq[k2];bestV=parseInt(k2,10)}
if(bestN>=6)copy[r4][c5]=bestV}
targets=copy}
var used={},palette=[],finalMap={};
for(var r5=0;r5<side;r5++)for(var c6=0;c6<side;c6++){var v2=targets[r5][c6];
if(finalMap[v2]===undefined){finalMap[v2]=palette.length;palette.push('rgb('+pal[v2][0]+','+pal[v2][1]+','+pal[v2][2]+')')}
targets[r5][c6]=finalMap[v2]}
var done=[];for(var r6=0;r6<side;r6++)done.push(new Array(side).fill(false));
var th=document.createElement('canvas');th.width=160;th.height=160;th.getContext('2d').drawImage(c,0,0,160,160);
return{id:Date.now()+Math.floor(Math.random()*999),name:name,createdAt:Date.now(),side:side,
thumb:th.toDataURL('image/jpeg',.72),palette:palette,targets:targets,done:done,progress:0}}
function computeMeta(rec){var size=rec.side,total=size*size,doneCount=0,counts=new Array(rec.palette.length).fill(0),byColor=[];
for(var i=0;i<rec.palette.length;i++)byColor.push([]);
for(var r=0;r<size;r++)for(var c=0;c<size;c++){var t=rec.targets[r][c];byColor[t].push(r*size+c);
if(rec.done[r][c])doneCount++;else counts[t]++}
return{total:total,doneCount:doneCount,counts:counts,byColor:byColor}}
function renderPins(){var grid=$('px-pins');if(!grid)return;grid.innerHTML='';PINS_CACHE=[];
idbAll('pins').then(function(list){list.sort(function(a,b){return b.createdAt-a.createdAt});PINS_CACHE=list;
if(!list.length){grid.innerHTML='<p class="hint-text" style="grid-column:1/-1;text-align:center;padding:30px 0">Пока пусто. Загрузи пин или найди картинку сверху — всё сохранится здесь.</p>';return}
list.forEach(function(rec,i){
var card=document.createElement('div');card.className='level-card';card.style.animationDelay=(i*.04)+'s';
var img=document.createElement('img');img.className='level-card-img';img.src=rec.thumb||IMG_FALLBACK;
var ov=document.createElement('div');ov.className='level-card-overlay';
var pct=Math.round(rec.progress||0);
ov.innerHTML='<div class="level-card-name">'+rec.name+'</div><span class="pin-pct'+(pct>=100?' done':'')+'">'+(pct>=100?'★ ':pct+'%')+'</span>';
var del=document.createElement('button');del.className='photo-delete';del.setAttribute('data-action','pxdelpin');del.setAttribute('data-arg',String(rec.id));
del.innerHTML='<svg class="ic" viewBox="0 0 24 24"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>';
card.appendChild(img);card.appendChild(ov);card.appendChild(del);
card.setAttribute('data-action','pxopenpin');card.setAttribute('data-arg',String(i));
grid.appendChild(card)})}).catch(function(){})}
function openPin(i){var rec=PINS_CACHE[parseInt(i,10)];if(!rec)return;audio.playClick();startFromRec(rec)}
function delPin(id){if(confirm('Удалить пин?'))idbDel('pins',parseInt(id,10)).then(function(){audio.playClick();renderPins()})}
function pixelPhoto(){audio.playClick();$('pixel-photo-input').click()}
$('pixel-photo-input').addEventListener('change',function(e){var f=e.target.files[0];e.target.value='';if(!f)return;
var url=URL.createObjectURL(f),img=new Image();
img.onload=function(){var rec=makePin(img,PX.side,(f.name||'Пин').replace(/\.[^/.]+$/,'').slice(0,18)||'Пин');
URL.revokeObjectURL(url);
idbPut('pins',rec).then(function(){renderPins()}).catch(function(){});
startFromRec(rec)};
img.onerror=function(){URL.revokeObjectURL(url);toast('Ошибка чтения')};img.src=url});
var pxSlider=$('px-slider');
if(pxSlider){pxSlider.addEventListener('input',function(){PX.side=parseInt(pxSlider.value,10);var v=$('px-slider-val');if(v)v.textContent=PX.side+'×'+PX.side});PX.side=parseInt(pxSlider.value,10)}

/* ---------- ПИКСЕЛЬ: ХОЛСТ ---------- */
function startFromRec(rec){PX.rec=rec;PX.size=rec.side;PX.targets=rec.targets;PX.done=rec.done;PX.palette=rec.palette;PX.name=rec.name;
var meta=computeMeta(rec);
PX.total=meta.total;PX.doneCount=meta.doneCount;PX.counts=meta.counts;PX.byColor=meta.byColor;
PX.selected=0;PX.fx=[];PX.bombArmed=false;PX.tool='brush';PX.coinAcc=0;PX.saveTick=0;PX.lastMode=true;
var t=$('pxg-title');if(t)t.textContent=rec.name;var pr=$('pxg-progress');if(pr)pr.textContent=Math.round(PX.doneCount/PX.total*100)+'%';
showScreen('screen-pixel-game');
var area=$('px-area');PX.viewW=area.clientWidth;PX.viewH=area.clientHeight;
PX.canvas=$('pxg-canvas');var dpr=Math.min(2,window.devicePixelRatio||1);
PX.canvas.width=PX.viewW*dpr;PX.canvas.height=PX.viewH*dpr;PX.ctx=PX.canvas.getContext('2d');PX.ctx.setTransform(dpr,0,0,dpr,0,0);
PX.base=document.createElement('canvas');PX.base.width=PX.viewW*dpr;PX.base.height=PX.viewH*dpr;PX.bctx=PX.base.getContext('2d');PX.bctx.setTransform(dpr,0,0,dpr,0,0);
pxFit();
var tb=$('tool-brush'),th=$('tool-hand');if(tb)tb.classList.add('active');if(th)th.classList.remove('active');
var bb=$('bs-bomb');if(bb)bb.classList.remove('armed');
renderPxPalette();updateCoinsUI()}
function pxFit(){var m=Math.min(PX.viewW,PX.viewH)*0.92;PX.cell=m/PX.size;PX.scale=1;
PX.offX=(PX.viewW-PX.cell*PX.size)/2;PX.offY=(PX.viewH-PX.cell*PX.size)/2;PX.dirty=true}
function renderPxPalette(){var box=$('pxg-palette');if(!box)return;box.innerHTML='';
PX.palette.forEach(function(col,idx){var b=document.createElement('button');
b.className='px-swatch'+(idx===PX.selected?' active':'')+(PX.counts[idx]===0?' sw-done':'');
b.style.background=col;b.setAttribute('data-action','swatch');b.setAttribute('data-arg',String(idx));
b.innerHTML='<span class="num">'+(idx+1)+'</span><span class="left">'+PX.counts[idx]+'</span>';
box.appendChild(b)})}
function renderBase(){var c=PX.bctx,cs=PX.cell*PX.scale,bw=PX.size*cs;
c.clearRect(0,0,PX.viewW,PX.viewH);
c.save();c.shadowColor='rgba(0,0,0,.45)';c.shadowBlur=26;c.shadowOffsetY=6;
c.fillStyle='#F4F6FA';
if(c.roundRect){c.beginPath();c.roundRect(PX.offX-3,PX.offY-3,bw+6,bw+6,10);c.fill()}else c.fillRect(PX.offX-3,PX.offY-3,bw+6,bw+6);
c.restore();
for(var r=0;r<PX.size;r++)for(var col=0;col<PX.size;col++){
var x=PX.offX+col*cs,y=PX.offY+r*cs;
if(x+cs<0||y+cs<0||x>PX.viewW||y>PX.viewH)continue;
if(PX.done[r][col]){c.fillStyle=PX.palette[PX.targets[r][col]];c.fillRect(x,y,cs+0.6,cs+0.6)}
else{c.fillStyle=(r+col)%2?'#ECEFF4':'#F1F3F8';c.fillRect(x,y,cs+0.6,cs+0.6);
if(cs>=3){c.strokeStyle='rgba(18,19,28,0.05)';c.lineWidth=1;c.strokeRect(x+.5,y+.5,cs-1,cs-1)}
if(cs>=10){c.fillStyle='#4A5065';c.font='600 '+Math.max(8,Math.min(15,cs*.4))+'px Manrope,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(String(PX.targets[r][col]+1),x+cs/2,y+cs/2+1)}}}}
function pxLoopStart(){if(!PX.fxRaf)requestAnimationFrame(pxLoop)}
function pxLoop(t){if(!PX.active){PX.fxRaf=null;return}
PX.fxRaf=requestAnimationFrame(pxLoop);
if(PX.dirty){renderBase();PX.dirty=false}
var c=PX.ctx,cs=PX.cell*PX.scale;
c.clearRect(0,0,PX.viewW,PX.viewH);
c.drawImage(PX.base,0,0,PX.viewW,PX.viewH);
var list=PX.byColor[PX.selected]||[];
var a=.22+.16*Math.sin(t/280);
c.fillStyle=rgbaOf(PX.palette[PX.selected],a);
for(var i=0;i<list.length;i++){var idx=list[i],r=idx/PX.size|0,col=idx%PX.size;
if(PX.done[r][col])continue;
var x=PX.offX+col*cs,y=PX.offY+r*cs;
if(x+cs<0||y+cs<0||x>PX.viewW||y>PX.viewH)continue;
c.fillRect(x+1,y+1,cs-2,cs-2)}
var now=performance.now();
PX.fx=PX.fx.filter(function(f){return now-f.t0<320});
for(var i2=0;i2<PX.fx.length;i2++){var f=PX.fx[i2],age=(now-f.t0)/320,fx=PX.offX+f.c*cs+cs/2,fy=PX.offY+f.r*cs+cs/2;
c.save();c.globalAlpha=1-age;c.strokeStyle='#FFFFFF';c.lineWidth=2;
c.beginPath();c.arc(fx,fy,cs*.2+age*cs*.7,0,Math.PI*2);c.stroke();c.restore()}}
function rgbaOf(col,a){if(!col)return 'rgba(124,140,255,'+a.toFixed(3)+')';
if(col.charAt(0)==='#'){var r=parseInt(col.substr(1,2),16),g=parseInt(col.substr(3,2),16),b=parseInt(col.substr(5,2),16);return 'rgba('+r+','+g+','+b+','+a.toFixed(3)+')'}
return col.replace('rgb(','rgba(').replace(')',','+a.toFixed(3)+')')}
function clampView(){var sw=PX.cell*PX.size*PX.scale;
PX.offX=sw<PX.viewW?(PX.viewW-sw)/2:clamp(PX.offX,PX.viewW-sw,0);
PX.offY=sw<PX.viewH?(PX.viewH-sw)/2:clamp(PX.offY,PX.viewH-sw,0)}
function pxZoom(f){var cx=PX.viewW/2,cy=PX.viewH/2;var ns=clamp(PX.scale*f,1,14);var k=ns/PX.scale;
PX.offX=cx-(cx-PX.offX)*k;PX.offY=cy-(cy-PX.offY)*k;PX.scale=ns;clampView();PX.dirty=true}
function pxTool(t){PX.tool=t;audio.playClick();var tb=$('tool-brush'),th=$('tool-hand');
if(tb)tb.classList.toggle('active',t==='brush');if(th)th.classList.toggle('active',t==='hand')}
function pxCellAt(cx,cy){var rect=PX.canvas.getBoundingClientRect();var cs=PX.cell*PX.scale;
var col=Math.floor((cx-rect.left-PX.offX)/cs),r=Math.floor((cy-rect.top-PX.offY)/cs);
if(r<0||col<0||r>=PX.size||col>=PX.size)return null;return{r:r,c:col}}
function savePinProgress(){if(!PX.rec)return;
PX.rec.progress=Math.round(PX.doneCount/PX.total*100);
idbPut('pins',PX.rec).catch(function(){})}
function pxPaint(r,col){var t=PX.targets[r][col];if(PX.done[r][col])return;
if(PX.bombArmed){bombUse(r,col);return}
if(t===PX.selected){PX.done[r][col]=true;PX.doneCount++;PX.counts[t]--;audio.pop();vibrate(6);
PX.fx.push({r:r,c:col,t0:performance.now()});
PX.coinAcc++;if(PX.coinAcc>=10){PX.coinAcc=0;addCoins(1);audio.playCoin()}
var pr=$('pxg-progress');if(pr)pr.textContent=Math.round(PX.doneCount/PX.total*100)+'%';
if(PX.counts[t]===0){for(var n=0;n<PX.palette.length;n++)if(PX.counts[n]>0){PX.selected=n;break}}
renderPxPalette();PX.dirty=true;
if(++PX.saveTick>=20){PX.saveTick=0;savePinProgress()}
if(PX.doneCount>=PX.total)setTimeout(pxWin,350)}
else{audio.playError();vibrate(15)}}
function ensureBooster(n){if(isGod())return true;var b=getBoosters();if(b[n]>0){b[n]--;setBoosters(b);updateCoinsUI();return true}if(spendCoins(PRICE[n])){updateCoinsUI();return true}return false}
function boosterTap(n){audio.playClick();
if(n==='bomb'){var btn=$('bs-bomb');
if(PX.bombArmed){PX.bombArmed=false;if(btn)btn.classList.remove('armed');return}
if(ensureBooster('bomb')){PX.bombArmed=true;if(btn)btn.classList.add('armed');audio.playBoost();toast('Бомба готова — тапни по полю')}}
else if(n==='bucket'){if(PX.counts[PX.selected]===0){toast('Цвет уже готов');return}
if(ensureBooster('bucket')){audio.playBoost();
var list=PX.byColor[PX.selected]||[];
for(var i=0;i<list.length;i++){var idx=list[i],r=idx/PX.size|0,c=idx%PX.size;
if(!PX.done[r][c]){PX.done[r][c]=true;PX.doneCount++}}
PX.counts[PX.selected]=0;
for(var n2=0;n2<PX.palette.length;n2++)if(PX.counts[n2]>0){PX.selected=n2;break}
var pr=$('pxg-progress');if(pr)pr.textContent=Math.round(PX.doneCount/PX.total*100)+'%';
renderPxPalette();PX.dirty=true;vibrate(25);savePinProgress();
if(PX.doneCount>=PX.total)setTimeout(pxWin,350)}}
else if(n==='lens'){if(ensureBooster('lens')){audio.playBoost();
var und=[];for(var r=0;r<PX.size;r++)for(var c=0;c<PX.size;c++)if(!PX.done[r][c])und.push([r,c]);
if(und.length){var p=und[Math.floor(Math.random()*und.length)];
PX.scale=Math.max(PX.scale,2.5);var cs=PX.cell*PX.scale;
PX.offX=PX.viewW/2-(p[1]+.5)*cs;PX.offY=PX.viewH/2-(p[0]+.5)*cs;clampView();PX.dirty=true}}}}
function bombUse(r,c){PX.bombArmed=false;var btn=$('bs-bomb');if(btn)btn.classList.remove('armed');
audio.playBoost();vibrate(35);
for(var rr=r-1;rr<=r+1;rr++)for(var cc=c-1;cc<=c+1;cc++){
if(rr<0||cc<0||rr>=PX.size||cc>=PX.size)continue;
if(!PX.done[rr][cc]){PX.done[rr][cc]=true;PX.doneCount++;PX.counts[PX.targets[rr][cc]]--;PX.fx.push({r:rr,c:cc,t0:performance.now()})}}
var pr=$('pxg-progress');if(pr)pr.textContent=Math.round(PX.doneCount/PX.total*100)+'%';
renderPxPalette();PX.dirty=true;savePinProgress();
if(PX.doneCount>=PX.total)setTimeout(pxWin,350)}
function pxWin(){savePinProgress();PX.rec.progress=100;idbPut('pins',PX.rec).catch(function(){});
var reward=Math.round(PX.total/8)+20;addCoins(reward);audio.playVictory();vibrate([50,80,50]);
var t=$('victory-title');if(t)t.textContent='Готово!';
var s=$('victory-sub');if(s)s.textContent=PX.name+' · '+PX.size+'×'+PX.size;
var vt=$('victory-time');if(vt)vt.textContent='—';var vm=$('victory-moves');if(vm)vm.textContent=PX.total;
var box=$('victory-stars');if(box)box.style.display='none';
var rw=$('victory-reward');if(rw){rw.classList.remove('hidden');var rn=$('victory-reward-n');if(rn)rn.textContent='+'+fmt(reward)}
var nb=$('victory-next-btn');if(nb)nb.style.display='none';
var v=$('screen-victory');if(v)v.classList.add('active');startConfetti();updateCoinsUI()}
function pxQuit(){audio.playClick();savePinProgress();PX.active=false;showScreen('screen-pixel')}

/* touch/mouse холста */
document.addEventListener('touchstart',function(e){
if(!PX.active||e.target!==PX.canvas)return;
e.preventDefault();
if(e.touches.length===2){PX.pinch={d:Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY),mx:(e.touches[0].clientX+e.touches[1].clientX)/2,my:(e.touches[0].clientY+e.touches[1].clientY)/2,scale:PX.scale,offX:PX.offX,offY:PX.offY};PX.swipe=false;PX.pan=null;return}
var t=e.touches[0];
if(PX.tool==='hand'){PX.pan={x:t.clientX,y:t.clientY,offX:PX.offX,offY:PX.offY};return}
PX.swipe=true;PX.lastCell=null;
var cell=pxCellAt(t.clientX,t.clientY);
if(cell){PX.lastCell=cell.r+','+cell.c;pxPaint(cell.r,cell.c)}},{passive:false});
document.addEventListener('touchmove',function(e){
if(!PX.active||e.target!==PX.canvas)return;
e.preventDefault();
if(PX.pinch&&e.touches.length===2){
var d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
var mx=(e.touches[0].clientX+e.touches[1].clientX)/2,my=(e.touches[0].clientY+e.touches[1].clientY)/2;
var ns=clamp(PX.pinch.scale*d/PX.pinch.d,1,14);var k=ns/PX.pinch.scale;
PX.offX=mx-(PX.pinch.mx-PX.pinch.offX)*k;PX.offY=my-(PX.pinch.my-PX.pinch.offY)*k;
PX.scale=ns;clampView();PX.dirty=true;return}
var t=e.touches[0];
if(PX.pan){PX.offX=PX.pan.offX+(t.clientX-PX.pan.x);PX.offY=PX.pan.offY+(t.clientY-PX.pan.y);clampView();PX.dirty=true;return}
if(PX.swipe){var cell=pxCellAt(t.clientX,t.clientY);
if(cell&&PX.lastCell!==cell.r+','+cell.c){PX.lastCell=cell.r+','+cell.c;pxPaint(cell.r,cell.c)}}},{passive:false});
document.addEventListener('touchend',function(e){if(PX.pinch&&e.touches.length<2)PX.pinch=null;if(e.touches.length===0){PX.pan=null;PX.swipe=false}});
var mDown=false;
document.addEventListener('mousedown',function(e){if(!PX.active||e.target!==PX.canvas)return;mDown=true;
if(PX.tool==='hand'){PX.pan={x:e.clientX,y:e.clientY,offX:PX.offX,offY:PX.offY};return}
var cell=pxCellAt(e.clientX,e.clientY);if(cell)pxPaint(cell.r,cell.c)});
document.addEventListener('mousemove',function(e){if(!mDown||!PX.active)return;
if(PX.pan){PX.offX=PX.pan.offX+(e.clientX-PX.pan.x);PX.offY=PX.pan.offY-(PX.pan.y-e.clientY)*-1;clampView();PX.dirty=true;return}
var cell=pxCellAt(e.clientX,e.clientY);if(cell)pxPaint(cell.r,cell.c)});
document.addEventListener('mouseup',function(){mDown=false;PX.pan=null});

/* ---------- РЕСАЙЗ / СТАРТ ---------- */
window.addEventListener('resize',function(){
var gs=$('screen-game');
if(gs&&gs.classList.contains('active')&&sourceCanvas)layoutGame();
if(PX.active){var area=$('px-area');PX.viewW=area.clientWidth;PX.viewH=area.clientHeight;
var dpr=Math.min(2,window.devicePixelRatio||1);
PX.canvas.width=PX.viewW*dpr;PX.canvas.height=PX.viewH*dpr;PX.ctx.setTransform(dpr,0,0,dpr,0,0);
PX.base.width=PX.viewW*dpr;PX.base.height=PX.viewH*dpr;PX.bctx.setTransform(dpr,0,0,dpr,0,0);
clampView();PX.dirty=true}});
document.addEventListener('visibilitychange',function(){if(document.hidden&&!paused){var gs=$('screen-game');if(gs&&gs.classList.contains('active')&&timerInt)pauseGame()}});
var box=$('particles');
if(box){for(var i=0;i<24;i++){var p=document.createElement('div');p.className='particle';var sz=2+Math.random()*3;
p.style.width=sz+'px';p.style.height=sz+'px';p.style.left=Math.random()*100+'%';p.style.top=Math.random()*100+'%';
p.style.animationDelay=(Math.random()*9)+'s';p.style.animationDuration=(7+Math.random()*7)+'s';box.appendChild(p)}}
loadSettingsUI();updateCoinsUI();updateMenuStats();
});