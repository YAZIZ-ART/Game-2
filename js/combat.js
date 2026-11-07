/* =====================================================================
   js/combat.js : serangan senjata, skill kombinasi elemen, proyektil, ledakan musuh
   Dipakai game.js:
     Combat.reset(world)       world = { player, enemies:[] } (objek yang sama sepanjang game)
     Combat.attack(player)     Combat.skill(player)
     Combat.update(dt)         Combat.draw(ctx, camX, camY, t, layer)   layer 0 = tanah, 1 = atas
   Dipakai entities.js:
     Combat.enemyShot(enemy, sudut, {speed, dmg, color, size, element})
     Combat.enemyAoe(enemy, x, y, radius, dmg, tunda, warna[])
   ===================================================================== */
'use strict';

const Combat = (function () {
  const TAU = Math.PI * 2;
  const SKILL_BASE = 18;                       // damage dasar skill (dikali dmg kombinasi dan atkMult)
  // musuh dengan elemen kiri lemah terhadap elemen kanan (+30% damage)
  const WEAK = { api: 'air', air: 'petir', petir: 'tanah', tanah: 'udara', udara: 'api' };

  let world = { player: null, enemies: [] };
  const projs = [];
  const aoes = [];
