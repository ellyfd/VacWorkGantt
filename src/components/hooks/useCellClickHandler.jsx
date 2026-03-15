import { useRef, useCallback } from 'react';

/**
 * 共用雙擊偵測 hook：單擊→請假，雙擊→刪除連續假期
 *
 * @param {Object} opts
 * @param {boolean} opts.rangeMode - 是否處於區間模式
 * @param {React.RefObject} opts.selectedLeaveTypeIdRef - 當前選中假別 ref
 * @param {Function} opts.onSingleClick - 單擊回呼 (records, ...extraArgs) => void
 * @param {Function} opts.onDoubleClick - 雙擊回呼 (targetRecord) => void
 * @param {Function} opts.onRangeClick - 區間模式點擊回呼 (...extraArgs) => void
 */
export function useCellClickHandler({
  rangeMode,
  selectedLeaveTypeIdRef,
  onSingleClick,
  onDoubleClick,
  onRangeClick,
}) {
  const clickTimerRef = useRef(null);

  const handleCellClick = useCallback(
    (records, ...extraArgs) => {
      const targetRecord = records.full || records.AM || records.PM;

      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
        if (targetRecord && !rangeMode) onDoubleClick(targetRecord);
        return;
      }

      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        if (rangeMode && onRangeClick) {
          onRangeClick(...extraArgs);
        } else if (selectedLeaveTypeIdRef.current) {
          onSingleClick(...extraArgs, selectedLeaveTypeIdRef.current);
        }
      }, 250);
    },
    [rangeMode, onSingleClick, onDoubleClick, onRangeClick],
  );

  return handleCellClick;
}
