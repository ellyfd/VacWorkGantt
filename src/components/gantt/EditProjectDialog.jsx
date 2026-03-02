import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';

const COLORS = [
  '#3b82f6','#8b5cf6','#10b981','#f59e0b',
  '#ef4444','#ec4899','#06b6d4','#6b7280'
];

export default function EditProjectDialog({ 
  open, onOpenChange, project, setProject, onSave,
  projectTasks, onUpdateTask, onDeleteTask, onCreateTask
}) {
  const navigate = useNavigate();
  const [newTaskName, setNewTaskName] = React.useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
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

            {/* 顏色 - 唯讀 */}
            <div>
              <Label>顏色</Label>
              <div className="mt-2 flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full border-2 border-white shadow"
                  style={{ backgroundColor: project?.color || '#3b82f6' }}
                />
                <span className="text-sm text-gray-400">顏色由品牌設定決定</span>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    navigate('/ProjectSettings?tab=projects');
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  前往修改 →
                </button>
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
                   <div key={task.id} className="space-y-2 p-3 border rounded-lg bg-gray-50">
                     {/* 第一行：顏色點 + 名稱 + 刪除 */}
                     <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.color || '#3b82f6' }} />
                       <span className="flex-1 h-8 text-sm flex items-center">{task.name}</span>
                       <button
                         onClick={() => onDeleteTask(task.id)}
                         className="p-1 hover:bg-red-100 rounded text-red-500"
                       >
                         <Trash2 className="w-3.5 h-3.5" />
                       </button>
                     </div>

                    {/* 第二行：時間類型（獨立一行） */}
                    <div className="pl-4">
                      <Select
                        value={task.time_type || ''}
                        onValueChange={(val) =>
                          onUpdateTask(task.id, {
                            ...task,
                            time_type: val,
                            start_date: '',
                            end_date: '',
                          })
                        }
                      >
                        <SelectTrigger className="h-7 text-xs w-full">
                          <SelectValue placeholder="不設定時間" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>不設定</SelectItem>
                          <SelectItem value="milestone">◆ 里程碑</SelectItem>
                          <SelectItem value="duration">▬ 區間</SelectItem>
                          <SelectItem value="rolling">▶ Rolling</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 第三行：日期欄位（依類型顯示） */}
                    {task.time_type === 'milestone' && (
                      <div className="pl-4">
                        <Input
                          type="date"
                          value={task.start_date || ''}
                          onChange={(e) =>
                            onUpdateTask(task.id, { ...task, start_date: e.target.value })
                          }
                          className="h-7 text-xs w-full"
                        />
                      </div>
                    )}

                    {task.time_type === 'duration' && (
                      <div className="pl-4 flex items-center gap-2">
                        <Input
                          type="date"
                          value={task.start_date || ''}
                          onChange={(e) =>
                            onUpdateTask(task.id, { ...task, start_date: e.target.value })
                          }
                          className="h-7 text-xs flex-1"
                        />
                        <span className="text-gray-400 text-xs flex-shrink-0">～</span>
                        <Input
                          type="date"
                          value={task.end_date || ''}
                          min={task.start_date}
                          onChange={(e) =>
                            onUpdateTask(task.id, { ...task, end_date: e.target.value })
                          }
                          className="h-7 text-xs flex-1"
                        />
                      </div>
                    )}

                    {task.time_type === 'rolling' && (
                      <div className="pl-4">
                        <Input
                          type="date"
                          value={task.start_date || ''}
                          onChange={(e) =>
                            onUpdateTask(task.id, { ...task, start_date: e.target.value })
                          }
                          className="h-7 text-xs w-full"
                        />
                      </div>
                    )}
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