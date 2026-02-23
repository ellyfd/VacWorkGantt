import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

export default function AddPhaseDialog({
  open,
  onOpenChange,
  projectName,
  samplesForSelection,
  selectedSamples,
  setSelectedSamples,
  onConfirm,
  isLoading,
}) {
  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) {
        setSelectedSamples({});
      }
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>新增樣品階段</DialogTitle>
          <DialogDescription>
            將樣品作為階段加入此專案: <span className="font-semibold">{projectName}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {samplesForSelection.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">此品牌沒有樣品，請先到「專案設定」新增</p>
          ) : (
            <div>
              <Label className="mb-2 block">選擇樣品</Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                {samplesForSelection.map((sample) => (
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
              <p className="text-xs text-gray-500 mt-1">已選 {Object.values(selectedSamples).filter(Boolean).length} 個</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button
            onClick={onConfirm}
            disabled={Object.values(selectedSamples).filter(Boolean).length === 0 || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? '新增中...' : '新增樣品階段'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}