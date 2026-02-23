import React, { useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";

export default function CalendarSettings({ departments, selectedDepartments, onDepartmentsChange }) {
  const handleDepartmentToggle = useCallback((deptId) => {
    onDepartmentsChange(prev =>
      prev.includes(deptId)
        ? prev.filter(id => id !== deptId)
        : [...prev, deptId]
    );
  }, [onDepartmentsChange]);

  const handleSelectAll = useCallback(() => {
    if (selectedDepartments.length === departments.length) {
      onDepartmentsChange([]);
    } else {
      onDepartmentsChange(departments.map(d => d.id));
    }
  }, [selectedDepartments, departments, onDepartmentsChange]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9">
          <Settings className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>行事曆設定</SheetTitle>
          <SheetDescription>選擇要顯示的部門</SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold text-gray-700">篩選部門</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="h-8"
            >
              {selectedDepartments.length === departments.length ? '取消全選' : '全選'}
            </Button>
          </div>
          
          <div className="space-y-2">
            {departments.map((dept) => (
              <label
                key={dept.id}
                className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg border border-gray-200"
              >
                <input
                  type="checkbox"
                  checked={selectedDepartments.includes(dept.id)}
                  data-dept-id={dept.id}
                  onChange={(e) => handleDepartmentToggle(e.currentTarget.dataset.deptId)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{dept.name}</span>
              </label>
            ))}
          </div>
          
          {selectedDepartments.length > 0 && (
            <p className="text-xs text-gray-500 mt-4">
              已選擇 {selectedDepartments.length} 個部門
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}