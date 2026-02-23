import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

export default function RangeLeaveDialog({ 
  isOpen, 
  onClose, 
  onSubmit, 
  onCancel,
  leaveTypes,
  employeeId,
  employeeName,
  isSubmitting 
}) {
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [leaveTypeId, setLeaveTypeId] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setDateRange({ from: undefined, to: undefined });
      setLeaveTypeId('');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (dateRange?.from && dateRange?.to && leaveTypeId) {
      const startDate = format(dateRange.from, 'yyyy-MM-dd');
      const endDate = format(dateRange.to, 'yyyy-MM-dd');
      onSubmit(employeeId, startDate, endDate, leaveTypeId);
    }
  };

  const handleCancel = (e) => {
    e.preventDefault();
    if (dateRange?.from && dateRange?.to) {
      const startDate = format(dateRange.from, 'yyyy-MM-dd');
      const endDate = format(dateRange.to, 'yyyy-MM-dd');
      onCancel(employeeId, startDate, endDate);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>區間請假 - {employeeName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>選擇日期區間</Label>
            <div className="mt-2 flex justify-center border rounded-lg p-3">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                locale={zhTW}
                numberOfMonths={1}
                className="rounded-md"
              />
            </div>
            {dateRange?.from && (
              <p className="text-sm text-gray-600 mt-2 text-center">
                {dateRange.to ? (
                  <>
                    {format(dateRange.from, 'yyyy/MM/dd', { locale: zhTW })} - {format(dateRange.to, 'yyyy/MM/dd', { locale: zhTW })}
                  </>
                ) : (
                  <>選擇開始日期: {format(dateRange.from, 'yyyy/MM/dd', { locale: zhTW })}</>
                )}
              </p>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="leaveType">假別</Label>
            <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="選擇假別" />
              </SelectTrigger>
              <SelectContent>
                {[...(leaveTypes || [])].sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999)).map((lt) => (
                  <SelectItem key={lt.id} value={lt.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: lt.color }}
                      />
                      {lt.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              關閉
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleCancel} 
              disabled={isSubmitting || !dateRange?.from || !dateRange?.to}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  取消中...
                </>
              ) : (
                '區間取消'
              )}
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  處理中...
                </>
              ) : (
                '區間請假'
              )}
            </Button>
          </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}