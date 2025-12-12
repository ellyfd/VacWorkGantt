import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from 'lucide-react';

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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (startDate && endDate && leaveTypeId) {
      onSubmit(employeeId, startDate, endDate, leaveTypeId);
      setStartDate('');
      setEndDate('');
      setLeaveTypeId('');
    }
  };

  const handleCancel = (e) => {
    e.preventDefault();
    if (startDate && endDate) {
      onCancel(employeeId, startDate, endDate);
      setStartDate('');
      setEndDate('');
      setLeaveTypeId('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>區間請假 - {employeeName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="startDate">開始日期</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="endDate">結束日期</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="leaveType">假別</Label>
            <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="選擇假別" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map((lt) => (
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              關閉
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleCancel} 
              disabled={isSubmitting || !startDate || !endDate}
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}