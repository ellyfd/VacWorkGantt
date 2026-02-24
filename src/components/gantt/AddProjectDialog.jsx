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
            <Select value={projectFormData.brand_id} onValueChange={(v) => {
              const brand = projects.find(p => p.id === v);
              setProjectFormData({
                ...projectFormData,
                brand_id: v,
                season: '',
                color: brand?.default_color || availableColors[0] || '#3b82f6',
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

          {/* 顏色選擇 */}
          <div>
            <Label className="mb-2 block">顏色</Label>
            <div className="space-y-2">
              {/* 色票列 */}
              {availableColors.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {availableColors.map(c => (
                    <button key={c} type="button"
                      onClick={() => setProjectFormData({ ...projectFormData, color: c })}
                      className="w-7 h-7 rounded-full transition-transform hover:scale-110 flex-shrink-0"
                      style={{
                        backgroundColor: c,
                        outline: projectFormData.color === c ? `3px solid ${c}` : 'none',
                        outlineOffset: 2,
                      }}
                    />
                  ))}
                </div>
              )}
              {availableColors.length === 0 && (
                <p className="text-xs text-gray-400">所有預設顏色已被使用</p>
              )}

              {/* Hex 輸入 */}
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex-shrink-0 border border-gray-200"
                  style={{ backgroundColor: projectFormData.color || '#3b82f6' }}
                />
                <Input
                  value={projectFormData.color || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(val) || val === '') {
                      setProjectFormData({ ...projectFormData, color: val });
                    }
                  }}
                  placeholder="#3b82f6"
                  className="h-8 text-sm font-mono w-32"
                  maxLength={7}
                />
                <span className="text-xs text-gray-400 flex-shrink-0">Hex</span>
              </div>
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