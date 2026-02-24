import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Trash2, Plus } from 'lucide-react';

const COLORS = [
  '#3b82f6','#8b5cf6','#10b981','#f59e0b',
  '#ef4444','#ec4899','#06b6d4','#6b7280'
];

export default function EditProjectDialog({ 
  open, onOpenChange, project, setProject, onSave,
  projectTasks, onUpdateTask, onDeleteTask, onCreateTask
}) {
  const [newTaskName, setNewTaskName] = React.useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>編輯開發季</DialogTitle>
        </DialogHeader>
        {project && (
          <div className="space-y-5 py-2">

            {/* 名稱 */}
            <div>
              <Label>開發季名稱</Label>
              <Input
                value={project.name}
                onChange={(e) => setProject({ ...project, name: e.target.value })}
                className="mt-1"
              />
            </div>

            {/* 顏色 */}
            <div>
              <Label className="mb-2 block">顏色</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} type="button"
                    onClick={() => setProject({ ...project, color: c })}
                    className="w-7 h-7 rounded-full transition-all"
                    style={{
                      backgroundColor: c,
                      outline: project.color === c ? `3px solid ${c}` : '3px solid transparent',
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* 任務列表 */}
            <div>
              <Label className="mb-2 block">任務列表</Label>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {projectTasks.length === 0 && (
                  <p className="text-xs text-gray-400 py-2 text-center">尚無任務</p>
                )}
                {projectTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-2 group">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.color || '#3b82f6' }} />
                    <Input
                      value={task.name}
                      onChange={(e) => onUpdateTask(task.id, { ...task, name: e.target.value })}
                      className="h-8 text-sm flex-1"
                    />
                    {task.time_type && (
                      <span className="text-[10px] text-gray-400 flex-shrink-0 w-12 text-center">
                        {task.time_type === 'milestone' ? '◆ 里程碑' :
                         task.time_type === 'duration' ? '▬ 區間' : '▶ Rolling'}
                      </span>
                    )}
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* 新增任務 */}
              <div className="flex gap-2 mt-3">
                <Input
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="新增任務名稱..."
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTaskName.trim()) {
                      onCreateTask(newTaskName.trim());
                      setNewTaskName('');
                    }
                  }}
                />
                <Button size="sm" variant="outline"
                  disabled={!newTaskName.trim()}
                  onClick={() => { onCreateTask(newTaskName.trim()); setNewTaskName(''); }}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={onSave} className="bg-blue-600 hover:bg-blue-700">儲存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}