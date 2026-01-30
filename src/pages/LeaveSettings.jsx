import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Loader2, Calendar, Tag } from 'lucide-react';
import { format } from 'date-fns';

const PRESET_COLORS = [
  '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#EF4444', '#06B6D4', '#84CC16', '#F97316'
];

export default function LeaveSettings() {
  const [activeTab, setActiveTab] = useState('types');
  const queryClient = useQueryClient();

  // ============ LEAVE TYPE STATE ============
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [typeFormData, setTypeFormData] = useState({ name: '', short_name: '', color: PRESET_COLORS[0] });

  // ============ HOLIDAY STATE ============
  const [isHolidayOpen, setIsHolidayOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [holidayFormData, setHolidayFormData] = useState({ date: '', name: '', type: 'company' });
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState(null);

  // ============ QUERIES ============
  const { data: leaveTypes = [], isLoading: loadingTypes } = useQuery({
    queryKey: ['leaveTypes'],
    queryFn: async () => {
      const types = await base44.entities.LeaveType.list('sort_order');
      return types.sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999));
    },
  });

  const { data: holidays = [], isLoading: loadingHolidays } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list('date'),
  });

  // ============ LEAVE TYPE MUTATIONS ============
  const createType = useMutation({
    mutationFn: (data) => base44.entities.LeaveType.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leaveTypes']);
      handleCloseTypeDialog();
    },
  });

  const updateType = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LeaveType.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leaveTypes']);
      handleCloseTypeDialog();
    },
  });

  const deleteType = useMutation({
    mutationFn: (id) => base44.entities.LeaveType.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['leaveTypes']),
  });

  // ============ HOLIDAY MUTATIONS ============
  const createHoliday = useMutation({
    mutationFn: (data) => base44.entities.Holiday.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['holidays']);
      setIsHolidayOpen(false);
      setHolidayFormData({ date: '', name: '', type: 'company' });
    },
  });

  const updateHoliday = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Holiday.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['holidays']);
      setIsHolidayOpen(false);
      setEditingHoliday(null);
      setHolidayFormData({ date: '', name: '', type: 'company' });
    },
  });

  const deleteHoliday = useMutation({
    mutationFn: (id) => base44.entities.Holiday.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['holidays']);
    },
  });

  // ============ LEAVE TYPE HANDLERS ============
  const handleOpenTypeDialog = (type = null) => {
    if (type) {
      setEditingType(type);
      setTypeFormData({ name: type.name, short_name: type.short_name, color: type.color });
    } else {
      setEditingType(null);
      setTypeFormData({ name: '', short_name: '', color: PRESET_COLORS[0] });
    }
    setIsTypeOpen(true);
  };

  const handleCloseTypeDialog = () => {
    setIsTypeOpen(false);
    setEditingType(null);
    setTypeFormData({ name: '', short_name: '', color: PRESET_COLORS[0] });
  };

  const handleSubmitType = (e) => {
    e.preventDefault();
    if (editingType) {
      updateType.mutate({ id: editingType.id, data: typeFormData });
    } else {
      const maxOrder = Math.max(...leaveTypes.map(t => t.sort_order || 0), 0);
      createType.mutate({ ...typeFormData, sort_order: maxOrder + 1 });
    }
  };

  const handleSortOrderChange = async (typeId, newOrder) => {
    const order = parseInt(newOrder);
    if (isNaN(order)) return;
    await base44.entities.LeaveType.update(typeId, { sort_order: order });
    queryClient.invalidateQueries(['leaveTypes']);
  };

  // ============ HOLIDAY HANDLERS ============
  const handleEditHoliday = (holiday) => {
    setEditingHoliday(holiday);
    setHolidayFormData({ date: holiday.date, name: holiday.name, type: holiday.type });
    setIsHolidayOpen(true);
  };

  const handleAddHoliday = () => {
    setEditingHoliday(null);
    setHolidayFormData({ date: '', name: '', type: 'company' });
    setIsHolidayOpen(true);
  };

  const handleSubmitHoliday = (e) => {
    e.preventDefault();
    if (editingHoliday) {
      updateHoliday.mutate({ id: editingHoliday.id, data: holidayFormData });
    } else {
      createHoliday.mutate(holidayFormData);
    }
  };

  const filteredHolidays = holidays.filter(holiday => {
    const yearMatch = selectedYear === 'all' || holiday.date.startsWith(selectedYear);
    const typeMatch = selectedType === 'all' || holiday.type === selectedType;
    return yearMatch && typeMatch;
  });

  const isLoading = loadingTypes || loadingHolidays;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">休假設定</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="types" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              <span>假別管理</span>
            </TabsTrigger>
            <TabsTrigger value="holidays" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>假日管理</span>
            </TabsTrigger>
          </TabsList>

          {/* LEAVE TYPES TAB */}
          <TabsContent value="types" className="space-y-4 mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Tag className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">假別列表</h2>
              </div>
              <Dialog open={isTypeOpen} onOpenChange={setIsTypeOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenTypeDialog()} className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    新增假別
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingType ? '編輯假別' : '新增假別'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmitType} className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="name">假別名稱</Label>
                      <Input
                        id="name"
                        value={typeFormData.name}
                        onChange={(e) => setTypeFormData({ ...typeFormData, name: e.target.value })}
                        required
                        placeholder="例：年假"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="short_name">簡稱</Label>
                      <Input
                        id="short_name"
                        value={typeFormData.short_name}
                        onChange={(e) => setTypeFormData({ ...typeFormData, short_name: e.target.value })}
                        required
                        placeholder="例：年"
                        maxLength={4}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>顏色</Label>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setTypeFormData({ ...typeFormData, color })}
                            className={`w-8 h-8 rounded-full transition-all ${
                              typeFormData.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-sm text-gray-500">自訂顏色：</span>
                        <Input
                          type="color"
                          value={typeFormData.color}
                          onChange={(e) => setTypeFormData({ ...typeFormData, color: e.target.value })}
                          className="w-12 h-8 p-0 border-0"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={handleCloseTypeDialog}>
                        取消
                      </Button>
                      <Button type="submit" className="bg-green-600 hover:bg-green-700">
                        {editingType ? '更新' : '新增'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-14 md:w-[8%]">排序</TableHead>
                    <TableHead className="w-12 md:w-[8%]">顏色</TableHead>
                    <TableHead className="md:w-[45%]">假別名稱</TableHead>
                    <TableHead className="w-20 md:w-[19%]">簡稱</TableHead>
                    <TableHead className="w-16 md:w-[20%]">編輯</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveTypes.map((lt, index) => (
                    <TableRow key={lt.id}>
                      <TableCell>
                        <Input
                          type="number"
                          value={lt.sort_order ?? ''}
                          onChange={(e) => handleSortOrderChange(lt.id, e.target.value)}
                          className="w-12 h-7 text-center text-xs"
                          min="1"
                        />
                      </TableCell>
                      <TableCell>
                        <div 
                          className="w-5 h-5 rounded"
                          style={{ backgroundColor: lt.color }}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-sm">{lt.name}</TableCell>
                      <TableCell>
                        <span 
                          className="px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap"
                          style={{ color: lt.color, backgroundColor: `${lt.color}15` }}
                        >
                          {lt.short_name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenTypeDialog(lt)}
                            className="h-7 w-7"
                          >
                            <Pencil className="w-4 h-4 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteType.mutate(lt.id)}
                            className="h-7 w-7"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* HOLIDAYS TAB */}
          <TabsContent value="holidays" className="space-y-4 mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">假日列表</h2>
              </div>
              <Button onClick={handleAddHoliday} className="bg-blue-600 hover:bg-blue-700">
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
                    <th className="px-1.5 md:px-3 py-2 text-left text-xs font-semibold text-gray-600 w-12 md:w-[17%]">編輯</th>
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
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditHoliday(holiday)}
                            className="h-6 w-6"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setHolidayToDelete(holiday);
                              setDeleteDialogOpen(true);
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

            <Dialog open={isHolidayOpen} onOpenChange={setIsHolidayOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingHoliday ? '編輯假日' : '新增假日'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitHoliday}>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">日期</label>
                      <Input
                        type="date"
                        value={holidayFormData.date}
                        onChange={(e) => setHolidayFormData({ ...holidayFormData, date: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">假日名稱</label>
                      <Input
                        value={holidayFormData.name}
                        onChange={(e) => setHolidayFormData({ ...holidayFormData, name: e.target.value })}
                        placeholder="例：中秋節"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">類型</label>
                      <Select value={holidayFormData.type} onValueChange={(value) => setHolidayFormData({ ...holidayFormData, type: value })}>
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
                  <DialogFooter className="flex flex-col sm:flex-row gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsHolidayOpen(false)}>
                      取消
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      {editingHoliday ? '更新' : '新增'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>刪除假日</DialogTitle>
                  <DialogDescription>
                    確定要刪除假日「{holidayToDelete?.name}」({holidayToDelete?.date}) 嗎？此操作無法復原。
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeleteDialogOpen(false);
                      setHolidayToDelete(null);
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      deleteHoliday.mutate(holidayToDelete.id);
                      setDeleteDialogOpen(false);
                      setHolidayToDelete(null);
                    }}
                  >
                    刪除
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}