import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// 編輯任務對話框（自 GanttChart 抽出；維持 always-mounted + open prop 模式）
export default function EditTaskDialog({
  open,
  onOpenChange,
  editingTask,
  setEditingTask,
  categories,
  onSave,
  onDelete,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>編輯任務</DialogTitle>
        </DialogHeader>
        {editingTask && (
          <div className="space-y-4 py-2">
            <div>
              <Label>樣品</Label>
              <div className="mt-1 flex items-center h-10 px-3 border border-gray-300 rounded-md text-sm bg-gray-50">
                {editingTask.name || '未設定'}
              </div>
            </div>
            {categories.length > 0 ? (
              <div>
                <Label className="text-xs">Category</Label>
                <Select
                  value={editingTask.category || ''}
                  onValueChange={(val) => setEditingTask({ ...editingTask, category: val })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="選擇 category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                如需設定 category，請至「專案設定 &gt; 品牌管理」新增。
              </p>
            )}
            <div className="border-t pt-4">
              <Label className="mb-2 block text-gray-600">時間類型</Label>
              <div className="flex gap-1.5">
                {[
                  { value: 'milestone', label: '◆ 里程碑' },
                  { value: 'duration', label: '▬ 區間' },
                  { value: 'rolling', label: '▶ Rolling' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEditingTask({
                      ...editingTask,
                      time_type: editingTask.time_type === opt.value ? '' : opt.value,
                      start_date: '',
                      end_date: ''
                    })}
                    className={`flex-1 text-xs px-1.5 py-1.5 rounded border transition-colors ${
                      editingTask.time_type === opt.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {editingTask.time_type === 'milestone' && (
                <div className="mt-3">
                  <Label className="text-xs">日期</Label>
                  <Input type="date" value={editingTask.start_date || ''} className="mt-1"
                    onChange={(e) => setEditingTask({ ...editingTask, start_date: e.target.value })} />
                </div>
              )}
              {editingTask.time_type === 'duration' && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">開始</Label>
                    <Input type="date" value={editingTask.start_date || ''} className="mt-1"
                      onChange={(e) => setEditingTask({ ...editingTask, start_date: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">結束</Label>
                    <Input type="date" value={editingTask.end_date || ''} className="mt-1"
                      min={editingTask.start_date}
                      onChange={(e) => setEditingTask({ ...editingTask, end_date: e.target.value })} />
                  </div>
                </div>
              )}
              {editingTask.time_type === 'rolling' && (
                <div className="mt-3">
                  <Label className="text-xs">開始日期</Label>
                  <Input type="date" value={editingTask.start_date || ''} className="mt-1"
                    onChange={(e) => setEditingTask({ ...editingTask, start_date: e.target.value })} />
                </div>
              )}
            </div>
          </div>
        )}
        <DialogFooter className="flex justify-between">
          <Button variant="destructive" size="sm" onClick={onDelete}>
            刪除
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>取消</Button>
            <Button size="sm" onClick={onSave} disabled={!editingTask?.name} className="bg-blue-600 hover:bg-blue-700">
              儲存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
