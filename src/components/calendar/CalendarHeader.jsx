import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function CalendarHeader({ selectedYears, onYearsChange, selectedMonths, onMonthsChange, departments, selectedDepartments, onDepartmentsChange }) {
  const years = [2025, 2026, 2027];
  const months = Array.from({ length: 12 }, (_, i) => i);

  const handleYearToggle = (year) => {
    onYearsChange(prev => 
      prev.includes(year) 
        ? prev.filter(y => y !== year)
        : [...prev, year]
    );
  };

  const handleMonthToggle = (month) => {
    onMonthsChange(prev => 
      prev.includes(month) 
        ? prev.filter(m => m !== month)
        : [...prev, month]
    );
  };

  const handleDepartmentToggle = (deptId) => {
    onDepartmentsChange(prev => 
      prev.includes(deptId) 
        ? prev.filter(id => id !== deptId)
        : [...prev, deptId]
    );
  };

  const handleSelectAllYears = () => {
    if (selectedYears.length === years.length) {
      onYearsChange([]);
    } else {
      onYearsChange(years);
    }
  };

  const handleSelectAllMonths = () => {
    if (selectedMonths.length === months.length) {
      onMonthsChange([]);
    } else {
      onMonthsChange(months);
    }
  };

  const handleSelectAllDepartments = () => {
    if (selectedDepartments.length === departments.length) {
      onDepartmentsChange([]);
    } else {
      onDepartmentsChange(departments.map(d => d.id));
    }
  };

  return (
    <div className="flex flex-col gap-4 mb-6">
      <h1 className="text-2xl font-bold text-gray-800">
        排休登記表
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-semibold text-gray-700">篩選年度</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAllYears}
              className="h-8"
            >
              {selectedYears.length === years.length ? '取消全選' : '全選'}
            </Button>
          </div>
          <div className="flex flex-wrap gap-3">
            {years.map((year) => (
              <label
                key={year}
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-md border border-gray-200"
              >
                <input
                  type="checkbox"
                  checked={selectedYears.includes(year)}
                  onChange={() => handleYearToggle(year)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{year}年</span>
              </label>
            ))}
          </div>
          {selectedYears.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              已選擇 {selectedYears.length} 個年度
            </p>
          )}
        </div>

        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-semibold text-gray-700">篩選月份</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAllMonths}
              className="h-8"
            >
              {selectedMonths.length === months.length ? '取消全選' : '全選'}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {months.map((month) => (
              <label
                key={month}
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-2 rounded-md border border-gray-200"
              >
                <input
                  type="checkbox"
                  checked={selectedMonths.includes(month)}
                  onChange={() => handleMonthToggle(month)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{month + 1}月</span>
              </label>
            ))}
          </div>
          {selectedMonths.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              已選擇 {selectedMonths.length} 個月份
            </p>
          )}
        </div>

        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-semibold text-gray-700">篩選部門</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAllDepartments}
              className="h-8"
            >
              {selectedDepartments.length === departments.length ? '取消全選' : '全選'}
            </Button>
          </div>
          <div className="flex flex-wrap gap-3">
            {departments.map((dept) => (
              <label
                key={dept.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-md border border-gray-200"
              >
                <input
                  type="checkbox"
                  checked={selectedDepartments.includes(dept.id)}
                  onChange={() => handleDepartmentToggle(dept.id)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{dept.name}</span>
              </label>
            ))}
          </div>
          {selectedDepartments.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              已選擇 {selectedDepartments.length} 個部門
            </p>
          )}
        </div>
      </div>
    </div>
  );
}