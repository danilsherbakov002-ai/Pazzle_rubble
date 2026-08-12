/* PUZZLE MASTER 4.1 — полный движок. События: делегирование touchend+click по data-action. */
function el(i){return document.getElementById(i)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function st(){return window.gameSettings||{}}
function fmt(n){return n.toLocaleString('ru-RU')}
var STAR='<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.26 6.6.56-5 4.4 1.5 6.5L12 16.9 5.99 19.7l1.5-6.5-5-4.4 6.6-.56z"/></svg>';

/* ---------- AUDIO ---------- */
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

/* ---------- SETTINGS / ECONOMY ---------- */
var DEF_SET={sfx:true,music:true,vibration:true,targetGlow:true};
function getSettings(){var s={};try{s=JSON.parse(localStorage.getItem('pm_settings')||'{}')}catch(e){}return Object.assign({},DEF_SET,s)}
function updateSetting(k,v){var s=getSettings();s[k]=v;localStorage.setItem('pm_settings',JSON.stringify(s));applySettings(s)}
function applySettings(s){audio.setSFX(s.sfx);audio.setMusic(s.music);window.gameSettings=s}
function loadSettingsUI(){var s=getSettings();el('setting-sfx').checked=s.sfx;el('setting-music').checked=s.music;el('setting-vibration').checked=s.vibration;el('setting-targetglow').checked=s.targetGlow;applySettings(s)}
function vibrate(p){if(st().vibration&&navigator.vibrate)navigator.vibrate(p)}
function getCoins(){return parseInt(localStorage.getItem('pm_coins')||'0',10)||0}
function setCoins(n){localStorage.setItem('pm_coins',String(n));updateCoinsUI()}
function addCoins(n){setCoins(getCoins()+n)}
function spendCoins(n){if(getCoins()<n){toast('Недостаточно монет');return false}setCoins(getCoins()-n);audio.playCoin();return true}
function isGod(){return localStorage.getItem('pm_god')==='1'}
function getBoosters(){var b={bomb:0,bucket:0,lens:0};try{b=Object.assign(b,JSON.parse(localStorage.getItem('pm_boost')||'{}'))}catch(e){}if(isGod()){b.bomb=999;b.bucket=999;b.lens=999}return b}
function setBoosters(b){localStorage.setItem('pm_boost',JSON.stringify(b))}
var PRICE={bomb:150,bucket:300,lens:100};
function updateCoinsUI(){var c=fmt(getCoins());el('coin-count-menu').textContent=c;el('coin-count-pixel').textContent=c;el('coin-count-settings').textContent=c;el('pxg-coins').textContent=c;
var b=getBoosters(),g=isGod();
el('bs-bomb-n').textContent=g?'∞':b.bomb;el('bs-bucket-n').textContent=g?'∞':b.bucket;el('bs-lens-n').textContent=g?'∞':b.lens;
el('shop-bomb-n').textContent='×'+(g?'∞':b.bomb);el('shop-bucket-n').textContent='×'+(g?'∞':b.bucket);el('shop-lens-n').textContent='×'+(g?'∞':b.lens);
el('god-badge').classList.toggle('hidden',!g)}
function toast(t,gold){var x=el('toast');x.textContent=t;x.classList.toggle('gold',!!gold);x.classList.remove('hidden');clearTimeout(toast._t);toast._t=setTimeout(function(){x.classList.add('hidden')},3200)}
function applyPromo(){var v=(el('promo-input').value||'').trim();
if(v.toLowerCase()==='goodofax'){addCoins(999999);localStorage.setItem('pm_god','1');setBoosters({bomb:999,bucket:999,lens:999});updateCoinsUI();audio.playVictory();vibrate([60,60,60,60,120]);toast('Dev Mode Activated!',true);el('promo-input').value=''}
else{audio.playError();toast('Неверный промокод')}}
function buyBooster(n){if(isGod()){toast('Dev Mode: бустеры бесконечны',true);return}if(spendCoins(PRICE[n])){var b=getBoosters();b[n]++;setBoosters(b);updateCoinsUI();audio.playBoost();toast('Куплено')}}
function resetProgress(){if(confirm('Сбросить всё?')){localStorage.removeItem('pm_progress');localStorage.removeItem('pm_coins');localStorage.removeItem('pm_boost');localStorage.removeItem('pm_god');LEVELS.forEach(function(l){l.stars=0;l.completed=false;l.locked=l.id>3});updateCoinsUI();updateMenuStats();showScreen('screen-menu');toast('Сброшено')}}

/* ---------- ДЕЛЕГИРОВАНИЕ СОБЫТИЙ ---------- */
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
case 'reset':resetProgress();break;
}}
document.addEventListener('touchend',function(e){var t=e.target.closest?e.target.closest('[data-action]'):null;if(t){e.preventDefault();runAction(t)}},{passive:false});
document.addEventListener('click',function(e){var t=e.target.closest?e.target.closest('[data-action]'):null;if(t)runAction(t)});

function showScreen(id){audio.playClick();var s=document.querySelectorAll('.screen');for(var i=0;i<s.length;i++)s[i].classList.remove('active');el(id).classList.add('active');
if(id==='screen-menu'){updateMenuStats();updateCoinsUI()}
if(id==='screen-gallery')renderGallery();
if(id==='screen-pixel')renderPixelLobby();
if(id==='screen-settings'){loadSettingsUI();updateCoinsUI()}
if(id!=='screen-pixel-game')PX.active=false}

/* ---------- УРОВНИ ---------- */
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
function unlockNextLevels(id){var i=LEVELS.findIndex(function(l){return l.id===id});if(i<0)return;for(var k=1;k<=2;k++)if(LEVELS[i+k])saveLevelProgress(LEVELS[i+k].id,{locked:false})}
function getTotalStars(){return getLevels().reduce(function(s,l){return s+(l.stars||0)},0)}
function getTotalCompleted(){return getLevels().filter(function(l){return l.completed}).length}
function updateMenuStats(){el('total-stars').textContent=getTotalStars();el('total-completed').textContent=getTotalCompleted()}

/* ---------- ГАЛЕРЕЯ + IDB ---------- */
var currentCategory='all',CUSTOM_CACHE=[];
function renderGallery(){var tabs=el('category-tabs');tabs.innerHTML='';
CATS.forEach(function(c){var b=document.createElement('button');b.className='category-tab'+(c.id===currentCategory?' active':'');b.textContent=c.name;b.setAttribute('data-action','cat');b.setAttribute('data-arg',c.id);tabs.appendChild(b)});
if(currentCategory==='custom'){renderCustomPhotos();return}
var grid=el('levels-grid');grid.innerHTML='';
getLevels().filter(function(l){return currentCategory==='all'||l.category===currentCategory}).forEach(function(lv,i){
var card=document.createElement('div');card.className='level-card'+(lv.locked?' locked':'');card.style.animationDelay=(i*.04)+'s';
var img=document.createElement('img');img.className='level-card-img';img.loading='lazy';img.src=lv.image;
var ov=document.createElement('div');ov.className='level-card-overlay';var stars='';
for(var s=1;s<=3;s++)stars+=STAR.replace('<svg','<svg class="'+((lv.stars||0)>=s?'filled':'')+'"');
ov.innerHTML='<div class="level-card-name">'+lv.name+'</div><div class="level-card-stars">'+stars+'</div>';
card.appendChild(img);card.appendChild(ov);
if(!lv.locked){card.setAttribute('data-action','level');card.setAttribute('data-arg','L'+lv.id)}
grid.appendChild(card)})}
function selectLevelById(a){if(a.charAt(0)==='L'){var id=parseInt(a.slice(1),10);var lv=getLevels().find(function(l){return l.id===id});if(lv)selectLevel(lv)}
else{var rec=CUSTOM_CACHE[parseInt(a.slice(1),10)];if(rec)selectLevel({id:'photo-'+rec.id,name:rec.name,category:'custom',image:URL.createObjectURL(rec.blob),locked:false,stars:0,completed:false})}}
function selectLevel(lv){audio.playClick();currentLevel=lv;el('difficulty-preview-img').src=lv.image;el('difficulty-level-name').textContent=lv.name;showScreen('screen-difficulty')}
function idbOpen(){return new Promise(function(res,rej){var rq=indexedDB.open('puzzleMasterDB',1);rq.onupgradeneeded=function(e){var db=e.target.result;if(!db.objectStoreNames.contains('photos'))db.createObjectStore('photos',{keyPath:'id'})};rq.onsuccess=function(e){res(e.target.result)};rq.onerror=function(e){rej(e.target.error)}})}
function idbPut(r){return idbOpen().then(function(db){return new Promise(function(res){var tx=db.transaction('photos','readwrite');tx.objectStore('photos').put(r);tx.oncomplete=function(){db.close();res()}})})}
function idbAll(){return idbOpen().then(function(db){return new Promise(function(res){var tx=db.transaction('photos','readonly');var rq=tx.objectStore('photos').getAll();rq.onsuccess=function(){db.close();res(rq.result||[])}})})}
function idbDel(id){return idbOpen().then(function(db){return new Promise(function(res){var tx=db.transaction('photos','readwrite');tx.objectStore('photos').delete(id);tx.oncomplete=function(){db.close();res()}})})}
function renderCustomPhotos(){var grid=el('levels-grid');grid.innerHTML='';CUSTOM_CACHE=[];
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
grid.appendChild(card)})})}
function delPhoto(id){if(confirm('Удалить фото?'))idbDel(parseInt(id,10)).then(function(){audio.playClick();renderCustomPhotos()})}
function addCustomPhoto(){audio.playClick();el('photo-input').click()}
el('photo-input').addEventListener('change',function(e){var f=e.target.files[0];e.target.value='';if(!f)return;
var url=URL.createObjectURL(f),img=new Image();
img.onload=function(){var side=Math.min(img.width,img.height);
var full=document.createElement('canvas');full.width=1080;full.height=1080;
full.getContext('2d').drawImage(img,(img.width-side)/2,(img.height-side)/2,side,side,0,0,1080,1080);
var th=document.createElement('canvas');th.width=240;th.height=240;th.getContext('2d').drawImage(full,0,0,240,240);
full.toBlob(function(blob){URL.revokeObjectURL(url);
idbPut({id:Date.now(),name:(f.name||'Фото').replace(/\.[^/.]+$/,'').slice(0,22)||'Фото',createdAt:Date.now(),thumb:th.toDataURL('image/jpeg',.7),blob:blob}).then(function(){audio.playSnap();vibrate(30);toast('Фото сохранено');currentCategory='custom';showScreen('screen-gallery')})},'image/jpeg',.85)};
img.onerror=function(){URL.revokeObjectURL(url);toast('Ошибка чтения')};img.src=url});

/* ---------- ПАЗЛЫ ---------- */
var DRAG_LIFT=48,COMBO_W=6000,FX_MAX=220;
var currentLevel=null,gridSize=4,pieces=[],placedCount=0,moves=0,zTop=10,dragging=null,areaRect=null;
var boardX=0,boardY=0,boardSize=0,cellSize=0,sourceCanvas=null,boardCache=null,hintOn=false,combo=0,lastPlace=0;
var timerInt=null,elapsedMs=0,lastTick=0,paused=false,fxCanvas=null,fxCtx=null,fxParts=[],fxRaf=null;
function snapRadius(){return clamp(cellSize*.35,15,40)}
function startGame(g){audio.playClick();initGame({grid:g,level:currentLevel,mp:false})}
function loadSourceImage(url,cb){var img=new Image();img.crossOrigin='anonymous';
img.onload=function(){var nw=img.naturalWidth,nh=img.naturalHeight,side=Math.min(nw,nh),S=720;var c=document.createElement('canvas');c.width=S;c.height=S;c.getContext('2d').drawImage(img,(nw-side)/2,(nh-side)/2,side,side,0,0,S,S);cb(c)};
img.onerror=function(){var S=720,c=document.createElement('canvas');c.width=S;c.height=S;var x=c.getContext('2d');x.fillStyle='#1E2130';x.fillRect(0,0,S,S);for(var i=0;i<24;i++){x.beginPath();x.arc(Math.random()*S,Math.random()*S,30+Math.random()*90,0,7);x.fillStyle='hsla('+(225+Math.random()*40)+',45%,'+(30+Math.random()*30)+'%,.5)';x.fill()}cb(c)};
img.src=url}
function initGame(o){gridSize=o.grid;currentLevel=o.level;PX.lastMode=false;
if(!o.mp){try{localStorage.setItem('pm_lastGrid',String(gridSize))}catch(e){}}
moves=0;placedCount=0;combo=0;el('game-moves').textContent='0';el('game-timer').textContent='00:00';el('game-combo').classList.add('hidden');
hintOn=true;toggleHint(true);
MP.active=!!o.mp;MP.oppPct=0;MP.oppFinished=false;MP.myFinished=false;
el('mp-bars').classList.toggle('hidden',!MP.active);el('mp-alert').classList.add('hidden');updateMPBars(0);
showScreen('screen-game');
var area=el('game-area');area.classList.remove('done');
var old=area.querySelectorAll('.piece,.float-text');for(var i=0;i<old.length;i++)old[i].parentNode.removeChild(old[i]);
pieces=[];fxParts=[];
loadSourceImage(currentLevel.image,function(src){sourceCanvas=src;layoutGame();spawnPieces();startTimer();if(audio.musOn&&!MP.active)audio.startMusic()})}
function layoutGame(){var area=el('game-area'),tray=el('tray'),wrap=el('board-wrap'),cv=el('board-canvas');
var aW=area.clientWidth,aH=area.clientHeight,trayH=clamp(Math.round(aH*.32),140,240);tray.style.height=trayH+'px';
boardSize=Math.max(160,Math.min(aW-16,aH-trayH-26));cellSize=boardSize/gridSize;
var dpr=Math.min(2,window.devicePixelRatio||1);
cv.width=Math.round(boardSize*dpr);cv.height=Math.round(boardSize*dpr);cv.style.width=boardSize+'px';cv.style.height=boardSize+'px';cv.getContext('2d').setTransform(dpr,0,0,dpr,0,0);
wrap.style.width=boardSize+'px';wrap.style.height=boardSize+'px';boardX=wrap.offsetLeft;boardY=wrap.offsetTop;
fxCanvas=el('fx-canvas');fxCtx=fxCanvas.getContext('2d');fxCanvas.width=aW;fxCanvas.height=aH;
buildCache(dpr);
for(var i=0;i<pieces.length;i++){var p=pieces[i];p.w=cellSize;p.h=cellSize;p.el.style.width=cellSize+'px';p.el.style.height=cellSize+'px';
if(p.placed){p.x=boardX+p.col*cellSize;p.y=boardY+p.row*cellSize}else{p.x=clamp(p.x,0,aW-cellSize);p.y=clamp(p.y,0,aH-cellSize)}
setPT(p,false)}
drawBoard(null,0)}
function buildCache(dpr){boardCache=document.createElement('canvas');boardCache.width=Math.round(boardSize*dpr);boardCache.height=Math.round(boardSize*dpr);
var c=boardCache.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='rgba(255,255,255,.03)';c.fillRect(0,0,boardSize,boardSize);
c.strokeStyle='rgba(255,255,255,.08)';c.lineWidth=1;
for(var i=1;i<gridSize;i++){var p=i*cellSize;c.beginPath();c.moveTo(p,0);c.lineTo(p,boardSize);c.stroke();c.beginPath();c.moveTo(0,p);c.lineTo(boardSize,p);c.stroke()}}
function drawBoard(hl,a){var c=el('board-canvas').getContext('2d');c.clearRect(0,0,boardSize,boardSize);
if(boardCache)c.drawImage(boardCache,0,0,boardSize,boardSize);
if(hl&&st().targetGlow){var x=hl.c*cellSize,y=hl.r*cellSize;a=clamp(a,0,1);c.save();
c.fillStyle='rgba(110,231,183,'+(0.06+a*.12)+')';c.fillRect(x+1,y+1,cellSize-2,cellSize-2);
c.strokeStyle='rgba(110,231,183,'+(0.3+a*.6)+')';c.lineWidth=1.5+a*1.5;c.shadowColor='rgba(110,231,183,.8)';c.shadowBlur=5+a*12;
c.strokeRect(x+2,y+2,cellSize-4,cellSize-4);c.restore()}}
function spawnPieces(){var area=el('game-area'),tray=el('tray'),aW=area.clientWidth,aH=area.clientHeight,trayTop=tray.offsetTop;
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
function beginDrag(p,cx,cy){areaRect=el('game-area').getBoundingClientRect();dragging={piece:p,offX:(cx-areaRect.left)-p.x,offY:(cy-areaRect.top)-p.y};
p.el.classList.add('dragging');p.el.style.zIndex=String(++zTop);audio.playPickup();vibrate(8)}
function moveDrag(cx,cy){if(!dragging)return;var p=dragging.piece,aW=el('game-area').clientWidth,aH=el('game-area').clientHeight;
p.x=clamp((cx-areaRect.left)-dragging.offX,0,aW-p.w);p.y=clamp((cy-areaRect.top)-dragging.offY-DRAG_LIFT,0,aH-p.h);setPT(p,true);
var tx=boardX+p.col*cellSize,ty=boardY+p.row*cellSize,d=Math.hypot(p.x-tx,p.y-ty),zone=cellSize*1.4;
if(d<zone)drawBoard({r:p.row,c:p.col},1-d/zone);else drawBoard(null,0)}
function endDrag(){if(!dragging)return;var p=dragging.piece;dragging=null;p.el.classList.remove('dragging');
moves++;el('game-moves').textContent=moves;
var tx=boardX+p.col*cellSize,ty=boardY+p.row*cellSize;
if(Math.hypot(p.x-tx,p.y-ty)<=snapRadius()){p.placed=true;p.x=tx;p.y=ty;p.el.classList.add('placed');
p.el.style.transition='transform 110ms ease';setPT(p,false);setTimeout(function(){p.el.style.transition=''},140);
placedCount++;onPlaceFX(p);
var pct=Math.round(placedCount/(gridSize*gridSize)*100);
if(MP.active){updateMPBars(pct);mpSend({type:'progress',pct:pct})}
if(placedCount===gridSize*gridSize)setTimeout(finishPuzzle,300)}
else{combo=0;el('game-combo').classList.add('hidden');setPT(p,false)}
drawBoard(null,0)}
document.addEventListener('touchmove',function(e){if(!dragging)return;e.preventDefault();moveDrag(e.touches[0].clientX,e.touches[0].clientY)},{passive:false});
document.addEventListener('touchend',endDrag);document.addEventListener('touchcancel',endDrag);
document.addEventListener('mousemove',function(e){if(dragging)moveDrag(e.clientX,e.clientY)});
document.addEventListener('mouseup',endDrag);
function onPlaceFX(p){var cx=p.x+p.w/2,cy=p.y+p.h/2,now=performance.now();
combo=(now-lastPlace<COMBO_W)?combo+1:1;lastPlace=now;var m=Math.min(combo,5);
fxBurst(cx,cy,8+m*4,2.6+m*.4);fxRing(cx,cy,'rgba(143,160,255,.8)',2.5+m*.6);shakeBoard();
if(combo>=2){floatText(cx,cy-8,'серия ×'+combo,'combo');var b=el('game-combo');b.textContent='· ×'+combo;b.classList.remove('hidden');vibrate([12,18,12])}else vibrate([8,24,8]);
audio.playSnap()}
function fxRing(x,y,c,p){if(fxParts.length>FX_MAX)fxParts.splice(0,10);fxParts.push({type:2,x:x,y:y,r:4,vr:2.2+p,life:0,max:22,color:c});fxStart()}
function fxBurst(x,y,n,p){var cols=['#8FA0FF','#E8EAF2','#6EE7B7','#B7BFF9'];
for(var i=0;i<n;i++){if(fxParts.length>FX_MAX)fxParts.splice(0,10);var a=Math.random()*Math.PI*2,sp=(.5+Math.random())*p;
fxParts.push({type:Math.random()<.35?1:0,x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-1.5,g:.12,life:0,max:30+Math.random()*20,size:1.5+Math.random()*3,rot:Math.random()*6.28,vrot:(Math.random()-.5)*.4,color:cols[Math.floor(Math.random()*cols.length)]})}
fxStart()}
function fxStart(){if(!fxRaf)fxRaf=requestAnimationFrame(fxStep)}
function fxStep(){fxCtx.clearRect(0,0,fxCanvas.width,fxCanvas.height);var alive=[];
for(var i=0;i<fxParts.length;i++){var p=fxParts[i];p.life++;if(p.life>=p.max)continue;var t=1-p.life/p.max;
if(p.type===2){p.r+=p.vr;fxCtx.save();fxCtx.globalAlpha=t*.8;fxCtx.strokeStyle=p.color;fxCtx.lineWidth=2*t+.5;fxCtx.beginPath();fxCtx.arc(p.x,p.y,p.r,0,Math.PI*2);fxCtx.stroke();fxCtx.restore()}
else{p.x+=p.vx;p.y+=p.vy;p.vy+=p.g;p.vx*=.985;p.rot+=p.vrot;fxCtx.save();fxCtx.globalAlpha=t;fxCtx.fillStyle=p.color;fxCtx.translate(p.x,p.y);
if(p.type===1){fxCtx.rotate(p.rot);fxCtx.fillRect(-p.size/2,-p.size/4,p.size,p.size/2)}else{fxCtx.beginPath();fxCtx.arc(0,0,p.size/2,0,Math.PI*2);fxCtx.fill()}fxCtx.restore()}
alive.push(p)}
fxParts=alive;if(fxParts.length)fxRaf=requestAnimationFrame(fxStep);else{fxRaf=null;fxCtx.clearRect(0,0,fxCanvas.width,fxCanvas.height)}}
function floatText(x,y,t,c){var d=document.createElement('div');d.className='float-text'+(c?' '+c:'');d.textContent=t;d.style.left=x+'px';d.style.top=y+'px';el('game-area').appendChild(d);d.addEventListener('animationend',function(){if(d.parentNode)d.parentNode.removeChild(d)})}
function shakeBoard(){var w=el('board-wrap');w.classList.remove('shake');void w.offsetWidth;w.classList.add('shake')}
function startTimer(){stopTimer();elapsedMs=0;paused=false;lastTick=performance.now();
timerInt=setInterval(function(){var n=performance.now();if(!paused)elapsedMs+=n-lastTick;lastTick=n;var s=Math.floor(elapsedMs/1000);el('game-timer').textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')},250)}
function stopTimer(){if(timerInt){clearInterval(timerInt);timerInt=null}}
function fmtTime(s){return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function pauseGame(){audio.playClick();paused=true;el('screen-pause').classList.add('active')}
function resumeGame(){audio.playClick();paused=false;el('screen-pause').classList.remove('active')}
function restartGame(){audio.playClick();el('screen-pause').classList.remove('active');stopTimer();audio.stopMusic();var w=MP.active;mpReset();if(w){showScreen('screen-menu');return}initGame({grid:gridSize,level:currentLevel,mp:false})}
function quitToMenu(){audio.playClick();stopTimer();audio.stopMusic();paused=false;mpSend({type:'bye'});mpReset();PX.active=false;
el('screen-pause').classList.remove('active');el('screen-victory').classList.remove('active');showScreen('screen-menu')}
function toggleHint(f){if(typeof f==='boolean')hintOn=f;else{hintOn=!hintOn;audio.playClick()}el('hint-overlay').classList.toggle('hidden',!hintOn);el('btn-hint').style.opacity=hintOn?'1':'.45'}
function finishPuzzle(){stopTimer();audio.stopMusic();audio.playVictory();vibrate([50,80,50,80,50]);
var c=el('board-canvas').getContext('2d');c.clearRect(0,0,boardSize,boardSize);c.drawImage(sourceCanvas,0,0,boardSize,boardSize);el('game-area').classList.add('done');
for(var b=0;b<3;b++)setTimeout(function(){fxBurst(boardX+Math.random()*boardSize,boardY+Math.random()*boardSize,22,4.5)},b*180);
var sec=Math.floor(elapsedMs/1000),total=gridSize*gridSize,reward=gridSize*15;
if(MP.active){MP.myFinished=true;mpSend({type:'finish',time:sec});var w=!MP.oppFinished;addCoins(reward);showEnd(w?'Победа':'Поражение',w?'Вы собрали первыми!':'Соперник быстрее.',0,reward);return}
var stars=1;if(moves<=total*1.7&&sec<=total*9)stars=3;else if(moves<=total*2.6&&sec<=total*16)stars=2;
if(currentLevel&&typeof currentLevel.id==='number'){saveLevelProgress(currentLevel.id,{stars:Math.max(currentLevel.stars||0,stars),completed:true});unlockNextLevels(currentLevel.id)}
addCoins(reward);showEnd('Победа','',stars,reward)}
function showEnd(title,sub,stars,reward){el('victory-title').textContent=title;el('victory-sub').textContent=sub;
el('victory-time').textContent=fmtTime(Math.floor(elapsedMs/1000));el('victory-moves').textContent=moves;
var box=el('victory-stars');box.innerHTML='';box.style.display=stars?'flex':'none';
for(var i=1;i<=3;i++)box.innerHTML+=STAR.replace('<svg','<svg class="'+(i<=stars?'filled':'')+'"');
el('victory-reward').classList.remove('hidden');el('victory-reward-n').textContent='+'+fmt(reward);
el('victory-next-btn').style.display=(MP.active||PX.lastMode)?'none':'flex';
el('screen-victory').classList.add('active');startConfetti();updateCoinsUI()}
function nextLevel(){audio.playClick();el('screen-victory').classList.remove('active');
var lv=getLevels(),i=lv.findIndex(function(l){return l.id===currentLevel.id});var n=i>=0?lv[i+1]:null;
if(n&&!n.locked)selectLevel(n);else showScreen('screen-gallery')}
function startConfetti(){var cv=el('confetti-canvas'),c=cv.getContext('2d');cv.width=innerWidth;cv.height=innerHeight;
var cols=['#8FA0FF','#E8EAF2','#6EE7B7','#B7BFF9','#5560E8'],ps=[];
for(var i=0;i<130;i++)ps.push({x:Math.random()*cv.width,y:-Math.random()*cv.height,vx:(Math.random()-.5)*6,vy:2+Math.random()*4,size:3+Math.random()*7,rot:Math.random()*360,vr:(Math.random()-.5)*10,color:cols[Math.floor(Math.random()*cols.length)],round:Math.random()>.5});
var fr;function an(){c.clearRect(0,0,cv.width,cv.height);var al=false;
for(var i=0;i<ps.length;i++){var p=ps[i];p.x+=p.vx;p.y+=p.vy;p.vy+=.09;p.rot+=p.vr;if(p.y<cv.height+40)al=true;
c.save();c.translate(p.x,p.y);c.rotate(p.rot*Math.PI/180);c.fillStyle=p.color;
if(p.round){c.beginPath();c.arc(0,0,p.size/2,0,Math.PI*2);c.fill()}else c.fillRect(-p.size/2,-p.size/4,p.size,p.size/2);c.restore()}
if(al)fr=requestAnimationFrame(an)}
an();setTimeout(function(){cancelAnimationFrame(fr);c.clearRect(0,0,cv.width,cv.height)},5000)}

/* ---------- MULTIPLAYER ---------- */
var MP={active:false,conn:null,peer:null,isHost:false,code:null,grid:4,oppPct:0,oppFinished:false,myFinished:false,jt:null};
var MP_A='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function mpGen(){var s='';for(var i=0;i<4;i++)s+=MP_A[Math.floor(Math.random()*MP_A.length)];return s}
function mpId(c){return 'puzzle-master-ru-'+c}
function openMulti(){if(typeof Peer==='undefined'){toast('Нужен интернет при запуске');return}showScreen('screen-multi');el('multi-lobby').classList.remove('hidden');el('multi-room').classList.add('hidden');el('multi-status').textContent=''}
function leaveMulti(){mpSend({type:'bye'});mpReset();showScreen('screen-menu')}
function mpCreate(){audio.playClick();el('multi-status').textContent='Создание…';MP.code=mpGen();MP.isHost=true;MP.peer=new Peer(mpId(MP.code),{debug:0});mpBind();
var ch=el('multi-grid-chips').querySelectorAll('.chip');for(var i=0;i<ch.length;i++)ch[i].onclick=function(){var a=el('multi-grid-chips').querySelectorAll('.chip');for(var k=0;k<a.length;k++)a[k].classList.remove('active');this.classList.add('active');MP.grid=parseInt(this.getAttribute('data-grid'),10);audio.playClick()}}
function mpBind(){MP.peer.on('open',function(){el('multi-lobby').classList.add('hidden');el('multi-room').classList.remove('hidden');el('multi-code').textContent=MP.code;el('multi-room-status').textContent='Ожидание соперника…';el('multi-start-btn').classList.add('hidden');
if(window.QRCode)QRCode.toCanvas(el('multi-qr'),MP.code,{width:150,margin:1,color:{dark:'#E8EAF2',light:'#0B0C12'}}).catch(function(){})});
MP.peer.on('connection',function(c){MP.conn=c;mpSetup();el('multi-room-status').textContent='Соперник подключён';el('multi-start-btn').classList.remove('hidden')});
MP.peer.on('error',function(err){if(err&&err.type==='unavailable-id'){try{MP.peer.destroy()}catch(e){}MP.code=mpGen();MP.peer=new Peer(mpId(MP.code),{debug:0});mpBind()}else el('multi-status').textContent='Ошибка сети'})}
function mpJoin(){audio.playClick();var code=(el('multi-code-input').value||'').trim().toUpperCase();
if(code.length!==4){el('multi-status').textContent='Код из 4 символов';return}
el('multi-status').textContent='Подключение…';MP.isHost=false;MP.code=code;MP.peer=new Peer({debug:0});
MP.jt=setTimeout(function(){if(!MP.conn||!MP.conn.open){el('multi-status').textContent='Не удалось подключиться';try{MP.peer.destroy()}catch(e){}el('multi-room').classList.add('hidden');el('multi-lobby').classList.remove('hidden')}},8000);
MP.peer.on('open',function(){MP.conn=MP.peer.connect(mpId(code),{reliable:true});
MP.conn.on('open',function(){clearTimeout(MP.jt);mpSetup();el('multi-lobby').classList.add('hidden');el('multi-room').classList.remove('hidden');el('multi-code').textContent=code;el('multi-grid-chips').style.display='none';el('multi-start-btn').classList.add('hidden');el('multi-room-status').textContent='Ожидание старта…'})});
MP.peer.on('error',function(err){clearTimeout(MP.jt);el('multi-room').classList.add('hidden');el('multi-lobby').classList.remove('hidden');el('multi-status').textContent=err&&err.type==='peer-unavailable'?'Комната не найдена':'Ошибка'})}
function mpSetup(){MP.conn.on('data',mpData);MP.conn.on('close',function(){if(MP.active)mpAlert('Соперник вышел');MP.conn=null;MP.active=false;el('mp-bars').classList.add('hidden')})}
function mpSend(d){if(MP.conn&&MP.conn.open){try{MP.conn.send(d)}catch(e){}}}
function mpData(d){if(!d||typeof d!=='object')return;
if(d.type==='start'&&!MP.isHost){var b=new Blob([d.image],{type:'image/jpeg'});initGame({grid:d.grid,level:{id:'mp',name:'Versus',category:'mp',image:URL.createObjectURL(b),locked:false},mp:true})}
else if(d.type==='progress'){MP.oppPct=d.pct;el('mp-opp').style.width=d.pct+'%';el('mp-opp-pct').textContent=d.pct+'%'}
else if(d.type==='finish'){MP.oppFinished=true;if(!MP.myFinished)mpAlert('Соперник собрал!')}
else if(d.type==='bye'){if(MP.active)mpAlert('Соперник вышел');MP.active=false;el('mp-bars').classList.add('hidden')}}
function updateMPBars(p){el('mp-you').style.width=p+'%';el('mp-you-pct').textContent=p+'%'}
function mpAlert(t){var a=el('mp-alert');a.textContent=t;a.classList.remove('hidden');setTimeout(function(){a.classList.add('hidden')},4000)}
function mpStart(){if(!MP.conn||!MP.conn.open)return;audio.playClick();
var pool=getLevels().filter(function(l){return !l.locked});var lv=pool[Math.floor(Math.random()*pool.length)]||LEVELS[0];
var img=new Image();img.crossOrigin='anonymous';
img.onload=function(){var side=Math.min(img.naturalWidth,img.naturalHeight);var c=document.createElement('canvas');c.width=560;c.height=560;
c.getContext('2d').drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,560,560);
c.toBlob(function(bl){bl.arrayBuffer().then(function(ab){mpSend({type:'start',grid:MP.grid,image:ab});initGame({grid:MP.grid,level:{id:'mp',name:lv.name,category:'mp',image:URL.createObjectURL(bl),locked:false},mp:true})})},'image/jpeg',.72)};
img.onerror=function(){el('multi-room-status').textContent='Ошибка картинки'};img.src=lv.image}
function mpReset(){clearTimeout(MP.jt);MP.active=false;MP.oppPct=0;MP.oppFinished=false;MP.myFinished=false;
if(MP.conn){try{MP.conn.close()}catch(e){}MP.conn=null}if(MP.peer){try{MP.peer.destroy()}catch(e){}MP.peer=null}el('multi-grid-chips').style.display='flex'}
window.addEventListener('beforeunload',function(){mpSend({type:'bye'})});

/* ---------- ПИКСЕЛЬ-АРТ ---------- */
var PAL_M=['#0B0C12','#1E2130','#3A3F58','#64748B','#FFFFFF','#F87171','#DC2626','#FF9F43','#FECA57','#A16207','#6EE7B7','#10B981','#1DD3B0','#0EA5E9','#5560E8','#7C8CFF','#F472B6','#8B5CF6','#D97706','#78350F'];
var PAL_RGB=PAL_M.map(function(h){return[parseInt(h.substr(1,2),16),parseInt(h.substr(3,2),16),parseInt(h.substr(5,2),16)]});
function genPlanet(c,N){var g=c.createLinearGradient(0,0,0,N);g.addColorStop(0,'#0B0C12');g.addColorStop(1,'#1E2130');c.fillStyle=g;c.fillRect(0,0,N,N);
c.fillStyle='rgba(139,92,246,.25)';c.beginPath();c.arc(N*.75,N*.25,N*.22,0,7);c.fill();
for(var i=0;i<N*1.6;i++){c.fillStyle=Math.random()<.7?'#FFFFFF':'#7C8CFF';c.fillRect(Math.random()*N|0,Math.random()*N|0,1,1)}
var cx=N*.5,cy=N*.46,r=N*.26,pg=c.createRadialGradient(cx-r*.4,cy-r*.4,r*.2,cx,cy,r);
pg.addColorStop(0,'#FF9F43');pg.addColorStop(.6,'#DC2626');pg.addColorStop(1,'#78350F');c.fillStyle=pg;c.beginPath();c.arc(cx,cy,r,0,7);c.fill();
c.fillStyle='rgba(161,98,7,.8)';c.fillRect(cx-r,cy-r*.2,r*2,r*.18);
c.strokeStyle='#FECA57';c.lineWidth=N*.03;c.save();c.translate(cx,cy);c.rotate(-.4);c.beginPath();c.ellipse(0,0,r*1.6,r*.5,0,0,7);c.stroke();c.restore();
c.fillStyle='#64748B';c.beginPath();c.arc(N*.16,N*.18,N*.05,0,7);c.fill()}
function genRocket(c,N){var g=c.createLinearGradient(0,0,0,N);g.addColorStop(0,'#0B0C12');g.addColorStop(1,'#1E2130');c.fillStyle=g;c.fillRect(0,0,N,N);
for(var i=0;i<N*1.6;i++){c.fillStyle=Math.random()<.7?'#FFFFFF':'#7C8CFF';c.fillRect(Math.random()*N|0,Math.random()*N|0,1,1)}
var cx=N*.5,w=N*.16,top=N*.16,bot=N*.66;
c.fillStyle='#DC2626';c.beginPath();c.moveTo(cx,top-N*.08);c.lineTo(cx-w,top+N*.1);c.lineTo(cx+w,top+N*.1);c.fill();
c.fillStyle='#FFFFFF';c.fillRect(cx-w,top+N*.1,w*2,bot-top-N*.1);
c.fillStyle='#64748B';c.fillRect(cx,top+N*.1,w,bot-top-N*.1);
c.fillStyle='#0EA5E9';c.beginPath();c.arc(cx,top+N*.2,w*.55,0,7);c.fill();
c.fillStyle='#DC2626';c.beginPath();c.moveTo(cx-w,bot-N*.14);c.lineTo(cx-w*1.9,bot);c.lineTo(cx-w,bot);c.fill();
c.beginPath();c.moveTo(cx+w,bot-N*.14);c.lineTo(cx+w*1.9,bot);c.lineTo(cx+w,bot);c.fill();
c.fillStyle='#FF9F43';c.beginPath();c.moveTo(cx-w*.7,bot);c.lineTo(cx,bot+N*.2);c.lineTo(cx+w*.7,bot);c.fill();
c.fillStyle='#FECA57';c.beginPath();c.moveTo(cx-w*.4,bot);c.lineTo(cx,bot+N*.12);c.lineTo(cx+w*.4,bot);c.fill()}
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
for(var x=1;x<=4;x++)c.qu