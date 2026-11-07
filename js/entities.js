/* =====================================================================
   js/entities.js : Pemain, Musuh (termasuk bos), dan Pickup (orb)
   Dipakai oleh combat.js dan game.js.

   Player : x y aim element elem2 weapon hp mp level atkMult def sub
            update(dt, ax, ay)  draw(ctx, camX, camY, t)
            canAttack() useAttack()  canSkill() useSkill()  currentCombo() cycleElement()
            dash(ax, ay)  hurt(dmg, opts)  heal(n)  spendMp(n)  addXp(n)
   Enemy  : x y hp maxHp atk dead data
            update(dt, player)  draw(ctx, camX, camY, t)
            hurt(dmg, opts)  addStatus(name, detik)  has(name)
            boss: e.spawnRequests = [{type,x,y}] dibaca game.js
   Enemy memanggil (ada di combat.js):
            Combat.enemyShot(enemy, sudut, {speed, dmg, color, size})
            Combat.enemyAoe(enemy, x, y, radius, dmg, tunda, warna[])
   opts hurt: {kx, ky} dorongan, {dot:true} damage berkala, {ignoreInvuln:true}
   ===================================================================== */
'use strict';

/* ---------- Bantuan ---------- */
function dirFromAngle(a) {
