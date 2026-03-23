import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, onOpenChange, ...props }) {
        const handleDismiss = () => onOpenChange?.(false);
        return (
          <Toast key={id} onClick={handleDismiss} style={{ cursor: 'pointer' }} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose onClick={(e) => { e.stopPropagation(); handleDismiss(); }} />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
} 