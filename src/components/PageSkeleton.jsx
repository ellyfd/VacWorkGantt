import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// 全頁載入佔位：取代整頁置中的轉圈，減少載入完成時的版面跳動
export default function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-[420px] w-full rounded-xl" />
      </div>
    </div>
  );
}
