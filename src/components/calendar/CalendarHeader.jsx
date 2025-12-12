import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, subMonths } from "date-fns";

export default function CalendarHeader({ currentDate, onDateChange, departments, selectedDepartments, onDepartmentsChange, selectedStatuses, onStatusesChange }) {
  const handlePrevMonth = () => {
    const currentMonth = currentDate.getMonth();
    if (currentMonth === -1) {
      onDateChange(new Date(currentDate.getFullYear() - 1, -1, 1));
    } else {
      onDateChange(subMonths(currentDate, 1));
    }
  };

  const handleNextMonth = () => {
    const currentMonth = currentDate.getMonth();
    if (currentMonth === -1) {
      onDateChange(new Date(currentDate.getFullYear() + 1, -1, 1));
    } else {
      onDateChange(addMonths(currentDate, 1));
    }
  };

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handleYearChange = (year) => {
    const newDate = new Date(parseInt(year), currentMonth === -1 ? -1 : currentMonth, 1);
    onDateChange(newDate);
  };

  const handleMonthChange = (month) => {
    const newDate = new Date(currentYear, parseInt(month), 1);
    onDateChange(newDate);
  };

  const years = [2025, 2026, 2027];
  const months = Array.from({ length: 12 }, (_, i) => i);

  const handleDepartmentToggle = (deptId) => {
    onDepartmentsChange(prev => 
      prev.includes(deptId) 
        ? prev.filter(id => id !== deptId)
        : [...prev, deptId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDepartments.length === departments.length) {
      onDepartmentsChange([]);
    } else {
      onDepartmentsChange(departments.map(d => d.id));
    }
  };

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">
          排休登記表
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevMonth}
            className="h-9 w-9"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Select value={currentYear.toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>{year}年</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={currentMonth.toString()} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-1">全年</SelectItem>
              {months.map((month) => (
                <SelectItem key={month} value={month.toString()}>{month + 1}月</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextMonth}
            className="h-9 w-9"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-3">
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

        <div className="p-4 bg-white rounded-lg border border-gray-200">
        <Label className="text-sm font-semibold text-gray-700 mb-3 block">篩選員工狀態</Label>
        <div className="flex flex-wrap gap-3">
          {[
            { value: 'active', label: '在職', color: 'bg-green-100 text-green-800 border-green-300' },
            { value: 'parental_leave', label: '育嬰假', color: 'bg-blue-100 text-blue-800 border-blue-300' },
            { value: 'inactive', label: '離職', color: 'bg-gray-100 text-gray-800 border-gray-300' },
            { value: 'hidden', label: '隱藏', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' }
          ].map((status) => (
            <label
              key={status.value}
              className={`flex items-center gap-2 cursor-pointer hover:opacity-80 px-3 py-2 rounded-md border ${
                selectedStatuses?.includes(status.value) ? status.color : 'bg-white border-gray-200'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedStatuses?.includes(status.value)}
                onChange={() => {
                  if (selectedStatuses?.includes(status.value)) {
                    onStatusesChange(selectedStatuses.filter(s => s !== status.value));
                  } else {
                    onStatusesChange([...(selectedStatuses || []), status.value]);
                  }
                }}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium">{status.label}</span>
            </label>
          ))}
        </div>
        {selectedStatuses?.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            已選擇 {selectedStatuses.length} 種狀態
          </p>
        )}
        </div>
        </div>
        );
        }