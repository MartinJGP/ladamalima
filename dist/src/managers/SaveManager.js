const KEY = "la-dama-de-lima-save-v1";
const fresh = () => ({ name: "", score: 0, lives: 3, unlocked: 1, currentLevel: 1, record: 0, progress: {}, playTime: 0, ranking: [], audio: { music: true, sfx: true, volume: 0.55 } });

export class SaveManager {
  constructor() { this.data = this.load(); }
  load() { try { const stored=JSON.parse(localStorage.getItem(KEY) || "{}"); return { ...fresh(), ...stored, audio:{...fresh().audio,...stored.audio} }; } catch { return fresh(); } }
  save(patch = {}) { this.data = { ...this.data, ...patch }; localStorage.setItem(KEY, JSON.stringify(this.data)); return this.data; }
  newGame(name) { this.data = { ...fresh(), name: name.trim().slice(0, 18), audio: this.data.audio }; return this.save(); }
  complete(level, score, seconds) {
    const best = Math.max(this.data.progress[level]?.score || 0, score);
    const progress = { ...this.data.progress, [level]: { score: best, completed: true, seconds } };
    const unlocked = Math.max(this.data.unlocked, Math.min(3, level + 1));
    const total = Object.values(progress).reduce((n, x) => n + (x.score || 0), 0);
    const ranking = [...this.data.ranking, { name: this.data.name, score: total, levels: Object.keys(progress).length, time: Math.round(this.data.playTime + seconds), date: new Date().toISOString() }]
      .sort((a, b) => b.score - a.score || b.levels - a.levels || a.time - b.time).slice(0, 10);
    return this.save({ score: total, record: Math.max(this.data.record, total), unlocked, progress, ranking });
  }
  export() { return new Blob([JSON.stringify(this.data, null, 2)], { type: "application/json" }); }
  async import(file) { const value = JSON.parse(await file.text()); if (!value || typeof value !== "object") throw new Error("Partida inválida"); this.data = { ...fresh(), ...value }; this.save(); }
}
