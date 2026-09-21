export class AudioManager {
  constructor(save) {
    this.save = save;
    this.ctx = null;
    this.tracks = null;
    this.desiredMode = "menu";
    this.current = null;
  }
  ensure() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    if (!this.tracks) {
      this.tracks = {
        menu: new Audio("./assets/audio/menu-theme.mp3"),
        game: new Audio("./assets/audio/capa-y-pandero.mp3")
      };
      Object.values(this.tracks).forEach(track => {
        track.loop = true;
        track.preload = "auto";
        track.volume = this.save.data.audio.volume;
      });
    }
  }
  tone(freq, duration = .08, type = "square", gain = .05) {
    if (!this.save.data.audio.sfx) return; this.ensure(); const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = gain * this.save.data.audio.volume; g.gain.exponentialRampToValueAtTime(.0001, this.ctx.currentTime + duration); o.connect(g).connect(this.ctx.destination); o.start(); o.stop(this.ctx.currentTime + duration);
  }
  defeatSting() {
    if (!this.save.data.audio.sfx) return;
    this.ensure();
    const now = this.ctx.currentTime, volume = this.save.data.audio.volume;
    [[392, 0, .18], [311, .13, .2], [220, .28, .34]].forEach(([freq, delay, duration]) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain(), start = now + delay;
      o.type = "triangle"; o.frequency.setValueAtTime(freq, start); o.frequency.exponentialRampToValueAtTime(freq * .96, start + duration);
      g.gain.setValueAtTime(.0001, start); g.gain.exponentialRampToValueAtTime(.075 * volume, start + .012); g.gain.exponentialRampToValueAtTime(.0001, start + duration);
      o.connect(g).connect(this.ctx.destination); o.start(start); o.stop(start + duration);
    });
    const length = Math.floor(this.ctx.sampleRate * .11), buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
    const shaker = this.ctx.createBufferSource(), sg = this.ctx.createGain();
    shaker.buffer = buffer; sg.gain.value = .045 * volume; shaker.connect(sg).connect(this.ctx.destination); shaker.start(now + .27);
  }
  sfx(name) {
    if (name === "defeat") { this.defeatSting(); return; }
    const map = { jump: 520, skirt: 160, fan: 760, hit: 90, goal: 980, button: 330, hurt: 120 };
    this.tone(map[name] || 300, name === "goal" ? .35 : .09, name === "fan" ? "sine" : "square", .07);
  }
  music(mode = "menu") {
    this.desiredMode = mode === "menu" ? "menu" : "game";
    this.ensure();
    this.syncMusic();
  }
  syncMusic() {
    if (!this.tracks) return;
    const wanted = this.tracks[this.desiredMode];
    Object.values(this.tracks).forEach(track => {
      track.volume = this.save.data.audio.volume;
      if (track !== wanted || !this.save.data.audio.music) track.pause();
    });
    if (!this.save.data.audio.music) { this.current = null; return; }
    if (this.current !== wanted) {
      if (this.current) { this.current.pause(); this.current.currentTime = 0; }
      wanted.currentTime = 0;
      this.current = wanted;
    }
    wanted.play().catch(() => {});
  }
  setMusicEnabled(enabled) {
    this.save.data.audio.music = enabled;
    this.ensure();
    this.syncMusic();
  }
  setSfxEnabled(enabled) { this.save.data.audio.sfx = enabled; }
  setVolume(volume) {
    this.save.data.audio.volume = volume;
    if (this.tracks) Object.values(this.tracks).forEach(track => { track.volume = volume; });
  }
  unlock() { this.ensure(); this.syncMusic(); }
  stop() {
    if (this.tracks) Object.values(this.tracks).forEach(track => track.pause());
    this.current = null;
  }
}
