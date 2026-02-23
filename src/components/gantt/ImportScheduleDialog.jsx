import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Upload } from 'lucide-react';

export default function ImportScheduleDialog({
  open,
  onOpenChange,
  scheduleFile,
  setScheduleFile,
  onConfirm,
  isAnalyzing,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>上傳時程表</DialogTitle>
          <DialogDescription>
            上傳時程表圖片或 PDF，AI 將自動辨識階段和任務
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setScheduleFile(e.target.files?.[0] || null)}
              className="hidden"
              id="schedule-file-input"
            />
            <label htmlFor="schedule-file-input" className="cursor-pointer">
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">點擊或拖曳檔案到此處</p>
              <p className="text-xs text-gray-400 mt-1">支援 PNG, JPG, PDF</p>
            </label>
            {scheduleFile && (
              <p className="mt-3 text-sm text-green-600">✓ {scheduleFile.name}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => {
            onOpenChange(false);
            setScheduleFile(null);
          }}>
            取消
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!scheduleFile || isAnalyzing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isAnalyzing ? '分析中...' : '開始辨識'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}