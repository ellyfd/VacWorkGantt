import React from 'react';
import AllLeaveCalendar from '@/pages/AllLeaveCalendar';
import { DPC_DEPARTMENT_NAMES } from '@/lib/access';

// 開發處排休：沿用全部排休的版面與請假功能（可檢視/編輯），
// 但鎖定只顯示 DPC 部門、隱藏部門選擇器、不含甘特圖。
export default function DevDivisionLeave() {
  return (
    <AllLeaveCalendar
      restrictDepartmentNames={DPC_DEPARTMENT_NAMES}
      hideDepartmentSelector
      pageTitle="開發處排休（DPC）"
    />
  );
}
