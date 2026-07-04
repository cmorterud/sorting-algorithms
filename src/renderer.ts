import type { VisualizerState } from "./types";

interface RenderElements {
  barsContainer: HTMLElement;
  comparisonsValue: HTMLElement;
  movesValue: HTMLElement;
  algorithmValue: HTMLElement;
  sizeValue: HTMLElement;
  startButton: HTMLButtonElement;
  pauseButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
  randomizeButton: HTMLButtonElement;
  algorithmSelect: HTMLSelectElement;
  sizeSlider: HTMLInputElement;
}

const MAX_VALUE = 100;

const updateButtonStates = (
  elements: RenderElements,
  state: VisualizerState,
): void => {
  elements.startButton.disabled = state.isRunning;
  elements.pauseButton.disabled = !state.isRunning;
  elements.pauseButton.textContent = state.isPaused ? "Resume" : "Pause";
  elements.resetButton.disabled =
    !state.isRunning &&
    state.currentEventIndex === 0 &&
    state.comparisons === 0 &&
    state.swapsOrMoves === 0;
  elements.randomizeButton.disabled = state.isRunning;
  elements.algorithmSelect.disabled = state.isRunning;
  elements.sizeSlider.disabled = state.isRunning;
};

export const render = (
  elements: RenderElements,
  state: VisualizerState,
  algorithmLabel: string,
): void => {
  const barGap = state.values.length > 90 ? 1 : state.values.length > 55 ? 2 : 4;

  elements.barsContainer.style.gap = `${barGap}px`;
  elements.barsContainer.replaceChildren(
    ...state.values.map((value, index) => {
      const bar = document.createElement("div");
      const height = Math.max(3, (value / MAX_VALUE) * 100);
      bar.className = "bar";
      bar.style.height = `${height}%`;
      bar.style.flexBasis = `${100 / state.values.length}%`;
      bar.title = `Value ${value}`;

      if (state.sortedIndices.has(index)) {
        bar.classList.add("sorted");
      }

      if (state.highlightedCompareIndices.has(index)) {
        bar.classList.add("comparing");
      }

      if (state.highlightedSwapIndices.has(index)) {
        bar.classList.add("swapping");
      }

      return bar;
    }),
  );

  elements.comparisonsValue.textContent = String(state.comparisons);
  elements.movesValue.textContent = String(state.swapsOrMoves);
  elements.algorithmValue.textContent = algorithmLabel;
  elements.sizeValue.textContent = String(state.values.length);

  updateButtonStates(elements, state);
};
