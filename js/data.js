/* ============================================================
   AETHERIA : Echoes of the Five Elements  -  DATA
   Semua angka karakter / monster / 40 kekuatan ada di sini.
   ============================================================ */
'use strict';

/* ---------- Karakter (HP, MP, EXP, pasif dipegang tiap karakter) ---------- */
const CHAR_ORDER = ['Arcelia','Azarel','Draven','Guts','Isolde','Lunaria','Sylas','Xaviera'];

const CHAR_STATS = {
  Arcelia:{ title:'Rapier Duelist', elem:'Angin', color:'#c59bff',
    hp:95,  mp:70,  atk:15, def:2, spd:112, aspd:1.50, crit:.18, cdmg:1.60, hpG:13, mpG:5, atkG:2.6, defG:.7, expMul:1.00, expBase:34,
    basic:{ range:58, arc:70,  frames:[0,5], hit:2, type:'line', fx:'thrust', sfx:'dagger' },
    passive:{ name:"Duelist's Instinct", desc:'Serangan ke musuh yang HP-nya di atas 80% punya +25% peluang kritis. Setiap kritis memangkas cooldown skill 0.4 dtk.' } },
  Azarel:{ title:'Longsword Paladin', elem:'Cahaya', color:'#ffe58a',
    hp:120, mp:80,  atk:16, def:4, spd:100, aspd:1.20, crit:.10, cdmg:1.50, hpG:16, mpG:6, atkG:2.7, defG:.9, expMul:1.00, expBase:36,
    basic:{ range:64, arc:110, frames:[0,5], hit:2, type:'cone', fx:'sword-slash', sfx:'sword2' },
    passive:{ name:'Celestial Resolve', desc:'Saat HP di bawah 50%: DEF +30% dan regenerasi HP 1.5% per detik.' } },
  Draven:{ title:'Dragon Spear Knight', elem:'Api', color:'#ff8a4a',
    hp:125, mp:55,  atk:17, def:4, spd:100, aspd:1.15, crit:.12, cdmg:1.55, hpG:17, mpG:4, atkG:2.9, defG:.9, expMul:.95, expBase:36,
    basic:{ range:74, arc:60,  frames:[0,6], hit:3, type:'line', fx:'thrust', sfx:'sword1' },
    passive:{ name:"Dragon's Blood", desc:'Setiap kill memulihkan 3% HP maks dan menambah ATK +2% (maks 10 tumpukan, 8 dtk).' } },
  Guts:{ title:'Scimitar & Kite Shield', elem:'Tanah', color:'#b8c4d6',
    hp:160, mp:45,  atk:14, def:8, spd:92,  aspd:1.10, crit:.08, cdmg:1.50, hpG:21, mpG:3, atkG:2.3, defG:1.3, expMul:1.05, expBase:38,
    basic:{ range:60, arc:120, frames:[0,5], hit:2, type:'cone', fx:'sword-slash', sfx:'sword3' },
    passive:{ name:'Unbreakable Will', desc:'Damage yang diterima -15%. Sekali tiap 60 dtk bertahan di 1 HP dari serangan mematikan.' } },
  Isolde:{ title:'Katana Shadow-Blade', elem:'Bulan', color:'#9ad0ff',
    hp:100, mp:60,  atk:16, def:2, spd:108, aspd:1.40, crit:.20, cdmg:1.70, hpG:13, mpG:5, atkG:2.8, defG:.6, expMul:1.00, expBase:34,
    basic:{ range:62, arc:90,  frames:[0,5], hit:2, type:'cone', fx:'sword-slash', sfx:'sword1' },
    passive:{ name:'Blade of Silence', desc:'Kecepatan gerak +12%. Setiap serangan ke-5 pasti kritis dan menembus pertahanan musuh.' } },
  Lunaria:{ title:'Lunar Longsword', elem:'Bulan', color:'#d8e6ff',
    hp:105, mp:110, atk:13, def:3, spd:102, aspd:1.20, crit:.12, cdmg:1.50, hpG:14, mpG:8, atkG:2.3, defG:.8, expMul:1.10, expBase:36,
    basic:{ range:64, arc:110, frames:[0,5], hit:2, type:'cone', fx:'sword-slash', sfx:'sword2' },
    passive:{ name:'Lunar Resonance', desc:'Regenerasi MP +50%, damage skill +15%. Tiap skill karakter dipakai memulihkan 5% HP.' } },
  Sylas:{ title:'Whip Predator', elem:'Bayangan', color:'#ff7ad9',
    hp:110, mp:70,  atk:14, def:3, spd:104, aspd:1.25, crit:.14, cdmg:1.50, hpG:15, mpG:5, atkG:2.5, defG:.8, expMul:1.00, expBase:35,
    basic:{ range:96, arc:50,  frames:[0,5], hit:3, type:'line', fx:'whip-crack', sfx:'dagger' },
    passive:{ name:"Predator's Reach", desc:'Jangkauan serangan +25%. Damage +15% ke musuh dengan HP di bawah 50%.' } },
  Xaviera:{ title:'Crystal Arcanist', elem:'Kristal', color:'#7ef0ff',
    hp:85,  mp:130, atk:15, def:1, spd:98,  aspd:1.10, crit:.12, cdmg:1.50, hpG:11, mpG:9, atkG:2.7, defG:.5, expMul:1.15, expBase:36,
    basic:{ range:230, arc:0, frames:[0,6], hit:4, type:'bolt', fx:null, sfx:'laser' },
    passive:{ name:'Crystal Convergence', desc:'Setiap serangan dasar menambah 1 pecahan kristal. Di 5 pecahan, skill berikutnya +50% damage.' } },
};

/* ---------- Skill karakter (3 per karakter, CD & durasi dari file data JSON) ---------- */
/* shape: line|cone|circle|bolt|shield|comet     pulses: frac waktu tiap pukulan
   fx: {id, at(frac), where:self|front|target|rand, s:scale, rot:true} */
const CHAR_SKILLS = {
 Arcelia:[
  { dmg:2.6, mp:8,  shape:'line',  len:100, wid:34, pulses:[.25,.4,.55,.7],
    fx:[{id:'thrust',at:.25,where:'front',s:1,rot:true},{id:'thrust',at:.55,where:'front',s:1,rot:true}], sfx:'dagger' },
  { dmg:3.4, mp:14, shape:'line',  len:90,  wid:40, pulses:[.62], dash:{d:150,a:0,b:.5},
    fx:[{id:'poof',at:0,where:'self',s:.6},{id:'thrust',at:.62,where:'front',s:1.15,rot:true}], sfx:'laser' },
  { dmg:10,  mp:30, shape:'circle',r:118, pulses:[.2,.32,.44,.56,.68,.8],
    fx:[{id:'mana-burst',at:.1,where:'self',s:.9},{id:'spin-slash',at:.3,where:'self',s:1.1},{id:'spin-slash',at:.55,where:'self',s:1.3},{id:'mana-burst',at:.8,where:'self',s:1.1}], sfx:'exp' } ],
 Azarel:[
  { dmg:3.2, mp:8,  shape:'cone',  len:92,  arc:130, pulses:[.5,.7],
    fx:[{id:'sword-slash',at:.5,where:'front',s:1.3,rot:true},{id:'sword-slash',at:.7,where:'front',s:1.3,rot:true}], sfx:'sword2' },
  { dmg:4.4, mp:15, shape:'circle',r:92, pulses:[.7], dash:{d:90,a:.1,b:.55},
    fx:[{id:'ground-slam',at:.68,where:'self',s:.55}], sfx:'exp' },
  { dmg:11,  mp:32, shape:'circle',r:135, pulses:[.28,.4,.52,.64,.76],
    fx:[{id:'holy-pillar',at:.25,where:'rand',s:.8},{id:'holy-pillar',at:.4,where:'rand',s:.8},{id:'smite',at:.55,where:'rand',s:.9},{id:'holy-pillar',at:.7,where:'self',s:1}], sfx:'power' } ],
 Draven:[
  { dmg:2.8, mp:8,  shape:'line',  len:118, wid:36, pulses:[.35,.5],
    fx:[{id:'thrust',at:.35,where:'front',s:1.2,rot:true}], sfx:'sword1' },
  { dmg:3.6, mp:15, shape:'cone',  len:96, arc:120, pulses:[.65], dash:{d:160,a:0,b:.5},
    fx:[{id:'fire-ring',at:.6,where:'self',s:.55}], sfx:'laser' },
  { dmg:10.5,mp:32, shape:'cone',  len:170, arc:80, pulses:[.2,.3,.4,.5,.6,.7,.8,.9],
    fx:[{id:'fire-breath',at:.18,where:'front',s:1.1,rot:true,loopSec:3.4},{id:'fire-ring',at:.85,where:'self',s:.8}], sfx:'exp' } ],
 Guts:[
  { dmg:3.2, mp:8,  shape:'cone',  len:84,  arc:130, pulses:[.45],
    fx:[{id:'sword-slash',at:.4,where:'front',s:1.3,rot:true}], sfx:'sword3' },
  { dmg:1.8, mp:14, shape:'shield',r:78, pulses:[.3,.6], shieldDur:3, dr:.7,
    fx:[{id:'divine-shield',at:0,where:'self',s:1.2,loopSec:3}], sfx:'power' },
  { dmg:10,  mp:32, shape:'circle',r:140, pulses:[.3,.45,.6,.75], stun:1.5,
    fx:[{id:'ground-slam',at:.3,where:'self',s:.7},{id:'quake',at:.5,where:'self',s:.9},{id:'ground-slam',at:.75,where:'self',s:.85}], sfx:'exp' } ],
 Isolde:[
  { dmg:2.9, mp:8,  shape:'line',  len:125, wid:34, pulses:[.55], critBonus:.3,
    fx:[{id:'sword-slash',at:.5,where:'front',s:1.3,rot:true}], sfx:'sword1' },
  { dmg:3.8, mp:14, shape:'circle',r:86, pulses:[.3,.7],
    fx:[{id:'spin-slash',at:.28,where:'self',s:.95},{id:'spin-slash',at:.68,where:'self',s:.95}], sfx:'sword2' },
  { dmg:10.5,mp:30, shape:'circle',r:125, pulses:[.12,.22,.32,.42,.52,.62,.72,.82],
    fx:[{id:'poof',at:0,where:'self',s:.6},{id:'sword-slash',at:.15,where:'rand',s:1.2},{id:'sword-slash',at:.3,where:'rand',s:1.2},{id:'sword-slash',at:.45,where:'rand',s:1.2},{id:'sword-slash',at:.6,where:'rand',s:1.2},{id:'sword-slash',at:.75,where:'rand',s:1.2},{id:'poof',at:.9,where:'self',s:.6}], sfx:'sword3' } ],
 Lunaria:[
  { dmg:2.8, mp:8,  shape:'cone',  len:96,  arc:120, pulses:[.5],
    fx:[{id:'scythe-reap',at:.45,where:'front',s:1.1,rot:true}], sfx:'sword2' },
  { dmg:3.6, mp:15, shape:'comet', len:280, wid:36, pulses:[.5], speed:340,
    fx:[], sfx:'laser' },
  { dmg:10.5,mp:32, shape:'circle',r:150, pulses:[.25,.35,.45,.55,.65,.75],
    fx:[{id:'star-fall',at:.2,where:'self',s:1.2},{id:'star-fall',at:.5,where:'self',s:1.2}], sfx:'power' } ],
 Sylas:[
  { dmg:2.7, mp:8,  shape:'line',  len:135, wid:42, pulses:[.45],
    fx:[{id:'whip-crack',at:.4,where:'front',s:1.3,rot:true}], sfx:'dagger' },
  { dmg:2.2, mp:14, shape:'circle',r:104, pulses:[.45], stun:2, pull:true,
    fx:[{id:'grasping-hands',at:.3,where:'self',s:.9}], sfx:'power' },
  { dmg:11,  mp:32, shape:'circle',r:150, pulses:[.22,.32,.42,.52,.62,.72,.82,.9],
    fx:[{id:'shadow-tendrils',at:.15,where:'rand',s:.9},{id:'shadow-tendrils',at:.3,where:'rand',s:.9},{id:'shadow-tendrils',at:.45,where:'rand',s:.9},{id:'shadow-tendrils',at:.6,where:'rand',s:.9},{id:'shadow-tendrils',at:.75,where:'rand',s:.9}], sfx:'exp' } ],
 Xaviera:[
  { dmg:3.0, mp:8,  shape:'bolt',  count:3, spread:.28, pulses:[.55], speed:300, range:300,
    fx:[], sfx:'laser' },
  { dmg:1.5, mp:15, shape:'shield',r:90, pulses:[.5], shieldDur:3.5, absorb:.4,
    fx:[{id:'divine-shield',at:0,where:'self',s:1.3,loopSec:3.5}], sfx:'power' },
  { dmg:12,  mp:34, shape:'circle',r:155, pulses:[.12,.2,.28,.36,.44,.52,.6,.68,.76,.84],
    fx:[{id:'star-fall',at:.1,where:'self',s:1.3},{id:'ice-spikes',at:.3,where:'rand',s:.8},{id:'ice-spikes',at:.45,where:'rand',s:.8},{id:'star-fall',at:.55,where:'self',s:1.3},{id:'ice-spikes',at:.7,where:'rand',s:.8}], sfx:'exp' } ],
};

/* ---------- Monster ---------- */
const MONSTERS = {
  Undead:  { sheet:'Undead',   hp:36,  atk:8,  def:0, spd:38, xp:6,   r:9,  scale:1.0,  minLv:1,  w:60, fade:25, tier:'Normal', range:20 },
  Skeleton:{ sheet:'Skeleton', hp:48,  atk:10, def:1, spd:44, xp:9,   r:9,  scale:1.0,  minLv:2,  w:32, fade:30, tier:'Normal', range:22 },
  Orc:     { sheet:'Orc',      hp:120, atk:14, def:3, spd:42, xp:24,  r:11, scale:1.12, minLv:5,  w:18, fade:22, tier:'Unik',   range:24 },
  Lizard:  { sheet:'Lizard',   hp:90,  atk:13, def:2, spd:64, xp:20,  r:11, scale:1.0,  minLv:6,  w:16, fade:20, tier:'Unik',   range:24 },
  Cyclops: { sheet:'Cyclops',  hp:330, atk:22, def:5, spd:36, xp:70,  r:15, scale:1.45, minLv:9,  w:7,  fade:12, tier:'Unik',   range:30 },
  Minotour:{ sheet:'Minotour', hp:720, atk:30, def:8, spd:48, xp:160, r:17, scale:1.6,  minLv:12, w:3,  fade:8,  tier:'Boss',   range:34 },
};

/* ---------- 40 KEKUATAN ----------
   type: passive | active | curse     per-level parameter dihitung di game.js (fungsi lv) */
const POWERS = [
 // ===== PASSIVE (1-15)
 {id:1, type:'passive', name:'Eternal Vitality',  icon:'❤',  desc:'Regenerasi HP perlahan saat 3 dtk tidak diserang.', lvDesc:l=>`+${(1.2+.5*l).toFixed(1)}% HP maks / dtk`},
 {id:2, type:'passive', name:'Mana Reservoir',    icon:'💧', desc:'Kapasitas MP maksimum meningkat.', lvDesc:l=>`MP maks +${20+8*l}%`},
 {id:3, type:'passive', name:'Berserker Instinct',icon:'🔥', desc:'ATK naik saat HP di bawah 40%.', lvDesc:l=>`ATK +${25+8*l}%`},
 {id:4, type:'passive', name:'Iron Fortress',     icon:'🛡', desc:'DEF naik saat HP di atas 70%.', lvDesc:l=>`DEF +${30+10*l}%`},
 {id:5, type:'passive', name:'Swift Reflex',      icon:'💨', desc:'Gerak lebih cepat & pemulihan dash lebih singkat.', lvDesc:l=>`Gerak +${8+3*l}%, CD dash -${10+4*l}%`},
 {id:6, type:'passive', name:'Critical Vision',   icon:'👁', desc:'Peluang serangan kritis meningkat.', lvDesc:l=>`Kritis +${6+3*l}%`},
 {id:7, type:'passive', name:'Soul Absorption',   icon:'👻', desc:'Memulihkan sebagian HP saat mengalahkan musuh.', lvDesc:l=>`+${(2+.8*l).toFixed(1)}% HP per kill`},
 {id:8, type:'passive', name:'Elemental Harmony', icon:'☯',  desc:'Mengurangi konsumsi MP untuk kemampuan.', lvDesc:l=>`Biaya MP -${12+4*l}%`},
 {id:9, type:'passive', name:"Predator's Mark",   icon:'🎯', desc:'Serangan ke musuh HP rendah (<35%) lebih kuat.', lvDesc:l=>`Damage +${15+5*l}%`},
 {id:10,type:'passive', name:'Phantom Step',      icon:'🌫', desc:'Peluang menghindari serangan biasa otomatis.', lvDesc:l=>`Hindar ${8+3*l}%`},
 {id:11,type:'passive', name:'Unbreakable Will',  icon:'⛓', desc:'Mengurangi durasi stun dan slow.', lvDesc:l=>`Durasi -${30+10*l}%`},
 {id:12,type:'passive', name:'Arcane Precision',  icon:'🏹', desc:'Serangan jarak jauh & skill proyektil lebih efektif.', lvDesc:l=>`Damage jarak jauh +${15+6*l}%, kritis +${2*l}%`},
 {id:13,type:'passive', name:'Guardian Spirit',   icon:'🕊', desc:'Perisai tambahan saat HP kritis (<25%), CD 40 dtk.', lvDesc:l=>`Perisai ${20+5*l}% HP maks`},
 {id:14,type:'passive', name:'Blood Momentum',    icon:'🩸', desc:'Serangan beruntun menambah ATK sementara.', lvDesc:l=>`ATK +${3+l}% per tumpukan (maks ${4+l}x)`},
 {id:15,type:'passive', name:'Eternal Focus',     icon:'🧘', desc:'Regenerasi MP meningkat saat tidak memakai skill.', lvDesc:l=>`MP regen +${40+15*l}%`},
 // ===== ACTIVE (16-30)
 {id:16,type:'active', name:'Infernal Burst',  icon:'🔥', cd:8,  mp:14, desc:'Ledakan api di sekitar karakter, serangan area.', lvDesc:l=>`${(2+.4*l).toFixed(1)}x ATK, radius ${90+8*l}`},
 {id:17,type:'active', name:'Frost Prison',    icon:'❄',  cd:12, mp:16, desc:'Membekukan musuh di area untuk sementara.', lvDesc:l=>`Beku ${(1.6+.3*l).toFixed(1)} dtk, ${(1.2+.3*l).toFixed(1)}x ATK`},
 {id:18,type:'active', name:'Thunder Dash',    icon:'⚡', cd:7,  mp:10, desc:'Melesat secepat kilat, menyambar musuh di jalur.', lvDesc:l=>`${(2+.4*l).toFixed(1)}x ATK, jarak ${150+10*l}`},
 {id:19,type:'active', name:'Earth Shatter',   icon:'🪨', cd:10, mp:14, desc:'Menghantam tanah, retakan batu menyerang & menahan musuh.', lvDesc:l=>`${(2.4+.5*l).toFixed(1)}x ATK + stun 1 dtk`},
 {id:20,type:'active', name:'Wind Reaper',     icon:'🌙', cd:6,  mp:9,  desc:'Tebasan angin bulan sabit yang menembus musuh.', lvDesc:l=>`${(1.8+.4*l).toFixed(1)}x ATK menembus`},
 {id:21,type:'active', name:'Abyssal Chains',  icon:'⛓', cd:11, mp:15, desc:'Rantai energi mengikat dan menarik musuh terdekat.', lvDesc:l=>`${2+l} musuh diikat ${(1.6+.2*l).toFixed(1)} dtk`},
 {id:22,type:'active', name:'Celestial Spear', icon:'✨', cd:9,  mp:14, desc:'Tombak energi dari langit menghantam satu titik.', lvDesc:l=>`${(3.4+.7*l).toFixed(1)}x ATK titik tunggal`},
 {id:23,type:'active', name:'Blood Nova',      icon:'🩸', cd:13, mp:0,  desc:'Korbankan 10% HP untuk ledakan energi darah.', lvDesc:l=>`${(4+.8*l).toFixed(1)}x ATK, radius ${120+8*l}`},
 {id:24,type:'active', name:'Phantom Clone',   icon:'👥', cd:18, mp:18, desc:'Bayangan meniru serangan karakter selama beberapa detik.', lvDesc:l=>`${(6+l).toFixed(0)} dtk, damage ${45+8*l}%`},
 {id:25,type:'active', name:'Gravity Collapse',icon:'🌀', cd:14, mp:20, desc:'Medan gravitasi menarik musuh ke satu titik lalu runtuh.', lvDesc:l=>`${(2.6+.5*l).toFixed(1)}x ATK, radius ${130+10*l}`},
 {id:26,type:'active', name:'Soul Requiem',    icon:'💀', cd:12, mp:16, desc:'Gelombang energi spiritual menyerang banyak musuh.', lvDesc:l=>`${(2.2+.4*l).toFixed(1)}x ATK, radius ${150+10*l}`},
 {id:27,type:'active', name:'Void Rift',       icon:'🌌', cd:15, mp:22, desc:'Portal kehampaan yang terus menghisap dan melukai musuh.', lvDesc:l=>`${(4+l).toFixed(0)} dtk, ${(1+.2*l).toFixed(1)}x ATK/tick`},
 {id:28,type:'active', name:"Dragon's Roar",   icon:'🐉', cd:12, mp:18, desc:'Gelombang api naga menerjang ke depan.', lvDesc:l=>`${(3+.6*l).toFixed(1)}x ATK, jarak ${140+10*l}`},
 {id:29,type:'active', name:'Divine Barrier',  icon:'🔰', cd:20, mp:18, desc:'Perisai yang menyerap sejumlah serangan musuh.', lvDesc:l=>`Serap ${30+8*l}% HP maks, ${(5+l)} dtk`},
 {id:30,type:'active', name:'Meteor Fall',     icon:'☄',  cd:16, mp:26, desc:'Memanggil meteor dari langit menghancurkan area.', lvDesc:l=>`${(5+1*l).toFixed(0)}x ATK, radius ${100+8*l}`},
 // ===== CURSE (31-40)  gain / sacrifice
 {id:31,type:'curse', name:'Curse of Gluttony',      icon:'🍖', gain:'ATK naik tiap kill beruntun.', cost:'Regenerasi & pemulihan HP berkurang drastis.', lvDesc:l=>`+${3+l}% ATK per kill (maks 12), HP regen -${60+5*l}%`},
 {id:32,type:'curse', name:'Curse of Frailty',       icon:'🥀', gain:'Critical Damage meningkat signifikan.', cost:'DEF maksimum berkurang.', lvDesc:l=>`Crit DMG +${50+15*l}%, DEF -${45}%`},
 {id:33,type:'curse', name:'Curse of the Hollow Soul',icon:'🕳', gain:'Kapasitas MP & kekuatan skill naik.', cost:'HP maksimum berkurang.', lvDesc:l=>`MP +${40+10*l}%, skill +${20+8*l}%, HP -35%`},
 {id:34,type:'curse', name:'Curse of Eternal Hunger',icon:'🦷', gain:'Memulihkan HP dari setiap serangan yang mengenai.', cost:'MP terus terkuras perlahan.', lvDesc:l=>`Curi HP ${4+l}%, MP -${(1.5).toFixed(1)}/dtk`},
 {id:35,type:'curse', name:'Curse of the Broken Wings',icon:'🪽',gain:'Kecepatan serangan meningkat.', cost:'Kecepatan gerak berkurang.', lvDesc:l=>`Kec. serang +${35+8*l}%, gerak -25%`},
 {id:36,type:'curse', name:'Curse of Blind Fate',    icon:'🎲', gain:'Peluang kritis meningkat drastis.', cost:'Akurasi serangan menurun.', lvDesc:l=>`Kritis +${25+5*l}%, meleset 25%`},
 {id:37,type:'curse', name:'Curse of the Last Breath',icon:'⏳',gain:'ATK & kecepatan naik makin HP rendah.', cost:'Tidak bisa memulihkan HP di atas 60%.', lvDesc:l=>`Hingga ATK +${50+10*l}%, kec. +${30+5*l}%`},
 {id:38,type:'curse', name:'Curse of the Frozen Heart',icon:'🧊',gain:'DEF & ketahanan efek negatif naik.', cost:'Kecepatan serangan berkurang.', lvDesc:l=>`DEF +${40+10*l}%, resist +50%, kec. serang -25%`},
 {id:39,type:'curse', name:'Curse of Sacrifice',     icon:'🩸', gain:'Skill memakai HP bukan MP, tapi jauh lebih kuat.', cost:'Tiap skill mengurangi HP.', lvDesc:l=>`Skill +${50+10*l}%, biaya ${Math.max(5,12-l)}% HP`},
 {id:40,type:'curse', name:'Curse of the Abyss',     icon:'🌑', gain:'Semua kemampuan elemen lebih kuat.', cost:'Semua pertahanan turun, regenerasi MP terhambat.', lvDesc:l=>`Skill +${30+10*l}%, DEF -40%, MP regen -70%`},
];
const POWER_BY_ID = {}; POWERS.forEach(p=>POWER_BY_ID[p.id]=p);
const POWER_MAXLV = 5;
const LIMITS = { passive:3, active:3, curse:1 };

/* efek visual (pixelfx) tiap kekuatan active */
const POWER_FX = {
  16:['fire-ring'], 17:['frost-nova'], 18:['chain-lightning','lightning-strike'], 19:['quake','earth-spike'],
  20:['scythe-reap'], 21:['grasping-hands'], 22:['smite'], 23:['small-explosion'],
  24:['poof'], 25:['implosion','black-hole'], 26:['plasma-explosion'], 27:['black-hole'],
  28:['fire-breath'], 29:['divine-shield'], 30:['meteor'],
};

/* ---------- SFX (file dari koleksi yang dikirim, tidak diubah) ---------- */
const SFX_FILES = {
  sword1:'Weapons/Melee/sfx_wpn_sword1.wav', sword2:'Weapons/Melee/sfx_wpn_sword2.wav', sword3:'Weapons/Melee/sfx_wpn_sword3.wav',
  dagger:'Weapons/Melee/sfx_wpn_dagger.wav', punch:'Weapons/Melee/sfx_wpn_punch2.wav',
  laser:'Weapons/Lasers/sfx_wpn_laser3.wav', laser2:'Weapons/Lasers/sfx_wpn_laser7.wav',
  hit1:'General Sounds/Simple Damage Sounds/sfx_damage_hit3.wav', hit2:'General Sounds/Simple Damage Sounds/sfx_damage_hit5.wav',
  hit3:'General Sounds/Simple Damage Sounds/sfx_damage_hit8.wav', crit:'General Sounds/Impacts/sfx_sounds_impact7.wav',
  hurt:'General Sounds/Negative Sounds/sfx_sounds_damage2.wav', exp:'Explosions/Shortest/sfx_exp_shortest_hard4.wav',
  expbig:'Explosions/Short/sfx_exp_short_hard8.wav', power:'General Sounds/Positive Sounds/sfx_sounds_powerup6.wav',
  levelup:'General Sounds/Fanfares/sfx_sounds_fanfare1.wav', pick:'General Sounds/Positive Sounds/sfx_sounds_powerup13.wav',
  curse:'General Sounds/Negative Sounds/sfx_sounds_negative1.wav', coin:'General Sounds/Coins/sfx_coin_single3.wav',
  menu:'General Sounds/Menu Sounds/sfx_menu_move2.wav', select:'General Sounds/Menu Sounds/sfx_menu_select2.wav',
  btn:'General Sounds/Buttons/sfx_sounds_button4.wav', die1:'Death Screams/Alien/sfx_deathscream_alien2.wav', die2:'Death Screams/Alien/sfx_deathscream_alien5.wav',
  dead:'Death Screams/Human/sfx_deathscream_human6.wav', dash:'Movement/Jumping and Landing/sfx_movement_jump12.wav', portal:'Movement/Portals and Transitions/sfx_movement_portal2.wav',
  error:'General Sounds/Negative Sounds/sfx_sounds_error5.wav', low:'General Sounds/Alarms/Low health Alarms/sfx_lowhealth_alarmloop2.wav',
  boss:'General Sounds/Fanfares/sfx_sounds_fanfare3.wav', block:'General Sounds/Impacts/sfx_sounds_impact3.wav',
};
