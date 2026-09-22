const fresh = () => ({ name: "", started: false, score: 0, lives: 3, unlocked: 1, currentLevel: 1, record: 0, progress: {}, playTime: 0, rankingSubmitted: false, audio: { music: true, sfx: true, volume: 0.55 } });

export class SaveManager {
  constructor() { this.data = fresh(); }
  save(patch = {}) { this.data = { ...this.data, ...patch }; return this.data; }
  newGame() { this.data = { ...fresh(), started: true, audio: this.data.audio }; return this.save(); }
  complete(level, score, seconds) {
    const best = Math.max(this.data.progress[level]?.score || 0, score);
    const progress = { ...this.data.progress, [level]: { score: best, completed: true, seconds } };
    const unlocked = Math.max(this.data.unlocked, Math.min(3, level + 1));
    const total = Object.values(progress).reduce((n, x) => n + (x.score || 0), 0);
    const playTime = this.data.playTime + seconds;
    return this.save({ score: total, record: Math.max(this.data.record, total), unlocked, progress, playTime });
  }
  async getRanking() {
    const response = await fetch("/api/ranking", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "No se pudo conectar con la base de datos.");
    if (!Array.isArray(body.ranking)) throw new Error("La respuesta del ranking no es válida.");
    return body.ranking;
  }
  async submitRanking(entry) {
    const response = await fetch("/api/ranking", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(entry), keepalive: true });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "No se pudo guardar la puntuación.");
    return body;
  }
  async submitFinalRanking(name) {
    const cleanName = String(name || "").trim().replace(/\s+/g, " ").slice(0, 18);
    if (!cleanName) throw new Error("Escribe un nombre para guardar la puntuación.");
    if (this.data.rankingSubmitted) return { ok: true, duplicate: true };
    const entry = { name: cleanName, score: this.data.score, levels: Object.keys(this.data.progress).length, time: Math.round(this.data.playTime) };
    await this.submitRanking(entry);
    this.save({ name: cleanName, rankingSubmitted: true });
    return { ok: true };
  }
}
