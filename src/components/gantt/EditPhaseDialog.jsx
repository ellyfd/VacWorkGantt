import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Trash2 } from 'lucide-react';

export default function EditPhaseDialog({
  open,
  onOpenChange,
  phase,
  phaseName,
  setPhaseName,
  phaseTasks,
  setPhaseTasks,
  newTaskName,
  setNewTaskName,
  onSave,
  onCreateTask,
  onDeleteTask,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>編輯樣品：{phase?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>樣品名稱</Label>
            <Input
              value={phaseName}
              onChange={(e) => setPhaseName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>任務列表</Label>
              <div className="flex gap-2 items-center">
                <Input
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="新任務名稱"
                  className="h-7 text-xs w-36"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTaskName.trim()) {
                      onCreateTask();
                    }
                  }}
                />
                <button
                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={onCreateTask}
                >
                  + 新增
                </button>
              </div>
            </div>
            <div className="border rounded-lg divide-y max-h-52 overflow-y-auto">
              {phaseTasks.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">尚無任務</p>
              )}
              {phaseTasks.map(task => (
                <div key={task.id} className="flex items-center gap-2 px-3 py-2">
                  <span className="flex-1 text-sm truncate">{task.name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {task.time_type === 'milestone' ? '里程碑' : task.time_type === 'duration' ? '區間' : task.time_type === 'rolling' ? 'Rolling' : '-'}
                  </span>
                  <span className="text-xs text-gray-400 flex-shrink-0 w-20 text-right">
                    {task.start_date || task.date || ''}
                  </span>
                  <button
                    className="text-red-400 hover:text-red-600 flex-shrink-0"
                    onClick={() => onDeleteTask(task.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button
            onClick={onSave}
            className="bg-blue-600 hover:bg-blue-700"
          >
            儲存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}