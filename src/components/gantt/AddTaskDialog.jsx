import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AddTaskDialog = React.memo(function AddTaskDialog({ open, onOpenChange, taskFormData, setTaskFormData, onConfirm, samplesForProject = [], categories = [] }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>新增任務</DialogTitle>
          <DialogDescription>選擇樣品與時間類型；日期也可以在建立後從甘特圖上設定。</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">

          {/* 樣品必選 */}
          <div>
            <Label>樣品 <span className="text-red-500" aria-hidden="true">*</span></Label>
            <select
              value={taskFormData.sample_id || ''}
              onChange={(e) => {
                const sample = samplesForProject.find(s => s.id === e.target.value);
                setTaskFormData({
                  ...taskFormData,
                  sample_id: e.target.value,
                  name: sample ? (sample.short_name || sample.name) : '',
                });
              }}
              className="mt-1.5 h-10 w-full border border-gray-300 rounded-md bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">選擇樣品...</option>
              {samplesForProject.map(s => (
                <option key={s.id} value={s.id}>{s.short_name || s.name}</option>
              ))}
            </select>
            {taskFormData.name && (
              <p className="mt-1.5 text-xs text-gray-500">任務名稱將使用：<span className="font-medium text-gray-700">{taskFormData.name}</span></p>
            )}
          </div>

          {/* 分類 */}
          {categories.length > 0 ? (
            <div>
              <Label>Category</Label>
              <Select
                value={taskFormData.category || ''}
                onValueChange={(val) => setTaskFormData({ ...taskFormData, category: val })}
              >
                <SelectTrigger className="mt-1.5">
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
            taskFormData.sample_id && (
              <p className="text-xs text-gray-400">
                如需設定 category，請至「專案設定 &gt; 品牌管理」新增。
              </p>
            )
          )}

          {/* 時間設定（選填） */}
          <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3.5">
            <Label className="mb-1 block text-gray-700">
              時間設定 <span className="text-gray-400 font-normal">（選填）</span>
            </Label>
            <p className="mb-3 text-xs text-gray-500">未選擇時，可在新增後直接於甘特時間軸畫出日期。</p>
            <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="時間類型">
              {[
                { value: 'milestone', label: '◆ 里程碑' },
                { value: 'duration', label: '▬ 區間' },
                { value: 'rolling', label: '▶ Rolling' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTaskFormData({ 
                    ...taskFormData, 
                    time_type: taskFormData.time_type === opt.value ? '' : opt.value,
                    start_date: '', 
                    end_date: '' 
                  })}
                  aria-pressed={taskFormData.time_type === opt.value}
                  className={`h-9 text-xs px-1.5 rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
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
                <Input type="date" value={taskFormData.start_date} className="mt-1"
                  onChange={(e) => setTaskFormData({ ...taskFormData, start_date: e.target.value })} />
              </div>
            )}

            {taskFormData.time_type === 'duration' && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">開始</Label>
                  <Input type="date" value={taskFormData.start_date} className="mt-1"
                    onChange={(e) => setTaskFormData({ ...taskFormData, start_date: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">結束</Label>
                  <Input type="date" value={taskFormData.end_date} min={taskFormData.start_date} className="mt-1"
                    onChange={(e) => setTaskFormData({ ...taskFormData, end_date: e.target.value })} />
                </div>
              </div>
            )}

            {taskFormData.time_type === 'rolling' && (
              <div className="mt-3">
                <Label className="text-xs">開始日期</Label>
                <Input type="date" value={taskFormData.start_date} className="mt-1"
                  onChange={(e) => setTaskFormData({ ...taskFormData, start_date: e.target.value })} />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button
            onClick={onConfirm}
            disabled={!taskFormData.sample_id}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {taskFormData.time_type ? '新增任務' : '新增後選擇日期 →'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default AddTaskDialog;
