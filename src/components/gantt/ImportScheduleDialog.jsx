import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { FileText, Loader2, Upload, X } from 'lucide-react';

const ImportScheduleDialog = React.memo(function ImportScheduleDialog({
  open,
  onOpenChange,
  scheduleFile,
  setScheduleFile,
  onConfirm,
  isAnalyzing,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>上傳時程表</DialogTitle>
          <DialogDescription>
            選擇時程表圖片或 PDF，系統會依既有流程辨識階段與任務。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${scheduleFile ? 'border-blue-300 bg-blue-50/50' : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'}`}>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setScheduleFile(e.target.files?.[0] || null)}
              className="hidden"
              id="schedule-file-input"
            />
            <label htmlFor="schedule-file-input" className="cursor-pointer block focus-within:ring-2 focus-within:ring-blue-500 rounded-md">
              <Upload className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <p className="text-sm font-medium text-gray-700">點擊選擇檔案</p>
              <p className="text-xs text-gray-500 mt-1">支援 PNG、JPG、PDF</p>
            </label>
            {scheduleFile && (
              <div className="mt-4 flex items-center gap-2 rounded-md border border-blue-100 bg-white px-3 py-2 text-left">
                <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm text-gray-700" title={scheduleFile.name}>{scheduleFile.name}</span>
                <button type="button" onClick={() => setScheduleFile(null)} className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="移除已選檔案" title="移除檔案">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="border-t pt-4">
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
            {isAnalyzing && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {isAnalyzing ? '辨識中…' : '開始辨識'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default ImportScheduleDialog;
