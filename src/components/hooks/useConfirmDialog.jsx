import { useState, useCallback, useRef } from 'react';

/**
 * Hook to replace window.confirm() with a proper dialog.
 * Returns [dialogProps, confirm] where:
 * - dialogProps: spread into ConfirmDialog component
 * - confirm(message, options?): returns Promise<boolean>
 */
export function useConfirmDialog() {
  const [state, setState] = useState({
    open: false,
    title: '確認',
    message: '',
    confirmText: '確定',
    cancelText: '取消',
    variant: 'default', // 'default' | 'destructive'
  });
  const resolveRef = useRef(null);

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({
        open: true,
        title: options.title || '確認',
        message,
        confirmText: options.confirmText || '確定',
        cancelText: options.cancelText || '取消',
        variant: options.variant || 'default',
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState(s => ({ ...s, open: false }));
    resolveRef.current?.(true);
    resolveRef.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    setState(s => ({ ...s, open: false }));
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  const dialogProps = {
    ...state,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
    onOpenChange: (open) => {
      if (!open) handleCancel();
    },
  };

  return [dialogProps, confirm];
}
