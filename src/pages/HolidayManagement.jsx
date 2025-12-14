import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function HolidayManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [formData, setFormData] = useState({ date: '', name: '', type: 'company' });
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  const queryClient = useQueryClient();

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list('date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Holiday.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['holidays']);
      setIsDialogOpen(false);
      setFormData({ date: '', name: '', type: 'company' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Holiday.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['holidays']);
      setIsDialogOpen(false);
      setEditingHoliday(null);
      setFormData({ date: '', name: '', type: 'company' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Holiday.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['holidays']);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingHoliday) {
      updateMutation.mutate({ id: editingHoliday.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (holiday) => {
    setEditingHoliday(holiday);
    setFormData({ date: holiday.date, name: holiday.name, type: holiday.type });
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingHoliday(null);
    setFormData({ date: '', name: '', type: 'company' });
    setIsDialogOpen(true);
  };

  const filteredHolidays = holidays.filter(holiday => {
    const yearMatch = selectedYear === 'all' || holiday.date.startsWith(selectedYear);
    const typeMatch = selectedType === 'all' || holiday.type === selectedType;
    return yearMatch && typeMatch;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">假日管理</h1>
          </div>
          <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            新增假日
          </Button>
        </div>

        <div className="mb-4 flex gap-3">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="選擇年度" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有年度</SelectItem>
              <SelectItem value="2025">2025年</SelectItem>
              <SelectItem value="2026">2026年</SelectItem>
              <SelectItem value="2027">2027年</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="選擇類型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有類型</SelectItem>
              <SelectItem value="national">國定假日</SelectItem>
              <SelectItem value="company">公司特別假</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-1.5 md:px-3 py-2 text-left text-xs font-semibold text-gray-600 w-16 md:w-[15%]">日期</th>
                <th className="px-2 md:px-4 py-2 text-left text-xs font-semibold text-gray-600 md:w-[50%]">假日名稱</th>
                <th className="px-1.5 md:px-3 py-2 text-left text-xs font-semibold text-gray-600 w-20 md:w-[18%]">類型</th>
                <th className="px-1.5 md:px-3 py-2 text-center text-xs font-semibold text-gray-600 w-12 md:w-[17%]">編輯</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredHolidays.map((holiday) => (
                <tr key={holiday.id} className="hover:bg-gray-50">
                  <td className="px-1.5 md:px-3 py-2 text-xs md:text-sm text-gray-800">
                    <div className="md:flex md:items-center md:gap-2">
                      <span className="font-semibold text-xs block md:inline">{format(new Date(holiday.date), 'yyyy')}</span>
                      <span className="text-xs block md:inline">{format(new Date(holiday.date), 'MM/dd')}</span>
                    </div>
                  </td>
                  <td className="px-2 md:px-4 py-2 text-xs md:text-sm font-medium text-gray-800">{holiday.name}</td>
                  <td className="px-1.5 md:px-3 py-2 text-xs md:text-sm">
                    <span className={`px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs whitespace-nowrap ${
                      holiday.type === 'national' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {holiday.type === 'national' ? '國定假日' : '公司假'}
                    </span>
                  </td>
                  <td className="px-1.5 md:px-3 py-2">
                    <div className="flex flex-col items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(holiday)}
                        className="h-6 w-6"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          if (confirm('確定要刪除此假日嗎？')) {
                            deleteMutation.mutate(holiday.id);
                          }
                        }}
                        className="h-6 w-6 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredHolidays.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {holidays.length === 0 ? '尚無假日資料' : '無符合條件的假日'}
              </p>
            </div>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingHoliday ? '編輯假日' : '新增假日'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">日期</label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">假日名稱</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例：中秋節"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">類型</label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="national">國定假日</SelectItem>
                      <SelectItem value="company">公司特別假</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingHoliday ? '更新' : '新增'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}