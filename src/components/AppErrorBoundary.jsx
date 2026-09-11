import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

// 頁面層級的錯誤邊界：任何 render 期間的例外（例如 date-fns 收到無效日期）
// 原本會讓整個 React tree 卸載變成白屏，這裡改成顯示可恢復的錯誤卡片，
// 側欄/導覽仍可使用。每個 Route 各包一層，切換頁面即自動重置。
export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[AppErrorBoundary]', error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    // 保留 Base44 的 app_id / server_url 等 query 參數
    window.location.href = createPageUrl('LeaveCalendar') + window.location.search;
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border border-border rounded-xl shadow-sm p-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">頁面發生錯誤</h2>
            <p className="text-sm text-muted-foreground mt-1">
              這個頁面在顯示時遇到問題，請重新整理再試一次；若持續發生請聯絡管理員。
            </p>
          </div>
          <pre className="text-left text-xs bg-muted text-muted-foreground rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
            {String(error?.message || error)}
          </pre>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={this.handleHome}>
              <Home className="w-4 h-4 mr-1" />
              回首頁
            </Button>
            <Button onClick={this.handleReload}>
              <RefreshCw className="w-4 h-4 mr-1" />
              重新整理
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
