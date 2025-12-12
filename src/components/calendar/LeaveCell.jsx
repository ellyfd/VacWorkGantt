import React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function LeaveCell({ 
  record, 
  leaveTypes, 
  onSelectLeave, 
  onClearLeave,
  isWeekend,
  isHoliday 
}) {
  const leaveType = record ? leaveTypes.find(lt => lt.id === record.leave_type_id) : null;

  const cellBgClass = isHoliday 
    ? "bg-red-50" 
    : isWeekend 
      ? "bg-gray-100" 
      : "bg-white";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div 
          className={`h-8 min-w-[32px] border-r border-b border-gray-200 flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors ${cellBgClass}`}
        >
          {leaveType && (
            <span 
              className="text-xs font-medium px-1 py-0.5 rounded"
              style={{ 
                color: leaveType.color,
                backgroundColor: `${leaveType.color}15`
              }}
            >
              {leaveType.short_name}
            </span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="space-y-1">
          <p className="text-xs text-gray-500 mb-2 font-medium">選擇假別</p>
          {leaveTypes.map((lt) => (
            <Button
              key={lt.id}
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sm h-8"
              style={{ color: lt.color }}
              onClick={() => onSelectLeave(lt.id)}
            >
              <span 
                className="w-2 h-2 rounded-full mr-2"
                style={{ backgroundColor: lt.color }}
              />
              {lt.name}
            </Button>
          ))}
          {record && (
            <>
              <div className="border-t my-2" />
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm h-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={onClearLeave}
              >
                <X className="w-3 h-3 mr-2" />
                清除
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}