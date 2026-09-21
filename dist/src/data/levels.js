const floor = (w) => ({ x: 0, y: 486, w, h: 54, kind: "floor" });

export const LEVELS = [
  {
    id: 1, name: "Plaza Mayor", subtitle: "Faroles entre la garúa", worldWidth: 3650,
    colors: ["#77849f", "#d8aa43", "#6d7c57"], timeBonus: 180,
    platforms: [floor(3650), {x:430,y:405,w:190,h:28},{x:760,y:350,w:170,h:28},{x:1070,y:418,w:240,h:28},{x:1510,y:380,w:150,h:28},{x:1820,y:325,w:190,h:28},{x:2210,y:405,w:220,h:28},{x:2620,y:350,w:170,h:28},{x:2940,y:300,w:180,h:28},{x:3260,y:390,w:170,h:28}],
    enemies: [{x:420,type:"thrower"},{x:680,type:"guard"},{x:1340,type:"pigeon"},{x:2050,type:"guard"},{x:2780,type:"pigeon"}], hazards: [{x:870,w:82},{x:2440,w:95}], goal: {x:3440,y:365}
  },
  {
    id: 2, name: "Puente de los Suspiros", subtitle: "Madera, flores y faroles", worldWidth: 4050,
    colors: ["#5c6881", "#c6813d", "#39726b"], timeBonus: 220,
    platforms: [floor(4050),{x:350,y:395,w:170,h:25},{x:650,y:328,w:150,h:25},{x:960,y:388,w:200,h:25},{x:1270,y:310,w:135,h:25},{x:1540,y:370,w:170,h:25},{x:1870,y:290,w:180,h:25},{x:2210,y:390,w:130,h:25},{x:2490,y:325,w:165,h:25},{x:2820,y:260,w:140,h:25},{x:3120,y:345,w:200,h:25},{x:3450,y:285,w:150,h:25},{x:3720,y:390,w:160,h:25}],
    enemies: [{x:560,type:"guard"},{x:1100,type:"pursuer"},{x:1460,type:"thrower"},{x:1750,type:"pigeon"},{x:2380,type:"guard"},{x:2760,type:"thrower"},{x:3060,type:"pursuer"}], hazards: [{x:810,w:140},{x:2050,w:150},{x:3330,w:105}], goal: {x:3860,y:365}
  },
  {
    id: 3, name: "Huaca al Amanecer", subtitle: "Piedra, altura y memoria", worldWidth: 4450,
    colors: ["#405070", "#b47645", "#887b50"], timeBonus: 260,
    platforms: [floor(4450),{x:330,y:400,w:140,h:24},{x:600,y:330,w:130,h:24},{x:870,y:255,w:145,h:24},{x:1170,y:350,w:115,h:24},{x:1400,y:280,w:170,h:24},{x:1730,y:390,w:120,h:24},{x:2010,y:315,w:130,h:24},{x:2280,y:235,w:160,h:24},{x:2620,y:340,w:130,h:24},{x:2890,y:270,w:125,h:24},{x:3150,y:390,w:145,h:24},{x:3440,y:310,w:150,h:24},{x:3740,y:245,w:140,h:24},{x:4050,y:360,w:190,h:24}],
    enemies: [{x:520,type:"pursuer"},{x:1080,type:"pigeon"},{x:1390,type:"thrower"},{x:1600,type:"guard"},{x:2180,type:"pursuer"},{x:2750,type:"pigeon"},{x:3040,type:"thrower"},{x:3370,type:"guard"},{x:3900,type:"pursuer"}], hazards: [{x:740,w:120},{x:1290,w:100},{x:1850,w:150},{x:2460,w:145},{x:3300,w:130}], goal: {x:4250,y:335}
  }
];

export const getLevel = id => structuredClone(LEVELS.find(x => x.id === id) || LEVELS[0]);
