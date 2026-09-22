const fresh = () => ({ name: "", score: 0, lives: 3, unlocked: 1, currentLevel: 1, record: 0, progress: {}, playTime: 0, ranking: [], audio: { music: true, sfx: true, volume: 0.55 } });

export class SaveManager {
  constructor() { this.data = fresh(); }
  save(patch = {}) { this.data = { ...this.data, ...patch }; return this.data; }
  newGame(name) { this.data = { ...fresh(), name: name.trim().slice(0, 18), audio: this.data.audio, ranking: this.data.ranking }; return this.save(); }
  complete(level, score, seconds) {
    const best = Math.max(this.data.progress[level]?.score || 0, score);
    const progress = { ...this.data.progress, [level]: { score: best, completed: true, seconds } };
    const unlocked = Math.max(this.data.unlocked, Math.min(3, level + 1));
    const total = Object.values(progress).reduce((n, x) => n + (x.score || 0), 0);
    const entry = { name: this.data.name, score: total, levels: Object.keys(progress).length, time: Math.round(this.data.playTime + seconds), date: new Date().toISOString() };
    const ranking = [...this.data.ranking, entry]
      .sort((a, b) => b.score - a.score || b.levels - a.levels || a.time - b.time).slice(0, 10);
    const result = this.save({ score: total, record: Math.max(this.data.record, total), unlocked, progress, ranking });
    void this.submitRanking(entry);
    return result;
  }
  async getRanking() {
    const response = await fetch("/api/ranking", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "No se pudo conectar con la base de datos.");
    if (!Array.isArray(body.ranking)) throw new Error("La respuesta del ranking no es válida.");
    return body.ranking;
  }
  async submitRanking(entry) {
    try {
      const response = await fetch("/api/ranking", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(entry), keepalive: true });
      if (!response.ok) throw new Error("No se pudo guardar la puntuación");
    } catch (error) { console.error("No se pudo guardar la puntuación global", error); }
  }
}
