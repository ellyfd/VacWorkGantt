import { useState } from 'react';

export function useDragState() {
  const [isDragging, setIsDragging] = useState(false);
  const [dragTaskId, setDragTaskId] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);

  return {
    isDragging, setIsDragging,
    dragTaskId, setDragTaskId,
    dragStart, setDragStart,
    dragEnd, setDragEnd,
  };
}