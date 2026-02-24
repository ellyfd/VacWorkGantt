import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SEASONS = ['SP', 'SU', 'FW', 'HO'];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - 1 + i);

const COLOR_OPTIONS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4','#6b7280'];

export default function AddProjectDialog({ open, onOpenChange, projectFormData, setProjectFormData, projects, ganttProjects = [], onConfirm, isLoading }) {
  // 計算已使用的顏色
  const usedColors = new Set(ganttProjects.map(p => p.color).filter(Boolean));
  const availableColors = COLOR_OPTIONS.filter(c => !usedColors.has(c));

  // Dialog 打開時，如果當前色已被使用，自動換成第一個可用色
  useEffect(() => {
    if (!open) return;
    if (availableColors.length > 0 && usedColors.has(projectFormData.color)) {
      setProjectFormData(prev => ({ ...prev, color: availableColors[0] }));
    }
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>新增開發季</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">

          {/* 品牌 */}
           <div>
             <Label>品牌 *</Label>
             <Select value={projectFormData.brand_id} onValueChange={(val) => {
               const brand = projects.find(p => p.id === val);
               setProjectFormData({
                 ...projectFormData,
                 brand_id: val,
                 season: '',
                 color: brand?.default_color || '#3b82f6',
               });
             }}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="選擇品牌..." /></SelectTrigger>
              <SelectContent>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.short_name || p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* 季節 + 年份 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>季節 *</Label>
              {(() => {
                const selectedBrand = projects.find(p => p.id === projectFormData.brand_id);
                const isFreeInput = selectedBrand?.short_name === 'TGT' || selectedBrand?.name === 'TGT';
                
                if (isFreeInput) {
                  return (
                    <Input
                      className="mt-1"
                      placeholder="輸入季節，例如 Spring 2026"
                      value={projectFormData.season || ''}
                      onChange={(e) => setProjectFormData({ ...projectFormData, season: e.target.value })}
                    />
                  );
                }
                
                return (
                  <Select value={projectFormData.season} onValueChange={(v) => setProjectFormData({ ...projectFormData, season: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="選擇季節..." /></SelectTrigger>
                    <SelectContent>
                      {SEASONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                );
              })()}
            </div>
            <div>
              <Label>年份 *</Label>
              <Select value={String(projectFormData.year)} onValueChange={(v) => setProjectFormData({ ...projectFormData, year: Number(v) })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="選擇年份..." /></SelectTrigger>
                <SelectContent>
                  {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 預覽名稱 */}
          {projectFormData.brand_id && projectFormData.season && projectFormData.year && (() => {
            const brand = projects.find(p => p.id === projectFormData.brand_id);
            const yy = String(projectFormData.year).slice(-2);
            const preview = `${brand?.short_name || brand?.name} ${projectFormData.season}${yy}`;
            return (
              <div className="bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-600">
                開發季名稱：<span className="font-semibold text-gray-900">{preview}</span>
              </div>
            );
          })()}

          {/* 顏色 - 唯讀，從品牌設定帶入 */}
          <div>
            <Label>顏色</Label>
            <div className="mt-2 flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-full border border-gray-200 flex-shrink-0"
                style={{ backgroundColor: projectFormData.color || '#3b82f6' }}
              />
              <span className="text-sm text-gray-500">由品牌設定帶入</span>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="text-xs text-blue-600 hover:underline"
              >
                前往品牌設定修改 →
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={onConfirm}
            disabled={!projectFormData.brand_id || !projectFormData.season || !projectFormData.year || isLoading}
            className="bg-blue-600 hover:bg-blue-700">
            {isLoading ? '建立中...' : '建立'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}