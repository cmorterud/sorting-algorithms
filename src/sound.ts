import type { SortEvent } from "./types";

const MIN_FREQUENCY = 180;
const MAX_FREQUENCY = 920;
const MIN_VALUE = 5;
const MAX_VALUE = 100;

const valueToFrequency = (value: number): number => {
  const normalized = (value - MIN_VALUE) / (MAX_VALUE - MIN_VALUE);
  return MIN_FREQUENCY + normalized * (MAX_FREQUENCY - MIN_FREQUENCY);
};

export class SortSound {
  private context: AudioContext | undefined;
  private enabled = true;
  private volume = 0.16;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.min(0.18, Math.max(0, volume) * 0.18);
  }

  async unlock(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  playEvent(event: SortEvent, values: number[]): void {
    if (!this.enabled || !this.context || this.context.state !== "running") {
      return;
    }

    switch (event.type) {
      case "compare":
        this.playToneSequence(
          event.indices.map((index) => values[index]).filter(Boolean),
          "sine",
          0.035,
          0.55,
        );
        break;
      case "swap":
        this.playToneSequence(
          [values[event.i], values[event.j]],
          "triangle",
          0.06,
          0.9,
        );
        break;
      case "overwrite":
        this.playToneSequence([event.value], "triangle", 0.055, 0.8);
        break;
      case "markSorted":
        this.playToneSequence(
          event.indices.map((index) => values[index]).filter(Boolean),
          "sine",
          0.025,
          0.28,
        );
        break;
      case "clearHighlights":
        break;
    }
  }

  private playToneSequence(
    values: number[],
    wave: OscillatorType,
    durationSeconds: number,
    intensity: number,
  ): void {
    if (!this.context || values.length === 0) {
      return;
    }

    values.slice(0, 3).forEach((value, index) => {
      this.playTone(
        valueToFrequency(value),
        wave,
        durationSeconds,
        intensity,
        index * 0.018,
      );
    });
  }

  private playTone(
    frequency: number,
    wave: OscillatorType,
    durationSeconds: number,
    intensity: number,
    offsetSeconds: number,
  ): void {
    if (!this.context) {
      return;
    }

    const startTime = this.context.currentTime + offsetSeconds;
    const endTime = startTime + durationSeconds;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();

    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, this.volume * intensity),
      startTime + 0.008,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(startTime);
    oscillator.stop(endTime + 0.015);
  }
}
