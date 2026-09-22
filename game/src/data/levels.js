const floor = width => ({ x: 0, y: 486, w: width, h: 54, kind: "floor" });

export const WORLDS = [
  {
    id: 1, name: "Lima", subtitle: "El inicio de la aspirante", background: "lima", costume: "aspirant",
    colors: ["#77849f", "#d8aa43", "#6d7c57"], baseWidth: 3650, widthStep: 100,
    abilities: { skirt: true, fan: false, guitar: false }, reward: "fan",
    chapters: ["Plaza Mayor", "Jirón de la Unión", "Balcones de Lima", "Plaza San Martín"]
  },
  {
    id: 2, name: "Barranco", subtitle: "La etapa de pardilla", background: "barranco", costume: "novice",
    colors: ["#64758b", "#c68542", "#486d66"], baseWidth: 4700, widthStep: 120,
    abilities: { skirt: true, fan: true, guitar: false }, reward: "guitar",
    chapters: ["Plaza de Barranco", "Biblioteca Municipal", "Bajada de Baños", "Puente de los Suspiros"]
  },
  {
    id: 3, name: "Trujillo", subtitle: "La consagración tunera", background: "trujillo", costume: "tuna",
    colors: ["#7295b5", "#e1a843", "#65744d"], baseWidth: 5400, widthStep: 140,
    abilities: { skirt: true, fan: true, guitar: true }, reward: "regalia",
    chapters: ["Plazuela El Recreo", "Jirón Pizarro", "Casa Urquiaga", "Palacio Iturregui"]
  }
];

function buildPlatforms(width, world, chapter) {
  const count = 7 + world + Math.ceil(chapter / 2);
  const usable = width - 760;
  const platforms = [floor(width)];
  for (let index = 0; index < count; index++) {
    const wave = (index * 47 + chapter * 29 + world * 17) % 5;
    const x = 330 + Math.round((index + 0.35) * usable / count);
    const y = 410 - wave * 34 - (index % 3 === 2 ? 18 : 0);
    const w = 125 + ((index * 31 + chapter * 13) % 95);
    platforms.push({ x, y: Math.max(248, y), w, h: 24 + (index % 2) * 3 });
  }
  return platforms;
}

function buildHazards(width, world, chapter) {
  const count = Math.min(2 + world + Math.floor((chapter - 1) / 3), 7);
  return Array.from({ length: count }, (_, index) => {
    const section = width / (count + 1);
    return { x: Math.round(section * (index + 1) + ((chapter * 73 + index * 41) % 150) - 75), w: 70 + ((chapter + index * 17) % 65) };
  });
}

function buildEnemies(width, world, chapter) {
  const types = ["guard", "pigeon", "pursuer", "thrower"];
  const count = 3 + world + Math.ceil(chapter / 2);
  const start = 520;
  const span = width - 1050;
  return Array.from({ length: count }, (_, index) => ({
    x: Math.round(start + span * (index + 0.55) / count),
    type: types[(index + chapter + world) % types.length]
  }));
}

function createLevel(world, chapter) {
  const id = (world.id - 1) * 4 + chapter;
  const worldWidth = world.baseWidth + (chapter - 1) * world.widthStep;
  const isWorldFinal = chapter === 4;
  return {
    id, world: world.id, chapter, name: world.chapters[chapter - 1], worldName: world.name,
    subtitle: `${world.subtitle} · Capítulo ${chapter}/4`, background: world.background, costume: world.costume,
    abilities: { ...world.abilities }, reward: isWorldFinal ? world.reward : "flowers",
    colors: [...world.colors], worldWidth, timeBonus: Math.round(worldWidth / 17 + chapter * 7),
    platforms: buildPlatforms(worldWidth, world.id, chapter),
    enemies: buildEnemies(worldWidth, world.id, chapter),
    hazards: buildHazards(worldWidth, world.id, chapter),
    goal: { x: worldWidth - 210, y: 365 }, boss: world.id === 3 && chapter === 4
  };
}

export const LEVELS = WORLDS.flatMap(world => Array.from({ length: 4 }, (_, index) => createLevel(world, index + 1)));

export function getLevel(id) {
  const level = LEVELS.find(item => item.id === id) || LEVELS[0];
  return {
    ...level,
    abilities: { ...level.abilities }, colors: [...level.colors],
    platforms: level.platforms.map(platform => ({ ...platform })),
    enemies: level.enemies.map(enemy => ({ ...enemy })),
    hazards: level.hazards.map(hazard => ({ ...hazard })), goal: { ...level.goal }
  };
}
