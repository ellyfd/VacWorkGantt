import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { calculateWorkingDays, normalizeDate } from '@/lib/ganttUtils';

const EditProjectDialog = React.memo(function EditProjectDialog({
  open, onOpenChange, project, setProject, onSave,
  projectTasks, onUpdateTask, onDeleteTask, onCreateTask
}) {
  const navigate = useNavigate();
  const [newTaskName, setNewTaskName] = React.useState('');
  const projectColor = project?.color || '#3b82f6';
  const NO_TIME_TYPE = '__none__';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>編輯開發季</DialogTitle>
          <DialogDescription>修改名稱，或整理這個開發季內既有任務的時間設定。</DialogDescription>
        </DialogHeader>
        {project && (
          <div className="space-y-4 py-1 min-h-0 overflow-hidden flex flex-col">
            {/* 名稱 + 顏色 */}
            <div>
              <Label className="text-sm text-gray-700">開發季名稱</Label>
              <div className="mt-1 flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenChange(false);
                        navigate('/ProjectSettings?tab=projects');
                      }}
                      className="w-9 h-9 rounded-md border border-gray-200 flex-shrink-0 hover:ring-2 hover:ring-blue-300 transition"
                      style={{ backgroundColor: projectColor }}
                      aria-label="顏色由品牌設定決定，點此修改"
                    />
                  </TooltipTrigger>
                  <TooltipContent>顏色由品牌設定決定，點此修改</TooltipContent>
                </Tooltip>
                <Input
                  value={project.name}
                  onChange={(e) => setProject({ ...project, name: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            {/* 任務列表 */}
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <Label className="text-sm text-gray-700">任務列表</Label>
                {projectTasks.length > 0 && (
                  <span className="text-xs text-gray-500 tabular-nums">共 {projectTasks.length} 項</span>
                )}
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {projectTasks.length === 0 && (
                  <p className="text-xs text-gray-400 py-4 text-center">尚無任務</p>
                )}
                {projectTasks.map(task => {
                  const startStr = normalizeDate(task.start_date);
                  const endStr = normalizeDate(task.end_date);
                  const workDays = task.time_type === 'duration' && startStr && endStr
                    ? calculateWorkingDays(startStr, endStr) : 0;
                  const dateLabel = task.time_type === 'milestone' && startStr
                    ? format(new Date(startStr + 'T00:00:00'), 'M/d')
                    : task.time_type === 'duration' && startStr && endStr
                    ? `${format(new Date(startStr + 'T00:00:00'), 'M/d')}–${format(new Date(endStr + 'T00:00:00'), 'M/d')}`
                    : task.time_type === 'rolling' && startStr
                    ? `${format(new Date(startStr + 'T00:00:00'), 'M/d')} →`
                    : null;

                  return (
                    <div key={task.id} className="flex flex-col gap-2 px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50/60 hover:border-gray-300 transition-colors">
                      {/* 第一行：點 + 名稱 + 日期標籤 + 工作天 + 刪除 */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: projectColor }} />
                        <span className="flex-1 text-sm truncate">{task.name}</span>
                        {dateLabel && (
                          <span className="text-[11px] text-gray-500 whitespace-nowrap flex-shrink-0">{dateLabel}</span>
                        )}
                        {workDays > 0 && (
                          <span className="text-[10px] text-gray-600 bg-gray-200 px-1.5 py-0.5 rounded flex-shrink-0">
                            {workDays}d
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteTask(task.id)}
                          className="h-7 w-7 inline-flex items-center justify-center hover:bg-red-50 rounded-md text-gray-400 hover:text-red-600 flex-shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          aria-label={`刪除任務 ${task.name}`}
                          title="刪除任務"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* 第二行：時間類型 + 日期 */}
                      <div className="flex items-center gap-1.5">
                        <Select
                          value={task.time_type || NO_TIME_TYPE}
                          onValueChange={(val) =>
                            onUpdateTask(task.id, {
                              ...task,
                              time_type: val === NO_TIME_TYPE ? null : val,
                              start_date: '',
                              end_date: '',
                            })
                          }
                        >
                          <SelectTrigger className="h-7 text-xs w-28 flex-shrink-0">
                            <SelectValue placeholder="不設定" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_TIME_TYPE}>不設定</SelectItem>
                            <SelectItem value="milestone">◆ 里程碑</SelectItem>
                            <SelectItem value="duration">▬ 區間</SelectItem>
                            <SelectItem value="rolling">▶ Rolling</SelectItem>
                          </SelectContent>
                        </Select>

                        {task.time_type === 'milestone' && (
                          <Input
                            type="date"
                            value={task.start_date || ''}
                            onChange={(e) => onUpdateTask(task.id, { ...task, start_date: e.target.value })}
                            className="h-7 text-xs flex-1 min-w-0"
                          />
                        )}

                        {task.time_type === 'duration' && (
                          <>
                            <Input
                              type="date"
                              value={task.start_date || ''}
                              onChange={(e) => onUpdateTask(task.id, { ...task, start_date: e.target.value })}
                              className="h-7 text-xs flex-1 min-w-0 px-1.5"
                            />
                            <span className="text-gray-400 text-xs flex-shrink-0">~</span>
                            <Input
                              type="date"
                              value={task.end_date || ''}
                              min={task.start_date}
                              onChange={(e) => onUpdateTask(task.id, { ...task, end_date: e.target.value })}
                              className="h-7 text-xs flex-1 min-w-0 px-1.5"
                            />
                          </>
                        )}

                        {task.time_type === 'rolling' && (
                          <Input
                            type="date"
                            value={task.start_date || ''}
                            onChange={(e) => onUpdateTask(task.id, { ...task, start_date: e.target.value })}
                            className="h-7 text-xs flex-1 min-w-0"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 新增任務 */}
              <div className="flex gap-2 mt-3 rounded-lg border border-dashed border-gray-300 bg-white p-2">
                <Input
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="輸入任務名稱…"
                  className="h-9 text-sm border-0 shadow-none focus-visible:ring-0"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTaskName.trim()) {
                      onCreateTask(newTaskName.trim());
                      setNewTaskName('');
                    }
                  }}
                />
                <Button
                  size="sm"
                  disabled={!newTaskName.trim()}
                  onClick={() => { onCreateTask(newTaskName.trim()); setNewTaskName(''); }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />新增
                </Button>
              </div>
            </div>
          </div>
        )}
        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={onSave} className="bg-blue-600 hover:bg-blue-700">儲存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default EditProjectDialog;
