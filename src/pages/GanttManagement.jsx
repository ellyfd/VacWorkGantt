import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// 依裝置只掛載一種甘特圖：兩者各自抓資料，同時掛載會多發一倍請求
const GanttChart = lazy(() => import('./GanttChart'));
const MobileGanttChart = lazy(() => import('@/components/gantt/MobileGanttChart'));

const MOBILE_BREAKPOINT = 768;

export default function GanttManagement() {
  // 用同步初始值判斷裝置，避免首幀誤掛桌機版（useIsMobile 首幀回傳 false）
  const [isMobile, setIsMobile] = useState(
    () => window.innerWidth < MOBILE_BREAKPOINT
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[480px] w-full" />
        </div>
      }
    >
      {isMobile ? <MobileGanttChart /> : <GanttChart />}
    </Suspense>
  );
}
