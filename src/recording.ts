import { algorithms } from "./algorithms";
import { SortSound } from "./sound";
import type { AlgorithmDefinition, SortEvent, VisualizerState } from "./types";
import "./recording/themes/midnight.css";

type RecordingStatus = "idle" | "countdown" | "running" | "paused" | "completed";
type DataShape = "random" | "nearly-sorted" | "reversed" | "few-unique" | "sorted";
type RecordingTheme = "midnight";

interface Runner {
  algorithm: AlgorithmDefinition;
  state: VisualizerState;
  completedAt?: number;
}

const MIN_VALUE = 5;
const MAX_VALUE = 100;
const recordingTheme: RecordingTheme = "midnight";
const app = document.querySelector<HTMLDivElement>("#app");

if (!app) throw new Error("App root was not found.");

const algorithmOptions = algorithms
  .map(({ id, label }) => `<option value="${id}">${label}</option>`)
  .join("");

app.innerHTML = `
  <main class="recording-page" id="recording-page">
    <div class="recording-workspace">
      <section class="recording-preview" aria-label="Portrait recording preview">
        <div class="recording-canvas recording-theme-dark" id="recording-canvas" data-theme="${recordingTheme}">
          <header class="recording-header">
            <h1 id="recording-title"><span>Merge Sort</span><span>vs</span><span>Bubble Sort</span></h1>
            <p id="recording-subtitle">Same input. Same machine.</p>
          </header>
          <section class="recording-visualization" id="recording-visualization" aria-label="Sorting animation"></section>
          <footer class="recording-footer">
            <p class="recording-status" id="recording-status" aria-live="polite">Ready to record</p>
            <p class="recording-result" id="recording-result"></p>
          </footer>
          <div class="recording-countdown" id="recording-countdown" aria-live="assertive" hidden></div>
        </div>
      </section>
      <aside class="recording-controls" aria-label="Recording controls">
        <div class="control-group"><label>Primary algorithm<select id="primary-algorithm">${algorithmOptions}</select></label>
        <label>Second algorithm<select id="secondary-algorithm">${algorithmOptions.replace('value="merge"', 'value="merge" selected')}</select></label></div>
        <div class="control-group control-grid"><label>Items <output id="item-count-output">50</output><input id="item-count" type="range" min="20" max="200" value="50" /></label>
        <label>Speed <output id="speed-output">55</output><input id="recording-speed" type="range" min="1" max="100" value="55" /></label></div>
        <div class="control-group control-grid"><label>Data shape<select id="data-shape"><option value="random">Random</option><option value="nearly-sorted">Nearly sorted</option><option value="reversed">Reversed</option><option value="few-unique">Few unique values</option><option value="sorted">Already sorted</option></select></label>
        <label>Seed<input id="recording-seed" type="text" value="sort-race-2026" /></label></div>
        <div class="control-group toggle-grid">
          <label><input id="race-mode" type="checkbox" checked /> Race mode</label>
          <label><input id="countdown-enabled" type="checkbox" checked /> 3-second countdown</label>
          <label><input id="recording-sound" type="checkbox" /> Sound</label>
          <label><input id="show-stats" type="checkbox" checked /> Show stats</label>
          <label><input id="show-title" type="checkbox" checked /> Show title</label>
        </div>
        <div class="recording-actions">
          <button id="recording-start" type="button">Start</button><button id="recording-pause" type="button">Pause</button>
          <button id="recording-reset" type="button">Reset</button><button id="recording-replay" type="button">Replay</button>
          <button id="recording-fullscreen" type="button">Fullscreen preview</button>
        </div>
        <p class="recording-note">Portrait canvas: 9:16 · logical design: 1080 × 1920</p>
      </aside>
    </div>
  </main>`;

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.querySelector<T>(`#${id}`);
  if (!element) throw new Error(`Missing #${id}`);
  return element;
};

const el = {
  page: byId<HTMLElement>("recording-page"), canvas: byId<HTMLElement>("recording-canvas"), visualization: byId<HTMLElement>("recording-visualization"),
  title: byId<HTMLElement>("recording-title"), subtitle: byId<HTMLElement>("recording-subtitle"), status: byId<HTMLElement>("recording-status"), result: byId<HTMLElement>("recording-result"), countdown: byId<HTMLElement>("recording-countdown"),
  primary: byId<HTMLSelectElement>("primary-algorithm"), secondary: byId<HTMLSelectElement>("secondary-algorithm"), count: byId<HTMLInputElement>("item-count"), countOutput: byId<HTMLOutputElement>("item-count-output"), speed: byId<HTMLInputElement>("recording-speed"), speedOutput: byId<HTMLOutputElement>("speed-output"), shape: byId<HTMLSelectElement>("data-shape"), seed: byId<HTMLInputElement>("recording-seed"),
  race: byId<HTMLInputElement>("race-mode"), countdownEnabled: byId<HTMLInputElement>("countdown-enabled"), sound: byId<HTMLInputElement>("recording-sound"), stats: byId<HTMLInputElement>("show-stats"), showTitle: byId<HTMLInputElement>("show-title"),
  start: byId<HTMLButtonElement>("recording-start"), pause: byId<HTMLButtonElement>("recording-pause"), reset: byId<HTMLButtonElement>("recording-reset"), replay: byId<HTMLButtonElement>("recording-replay"), fullscreen: byId<HTMLButtonElement>("recording-fullscreen"),
};

const createState = (values: number[]): VisualizerState => ({ values: [...values], originalValues: [...values], events: [], currentEventIndex: 0, isRunning: false, isPaused: false, comparisons: 0, swapsOrMoves: 0, highlightedCompareIndices: new Set(), highlightedSwapIndices: new Set(), sortedIndices: new Set() });
const selected = (id: string): AlgorithmDefinition => algorithms.find((algorithm) => algorithm.id === id) ?? algorithms[0];
const hashSeed = (seed: string): number => [...seed].reduce((hash, char) => Math.imul(31, hash) + char.charCodeAt(0) | 0, 2166136261) >>> 0;
const seededRandom = (seed: string): (() => number) => { let value = hashSeed(seed); return () => { value |= 0; value = value + 0x6d2b79f5 | 0; let t = Math.imul(value ^ value >>> 15, 1 | value); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const makeValues = (count: number, shape: DataShape, seed: string): number[] => {
  const random = seededRandom(seed); const values = Array.from({ length: count }, () => Math.round(MIN_VALUE + random() * (MAX_VALUE - MIN_VALUE)));
  if (shape === "sorted" || shape === "nearly-sorted") values.sort((a, b) => a - b);
  if (shape === "reversed") values.sort((a, b) => b - a);
  if (shape === "few-unique") return values.map((value) => Math.round(value / 20) * 20);
  if (shape === "nearly-sorted") for (let i = 0; i < Math.max(1, Math.floor(count / 10)); i += 1) { const a = Math.floor(random() * count); const b = Math.floor(random() * count); [values[a], values[b]] = [values[b], values[a]]; }
  return values;
};

let status: RecordingStatus = "idle";
let runners: Runner[] = [];
let timer: number | undefined;
let countdownTimer: number | undefined;
let startedAt = 0;
let elapsedBeforePause = 0;
const sound = new SortSound();

const clearTimers = (): void => { if (timer) window.clearTimeout(timer); if (countdownTimer) window.clearTimeout(countdownTimer); timer = undefined; countdownTimer = undefined; };
const elapsed = (): number => status === "running" ? elapsedBeforePause + performance.now() - startedAt : elapsedBeforePause;
const delay = (): number => Math.max(8, 300 - Number(el.speed.value) * 2.8);
const applyEvent = (runner: Runner, event: SortEvent): void => {
  const state = runner.state; state.highlightedCompareIndices.clear(); state.highlightedSwapIndices.clear();
  if (el.sound.checked) sound.playEvent(event, state.values);
  if (event.type === "compare") { event.indices.forEach((index) => state.highlightedCompareIndices.add(index)); state.comparisons += 1; }
  if (event.type === "swap") { [state.values[event.i], state.values[event.j]] = [state.values[event.j], state.values[event.i]]; state.highlightedSwapIndices.add(event.i); state.highlightedSwapIndices.add(event.j); state.swapsOrMoves += 1; }
  if (event.type === "overwrite") { state.values[event.index] = event.value; state.highlightedSwapIndices.add(event.index); state.swapsOrMoves += 1; }
  if (event.type === "markSorted") event.indices.forEach((index) => state.sortedIndices.add(index));
};
const finishRunner = (runner: Runner): void => { runner.state.isRunning = false; runner.state.sortedIndices = new Set(runner.state.values.map((_, i) => i)); runner.state.highlightedCompareIndices.clear(); runner.state.highlightedSwapIndices.clear(); runner.completedAt = elapsed(); };
const formatTime = (milliseconds: number): string => `${(milliseconds / 1000).toFixed(1)}s`;
const renderBars = (runner: Runner): HTMLElement => {
  const card = document.createElement("article"); card.className = "recording-runner";
  const state = runner.state; const showStats = el.stats.checked;
  card.innerHTML = `<header><strong class="algorithm-label">${runner.algorithm.label}</strong><span>${runner.completedAt !== undefined ? "Complete" : status === "paused" ? "Paused" : status === "running" ? "Sorting" : "Ready"}</span></header><div class="recording-bars" role="img" aria-label="${runner.algorithm.label} sorting ${state.values.length} values"></div>${showStats ? `<div class="runner-stats"><span><em class="recording-stat-label">Comparisons</em> <b class="recording-stat-value">${state.comparisons}</b></span><span><em class="recording-stat-label">Writes</em> <b class="recording-stat-value">${state.swapsOrMoves}</b></span><span><em class="recording-stat-label">Time</em> <b class="recording-stat-value">${formatTime(elapsed())}</b></span><span><em class="recording-stat-label">Items</em> <b class="recording-stat-value">${state.values.length}</b></span></div>` : ""}`;
  const bars = card.querySelector<HTMLElement>(".recording-bars")!; bars.style.gap = state.values.length > 100 ? "2px" : "4px";
  state.values.forEach((value, index) => { const bar = document.createElement("i"); bar.style.height = `${Math.max(3, value)}%`; if (state.sortedIndices.has(index)) bar.classList.add("sorted"); if (state.highlightedCompareIndices.has(index)) bar.classList.add("comparing"); if (state.highlightedSwapIndices.has(index)) bar.classList.add("swapping"); bars.append(bar); });
  return card;
};
const getWinner = (): Runner | undefined => runners.length === 2 ? [...runners].sort((a, b) => a.state.comparisons - b.state.comparisons)[0] : undefined;
const render = (): void => {
  el.countOutput.value = el.count.value; el.speedOutput.value = el.speed.value; el.secondary.closest("label")!.hidden = !el.race.checked;
  const primaryAlgorithm = selected(el.primary.value).label;
  const secondaryAlgorithm = selected(el.secondary.value).label;
  if (el.race.checked) {
    el.title.replaceChildren(
      ...[secondaryAlgorithm, "vs", primaryAlgorithm].map((line) => {
        const span = document.createElement("span");
        span.textContent = line;
        return span;
      }),
    );
  } else {
    el.title.textContent = `Watch ${primaryAlgorithm} Work`;
  }
  el.subtitle.textContent = el.race.checked
    ? "Same input. Same machine."
    : "Every comparison. Every write.";
  el.title.parentElement!.hidden = !el.showTitle.checked; el.visualization.replaceChildren(...runners.map(renderBars));
  el.status.textContent = status === "idle" ? "Ready to record" : status === "countdown" ? "Starting shortly" : status === "running" ? "Sorting in progress" : status === "paused" ? "Animation paused" : "Sorting complete";
  const winner = status === "completed" ? getWinner() : undefined;
  el.result.textContent = winner ? `${winner.algorithm.label} wins · ${winner.state.comparisons.toLocaleString()} comparisons` : status === "completed" ? `${runners[0]?.algorithm.label ?? "Sort"} complete · ${runners[0]?.state.comparisons.toLocaleString() ?? 0} comparisons` : "";
  el.pause.textContent = status === "paused" ? "Resume" : "Pause"; el.pause.disabled = status !== "running" && status !== "paused"; el.start.disabled = status === "running" || status === "countdown"; el.replay.disabled = status === "idle";
};
const prepare = (): void => { clearTimers(); elapsedBeforePause = 0; const values = makeValues(Number(el.count.value), el.shape.value as DataShape, el.seed.value); const ids = el.race.checked ? [el.primary.value, el.secondary.value] : [el.primary.value]; runners = ids.map((id) => { const algorithm = selected(id); const state = createState(values); state.events = algorithm.sort([...values]); return { algorithm, state }; }); status = "idle"; el.countdown.hidden = true; render(); };
const complete = (): void => { status = "completed"; runners.forEach((runner) => { if (runner.completedAt === undefined) finishRunner(runner); }); render(); };
const tick = (): void => { if (status !== "running") return; let active = false; runners.forEach((runner) => { const event = runner.state.events[runner.state.currentEventIndex]; if (event) { applyEvent(runner, event); runner.state.currentEventIndex += 1; active = true; } else if (runner.completedAt === undefined) finishRunner(runner); }); render(); if (active) timer = window.setTimeout(tick, delay()); else complete(); };
const begin = async (): Promise<void> => { prepare(); if (el.sound.checked) { sound.setEnabled(true); await sound.unlock(); } if (!el.countdownEnabled.checked) { status = "running"; startedAt = performance.now(); render(); tick(); return; } status = "countdown"; let count = 3; const next = (): void => { el.countdown.hidden = false; el.countdown.textContent = String(count); el.countdown.classList.remove("countdown-pop"); void el.countdown.offsetWidth; el.countdown.classList.add("countdown-pop"); if (count-- > 1) countdownTimer = window.setTimeout(next, 1000); else countdownTimer = window.setTimeout(() => { el.countdown.hidden = true; status = "running"; startedAt = performance.now(); render(); tick(); }, 1000); }; render(); next(); };
const pause = (): void => { if (status === "running") { elapsedBeforePause = elapsed(); status = "paused"; clearTimers(); } else if (status === "paused") { status = "running"; startedAt = performance.now(); tick(); } render(); };

el.start.addEventListener("click", () => void begin()); el.pause.addEventListener("click", pause); el.reset.addEventListener("click", prepare); el.replay.addEventListener("click", () => void begin());
[el.primary, el.secondary, el.count, el.speed, el.shape, el.seed, el.race, el.countdownEnabled, el.stats, el.showTitle].forEach((input) => input.addEventListener("input", prepare));
el.sound.addEventListener("change", () => sound.setEnabled(el.sound.checked));
el.fullscreen.addEventListener("click", async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await el.page.requestFullscreen?.(); } catch { /* Fullscreen is optional. */ } });
document.addEventListener("fullscreenchange", () => { el.fullscreen.textContent = document.fullscreenElement ? "Exit fullscreen" : "Fullscreen preview"; });
prepare();
