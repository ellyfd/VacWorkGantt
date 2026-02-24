import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const COLORS = [
  { value: '#3b82f6', label: '藍' },
  { value: '#8b5cf6', label: '紫' },
  { value: '#10b981', label: '綠' },
  { value: '#f59e0b', label: '橘' },
  { value: '#ef4444', label: '紅' },
  { value: '#ec4899', label: '粉' },
  { value: '#06b6d4', label: '青' },
  { value: '#6b7280', label: '灰' },
];

export default function AddProjectDialog({ open, onOpenChange, projectFormData, setProjectFormData, projects, onConfirm, isLoading }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>新增開發季</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>品牌 *</Label>
              <Select value={projectFormData.brand_id} onValueChange={(v) => setProjectFormData({ ...projectFormData, brand_id: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="選擇品牌..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.short_name || p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>季節 *</Label>
              <Select value={projectFormData.season} onValueChange={(v) => setProjectFormData({ ...projectFormData, season: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="選擇季節..." />
                </SelectTrigger>
                <SelectContent>
                  {['SS25','FW25','SS26','FW26','SS27','FW27'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 顏色選擇 */}
          <div>
            <Label className="mb-2 block">顏色</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setProjectFormData({ ...projectFormData, color: c.value })}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{
                    backgroundColor: c.value,
                    outline: projectFormData.color === c.value ? `3px solid ${c.value}` : '3px solid transparent',
                    outlineOffset: 2,
                  }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button
            onClick={onConfirm}
            disabled={!projectFormData.brand_id || !projectFormData.season || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? '建立中...' : '建立'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}