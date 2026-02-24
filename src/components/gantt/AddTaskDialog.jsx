import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function AddTaskDialog({ open, onOpenChange, taskFormData, setTaskFormData, onConfirm }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>新增任務</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* 任務名稱 */}
          <div>
            <Label>任務名稱 *</Label>
            <Input
              value={taskFormData.name}
              onChange={(e) => setTaskFormData({ ...taskFormData, name: e.target.value })}
              placeholder="例：SPR raised in Centric"
              className="mt-1"
              autoFocus
            />
          </div>

          {/* 時間設定（選填） */}
          <div className="border-t pt-4">
            <Label className="mb-2 block text-gray-600">
              時間設定 <span className="text-gray-400 font-normal">（選填，可之後在甘特圖上拖曳）</span>
            </Label>
            <div className="flex gap-2">
              {[
                { value: '', label: '不設定' },
                { value: 'milestone', label: '◆ 里程碑' },
                { value: 'duration', label: '▬ 區間' },
                { value: 'rolling', label: '▶ Rolling' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTaskFormData({ ...taskFormData, time_type: opt.value, start_date: '', end_date: '' })}
                  className={`flex-1 text-xs px-2 py-1.5 rounded border transition-colors ${
                    taskFormData.time_type === opt.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {taskFormData.time_type === 'milestone' && (
              <div className="mt-3">
                <Label className="text-xs">日期</Label>
                <Input
                  type="date"
                  value={taskFormData.start_date}
                  onChange={(e) => setTaskFormData({ ...taskFormData, start_date: e.target.value })}
                  className="mt-1"
                />
              </div>
            )}

            {taskFormData.time_type === 'duration' && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">開始日期</Label>
                  <Input
                    type="date"
                    value={taskFormData.start_date}
                    onChange={(e) => setTaskFormData({ ...taskFormData, start_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">結束日期</Label>
                  <Input
                    type="date"
                    value={taskFormData.end_date}
                    min={taskFormData.start_date}
                    onChange={(e) => setTaskFormData({ ...taskFormData, end_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {taskFormData.time_type === 'rolling' && (
              <div className="mt-3">
                <Label className="text-xs">開始日期</Label>
                <Input
                  type="date"
                  value={taskFormData.start_date}
                  onChange={(e) => setTaskFormData({ ...taskFormData, start_date: e.target.value })}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button
            onClick={onConfirm}
            disabled={!taskFormData.name}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {taskFormData.time_type ? '新增' : '新增並畫日期 →'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}