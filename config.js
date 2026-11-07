const CHARACTERS = {};
WEAPON_DATA.forEach(function (w, i) {
  WEAPONS[w[0]] = {
    id: w[0], name: w[2], element: w[3],
    damage: 8 + (i % 6) * 2,
    range: 18 + (i % 5) * 6,
    speed: 0.35 + (i % 4) * 0.05
  };
  CHARACTERS[w[1].toLowerCase()] = {
    id: w[1].toLowerCase(), name: w[1], weapon: w[0], element: w[3],
    hp: 100 + (i % 5) * 10,
    mana: 60 + (i % 4) * 10,
    speed: 70 + (i % 3) * 5
  };
});
const CHARACTER_IDS = Object.keys(CHARACTERS);
const WEAPON_IDS = Object.keys(WEAPONS);

/* ---------- Musuh ---------- */
const ENEMIES = {
  slime:    { id: 'slime',    name: 'Slime',        element: 'air',   hp: 30,  damage: 4,  speed: 30, xp: 5 },
  imp:      { id: 'imp',      name: 'Imp Bara',     element: 'api',   hp: 40,  damage: 6,  speed: 45, xp: 8 },
  golem:    { id: 'golem',    name: 'Golem Batu',   element: 'tanah', hp: 90,  damage: 10, speed: 22, xp: 15 },
  wisp:     { id: 'wisp',     name: 'Wisp Kilat',   element: 'petir', hp: 35,  damage: 7,  speed: 55, xp: 10 },
  sylph:    { id: 'sylph',    name: 'Sylph Badai',  element: 'angin', hp: 45,  damage: 6,  speed: 60, xp: 10 },
  boss:     { id: 'boss',     name: 'Penjaga Lima Elemen', element: 'api', hp: 600, damage: 18, speed: 35, xp: 200 }
};
const ENEMY_IDS = Object.keys(ENEMIES);
