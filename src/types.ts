export type ValueArray = number[];

export type SortEvent =
  | { type: "compare"; indices: number[] }
  | { type: "swap"; i: number; j: number }
  | { type: "overwrite"; index: number; value: number }
  | { type: "markSorted"; indices: number[] }
  | { type: "clearHighlights" };

export type SortAlgorithm = (input: number[]) => SortEvent[];

export interface VisualizerState {
  values: number[];
  originalValues: number[];
  events: SortEvent[];
  currentEventIndex: number;
  isRunning: boolean;
  isPaused: boolean;
  comparisons: number;
  swapsOrMoves: number;
  highlightedCompareIndices: Set<number>;
  highlightedSwapIndices: Set<number>;
  sortedIndices: Set<number>;
}

export interface AlgorithmDefinition {
  id: string;
  label: string;
  sort: SortAlgorithm;
}
