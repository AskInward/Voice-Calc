export enum OperationType {
  ADD = 'ADD',
  SUBTRACT = 'SUBTRACT',
  MULTIPLY = 'MULTIPLY',
  DIVIDE = 'DIVIDE',
  RESET = 'RESET',
  UNKNOWN = 'UNKNOWN'
}

export interface HistoryItem {
  id: string;
  value: number;
  operation: OperationType;
  timestamp: number;
}

export interface CalculatorState {
  currentTotal: number;
  history: HistoryItem[];
  isListening: boolean;
  transcript: string; // Last heard phrase
}

export interface Stats {
  min: number;
  max: number;
  avg: number;
  median: number;
  count: number;
}