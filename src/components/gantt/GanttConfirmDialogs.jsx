import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

// 刪除／封存確認對話框（自 GanttChart 抽出；維持 always-mounted + open prop 模式）
export default function GanttConfirmDialogs({
  deleteConfirm,
  onDeleteOpenChange,
  onDeleteConfirm,
  archiveConfirm,
  onArchiveOpenChange,
  onArchiveConfirm,
}) {
  return (
    <>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={onDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogTitle>
            刪除{deleteConfirm?.type === 'project' ? '開發季' : '任務'}「{deleteConfirm?.name}」？
          </AlertDialogTitle>
          <AlertDialogDescription>
            {deleteConfirm?.type === 'project'
              ? '此開發季將被刪除，完成後無法復原；請先確認相關任務資料。'
              : '此任務將被刪除，完成後無法復原。'}
          </AlertDialogDescription>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={onDeleteConfirm}
            >
              刪除{deleteConfirm?.type === 'project' ? '開發季' : '任務'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={!!archiveConfirm} onOpenChange={onArchiveOpenChange}>
        <AlertDialogContent>
          <AlertDialogTitle>
            {archiveConfirm?.action === 'restore'
              ? `還原開發季「${archiveConfirm?.name}」？`
              : `封存開發季「${archiveConfirm?.name}」？`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {archiveConfirm?.action === 'restore'
              ? '開發季將恢復為進行中，並重新顯示在預設列表。'
              : '開發季將從預設列表隱藏，可在「已歸檔」狀態中還原；任務資料不會被刪除。'}
          </AlertDialogDescription>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={onArchiveConfirm}>
              {archiveConfirm?.action === 'restore' ? '還原開發季' : '封存開發季'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
