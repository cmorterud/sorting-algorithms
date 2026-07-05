import type { AlgorithmDefinition, SortEvent } from "./types";

const allIndices = (length: number): number[] =>
  Array.from({ length }, (_, index) => index);

const writeValue = (
  values: number[],
  events: SortEvent[],
  index: number,
  value: number,
): void => {
  if (values[index] === value) {
    return;
  }

  values[index] = value;
  events.push({ type: "overwrite", index, value });
};

const swapValues = (
  values: number[],
  events: SortEvent[],
  i: number,
  j: number,
): void => {
  if (i === j || values[i] === values[j]) {
    return;
  }

  [values[i], values[j]] = [values[j], values[i]];
  events.push({ type: "swap", i, j });
};

export const bubbleSort = (input: number[]): SortEvent[] => {
  const values = [...input];
  const events: SortEvent[] = [];
  let sortedBoundary = values.length;

  for (let pass = 0; pass < values.length - 1; pass += 1) {
    for (let i = 0; i < sortedBoundary - 1; i += 1) {
      events.push({ type: "compare", indices: [i, i + 1] });

      if (values[i] > values[i + 1]) {
        swapValues(values, events, i, i + 1);
      }
    }

    sortedBoundary -= 1;
    events.push({ type: "markSorted", indices: [sortedBoundary] });
  }

  if (values.length > 0) {
    events.push({ type: "markSorted", indices: [0] });
  }

  events.push({ type: "clearHighlights" });
  return events;
};

export const selectionSort = (input: number[]): SortEvent[] => {
  const values = [...input];
  const events: SortEvent[] = [];

  for (let i = 0; i < values.length - 1; i += 1) {
    let minIndex = i;

    for (let j = i + 1; j < values.length; j += 1) {
      events.push({ type: "compare", indices: [minIndex, j] });
      if (values[j] < values[minIndex]) {
        minIndex = j;
      }
    }

    if (minIndex !== i) {
      swapValues(values, events, i, minIndex);
    }

    events.push({ type: "markSorted", indices: [i] });
  }

  if (values.length > 0) {
    events.push({ type: "markSorted", indices: [values.length - 1] });
  }

  events.push({ type: "clearHighlights" });
  return events;
};

export const insertionSort = (input: number[]): SortEvent[] => {
  const values = [...input];
  const events: SortEvent[] = [];

  if (values.length > 0) {
    events.push({ type: "markSorted", indices: [0] });
  }

  for (let i = 1; i < values.length; i += 1) {
    const current = values[i];
    let j = i - 1;

    while (j >= 0) {
      events.push({ type: "compare", indices: [j, j + 1] });
      if (values[j] <= current) {
        break;
      }

      writeValue(values, events, j + 1, values[j]);
      j -= 1;
    }

    writeValue(values, events, j + 1, current);
    events.push({ type: "markSorted", indices: allIndices(i + 1) });
  }

  events.push({ type: "clearHighlights" });
  return events;
};

export const mergeSort = (input: number[]): SortEvent[] => {
  const values = [...input];
  const events: SortEvent[] = [];

  const merge = (left: number, middle: number, right: number): void => {
    const leftValues = values.slice(left, middle + 1);
    const rightValues = values.slice(middle + 1, right + 1);
    let leftIndex = 0;
    let rightIndex = 0;
    let writeIndex = left;

    while (leftIndex < leftValues.length && rightIndex < rightValues.length) {
      events.push({
        type: "compare",
        indices: [left + leftIndex, middle + 1 + rightIndex],
      });

      if (leftValues[leftIndex] <= rightValues[rightIndex]) {
        writeValue(values, events, writeIndex, leftValues[leftIndex]);
        leftIndex += 1;
      } else {
        writeValue(values, events, writeIndex, rightValues[rightIndex]);
        rightIndex += 1;
      }

      writeIndex += 1;
    }

    while (leftIndex < leftValues.length) {
      writeValue(values, events, writeIndex, leftValues[leftIndex]);
      leftIndex += 1;
      writeIndex += 1;
    }

    while (rightIndex < rightValues.length) {
      writeValue(values, events, writeIndex, rightValues[rightIndex]);
      rightIndex += 1;
      writeIndex += 1;
    }
  };

  const divide = (left: number, right: number): void => {
    if (left >= right) {
      return;
    }

    const middle = Math.floor((left + right) / 2);
    divide(left, middle);
    divide(middle + 1, right);
    merge(left, middle, right);
  };

  divide(0, values.length - 1);
  events.push({ type: "markSorted", indices: allIndices(values.length) });
  events.push({ type: "clearHighlights" });
  return events;
};

export const quickSort = (input: number[]): SortEvent[] => {
  const values = [...input];
  const events: SortEvent[] = [];

  const partition = (low: number, high: number): number => {
    const pivot = values[high];
    let pivotIndex = low;

    for (let i = low; i < high; i += 1) {
      events.push({ type: "compare", indices: [i, high] });

      if (values[i] < pivot) {
        if (i !== pivotIndex) {
          swapValues(values, events, i, pivotIndex);
        }

        pivotIndex += 1;
      }
    }

    if (pivotIndex !== high) {
      swapValues(values, events, pivotIndex, high);
    }

    events.push({ type: "markSorted", indices: [pivotIndex] });
    return pivotIndex;
  };

  const sortRange = (low: number, high: number): void => {
    if (low > high) {
      return;
    }

    if (low === high) {
      events.push({ type: "markSorted", indices: [low] });
      return;
    }

    const pivotIndex = partition(low, high);
    sortRange(low, pivotIndex - 1);
    sortRange(pivotIndex + 1, high);
  };

  sortRange(0, values.length - 1);
  events.push({ type: "clearHighlights" });
  return events;
};

export const algorithms: AlgorithmDefinition[] = [
  { id: "bubble", label: "Bubble Sort", sort: bubbleSort },
  { id: "selection", label: "Selection Sort", sort: selectionSort },
  { id: "insertion", label: "Insertion Sort", sort: insertionSort },
  { id: "merge", label: "Merge Sort", sort: mergeSort },
  { id: "quick", label: "Quick Sort", sort: quickSort },
];
