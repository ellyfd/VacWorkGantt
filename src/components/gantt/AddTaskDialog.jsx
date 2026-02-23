import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function AddTaskDialog({
  open,
  onOpenChange,
  taskFormData,
  setTaskFormData,
  onConfirm,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增任務</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>任務名稱 *</Label>
            <Input
              value={taskFormData.name}
              onChange={(e) => setTaskFormData({ ...taskFormData, name: e.target.value })}
              placeholder="例：SPR raised in Centric"
              className="mt-1"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={taskFormData.is_important}
              onChange={(e) => setTaskFormData({ ...taskFormData, is_important: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">標記為重要（黃色里程碑）</span>
          </label>
          <div>
            <Label>備註</Label>
            <Input
              value={taskFormData.note}
              onChange={(e) => setTaskFormData({ ...taskFormData, note: e.target.value })}
              placeholder="選填"
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button
            onClick={onConfirm}
            disabled={!taskFormData.name}
            className="bg-blue-600 hover:bg-blue-700"
          >
            新增
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}