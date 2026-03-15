import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const currentYear = new Date().getFullYear();
const COLOR_OPTIONS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#06b6d4','#ef4444','#ec4899','#64748b'];

const AddProjectDialog = React.memo(function AddProjectDialog({ open, onOpenChange, projectFormData, setProjectFormData, projects, groups = [], ganttProjects = [], onConfirm, isLoading }) {
  const navigate = useNavigate();

  const usedColors = new Set(ganttProjects.map(p => p.color).filter(Boolean));
  const availableColors = COLOR_OPTIONS.filter(c => !usedColors.has(c));

  const makalotGroupId = groups.find(g => g.name.toLowerCase() === 'makalot')?.id;
  const currentBrand = projects.find(p => p.id === projectFormData.brand_id);
  const isMakalot = currentBrand?.group_id === makalotGroupId;
  const isTGT = currentBrand?.short_name === 'TGT' || currentBrand?.name === 'TGT';

  useEffect(() => {
    if (!open) return;
    if (availableColors.length > 0 && usedColors.has(projectFormData.color)) {
      setProjectFormData(prev => ({ ...prev, color: availableColors[0] }));
    }
  }, [open]);

  // 預覽名稱
  const previewName = (() => {
    if (!currentBrand) return null;
    if (isMakalot) {
      return projectFormData.customName ? `${currentBrand.short_name || currentBrand.name}_${projectFormData.customName}` : null;
    }
    if (projectFormData.season && projectFormData.year) {
      const yy = String(projectFormData.year).slice(-2);
      return `${currentBrand.short_name || currentBrand.name} ${projectFormData.season}${yy}`;
    }
    return null;
  })();

  const canConfirm = projectFormData.brand_id && (
    isMakalot ? projectFormData.customName :
    (projectFormData.season && projectFormData.year)
  );

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
                customName: '',
                color: brand?.default_color || '#3b82f6',
              });
            }}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="選擇品牌..." /></SelectTrigger>
              <SelectContent>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.short_name || p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* 季節/年份 or 自填內容 */}
          {isMakalot ? (
            <div>
              <Label>內容 *</Label>
              <Input
                className="mt-1"
                placeholder="例如：2026春夏企劃"
                value={projectFormData.customName || ''}
                onChange={(e) => setProjectFormData({ ...projectFormData, customName: e.target.value })}
              />
            </div>
          ) : (
            <div className="flex gap-3">
              <div className="flex-1">
                <Label>季節 *</Label>
                {isTGT ? (
                  <Select
                    value={projectFormData.season}
                    onValueChange={(val) => setProjectFormData({ ...projectFormData, season: val })}
                  >
                    <SelectTrigger className="mt-1"><SelectValue placeholder="選擇季節..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="C1">C1</SelectItem>
                      <SelectItem value="C2">C2</SelectItem>
                      <SelectItem value="C3">C3</SelectItem>
                      <SelectItem value="C4">C4</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    value={projectFormData.season}
                    onValueChange={(val) => setProjectFormData({ ...projectFormData, season: val })}
                  >
                    <SelectTrigger className="mt-1"><SelectValue placeholder="選擇季節..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FW">FW</SelectItem>
                      <SelectItem value="HO">HO</SelectItem>
                      <SelectItem value="SU">SU</SelectItem>
                      <SelectItem value="SP">SP</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="w-28">
                <Label>年份 *</Label>
                <Select
                  value={String(projectFormData.year)}
                  onValueChange={(val) => setProjectFormData({ ...projectFormData, year: Number(val) })}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* 預覽名稱 */}
          {previewName && (
            <div className="bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-600">
              開發季名稱：<span className="font-semibold text-gray-900">{previewName}</span>
            </div>
          )}

          {/* 顏色 */}
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
                onClick={() => { onOpenChange(false); navigate('/ProjectSettings?tab=projects'); }}
                className="text-xs text-blue-600 hover:underline"
              >
                前往品牌設定修改 →
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={onConfirm} disabled={!canConfirm || isLoading} className="bg-blue-600 hover:bg-blue-700">
            {isLoading ? '建立中...' : '建立'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default AddProjectDialog;