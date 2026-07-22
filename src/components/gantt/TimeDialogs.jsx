import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Diamond, ArrowRight, Repeat, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const TimeDialogShell = React.memo(function TimeDialogShell({
  open,
  onOpenChange,
  icon,
  title,
  description,
  taskName,
  onConfirm,
  onClearTime,
  confirmClassName = 'bg-blue-600 hover:bg-blue-700',
  children,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-3 space-y-3">
            <div className="flex justify-between items-start gap-4">
              <span className="text-sm text-gray-500">任務</span>
              <span className="font-medium text-gray-900 text-right">{taskName}</span>
            </div>
            {children}
          </div>
        </div>
        <DialogFooter className="border-t pt-4 sm:justify-between">
          <Button variant="ghost" onClick={onClearTime} className="text-red-600 hover:text-red-700 hover:bg-red-50">
            <Trash2 className="w-4 h-4 mr-1.5" />清除時間
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button onClick={onConfirm} className={confirmClassName}>套用設定</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export const MilestoneDialog = React.memo(function MilestoneDialog({
  open, onOpenChange, taskName, firstDate, onConfirm, onClearTime,
}) {
  return (
    <TimeDialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={<Diamond className="w-5 h-5 text-blue-500" />}
      title="設定里程碑"
      description="將此任務設為單一時間點的里程碑"
      taskName={taskName}
      onConfirm={onConfirm}
      onClearTime={onClearTime}
    >
      <div className="flex justify-between items-center gap-4 border-t border-gray-200 pt-3">
        <span className="text-sm text-gray-500">日期</span>
        <span className="font-medium text-blue-600">
          {firstDate && format(firstDate, 'yyyy/MM/dd')}
        </span>
      </div>
    </TimeDialogShell>
  );
});

export const DurationDialog = React.memo(function DurationDialog({
  open, onOpenChange, taskName, firstDate, secondDate, getSortedDates, onConfirm, onClearTime,
}) {
  return (
    <TimeDialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={<ArrowRight className="w-5 h-5 text-blue-500" />}
      title="設定時間區間"
      description="設定任務的開始和結束日期"
      taskName={taskName}
      onConfirm={onConfirm}
      onClearTime={onClearTime}
    >
      <div className="flex justify-between items-center gap-4 border-t border-gray-200 pt-3">
        <span className="text-sm text-gray-500">開始日期</span>
        <span className="font-medium text-blue-600">
          {firstDate && format(getSortedDates().start, 'yyyy/MM/dd')}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">結束日期</span>
        <span className="font-medium text-green-600">
          {secondDate
            ? format(getSortedDates().end, 'yyyy/MM/dd')
            : firstDate && format(firstDate, 'yyyy/MM/dd') + ' (同一天)'
          }
        </span>
      </div>
      {!secondDate && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 p-2.5 rounded-md">
          提示：在甘特圖上點選第二個日期，即可設定區間範圍。
        </p>
      )}
    </TimeDialogShell>
  );
});

export const RollingDialog = React.memo(function RollingDialog({
  open, onOpenChange, taskName, firstDate, onConfirm, onClearTime,
}) {
  return (
    <TimeDialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={<Repeat className="w-5 h-5 text-purple-500" />}
      title="設定 Rolling"
      description="從指定日期開始持續進行的任務"
      taskName={taskName}
      onConfirm={onConfirm}
      onClearTime={onClearTime}
      confirmClassName="bg-purple-600 hover:bg-purple-700"
    >
      <div className="flex justify-between items-center gap-4 border-t border-gray-200 pt-3">
        <span className="text-sm text-gray-500">開始日期</span>
        <span className="font-medium text-purple-600">
          {firstDate && format(firstDate, 'yyyy/MM/dd')}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">結束日期</span>
        <span className="text-gray-400">持續進行 →</span>
      </div>
    </TimeDialogShell>
  );
});
