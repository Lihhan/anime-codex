// Replace this provider with a local TTS engine. No text is sent by this module.
// Provider contract: speak(text, config, onLevel[0..1], onEnd), stop().
export class SystemVoice {
  constructor() {
    this.timer = null;
    this.done = null;
  }
  speak(text, config, onLevel, onEnd) {
    this.stop();
    if (!globalThis.speechSynthesis) {
      onEnd();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = config.lang;
    utterance.rate = config.rate;
    utterance.pitch = config.pitch;
    utterance.voice =
      speechSynthesis
        .getVoices()
        .find((v) => v.lang.startsWith("zh") && v.localService) || null;
    this.done = onEnd;
    utterance.onstart = () => {
      this.timer = setInterval(
        () => onLevel(0.3 + 0.5 * Math.abs(Math.sin(performance.now() / 110))),
        70,
      );
    };
    utterance.onend = utterance.onerror = () => this.stop();
    speechSynthesis.speak(utterance);
  }
  stop() {
    clearInterval(this.timer);
    this.timer = null;
    globalThis.speechSynthesis?.cancel();
    const done = this.done;
    this.done = null;
    done?.();
  }
}
