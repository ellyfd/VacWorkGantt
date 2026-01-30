import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2 } from 'lucide-react';

const TIME_TYPES = [
  { value: 'milestone', label: '里程碑 (時間點)' },
  { value: 'duration', label: '時間區間' },
  { value: 'rolling', label: '持續進行' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: '待處理' },
  { value: 'progress', label: '進行中' },
  { value: 'done', label: '完成' },
  { value: 'delayed', label: '延遲' },
];

export default function GanttEditDialog({
  isOpen,
  onClose,
  item,
  itemType,
  employees,
  onSave,
  onDelete,
  isSubmitting
}) {
  const [formData, setFormData] = useState({
    name: '',
    phase_type: '',
    assignee_id: '',
    time_type: 'duration',
    start_date: '',
    end_date: '',
    date: '',
    status: 'pending',
  });

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        phase_type: item.phase_type || '',
        assignee_id: item.assignee_id || '',
        time_type: item.time_type || 'duration',
        start_date: item.start_date || '',
        end_date: item.end_date || '',
        date: item.date || '',
        status: item.status || 'pending',
      });
    }
  }, [item]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...item, ...formData });
  };

  const handleDelete = () => {
    if (window.confirm(`確定要刪除這個${itemType === 'phase' ? '階段' : '任務'}嗎？`)) {
      onDelete(item.id);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            編輯{itemType === 'phase' ? '階段' : '任務'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {itemType === 'task' && (
            <div>
              <Label htmlFor="name">任務名稱</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1"
              />
            </div>
          )}

          {itemType === 'phase' && (
            <div>
              <Label>階段類型</Label>
              <div className="mt-1 text-sm font-medium text-gray-700">
                {formData.phase_type}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="assignee">負責人</Label>
            <Select
              value={formData.assignee_id}
              onValueChange={(value) => setFormData({ ...formData, assignee_id: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="選擇負責人" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>無</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="timeType">時間類型</Label>
            <Select
              value={formData.time_type}
              onValueChange={(value) => setFormData({ ...formData, time_type: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.time_type === 'milestone' ? (
            <div>
              <Label htmlFor="date">日期</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="mt-1"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">開始日期</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="endDate">結束日期</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="status">狀態</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex justify-between pt-4">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              刪除
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    儲存中...
                  </>
                ) : (
                  '儲存'
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}