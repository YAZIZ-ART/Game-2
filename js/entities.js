/* =====================================================================
   js/entities.js : Pemain, Musuh (termasuk bos), dan Pickup (orb)
   Dipakai oleh combat.js dan game.js.

   Player : x y aim element weapon hp mp level atkMult m (efek pasif)
            update(dt, ax, ay)  draw(ctx, camX, camY, t)
            canAttack() useAttack()  canSkill() useSkill()  currentCombo() cycleElement()
            dash(ax, ay)  hurt(dmg, opts)  heal(n)  addXp(n)
   Enemy  : x y hp maxHp atk dead data
            update(dt, player)  draw(ctx, camX, camY, t)
            hurt(dmg, opts)  addStatus(name, detik)  has(name)
            boss: e.spawnRequests = [{type,x,y}] dibaca game.js
   Enemy memanggil (ada di combat.js):
            Combat.enemyShot(enemy, sudut, {speed, dmg, color, size, element})
            Combat.enemyAoe(enemy, x, y, radius, dmg, tunda, warna[])
   opts hurt: {kx, ky} dorongan, {dot:true} damage berkala, {st:[nama, detik]} status
   ===================================================================== */
'use strict';

const TAU2 = Math.PI * 2;

/* ---------- Bantuan ---------- */
function dirFromAngle(a) {
  const c = Math.cos(a), s = Math.sin(a);
  if (Math.abs(c) > Math.abs(s)) return c > 0 ? 'right' : 'left';
  return s > 0 ? 'down' : 'up';
}
function angDiff(a, b) {
  let d = a - b;
