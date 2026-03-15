import React, { useMemo } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { getContrastColor, getLightColor, getSoftBarColor, getDarkTextColor, normalizeDate } from '@/lib/ganttUtils';

const dropIndicatorStyle = { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: '#3b82f6', zIndex: 50 };
const taskOverlayStyle = { position: 'absolute', inset: 0, pointerEvents: 'none' };
const milestoneTextStyle = { fontSize: 13, fontWeight: 500 };
const categoryStyle = { fontSize: 11, marginLeft: 4, opacity: 0.7 };
const workingDaysStyle = { fontSize: 11, opacity: 0.8, marginLeft: 4 };
const rollingContainerStyle = { position: 'relative', width: '100%', height: '100%', overflow: 'hidden' };

const GanttRow = React.memo(function GanttRow({
  row,
  days,
  dayCellPropsMap,
  dayIndexMap,
  tasks,
  projectColor,
  workingDaysMap,
  isDragging,
  dragTaskId,
  dragStart,
  dragEnd,
  dropTargetId,
  gridStyle,
  CELL_WIDTH,
  ROW_HEIGHT,
  onEditTask,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onDragLeave,
}) {
  const textColor = getDarkTextColor(projectColor);

  // 找最近可見日期的 index
  const findVisibleIdx = (dateStr, direction = 'forward') => {
    if (dayIndexMap[dateStr] !== undefined) return dayIndexMap[dateStr];
    const date = new Date(dateStr);
    for (let i = 1; i <= 7; i++) {
      const tryStr = format(
        direction === 'forward' ? addDays(date, i) : subDays(date, i),
        'yyyy-MM-dd'
      );
      if (dayIndexMap[tryStr] !== undefined) return dayIndexMap[tryStr];
    }
    return -1;
  };

  const taskBars = useMemo(() => {
    return tasks.map(task => {
      if (!task.start_date) return null;

      const startDateStr = normalizeDate(task.start_date);
      const endDateStr = normalizeDate(task.end_date);
      if (!startDateStr) return null;

      const startIdx = findVisibleIdx(startDateStr, 'forward');
      if (startIdx < 0) return null;

      let left, width, bgColor;

      if (task.time_type === 'milestone') {
        left = startIdx * CELL_WIDTH + CELL_WIDTH / 2 - 8;
        width = 'auto';
        bgColor = 'transparent';
      } else if (task.time_type === 'duration') {
        if (!endDateStr) return null;
        const endIdx = findVisibleIdx(endDateStr, 'backward');
        if (endIdx < 0) return null;
        left = startIdx * CELL_WIDTH + 2;
        width = (endIdx - startIdx + 1) * CELL_WIDTH - 4;
        bgColor = getSoftBarColor(projectColor);
      } else if (task.time_type === 'rolling') {
        left = startIdx * CELL_WIDTH + 2;
        width = (days.length - startIdx) * CELL_WIDTH - 4;
        bgColor = getSoftBarColor(projectColor);
      } else {
        return null;
      }

      const workingDays = workingDaysMap[task.id] || 0;

      return (
        <div
          key={task.id}
          style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            left,
            width: width === 'auto' ? undefined : width,
            height: 22,
            borderRadius: 4,
            backgroundColor: bgColor,
            border: `1px solid ${projectColor}40`,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 8px',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            pointerEvents: 'auto',
            cursor: 'pointer',
            zIndex: 10,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onEditTask(task);
          }}
        >
          {task.time_type === 'milestone' && (
            <div className="flex items-center gap-1">
              <div style={{
                width: 12, height: 12,
                transform: 'rotate(45deg)',
                backgroundColor: task.is_important ? '#eab308' : projectColor,
                border: '1px solid rgba(0,0,0,0.12)',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 13, color: textColor, fontWeight: 600 }}>
                {task.name}
                {task.category && (
                  <span style={categoryStyle}>({task.category})</span>
                )}
              </span>
            </div>
          )}
          {task.time_type === 'duration' && (
            <span style={{ fontSize: 13, color: textColor, fontWeight: 600 }}>
              {task.name}
              {task.category && (
                <span style={{ fontSize: 11, marginLeft: 4, opacity: 0.8 }}>({task.category})</span>
              )}
              {workingDays > 0 && (
                <span style={workingDaysStyle}>
                  {workingDays}d
                </span>
              )}
            </span>
          )}
          {task.time_type === 'rolling' && (
            <div style={rollingContainerStyle}>
              <div style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(to right, ${getLightColor(projectColor)}, transparent)`,
                pointerEvents: 'none',
              }} />
              <span style={{ fontSize: 13, color: textColor, fontWeight: 600, position: 'relative', zIndex: 1 }}>
                {task.name}
                {task.category && (
                  <span style={categoryStyle}>({task.category})</span>
                )}
              </span>
            </div>
          )}
        </div>
      );
    });
  }, [tasks, dayIndexMap, days.length, CELL_WIDTH, projectColor, workingDaysMap, onEditTask]);

  // 計算 drag 高亮
  const dragHighlightDates = useMemo(() => {
    const hasDragOnRow = isDragging && tasks.some(t => t.id === dragTaskId);
    if (!hasDragOnRow || !dragStart || !dragEnd) return null;
    const s = format(dragStart < dragEnd ? dragStart : dragEnd, 'yyyy-MM-dd');
    const e = format(dragStart < dragEnd ? dragEnd : dragStart, 'yyyy-MM-dd');
    return { s, e };
  }, [isDragging, dragTaskId, dragStart, dragEnd, tasks]);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onDragLeave={onDragLeave}
      style={{
        position: 'relative',
        borderBottom: '1px solid #e5e7eb',
        height: ROW_HEIGHT,
        cursor: 'move',
        userSelect: 'none',
      }}
    >
      {dropTargetId && (
        <div style={dropIndicatorStyle} />
      )}
      {/* 底層：格子背景 */}
      <div style={{ ...gridStyle, position: 'absolute', inset: 0 }}>
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const props = dayCellPropsMap[dateStr];
          const isInDragRange = dragHighlightDates && dateStr >= dragHighlightDates.s && dateStr <= dragHighlightDates.e;
          const bgColor = isInDragRange ? '#bfdbfe' : props.bgColor;
          return (
            <div
              key={dateStr}
              style={{
                height: ROW_HEIGHT,
                borderRight: '1px solid #d1d5db',
                borderLeft: props.isFirstOfMonth ? '2px solid #6b7280' : undefined,
                backgroundColor: bgColor,
                backgroundImage: props.bgPattern
                  ? 'repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(0,0,0,0.03) 3px, rgba(0,0,0,0.03) 4px)'
                  : undefined,
                position: 'relative',
              }}
            >
              {props.isToday && <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />}
              {props.isToday && <div className="absolute left-1/2 -translate-x-px top-0 bottom-0 w-[2px] bg-blue-500/70 pointer-events-none z-20" />}
            </div>
          );
        })}
      </div>
      {/* 上層：Task bars */}
      <div style={taskOverlayStyle}>
        {taskBars}
      </div>
    </div>
  );
});

export default GanttRow;