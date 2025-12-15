import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function WarningDialog({ open, onOpenChange, title, message, onConfirm, onCancel }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <span className="text-orange-500">⚠️</span>
            {title || '警告'}
          </AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line text-sm text-gray-700">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={() => {
              onCancel?.();
              onOpenChange(false);
            }}
          >
            取消
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => {
              onConfirm?.();
              onOpenChange(false);
            }}
            className="bg-orange-600 hover:bg-orange-700"
          >
            確定繼續請假
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}