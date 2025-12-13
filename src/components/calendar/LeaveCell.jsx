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
        onDoubleClickLeave,
        isWeekend,
        isHoliday 
      }) {
  const [open, setOpen] = React.useState(false);
  const leaveType = record ? leaveTypes.find(lt => lt.id === record.leave_type_id) : null;

  const cellBgClass = (isHoliday || isWeekend) 
    ? "bg-gray-200" 
    : "bg-white";

  const handleKeyDown = (e) => {
    if (e.key === 'Delete' && record) {
      e.preventDefault();
      onClearLeave();
    }
  };

  const handleDoubleClick = (e) => {
    if (record) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      if (onDoubleClickLeave) {
        onDoubleClickLeave();
      } else {
        onClearLeave();
      }
    }
  };

  const handleSelectLeave = (leaveTypeId) => {
    onSelectLeave(leaveTypeId);
    setOpen(false);
  };

  const handleClear = () => {
    onClearLeave();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div 
          className={`w-full h-full min-h-[32px] flex items-center justify-center cursor-pointer hover:opacity-80 transition-all text-xs font-medium ${!record ? cellBgClass : ''}`}
          style={record && leaveType ? { backgroundColor: leaveType.color, color: '#fff' } : {}}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onDoubleClick={handleDoubleClick}
          onClick={(e) => {
            if (e.detail === 1) {
              setTimeout(() => {
                if (e.detail === 1) {
                  setOpen(true);
                }
              }, 200);
            }
          }}
        >
          {record && leaveType ? leaveType.short_name : ''}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="space-y-1">
          <p className="text-xs text-gray-500 mb-2 font-medium">選擇假別</p>
          {leaveTypes.sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999)).map((lt) => (
            <Button
              key={lt.id}
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sm h-8"
              style={{ color: lt.color }}
              onClick={() => handleSelectLeave(lt.id)}
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
                onClick={handleClear}
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