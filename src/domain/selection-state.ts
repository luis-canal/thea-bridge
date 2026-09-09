export type SelectionState = 'none' | 'partial' | 'all';

export function getSelectionState(total: number, selected: number): SelectionState {
  if (selected === 0 || total === 0) {
    return 'none';
  }

  if (selected === total) {
    return 'all';
  }

  return 'partial';
}