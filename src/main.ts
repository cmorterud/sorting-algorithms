import "./styles.css";
import { algorithms } from "./algorithms";
import type { SortEvent, VisualizerState } from "./types";
import { render } from "./renderer";

const MIN_VALUE = 5;
const MAX_VALUE = 100;
const DEFAULT_SIZE = 50;

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root was not found.");
}

app.innerHTML = `
  <main class="shell">
    <header class="app-header">
      <div>
        <h1>Sorting Visualizer</h1>
        <p>Compare pure algorithm events with independent DOM rendering.</p>
      </div>
    </header>

    <section class="visualizer" aria-label="Sorting visualization">
      <div class="bars-container" id="bars-container"></div>
    </section>

    <section class="controls" aria-label="Controls">
      <button id="randomize-button" type="button">Randomize</button>
      <button id="start-button" type="button">Start</button>
      <button id="pause-button" type="button">Pause</button>
      <button id="reset-button" type="button">Reset</button>

      <label>
        Algorithm
        <select id="algorithm-select"></select>
      </label>

      <label>
        Array size
        <input id="size-slider" type="range" min="10" max="150" value="${DEFAULT_SIZE}" />
      </label>

      <label>
        Speed
        <input id="speed-slider" type="range" min="1" max="100" value="45" />
      </label>
    </section>

    <section class="stats" aria-label="Statistics">
      <div>
        <span>Comparisons</span>
        <strong id="comparisons-value">0</strong>
      </div>
      <div>
        <span>Swaps/Moves</span>
        <strong id="moves-value">0</strong>
      </div>
      <div>
        <span>Algorithm</span>
        <strong id="algorithm-value">Bubble Sort</strong>
      </div>
      <div>
        <span>Array Size</span>
        <strong id="size-value">${DEFAULT_SIZE}</strong>
      </div>
    </section>
  </main>
`;

const getElement = <T extends HTMLElement>(id: string): T => {
  const element = document.querySelector<T>(id);
  if (!element) {
    throw new Error(`Element ${id} was not found.`);
  }

  return element;
};

const elements = {
  barsContainer: getElement<HTMLElement>("#bars-container"),
  comparisonsValue: getElement<HTMLElement>("#comparisons-value"),
  movesValue: getElement<HTMLElement>("#moves-value"),
  algorithmValue: getElement<HTMLElement>("#algorithm-value"),
  sizeValue: getElement<HTMLElement>("#size-value"),
  startButton: getElement<HTMLButtonElement>("#start-button"),
  pauseButton: getElement<HTMLButtonElement>("#pause-button"),
  resetButton: getElement<HTMLButtonElement>("#reset-button"),
  randomizeButton: getElement<HTMLButtonElement>("#randomize-button"),
  algorithmSelect: getElement<HTMLSelectElement>("#algorithm-select"),
  sizeSlider: getElement<HTMLInputElement>("#size-slider"),
  speedSlider: getElement<HTMLInputElement>("#speed-slider"),
};

algorithms.forEach((algorithm) => {
  const option = document.createElement("option");
  option.value = algorithm.id;
  option.textContent = algorithm.label;
  elements.algorithmSelect.append(option);
});

const randomValue = (): number =>
  Math.floor(Math.random() * (MAX_VALUE - MIN_VALUE + 1)) + MIN_VALUE;

const createRandomArray = (size: number): number[] =>
  Array.from({ length: size }, randomValue);

const createState = (values: number[]): VisualizerState => ({
  values: [...values],
  originalValues: [...values],
  events: [],
  currentEventIndex: 0,
  isRunning: false,
  isPaused: false,
  comparisons: 0,
  swapsOrMoves: 0,
  highlightedCompareIndices: new Set<number>(),
  highlightedSwapIndices: new Set<number>(),
  sortedIndices: new Set<number>(),
});

let state = createState(createRandomArray(DEFAULT_SIZE));
let playbackTimer: number | undefined;

const selectedAlgorithm = () => {
  const algorithm = algorithms.find(
    (candidate) => candidate.id === elements.algorithmSelect.value,
  );

  return algorithm ?? algorithms[0];
};

const renderCurrentState = (): void => {
  render(elements, state, selectedAlgorithm().label);
};

const clearPlaybackTimer = (): void => {
  if (playbackTimer !== undefined) {
    window.clearTimeout(playbackTimer);
    playbackTimer = undefined;
  }
};

const speedToDelay = (): number => {
  const speed = Number(elements.speedSlider.value);
  return Math.max(8, 420 - speed * 4);
};

const applyEvent = (event: SortEvent): void => {
  state.highlightedCompareIndices.clear();
  state.highlightedSwapIndices.clear();

  switch (event.type) {
    case "compare":
      event.indices.forEach((index) => state.highlightedCompareIndices.add(index));
      state.comparisons += 1;
      break;
    case "swap":
      [state.values[event.i], state.values[event.j]] = [
        state.values[event.j],
        state.values[event.i],
      ];
      state.highlightedSwapIndices.add(event.i);
      state.highlightedSwapIndices.add(event.j);
      state.swapsOrMoves += 1;
      break;
    case "overwrite":
      state.values[event.index] = event.value;
      state.highlightedSwapIndices.add(event.index);
      state.swapsOrMoves += 1;
      break;
    case "markSorted":
      event.indices.forEach((index) => state.sortedIndices.add(index));
      break;
    case "clearHighlights":
      state.highlightedCompareIndices.clear();
      state.highlightedSwapIndices.clear();
      break;
  }
};

const finishRun = (): void => {
  state.isRunning = false;
  state.isPaused = false;
  state.sortedIndices = new Set(state.values.map((_, index) => index));
  state.highlightedCompareIndices.clear();
  state.highlightedSwapIndices.clear();
  renderCurrentState();
};

const playNextEvent = (): void => {
  clearPlaybackTimer();

  if (!state.isRunning || state.isPaused) {
    renderCurrentState();
    return;
  }

  const event = state.events[state.currentEventIndex];
  if (!event) {
    finishRun();
    return;
  }

  applyEvent(event);
  state.currentEventIndex += 1;
  renderCurrentState();
  playbackTimer = window.setTimeout(playNextEvent, speedToDelay());
};

const resetRun = (): void => {
  clearPlaybackTimer();
  state = createState(state.originalValues);
  renderCurrentState();
};

const randomize = (): void => {
  clearPlaybackTimer();
  const size = Number(elements.sizeSlider.value);
  state = createState(createRandomArray(size));
  renderCurrentState();
};

elements.startButton.addEventListener("click", () => {
  const algorithm = selectedAlgorithm();
  state.events = algorithm.sort([...state.values]);
  state.originalValues = [...state.values];
  state.currentEventIndex = 0;
  state.isRunning = true;
  state.isPaused = false;
  state.comparisons = 0;
  state.swapsOrMoves = 0;
  state.highlightedCompareIndices.clear();
  state.highlightedSwapIndices.clear();
  state.sortedIndices.clear();
  renderCurrentState();
  playNextEvent();
});

elements.pauseButton.addEventListener("click", () => {
  if (!state.isRunning) {
    return;
  }

  state.isPaused = !state.isPaused;
  renderCurrentState();

  if (!state.isPaused) {
    playNextEvent();
  }
});

elements.resetButton.addEventListener("click", resetRun);
elements.randomizeButton.addEventListener("click", randomize);

elements.algorithmSelect.addEventListener("change", renderCurrentState);

elements.sizeSlider.addEventListener("input", () => {
  randomize();
});

renderCurrentState();
