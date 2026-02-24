import { useState } from 'react';

export function useSelectionState() {
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [contextMenuDate, setContextMenuDate] = useState(null);
  const [firstDate, setFirstDate] = useState(null);
  const [secondDate, setSecondDate] = useState(null);
  const [drawingMode, setDrawingMode] = useState(false);
  const [pendingTask, setPendingTask] = useState(null);

  const clearSelection = () => {
    setSelectedTaskId(null);
    setFirstDate(null);
    setSecondDate(null);
    setDrawingMode(false);
    setPendingTask(null);
  };

  return {
    selectedTaskId, setSelectedTaskId,
    contextMenuDate, setContextMenuDate,
    firstDate, setFirstDate,
    secondDate, setSecondDate,
    drawingMode, setDrawingMode,
    pendingTask, setPendingTask,
    clearSelection,
  };
}