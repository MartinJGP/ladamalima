const fresh = () => ({ name: "", started: false, score: 0, lives: 3, unlocked: 1, currentLevel: 1, record: 0, progress: {}, playTime: 0, rankingSubmitted: false, audio: { music: true, sfx: true, volume: 0.55 } });
const STORAGE_KEY = "la-dama-de-lima-save-v1";
const browserStorage = () => { try { return globalThis.localStorage; } catch { return undefined; } };

function readLocal(storage) {
  try {
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || "null");
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return fresh();
    const progress = saved.progress && typeof saved.progress === "object" && !Array.isArray(saved.progress) ? saved.progress : {};
    const audio = saved.audio && typeof saved.audio === "object" ? saved.audio : {};
    return {
      ...fresh(), ...saved, progress,
      unlocked: Math.max(1, Math.min(12, Number(saved.unlocked) || 1)),
      currentLevel: Math.max(1, Math.min(12, Number(saved.currentLevel) || 1)),
      rankingSubmitted: saved.rankingSubmitted === true,
      audio: { ...fresh().audio, ...audio }
    };
  } catch { return fresh(); }
}

export class SaveManager {
  constructor(storage = browserStorage()) { this.storage = storage; this.data = readLocal(storage); }
  save(patch = {}) {
    this.data = { ...this.data, ...patch };
    try { this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.data)); } catch { /* Private browsing can deny storage. */ }
    return this.data;
  }
  newGame() {
    const { audio, unlocked, progress, record, rankingSubmitted, name } = this.data;
    this.data = { ...fresh(), started: true, audio, unlocked, progress, record, rankingSubmitted, name };
    return this.save();
  }
  clearLocalData() {
    try { this.storage?.removeItem(STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
    this.data = fresh();
    return this.data;
  }
  complete(level, score, seconds) {
    const best = Math.max(this.data.progress[level]?.score || 0, score);
    const progress = { ...this.data.progress, [level]: { score: best, completed: true, seconds } };
    const unlocked = Math.max(this.data.unlocked, Math.min(12, level + 1));
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
    if (readLocal(this.storage).rankingSubmitted) this.data.rankingSubmitted = true;
    if (this.data.rankingSubmitted) return { ok: true, duplicate: true };
    const cleanName = String(name || "").trim().replace(/\s+/g, " ").slice(0, 18);
    if (!cleanName) throw new Error("Escribe un nombre para guardar la puntuación.");
    const completedLevels = Object.keys(this.data.progress).length;
    if (completedLevels < 12) throw new Error("Completa los 12 capítulos antes de guardar en el ranking.");
    const entry = { name: cleanName, score: this.data.score, levels: completedLevels, time: Math.round(this.data.playTime) };
    await this.submitRanking(entry);
    this.save({ name: cleanName, rankingSubmitted: true });
    return { ok: true };
  }
}
