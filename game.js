/* PUZZLE MASTER — game.js (полный, самодостаточный). Всё вешается после DOMContentLoaded. */
document.addEventListener('DOMContentLoaded', function () {
'use strict';
function $(id){return document.getElementById(id)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function st(){return window.gameSettings||{}}
function fmt(n){return n.toLocaleString('ru-RU')}
var STAR='<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.26 6.6.56-5 4.4 1.5 6.5L12 16.9 5.99 19.7l1.5-6.5-5-4.4 6.6-.56z"/></svg>';

/* ================= AUDIO ================= */
var audio={ctx:null,on:true,musOn:true,nodes:null,
init:function(){if(this.ctx)return;try{this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.m=this.ctx.createGain();this.m.gain.value=.5;this.m.connect(this.ctx.destination)}catch(e){}},
res:function(){if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume()},
t:function(f,d,tp,v,w,s){if(!this.ctx)return;var o=this.ctx.createOscillator(),g=this.ctx.createGain();o.connect(g);g.connect(this.m);o.type=tp||'sine';var t=this.ctx.currentTime+(w||0);o.frequency.setValueAtTime(f,t);if(s)o.frequency.exponentialRampToValueAtTime(s,t+d);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v||.25,t+.015);g.gain.exponentialRampToValueAtTime(.01,t+d);o.start(t);o.stop(t+d+.02)},
playClick:function(){if(this.on){this.res();this.t(760,.07,'sine',.22,0,420)}},
playPickup:function(){if(this.on){this.res();this.t(300,.1,'triangle',.22,0,620)}},
playSnap:function(){if(this.on){this.res();this.t(880,.16,'sine',.25);this.t(1320,.16,'sine',.16);this.t(1760,.22,'sine',.1,.06)}},
playError:function(){if(this.on){this.res();this.t(190,.16,'sawtooth',.12,0,110)}},
playCoin:function(){if(this.on){this.res();this.t(980,.08,'square',.1);this.t(1470,.16,'square',.08,.07)}},
playBoost:function(){if(this.on){this.res();this.t(240,.25,'sine',.25,0,900)}},
playVictory:function(){if(!this.on)return;this.res();var m=[[523,0,.15],[659,.15,.15],[784,.3,.15],[1046,.45,.4],[784,.7,.15],[1046,.85,.6]];for(var i=0;i<m.length;i++)this.t(m[i][0],m[i][2],'sine',.28,m[i][1])},
startMusic:function(){if(!this.musOn||!this.ctx||this.nodes)return;this.res();var g=this.ctx.createGain();g.gain.value=.035;g.connect(this.m);var ns=[130.81,164.81,196,261.63].map(function(f){var o=this.ctx.createOscillator(),og=this.ctx.createGain();o.connect(og);og.connect(g);o.type='sine';o.frequency.value=f;og.gain.value=.25;var l=this.ctx.createOscillator(),lg=this.ctx.createGain();l.connect(lg);lg.connect(o.frequency);l.frequency.value=.12+Math.random()*.2;lg.gain.value=2;o.start();l.start();return{o:o,l:l}},this);this.nodes={g:g,n:ns}},
stopMusic:function(){if(!this.nodes)return;this.nodes.n.forEach(function(x){try{x.o.stop();x.l.stop()}catch(e){}});this.nodes.g.disconnect();this.nodes=null},
setSFX:function(v){this.on=v},setMusic:function(v){this.musOn=v;if(v)this.startMusic();else this.stopMusic()}};
document.addEventListener('touchstart',function(){audio.init();audio.res()},{once:true});
document.addEventListener('click',function(){audio.init();audio.res()},{once:true});

/* ================= СОСТОЯНИЕ ================= */
var PX={active:false,size:0,targets:null,done:null,palette:[],counts:[],selected:0,total:0,doneCount:0,
canvas:null,ctx:null,base:null,bctx:null,cell:0,scale:1,offX:0,offY:0,viewW:0,viewH:0,dirty:true,fx:[],fxRaf:null,
tool:'brush',bombArmed:false,lastCell:null,pinch:null,pan:null,swipe:false,side:28,customImg:null,lastMode:false,coinAcc:0,name:''};
var MP={active:false,conn:null,peer:null,isHost:false,code:null,grid:4,oppPct:0,oppFinished:false,myFinished:false,jt:null};
var currentLevel=null,gridSize=4,pieces=[],placedCount=0,moves=0,zTop=10,dragging=null,areaRect=null;
var boardX=0,boardY=0,boardSize=0,cellSize=0,sourceCanvas=null,boardCache=null,hintOn=false,combo=0,lastPlace=0;
var timerInt=null,elapsedMs=0,lastTick=0,paused=false,fxCanvas=null,fxCtx=null,fxParts=[],fxRaf=null;
var currentCategory='all',pxCategory='all',CUSTOM_CACHE=[],PX_CARDS=[];

/* ================= ЭКОНОМИКА / НАСТРОЙКИ ================= */
var DEF_SET={sfx:true,music:true,vibration:true,targetGlow:true};
function getSettings(){var s={};try{s=JSON.parse(localStorage.getItem('pm_settings')||'{}')}catch(e){}return Object.assign({},DEF_SET,s)}
function updateSetting(k,v){var s=getSettings();s[k]=v;localStorage.setItem('pm_settings',JSON.stringify(s));applySettings(s)}
window.updateSetting=updateSetting;
function applySettings(s){audio.setSFX(s.sfx);audio.setMusic(s.music);window.gameSettings=s}
function loadSettingsUI(){var s=getSettings();var a=$('setting-sfx'),b=$('setting-music'),c=$('setting-vibration'),d=$('setting-targetglow');
if(a)a.checked=s.sfx;if(b)b.checked=s.music;if(c)c.checked=s.vibration;if(d)d.checked=s.targetGlow;applySettings(s)}
function vibrate(p){if(st().vibration&&navigator.vibrate)navigator.vibrate(p)}
function getCoins(){return parseInt(localStorage.getItem('pm_coins')||'0',10)||0}
function setCoins(n){localStorage.setItem('pm_coins',String(n));updateCoinsUI()}
function addCoins(n){setCoins(getCoins()+n)}
function spendCoins(n){if(getCoins()<n){toast('Недостаточно монет');return false}setCoins(getCoins()-n);audio.playCoin();return true}
function isGod(){return localStorage.getItem('pm_god')==='1'}
function getBoosters(){var b={bomb:0,bucket:0,lens:0};try{b=Object.assign(b,JSON.parse(localStorage.getItem('pm_boost')||'{}'))}catch(e){}if(isGod()){b.bomb=999;b.bucket=999;b.lens=999}return b}
function setBoosters(b){localStorage.setItem('pm_boost',JSON.stringify(b))}
var PRICE={bomb:150,bucket:300,lens:100};
function updateCoinsUI(){var c=fmt(getCoins());
['coin-count-menu','coin-count-pixel','coin-count-settings','pxg-coins'].forEach(function(id){var e=$(id);if(e)e.textContent=c});
var b=getBoosters(),g=isGod();
var e1=$('bs-bomb-n');if(e1)e1.textContent=g?'∞':b.bomb;var e2=$('bs-bucket-n');if(e2)e2.textContent=g?'∞':b.bucket;var e3=$('bs-lens-n');if(e3)e3.textContent=g?'∞':b.lens;
var s1=$('shop-bomb-n');if(s1)s1.textContent='×'+(g?'∞':b.bomb);var s2=$('shop-bucket-n');if(s2)s2.textContent='×'+(g?'∞':b.bucket);var s3=$('shop-lens-n');if(s3)s3.textContent='×'+(g?'∞':b.lens);
var gb=$('god-badge');if(gb)gb.classList.toggle('hidden',!g)}
function toast(t,gold){var x=$('toast');if(!x)return;x.textContent=t;x.classList.toggle('gold',!!gold);x.classList.remove('hidden');clearTimeout(toast._t);toast._t=setTimeout(function(){x.classList.add('hidden')},3200)}
function buyBooster(n){if(isGod()){toast('Dev Mode: бустеры бесконечны',true);return}if(spendCoins(PRICE[n])){var b=getBoosters();b[n]++;setBoosters(b);updateCoinsUI();audio.playBoost();toast('Куплено')}}
function resetProgress(){if(confirm('Сбросить всё?')){localStorage.removeItem('pm_progress');localStorage.removeItem('pm_coins');localStorage.removeItem('pm_boost');localStorage.removeItem('pm_god');LEVELS.forEach(function(l){l.stars=0;l.completed=false;l.locked=l.id>3});updateCoinsUI();updateMenuStats();showScreen('main-menu');toast('Сброшено')}}

/* ================= ПРОМОКОД ================= */
function applyPromo(){var inp=$('promo-input');var v=(inp?inp.value:'').trim().toLowerCase();
if(v==='goodofax'){setCoins(getCoins()+999999);localStorage.setItem('pm_god','1');setBoosters({bomb:999,bucket:999,lens:999});updateCoinsUI();alert('God Mode Activated!');if(inp)inp.value=''}
else{audio.playError();alert('Неверный промокод')}}
window.applyPromo=applyPromo;

/* ================= SHOWSCREEN (неубиваемая) ================= */
var ALIAS={'main-menu':['main-menu','screen-menu'],'puzzles-screen':['puzzles-screen','screen-gallery'],'pixel-screen':['pixel-screen','screen-pixel'],'multiplayer-screen':['multiplayer-screen','screen-multi'],'shop-screen':['shop-screen','screen-settings'],'game-screen':['game-screen','screen-game'],'pixel-game-screen':['pixel-game-screen','screen-pixel-game'],'difficulty-screen':['difficulty-screen','screen-difficulty'],'pause-screen':['pause-screen','screen-pause'],'victory-screen':['victory-screen','screen-victory']};
function showScreen(screenId){
var ids=ALIAS[screenId]||[screenId],target=null;
for(var i=0;i<ids.length;i++){var t=$(ids[i]);if(t){target=t;break}}
document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active')});
if(target)target.classList.add('active');
PX.active=!!(target&&(target.id==='pixel-game-screen'||target.id==='screen-pixel-game'));
if(PX.active)pxLoopStart();
var id=target?target.id:'';
if(id==='screen-menu'||id==='main-menu'){updateMenuStats();updateCoinsUI()}
if(id==='screen-gallery'||id==='puzzles-screen')renderGallery();
if(id==='screen-pixel'||id==='pixel-screen')renderPixelLobby();
if(id==='screen-settings'||id==='shop-screen'){loadSettingsUI();updateCoinsUI()}}
window.showScreen=showScreen;

/* ================= ПРИВЯЗКА КЛИКОВ ================= */
function bindNav(elm,target){if(!elm||elm._nb)return;elm._nb=1;elm.addEventListener('click',function(e){e.preventDefault();showScreen(target)})}
document.querySelectorAll('[data-nav]').forEach(function(b){bindNav(b,b.getAttribute('data-nav'))});
document.querySelectorAll('button,.btn,[role=button]').forEach(function(b){
if(b.hasAttribute('data-action')||b.hasAttribute('data-nav'))return;
var t=(b.textContent||'').trim();
if(t==='Пазлы')bindNav(b,'puzzles-screen');
else if(/^Пиксель-арт$/i.test(t))bindNav(b,'pixel-screen');
else if(t==='По сети')bindNav(b,'multiplayer-screen');
else if(/^Магазин/.test(t))bindNav(b,'shop-screen');
else if(/Назад/.test(t)||b.classList.contains('btn-back'))bindNav(b,'main-menu')});

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
case 'pxcat':pxCategory=g;audio.playClick();renderPixelLobby();break;
case 'pxphoto':pixelPhoto();break;
case 'pxstart':startPixelPreset(parseInt(g,10));break;
case 'pxquit':pxQuit();break;
case 'tool':pxTool(g);break;
case 'zin':pxZoom(1.25);break;case 'zout':pxZoom(0.8);break;
case 'bs':boosterTap(g);break;
case 'swatch':PX.selected=parseInt(g,10);audio.playClick();renderPxPalette();break;
case 'buy':buyBooster(g);break;
case 'promo':applyPromo();break;
case 'reset':resetProgress();break}}
document.addEventListener('click',function(e){var t=e.target.closest?e.target.closest('[data-action]'):null;if(t)runAction(t)});

/* ================= УРОВНИ ================= */
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

/* ================= ГАЛЕРЕЯ + INDEXEDDB ================= */
function renderGallery(){var tabs=$('category-tabs');if(!tabs)return;tabs.innerHTML='';
CATS.forEach(function(c){var b=document.createElement('button');b.className='category-tab'+(c.id===currentCategory?' active':'');b.textContent=c.name;b.setAttribute('data-action','cat');b.setAttribute('data-arg',c.id);tabs.appendChild(b)});
if(currentCategory==='custom'){renderCustomPhotos();return}
var grid=$('levels-grid');grid.innerHTML='';
getLevels().filter(function(l){return currentCategory==='all'||l.category===currentCategory}).forEach(function(lv,i){
var card=document.createElement('div');card.className='level-card'+(lv.locked?' locked':'');card.style.animationDelay=(i*.04)+'s';
var img=document.createElement('img');img.className='level-card-img';img.loading='lazy';img.src=lv.image;
var ov=document.createElement('div');ov.className='level-card-overlay';var stars='';
for(var s=1;s<=3;s++)stars+=STAR.replace('<svg','<svg class="'+((lv.stars||0)>=s?'filled':'')+'"');
ov.innerHTML='<div class="level-card-name">'+lv.name+'</div><div class="level-card-stars">'+stars+'</div>';
card.appendChild(img);card.appendChild(ov);
if(!lv.locked){card.setAttribute('data-action','level');card.setAttribute('data-arg','L'+lv.id)}
grid.appendChild(card)})}
function selectLevelById(a){if(a.charAt(0)==='L'){var id=parseInt(a.slice(1),10);var lv=getLevels().filter(function(l){return l.id===id})[0];if(lv)selectLevel(lv)}
else{var rec=CUSTOM_CACHE[parseInt(a.slice(1),10)];if(rec)selectLevel({id:'photo-'+rec.id,name:rec.name,category:'custom',image:URL.createObjectURL(rec.blob),locked:false,stars:0,completed:false})}}
function selectLevel(lv){audio.playClick();currentLevel=lv;var p=$('difficulty-preview-img');if(p)p.src=lv.image;var n=$('difficulty-level-name');if(n)n.textContent=lv.name;showScreen('difficulty-screen')}
function idbOpen(){return new Promise(function(res,rej){var rq=indexedDB.open('puzzleMasterDB',1);rq.onupgradeneeded=function(e){var db=e.target.result;if(!db.objectStoreNames.contains('photos'))db.createObjectStore('photos',{keyPath:'id'})};rq.onsuccess=function(e){res(e.target.result)};rq.onerror=function(e){rej(e.target.error)}})}
function idbPut(r){return idbOpen().then(function(db){return new Promise(function(res){var tx=db.transaction('photos','readwrite');tx.objectStore('photos').put(r);tx.oncomplete=function(){db.close();res()}})})}
function idbAll(){return idbOpen().then(function(db){return new Promise(function(res){var tx=db.transaction('photos','readonly');var rq=tx.objectStore('photos').getAll();rq.onsuccess=function(){db.close();res(rq.result||[])}})})}
function idbDel(id){return idbOpen().then(function(db){return new Promise(function(res){var tx=db.transaction('photos','readwrite');tx.objectStore('photos').delete(id);tx.oncomplete=function(){db.close();res()}})})}
function renderCustomPhotos(){var grid=$('levels-grid');grid.innerHTML='';CUSTOM_CACHE=[];
idbAll().then(function(list){list.sort(function(a,b){return b.createdAt-a.createdAt});
if(!list.length){grid.innerHTML='<p class="hint-text" style="grid-column:1/-1;text-align:center;padding:30px 0">Пусто. Нажми камеру — фото сохранится навсегда.</p>';return}
list.forEach(function(rec,i){CUSTOM_CACHE.push(rec);
var card=document.createElement('div');card.className='level-card';card.style.animationDelay=(i*.04)+'s';
var img=document.createElement('img');img.className='level-card-img';img.src=rec.thumb||IMG_FALLBACK;
var ov=document.createElement('div');ov.className='level-card-overlay';ov.innerHTML='<div class="level-card-name">'+rec.name+'</div>';
var del=document.createElement('button');del.className='photo-delete';del.setAttribute('data-action','pdel');del.setAttribute('data-arg',String(rec.id));
del.innerHTML='<svg class="ic" viewBox="0 0 24 24"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>';
card.appendChild(img);card.appendChild(ov);card.appendChild(del);
card.setAttribute('data-action','level');card.setAttribute('data-arg','C'+(CUSTOM_CACHE.length-1));
grid.appendChild(card)})}).catch(function(){})}
function delPhoto(id){if(confirm('Удалить фото?'))idbDel(parseInt(id,10)).then(function(){audio.playClick();renderCustomPhotos()})}
function addCustomPhoto(){audio.playClick();$('photo-input').click()}
$('photo-input').addEventListener('change',function(e){var f=e.target.files[0];e.target.value='';if(!f)return;
var url=URL.createObjectURL(f),img=new Image();
img.onload=function(){var side=Math.min(img.width,img.height);
var full=document.createElement('canvas');full.width=1080;full.height=1080;
full.getContext('2d').drawImage(img,(img.width-side)/2,(img.height-side)/2,side,side,0,0,1080,1080);
var th=document.createElement('canvas');th.width=240;th.height=240;th.getContext('2d').drawImage(full,0,0,240,240);
full.toBlob(function(blob){URL.revokeObjectURL(url);
idbPut({id:Date.now(),name:(f.name||'Фото').replace(/\.[^/.]+$/,'').slice(0,22)||'Фото',createdAt:Date.now(),thumb:th.toDataURL('image/jpeg',.7),blob:blob}).then(function(){audio.playSnap();vibrate(30);toast('Фото сохранено');currentCategory='custom';showScreen('puzzles-screen')}).catch(function(){toast('Ошибка сохранения')})},'image/jpeg',.85)};
img.onerror=function(){URL.revokeObjectURL(url);toast('Ошибка чтения')};img.src=url});

/* ================= ПАЗЛЫ ================= */
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
showScreen('game-screen');
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
if(hl&&st().targetGlow){var x=hl.c*cellSize,y=hl.r*cellSize;a=clamp(a,0,1);c.save();
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
function pauseGame(){audio.playClick();paused=true;var p=$('pause-screen')||$('screen-pause');if(p)p.classList.add('active');else{var q=$('screen-pause');if(q)q.classList.add('active')}}
function resumeGame(){audio.playClick();paused=false;var p=$('screen-pause');if(p)p.classList.remove('active')}
function restartGame(){audio.playClick();var p=$('screen-pause');if(p)p.classList.remove('active');stopTimer();audio.stopMusic();var w=MP.active;mpReset();if(w){showScreen('main-menu');return}initGame({grid:gridSize,level:currentLevel,mp:false})}
function quitToMenu(){audio.playClick();stopTimer();audio.stopMusic();paused=false;mpSend({type:'bye'});mpReset();PX.active=false;
var p=$('screen-pause');if(p)p.classList.remove('active');var v=$('screen-victory');if(v)v.classList.remove('active');showScreen('main-menu')}
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
if(n&&!n.locked)selectLevel(n);else showScreen('puzzles-screen')}
function startConfetti(){var cv=$('confetti-canvas');if(!cv)return;var c=cv.getContext('2d');cv.width=innerWidth;cv.height=innerHeight;
var cols=['#8FA0FF','#E8EAF2','#6EE7B7','#B7BFF9','#5560E8'],ps=[];
for(var i=0;i<130;i++)ps.push({x:Math.random()*cv.width,y:-Math.random()*cv.height,vx:(Math.random()-.5)*6,vy:2+Math.random()*4,size:3+Math.random()*7,rot:Math.random()*360,vr:(Math.random()-.5)*10,color:cols[Math.floor(Math.random()*cols.length)],round:Math.random()>.5});
var fr;function an(){c.clearRect(0,0,cv.width,cv.height);var al=false;
for(var i=0;i<ps.length;i++){var p=ps[i];p.x+=p.vx;p.y+=p.vy;p.vy+=.09;p.rot+=p.vr;if(p.y<cv.height+40)al=true;
c.save();c.translate(p.x,p.y);c.rotate(p.rot*Math.PI/180);c.fillStyle=p.color;
if(p.round){c.beginPath();c.arc(0,0,p.size/2,0,Math.PI*2);c.fill()}else c.fillRect(-p.size/2,-p.size/4,p.size,p.size/2);c.restore()}
if(al)fr=requestAnimationFrame(an)}
an();setTimeout(function(){cancelAnimationFrame(fr);c.clearRect(0,0,cv.width,cv.height)},5000)}

/* ================= МУЛЬТИПЛЕЕР ================= */
var MP_A='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function mpGen(){var s='';for(var i=0;i<4;i++)s+=MP_A[Math.floor(Math.random()*MP_A.length)];return s}
function mpId(c){return 'puzzle-master-ru-'+c}
function openMulti(){if(typeof Peer==='undefined'){toast('Нужен интернет при запуске');return}showScreen('multiplayer-screen');
var l=$('multi-lobby');if(l)l.classList.remove('hidden');var r=$('multi-room');if(r)r.classList.add('hidden');var s=$('multi-status');if(s)s.textContent=''}
function leaveMulti(){mpSend({type:'bye'});mpReset();showScreen('main-menu')}
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

/* ================= ПИКСЕЛЬ-АРТ ================= */
var PAL_M=['#0B0C12','#1E2130','#3A3F58','#64748B','#FFFFFF','#F87171','#DC2626','#FF9F43','#FECA57','#A16207','#6EE7B1','#10B981','#1DD3B0','#0EA5E9','#5560E8','#7C8CFF','#F472B6','#8B5CF6','#D97706','#78350F'];
var PAL_RGB=PAL_M.map(function(h){return[parseInt(h.substr(1,2),16),parseInt(h.substr(3,2),16),parseInt(h.substr(5,2),16)]});
function genPlanet(c,N){var g=c.createLinearGradient(0,0,0,N);g.addColorStop(0,'#0B0C12');g.addColorStop(1,'#1E2130');c.fillStyle=g;c.fillRect(0,0,N,N);
c.fillStyle='rgba(139,92,246,.25)';c.beginPath();c.arc(N*.75,N*.25,N*.22,0,7);c.fill();
for(var i=0;i<N*1.6;i++){c.fillStyle=Math.random()<.7?'#FFFFFF':'#7C8CFF';c.fillRect(Math.random()*N|0,Math.random()*N|0,1,1)}
var cx=N*.5,cy=N*.46,r=N*.26,pg=c.createRadialGradient(cx-r*.4,cy-r*.4,r*.2,cx,cy,r);
pg.addColorStop(0,'#FF9F43');pg.addColorStop(.6,'#DC2626');pg.addColorStop(1,'#78350F');c.fillStyle=pg;c.beginPath();c.arc(cx,cy,r,0,7);c.fill();
c.fillStyle='rgba(161,98,7,.8)';c.fillRect(cx-r,cy-r*.2,r*2,r*.18);
c.strokeStyle='#FECA57';c.lineWidth=N*.03;c.save();c.translate(cx,cy);c.rotate(-.4);c.beginPath();c.ellipse(0,0,r*1.6,r*.5,0,0,7);c.stroke();c.restore();
c.fillStyle='#64748B';c.beginPath();c.arc(N*.16,N*.18,N*.05,0,7);c.fill()}
function genSword(c,N){var g=c.createRadialGradient(N/2,N/2,N*.1,N/2,N/2,N*.75);g.addColorStop(0,'#1E2130');g.addColorStop(1,'#0B0C12');c.fillStyle=g;c.fillRect(0,0,N,N);
c.save();c.translate(N/2,N/2);c.rotate(-Math.PI/4);var bl=N*.52,bw=N*.07;
var bg=c.createLinearGradient(-bw,0,bw,0);bg.addColorStop(0,'#64748B');bg.addColorStop(.5,'#FFFFFF');bg.addColorStop(1,'#3A3F58');
c.fillStyle=bg;c.beginPath();c.moveTo(-bw,-bl*.1);c.lineTo(-bw,-bl);c.lineTo(0,-bl-N*.08);c.lineTo(bw,-bl);c.lineTo(bw,-bl*.1);c.fill();
c.fillStyle='#FECA57';c.fillRect(-bw*2.6,-bl*.12,bw*5.2,N*.045);
c.fillStyle='#78350F';c.fillRect(-bw*.7,-bl*.075,bw*1.4,bl*.42);
c.fillStyle='#FECA57';c.beginPath();c.arc(0,bl*.38,bw*.9,0,7);c.fill();c.restore()}
function genPumpkin(c,N){var g=c.createLinearGradient(0,0,0,N);g.addColorStop(0,'#0B0C12');g.addColorStop(1,'#1E2130');c.fillStyle=g;c.fillRect(0,0,N,N);
for(var i=0;i<N;i++){c.fillStyle=Math.random()<.8?'#FFFFFF':'#8B5CF6';c.fillRect(Math.random()*N|0,Math.random()*N*.4|0,1,1)}
var cx=N*.5,cy=N*.58;
c.fillStyle='#DC2626';c.beginPath();c.ellipse(cx,cy,N*.34,N*.28,0,0,7);c.fill();
c.fillStyle='#FF9F43';c.beginPath();c.ellipse(cx,cy,N*.24,N*.28,0,0,7);c.fill();
c.fillStyle='#D97706';c.beginPath();c.ellipse(cx,cy,N*.12,N*.28,0,0,7);c.fill();
c.fillStyle='#10B981';c.fillRect(cx-N*.03,cy-N*.36,N*.06,N*.09);
c.fillStyle='#FECA57';
c.beginPath();c.moveTo(cx-N*.18,cy-N*.08);c.lineTo(cx-N*.06,cy-N*.08);c.lineTo(cx-N*.12,cy-N*.2);c.fill();
c.beginPath();c.moveTo(cx+N*.06,cy-N*.08);c.lineTo(cx+N*.18,cy-N*.08);c.lineTo(cx+N*.12,cy-N*.2);c.fill();
c.beginPath();c.moveTo(cx-N*.2,cy+N*.1);c.lineTo(cx-N*.1,cy+N*.16);c.lineTo(cx,cy+N*.1);c.lineTo(cx+N*.1,cy+N*.16);c.lineTo(cx+N*.2,cy+N*.1);c.lineTo(cx+N*.14,cy+N*.24);c.lineTo(cx-N*.14,cy+N*.24);c.fill()}
function genGhost(c,N){var g=c.createLinearGradient(0,0,0,N);g.addColorStop(0,'#0B0C12');g.addColorStop(1,'#1E2130');c.fillStyle=g;c.fillRect(0,0,N,N);
c.fillStyle='#FECA57';c.beginPath();c.arc(N*.8,N*.18,N*.1,0,7);c.fill();
for(var i=0;i<N;i++){c.fillStyle='#FFFFFF';c.fillRect(Math.random()*N|0,Math.random()*N|0,1,1)}
var cx=N*.45,cy=N*.5,w=N*.3;
c.fillStyle='#FFFFFF';c.beginPath();c.arc(cx,cy-w*.3,w,Math.PI,0);c.lineTo(cx+w,cy+w);
for(var x=4;x>=0;x--)c.quadraticCurveTo(cx+w-x*(w/2)-(w/4),cy+w+(x%2?N*.06:0),cx+w-(x+1)*(w/2)+(w/4)*0,cy+w+(x%2?0:N*.06));
c.closePath();c.fill();
c.fillStyle='#64748B';c.beginPath();c.arc(cx+w*.4,cy+w*.1,w*.5,0,7);c.fill();
c.fillStyle='#0B0C12';c.beginPath();c.arc(cx-w*.3,cy-w*.35,w*.14,0,7);c.arc(cx+w*.15,cy-w*.35,w*.14,0,7);c.fill()}
function genPizza(c,N){c.fillStyle='#1E2130';c.fillRect(0,0,N,N);
var cx=N*.5;
c.fillStyle='#FECA57';c.beginPath();c.moveTo(cx-N*.3,N*.25);c.lineTo(cx+N*.3,N*.25);c.lineTo(cx,N*.88);c.closePath();c.fill();
c.fillStyle='#D97706';c.beginPath();c.moveTo(cx-N*.34,N*.18);c.lineTo(cx+N*.34,N*.18);c.lineTo(cx+N*.3,N*.28);c.lineTo(cx-N*.3,N*.28);c.closePath();c.fill();
c.fillStyle='#DC2626';
[[cx-N*.14,N*.38],[cx+N*.13,N*.42],[cx,N*.56],[cx-N*.07,N*.66]].forEach(function(p){c.beginPath();c.arc(p[0],p[1],N*.06,0,7);c.fill()});
c.fillStyle='#10B981';c.fillRect(cx+N*.05,N*.6,N*.04,N*.04);c.fillRect(cx-N*.16,N*.5,N*.04,N*.04)}
var PX_GENS=[
{cat:'space',name:'Планета',fn:genPlanet},{cat:'space',name:'Меч',fn:genSword},
{cat:'hallow',name:'Тыква',fn:genPumpkin},{cat:'hallow',name:'Призрак',fn:genGhost},
{cat:'food',name:'Пицца',fn:genPizza}];
var PX_CATS=[{id:'all',name:'Все'},{id:'space',name:'Космос'},{id:'hallow',name:'Хэллоуин'},{id:'food',name:'Еда'}];
function quantize(cv,side){var d=cv.getContext('2d').getImageData(0,0,side,side).data;
var arr=new Array(side*side),freq={};
for(var i=0;i<side*side;i++){var r=d[i*4],g=d[i*4+1],b=d[i*4+2],best=0,bd=1e9;
for(var m=0;m<PAL_RGB.length;m++){var q=(r-PAL_RGB[m][0])*(r-PAL_RGB[m][0])+(g-PAL_RGB[m][1])*(g-PAL_RGB[m][1])+(b-PAL_RGB[m][2])*(b-PAL_RGB[m][2]);if(q<bd){bd=q;best=m}}
arr[i]=best;freq[best]=(freq[best]||0)+1}
var order=Object.keys(freq).map(Number).sort(function(a,b){return freq[b]-freq[a]}).slice(0,20);
var palette=order.map(function(m){return PAL_M[m]});
var targets=[];for(var rr=0;rr<side;rr++){targets.push([]);for(var cc=0;cc<side;cc++)targets[rr].push(order.indexOf(arr[rr*side+cc]))}
return{targets:targets,palette:palette}}
function renderPixelLobby(){var tabs=$('px-cat-tabs');if(!tabs)return;tabs.innerHTML='';
PX_CATS.forEach(function(c){var b=document.createElement('button');b.className='category-tab'+(c.id===pxCategory?' active':'');b.textContent=c.name;b.setAttribute('data-action','pxcat');b.setAttribute('data-arg',c.id);tabs.appendChild(b)});
var grid=$('px-grid');grid.innerHTML='';PX_CARDS=[];
PX_GENS.filter(function(g){return pxCategory==='all'||g.cat===pxCategory}).forEach(function(g){
[32,48].forEach(function(size){
var card={name:g.name,size:size,fn:g.fn};var idx=PX_CARDS.length;PX_CARDS.push(card);
var div=document.createElement('div');div.className='level-card';div.setAttribute('data-action','pxstart');div.setAttribute('data-arg',String(idx));
var cv=document.createElement('canvas');cv.className='px-preview';cv.width=size;cv.height=size;
g.fn(cv.getContext('2d'),size);
var ov=document.createElement('div');ov.className='level-card-overlay';ov.innerHTML='<div class="level-card-name">'+g.name+' · '+size+'×'+size+'</div>';
div.appendChild(cv);div.appendChild(ov);grid.appendChild(div)})})}
var pxSlider=$('px-slider');
if(pxSlider){pxSlider.addEventListener('input',function(){var side=clamp(Math.round(Math.sqrt(parseInt(pxSlider.value,10))),14,45);PX.side=side;var v=$('px-slider-val');if(v)v.textContent='≈'+side+'×'+side});
PX.side=clamp(Math.round(Math.sqrt(parseInt(pxSlider.value,10))),14,45)}
function pixelPhoto(){audio.playClick();$('pixel-photo-input').click()}
$('pixel-photo-input').addEventListener('change',function(e){var f=e.target.files[0];e.target.value='';if(!f)return;
var url=URL.createObjectURL(f),img=new Image();
img.onload=function(){var side=PX.side;var c=document.createElement('canvas');c.width=side;c.height=side;
var s=Math.min(img.width,img.height);c.getContext('2d').drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,side,side);
URL.revokeObjectURL(url);var q=quantize(c,side);startPixel({size:side,targets:q.targets,palette:q.palette,name:'Моё фото'})};
img.onerror=function(){URL.revokeObjectURL(url);toast('Ошибка чтения')};img.src=url});
function startPixelPreset(i){var card=PX_CARDS[i];if(!card)return;audio.playClick();
var c=document.createElement('canvas');c.width=card.size;c.height=card.size;card.fn(c.getContext('2d'),card.size);
var q=quantize(c,card.size);startPixel({size:card.size,targets:q.targets,palette:q.palette,name:card.name})}
function startPixel(d){PX.size=d.size;PX.targets=d.targets;PX.palette=d.palette;PX.name=d.name;
PX.selected=0;PX.doneCount=0;PX.total=0;PX.fx=[];PX.done=[];PX.bombArmed=false;PX.tool='brush';PX.coinAcc=0;
for(var r=0;r<PX.size;r++){PX.done.push(new Array(PX.size).fill(false));for(var c=0;c<PX.size;c++)if(PX.targets[r][c]>=0)PX.total++}
PX.counts=PX.palette.map(function(col,idx){var n=0;for(var r=0;r<PX.size;r++)for(var c=0;c<PX.size;c++)if(PX.targets[r][c]===idx)n++;return n});
PX.lastMode=true;
var t=$('pxg-title');if(t)t.textContent=d.name;var pr=$('pxg-progress');if(pr)pr.textContent='0%';
showScreen('pixel-game-screen');
var area=$('px-area');PX.viewW=area.clientWidth;PX.viewH=area.clientHeight;
PX.canvas=$('pxg-canvas');var dpr=Math.min(2,window.devicePixelRatio||1);
PX.canvas.width=PX.viewW*dpr;PX.canvas.height=PX.viewH*dpr;
PX.ctx=PX.canvas.getContext('2d');PX.ctx.setTransform(dpr,0,0,dpr,0,0);
PX.base=document.createElement('canvas');PX.base.width=PX.viewW*dpr;PX.base.height=PX.viewH*dpr;
PX.bctx=PX.base.getContext('2d');PX.bctx.setTransform(dpr,0,0,dpr,0,0);
PX.cell=Math.floor(Math.min(PX.viewW,PX.viewH)/PX.size);
PX.scale=1;PX.offX=(PX.viewW-PX.cell*PX.size)/2;PX.offY=(PX.viewH-PX.cell*PX.size)/2;
PX.dirty=true;
var tb=$('tool-brush'),th=$('tool-hand');if(tb)tb.classList.add('active');if(th)th.classList.remove('active');
renderPxPalette();updateCoinsUI()}
function renderPxPalette(){var box=$('pxg-palette');if(!box)return;box.innerHTML='';
PX.palette.forEach(function(col,idx){var b=document.createElement('button');
b.className='px-swatch'+(idx===PX.selected?' active':'')+(PX.counts[idx]===0?' sw-done':'');
b.style.background=col;b.setAttribute('data-action','swatch');b.setAttribute('data-arg',String(idx));
b.innerHTML='<span class="num">'+(idx+1)+'</span><span class="left">'+PX.counts[idx]+'</span>';
box.appendChild(b)})}
function grayFor(idx){var g=26+Math.round(((idx+1)/(PX.palette.length+1))*44);return 'rgb('+g+','+g+','+g+')'}
function renderBase(){var c=PX.bctx,cs=PX.cell*PX.scale;
c.clearRect(0,0,PX.viewW,PX.viewH);
c.fillStyle='#12131C';c.fillRect(0,0,PX.viewW,PX.viewH);
for(var r=0;r<PX.size;r++)for(var col=0;col<PX.size;col++){
var t=PX.targets[r][col];if(t<0)continue;
var x=PX.offX+col*cs,y=PX.offY+r*cs;
if(x+cs<0||y+cs<0||x>PX.viewW||y>PX.viewH)continue;
if(PX.done[r][col]){c.fillStyle=PX.palette[t];c.fillRect(x,y,cs+0.5,cs+0.5)}
else{c.fillStyle=grayFor(t);c.fillRect(x,y,cs+0.5,cs+0.5);
if(cs>=6){c.strokeStyle='rgba(0,0,0,.25)';c.lineWidth=1;c.strokeRect(x+.5,y+.5,cs-1,cs-1)}
if(cs>=9){c.fillStyle='rgba(255,255,255,.75)';c.font='700 '+Math.max(7,cs*.42)+'px Manrope,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(String(t+1),x+cs/2,y+cs/2+1)}}}}
function pxLoopStart(){if(!PX.fxRaf)requestAnimationFrame(pxLoop)}
function pxLoop(t){if(!PX.active){PX.fxRaf=null;return}
PX.fxRaf=requestAnimationFrame(pxLoop);
if(PX.dirty){renderBase();PX.dirty=false}
var c=PX.ctx,cs=PX.cell*PX.scale;
c.clearRect(0,0,PX.viewW,PX.viewH);
c.drawImage(PX.base,0,0,PX.viewW,PX.viewH);
var a=.22+.18*Math.sin(t/280);
c.fillStyle='rgba(255,255,255,'+a.toFixed(3)+')';
for(var r=0;r<PX.size;r++)for(var col=0;col<PX.size;col++){
if(PX.targets[r][col]!==PX.selected||PX.done[r][col])continue;
var x=PX.offX+col*cs,y=PX.offY+r*cs;
if(x+cs<0||y+cs<0||x>PX.viewW||y>PX.viewH)continue;
c.fillRect(x+1,y+1,cs-2,cs-2)}
var now=performance.now();
PX.fx=PX.fx.filter(function(f){return now-f.t0<350});
for(var i=0;i<PX.fx.length;i++){var f=PX.fx[i],age=(now-f.t0)/350,fx=PX.offX+f.c*cs+cs/2,fy=PX.offY+f.r*cs+cs/2;
c.save();
if(f.kind==='good'){c.globalAlpha=1-age;c.strokeStyle='#FFFFFF';c.lineWidth=2;c.beginPath();c.arc(fx,fy,cs*.2+age*cs*.7,0,Math.PI*2);c.stroke()}
else{c.globalAlpha=(1-age)*.5;c.fillStyle='#F87171';c.fillRect(PX.offX+f.c*cs,PX.offY+f.r*cs,cs,cs)}
c.restore()}}
function clampView(){var sw=PX.cell*PX.size*PX.scale,sh=sw;
PX.offX=sw<PX.viewW?(PX.viewW-sw)/2:clamp(PX.offX,PX.viewW-sw,0);
PX.offY=sh<PX.viewH?(PX.viewH-sh)/2:clamp(PX.offY,PX.viewH-sh,0)}
function pxZoom(f){var cx=PX.viewW/2,cy=PX.viewH/2;
var ns=clamp(PX.scale*f,1,8);var k=ns/PX.scale;
PX.offX=cx-(cx-PX.offX)*k;PX.offY=cy-(cy-PX.offY)*k;PX.scale=ns;clampView();PX.dirty=true}
function pxTool(t){PX.tool=t;audio.playClick();
var tb=$('tool-brush'),th=$('tool-hand');
if(tb)tb.classList.toggle('active',t==='brush');if(th)th.classList.toggle('active',t==='hand')}
function pxCellAt(cx,cy){var rect=PX.canvas.getBoundingClientRect();
var cs=PX.cell*PX.scale;
var col=Math.floor((cx-rect.left-PX.offX)/cs),r=Math.floor((cy-rect.top-PX.offY)/cs);
if(r<0||col<0||r>=PX.size||col>=PX.size)return null;return{r:r,c:col}}
function pxPaint(r,col){var t=PX.targets[r][col];if(t<0||PX.done[r][col])return;
if(PX.bombArmed){bombUse(r,col);return}
if(t===PX.selected){PX.done[r][col]=true;PX.doneCount++;PX.counts[t]--;audio.playSnap();vibrate(8);PX.fx.push({r:r,c:col,kind:'good',t0:performance.now()});
PX.coinAcc++;if(PX.coinAcc>=10){PX.coinAcc=0;addCoins(1);audio.playCoin()}
var pr=$('pxg-progress');if(pr)pr.textContent=Math.round(PX.doneCount/PX.total*100)+'%';
if(PX.counts[t]===0){for(var n=0;n<PX.palette.length;n++)if(PX.counts[n]>0){PX.selected=n;break}}
renderPxPalette();PX.dirty=true;
if(PX.doneCount>=PX.total)setTimeout(pxWin,350)}
else{audio.playError();vibrate(20);PX.fx.push({r:r,c:col,kind:'bad',t0:performance.now()})}}
function ensureBooster(n){if(isGod())return true;var b=getBoosters();if(b[n]>0){b[n]--;setBoosters(b);updateCoinsUI();return true}if(spendCoins(PRICE[n])){updateCoinsUI();return true}return false}
function boosterTap(n){audio.playClick();
if(n==='bomb'){var btn=$('bs-bomb');
if(PX.bombArmed){PX.bombArmed=false;if(btn)btn.classList.remove('armed');return}
if(ensureBooster('bomb')){PX.bombArmed=true;if(btn)btn.classList.add('armed');audio.playBoost();toast('Бомба готова — тапни по полю')}}
else if(n==='bucket'){if(PX.counts[PX.selected]===0){toast('Цвет уже готов');return}
if(ensureBooster('bucket')){audio.playBoost();
for(var r=0;r<PX.size;r++)for(var c=0;c<PX.size;c++)if(PX.targets[r][c]===PX.selected&&!PX.done[r][c]){PX.done[r][c]=true;PX.doneCount++}
PX.counts[PX.selected]=0;
for(var n2=0;n2<PX.palette.length;n2++)if(PX.counts[n2]>0){PX.selected=n2;break}
var pr=$('pxg-progress');if(pr)pr.textContent=Math.round(PX.doneCount/PX.total*100)+'%';
renderPxPalette();PX.dirty=true;vibrate(30);
if(PX.doneCount>=PX.total)setTimeout(pxWin,350)}}
else if(n==='lens'){if(ensureBooster('lens')){audio.playBoost();
var und=[];for(var r=0;r<PX.size;r++)for(var c=0;c<PX.size;c++)if(PX.targets[r][c]>=0&&!PX.done[r][c])und.push([r,c]);
if(und.length){var p=und[Math.floor(Math.random()*und.length)];
PX.scale=Math.max(PX.scale,2.5);var cs=PX.cell*PX.scale;
PX.offX=PX.viewW/2-(p[1]+.5)*cs;PX.offY=PX.viewH/2-(p[0]+.5)*cs;clampView();PX.dirty=true}}}}
function bombUse(r,c){PX.bombArmed=false;var btn=$('bs-bomb');if(btn)btn.classList.remove('armed');
audio.playBoost();vibrate(40);
for(var rr=r-1;rr<=r+1;rr++)for(var cc=c-1;cc<=c+1;cc++){
if(rr<0||cc<0||rr>=PX.size||cc>=PX.size)continue;var t=PX.targets[rr][cc];
if(t>=0&&!PX.done[rr][cc]){PX.done[rr][cc]=true;PX.doneCount++;PX.counts[t]--;PX.fx.push({r:rr,c:cc,kind:'good',t0:performance.now()})}}
var pr=$('pxg-progress');if(pr)pr.textContent=Math.round(PX.doneCount/PX.total*100)+'%';
renderPxPalette();PX.dirty=true;
if(PX.doneCount>=PX.total)setTimeout(pxWin,350)}
function pxWin(){var reward=Math.round(PX.total/8)+20;addCoins(reward);audio.playVictory();vibrate([50,80,50]);
var t=$('victory-title');if(t)t.textContent='Готово!';
var s=$('victory-sub');if(s)s.textContent=PX.name+' · '+PX.size+'×'+PX.size;
var vt=$('victory-time');if(vt)vt.textContent='—';var vm=$('victory-moves');if(vm)vm.textContent=PX.total;
var box=$('victory-stars');if(box)box.style.display='none';
var rw=$('victory-reward');if(rw){rw.classList.remove('hidden');var rn=$('victory-reward-n');if(rn)rn.textContent='+'+fmt(reward)}
var nb=$('victory-next-btn');if(nb)nb.style.display='none';
var v=$('screen-victory');if(v)v.classList.add('active');startConfetti();updateCoinsUI()}
function pxQuit(){audio.playClick();PX.active=false;showScreen('pixel-screen')}

/* touch/mouse для пиксель-канваса */
document.addEventListener('touchstart',function(e){
if(!PX.active||e.target!==PX.canvas)return;
e.preventDefault();
if(e.touches.length===2){PX.pinch={d:Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY),mx:(e.touches[0].clientX+e.touches[1].clientX)/2,my:(e.touches[0].clientY+e.touches[1].clientY)/2,scale:PX.scale,offX:PX.offX,offY:PX.offY};return}
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
var ns=clamp(PX.pinch.scale*d/PX.pinch.d,1,8);var k=ns/PX.pinch.scale;
PX.offX=mx-(PX.pinch.mx-PX.pinch.offX)*k+(mx-PX.pinch.mx)*0;
PX.offY=my-(PX.pinch.my-PX.pinch.offY)*k;
PX.offX+= (mx-PX.pinch.mx)*(1);PX.offY+=(my-PX.pinch.my);
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
if(PX.pan){PX.offX=PX.pan.offX+(e.clientX-PX.pan.x);PX.offY=PX.pan.offY+(e.clientY-PX.pan.y);clampView();PX.dirty=true;return}
var cell=pxCellAt(e.clientX,e.clientY);if(cell)pxPaint(cell.r,cell.c)});
document.addEventListener('mouseup',function(){mDown=false;PX.pan=null});

/* ================= РЕСАЙЗ / СТАРТ ================= */
window.addEventListener('resize',function(){
var gs=$('game-screen')||$('screen-game');
if(gs&&gs.classList.contains('active')&&sourceCanvas)layoutGame();
if(PX.active){var area=$('px-area');PX.viewW=area.clientWidth;PX.viewH=area.clientHeight;
var dpr=Math.min(2,window.devicePixelRatio||1);
PX.canvas.width=PX.viewW*dpr;PX.canvas.height=PX.viewH*dpr;PX.ctx.setTransform(dpr,0,0,dpr,0,0);
PX.base.width=PX.viewW*dpr;PX.base.height=PX.viewH*dpr;PX.bctx.setTransform(dpr,0,0,dpr,0,0);
clampView();PX.dirty=true}});
document.addEventListener('visibilitychange',function(){if(document.hidden&&!paused){var gs=$('screen-game');if(gs&&gs.classList.contains('active')&&timerInt)pauseGame()}});

/* particles в меню */
var box=$('particles');
if(box){for(var i=0;i<24;i++){var p=document.createElement('div');p.className='particle';var sz=2+Math.random()*3;
p.style.width=sz+'px';p.style.height=sz+'px';p.style.left=Math.random()*100+'%';p.style.top=Math.random()*100+'%';
p.style.animationDelay=(Math.random()*9)+'s';p.style.animationDuration=(7+Math.random()*7)+'s';box.appendChild(p)}}

loadSettingsUI();updateCoinsUI();updateMenuStats();
});