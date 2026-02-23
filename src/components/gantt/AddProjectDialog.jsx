import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function AddProjectDialog({
  open,
  onOpenChange,
  projectFormData,
  setProjectFormData,
  projectCreationMode,
  setProjectCreationMode,
  selectedSamples,
  setSelectedSamples,
  projects,
  samples,
  getBrandName,
  getSamplesByBrand,
  onConfirm,
  isLoading,
}) {
  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) {
        setProjectFormData({ brand_id: '', season: '' });
        setSelectedSamples({});
        setProjectCreationMode('manual');
      }
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>新增開發季</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>品牌 *</Label>
              <Select
                value={projectFormData.brand_id}
                onValueChange={(v) => {
                  setProjectFormData({ ...projectFormData, brand_id: v });
                  setSelectedSamples({});
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="選擇品牌..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.short_name || p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>季節 *</Label>
              <Select
                value={projectFormData.season}
                onValueChange={(v) => setProjectFormData({ ...projectFormData, season: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="選擇季節..." />
                </SelectTrigger>
                <SelectContent>
                  {['SS25','FW25','HO25','SS26','FW26','HO26','SS27','FW27'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {projectFormData.brand_id && projectFormData.season && (
            <div className="text-sm text-gray-600 px-3 py-2 bg-gray-50 rounded border">
              專案名稱：<strong>{getBrandName(projectFormData.brand_id)} {projectFormData.season}</strong>
            </div>
          )}

          <div className="border-t pt-4">
            <Label className="mb-2 block">建立方式</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={projectCreationMode === 'manual' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setProjectCreationMode('manual')}
              >
                📝 手動選擇樣品
              </Button>
              <Button
                type="button"
                variant={projectCreationMode === 'import' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setProjectCreationMode('import')}
              >
                📎 上傳時程表
              </Button>
            </div>
          </div>

          {projectCreationMode === 'manual' && projectFormData.brand_id && (
            <div>
              <Label className="mb-2 block">選擇樣品階段</Label>
              {getSamplesByBrand(projectFormData.brand_id).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-3">此品牌沒有樣品，請先到「專案設定」新增</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                    {getSamplesByBrand(projectFormData.brand_id).map((sample) => (
                      <label
                        key={sample.id}
                        className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${
                          selectedSamples[sample.id] ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSamples[sample.id] || false}
                          onChange={(e) => setSelectedSamples((prev) => ({ ...prev, [sample.id]: e.target.checked }))}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{sample.short_name || sample.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    已選 {Object.values(selectedSamples).filter(Boolean).length} 個（可以不選，之後再手動新增）
                  </p>
                </>
              )}
            </div>
          )}
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