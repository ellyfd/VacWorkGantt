import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AddTaskDialog({ open, onOpenChange, taskFormData, setTaskFormData, onConfirm, samplesForProject = [], categories = [] }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>新增任務</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">

          {/* 樣品必選 */}
          <div>
            <Label>樣品 *</Label>
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
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">選擇樣品...</option>
              {samplesForProject.map(s => (
                <option key={s.id} value={s.id}>{s.short_name || s.name}</option>
              ))}
            </select>
            {taskFormData.name && (
              <p className="mt-1 text-xs text-gray-400">任務名稱：{taskFormData.name}</p>
            )}
          </div>

          {/* 分類 */}
          {categories.length > 0 && (
            <div>
              <Label>分類</Label>
              <Select
                value={taskFormData.category || ''}
                onValueChange={(val) => setTaskFormData({ ...taskFormData, category: val })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="選擇分類" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 時間設定（選填） */}
          <div className="border-t pt-4">
            <Label className="mb-2 block text-gray-600">
              時間設定 <span className="text-gray-400 font-normal">（選填）</span>
            </Label>
            <div className="flex gap-1.5">
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
                  className={`flex-1 text-xs px-1.5 py-1.5 rounded border transition-colors ${
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button
            onClick={onConfirm}
            disabled={!taskFormData.sample_id}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {taskFormData.time_type ? '新增' : '新增並畫日期 →'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}