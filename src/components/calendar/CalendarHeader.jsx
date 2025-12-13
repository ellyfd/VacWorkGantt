import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, subMonths } from "date-fns";
import CalendarSettings from "./CalendarSettings";

export default function CalendarHeader({ currentDate, onDateChange, departments, selectedDepartments, onDepartmentsChange }) {
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
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800">
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
          <SelectTrigger className="w-[70px] md:w-[90px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>{year}年</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={currentMonth.toString()} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-[60px] md:w-[80px]">
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
        <CalendarSettings 
          departments={departments}
          selectedDepartments={selectedDepartments}
          onDepartmentsChange={onDepartmentsChange}
        />
      </div>
    </div>
  );
}