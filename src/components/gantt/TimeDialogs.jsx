import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Diamond, ArrowRight, Repeat } from 'lucide-react';
import { format } from 'date-fns';

export const MilestoneDialog = React.memo(function MilestoneDialog({
  open,
  onOpenChange,
  taskName,
  firstDate,
  onConfirm,
  onClearTime,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Diamond className="w-5 h-5 text-blue-500" />
            設定里程碑
          </DialogTitle>
          <DialogDescription>
            將此任務設為單一時間點的里程碑
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">任務名稱</span>
            <span className="font-medium">{taskName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">日期</span>
            <span className="font-medium text-blue-600">
              {firstDate && format(firstDate, 'yyyy/MM/dd')}
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={onClearTime}>
            清除時間
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button onClick={onConfirm} className="bg-blue-600 hover:bg-blue-700">確認</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export const DurationDialog = React.memo(function DurationDialog({
  open,
  onOpenChange,
  taskName,
  firstDate,
  secondDate,
  getSortedDates,
  onConfirm,
  onClearTime,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-blue-500" />
            設定時間區間
          </DialogTitle>
          <DialogDescription>
            設定任務的開始和結束日期
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">任務名稱</span>
            <span className="font-medium">{taskName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">開始日期</span>
            <span className="font-medium text-blue-600">
              {firstDate && format(getSortedDates().start, 'yyyy/MM/dd')}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">結束日期</span>
            <span className="font-medium text-green-600">
              {secondDate 
                ? format(getSortedDates().end, 'yyyy/MM/dd')
                : firstDate && format(firstDate, 'yyyy/MM/dd') + ' (同一天)'
              }
            </span>
          </div>
          {!secondDate && (
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
              💡 提示：可以在甘特圖上點選第二個日期來設定區間範圍
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={onClearTime}>
            清除時間
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button onClick={onConfirm} className="bg-blue-600 hover:bg-blue-700">確認</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export const RollingDialog = React.memo(function RollingDialog({
  open,
  onOpenChange,
  taskName,
  firstDate,
  onConfirm,
  onClearTime,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-purple-500" />
            設定 Rolling
          </DialogTitle>
          <DialogDescription>
            從指定日期開始持續進行的任務
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">任務名稱</span>
            <span className="font-medium">{taskName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">開始日期</span>
            <span className="font-medium text-purple-600">
              {firstDate && format(firstDate, 'yyyy/MM/dd')}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">結束日期</span>
            <span className="text-gray-400">持續進行 →</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={onClearTime}>
            清除時間
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button onClick={onConfirm} className="bg-purple-600 hover:bg-purple-700">確認</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});