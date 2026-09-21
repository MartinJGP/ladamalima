export class AudioManager {
  constructor(save) { this.save = save; this.ctx = null; this.timer = null; }
  ensure() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === "suspended") this.ctx.resume(); }
  tone(freq, duration = .08, type = "square", gain = .05) {
    if (!this.save.data.audio.sfx) return; this.ensure(); const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = gain * this.save.data.audio.volume; g.gain.exponentialRampToValueAtTime(.0001, this.ctx.currentTime + duration); o.connect(g).connect(this.ctx.destination); o.start(); o.stop(this.ctx.currentTime + duration);
  }
  sfx(name) { const map = { jump: 520, skirt: 160, fan: 760, hit: 90, goal: 980, button: 330, hurt: 120 }; this.tone(map[name] || 300, name === "goal" ? .35 : .09, name === "fan" ? "sine" : "square", .07); }
  music(mode = "menu") {
    clearInterval(this.timer); if (!this.save.data.audio.music) return; this.ensure();
    const notes = mode === "victory" ? [523, 659, 784, 1047, 784, 1047] : mode === "game" ? [220, 262, 330, 392, 330, 262] : [196, 247, 294, 247]; let i = 0;
    this.timer = setInterval(() => { if (!this.save.data.audio.music || !this.ctx) return; const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = "triangle"; o.frequency.value = notes[i++ % notes.length]; g.gain.value = .018 * this.save.data.audio.volume; g.gain.exponentialRampToValueAtTime(.0001, this.ctx.currentTime + .3); o.connect(g).connect(this.ctx.destination); o.start(); o.stop(this.ctx.currentTime + .32); }, 380);
  }
  stop() { clearInterval(this.timer); this.timer = null; }
}
