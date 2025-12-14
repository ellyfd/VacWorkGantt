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
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2, Calendar } from 'lucide-react';

const PRESET_COLORS = [
  '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#EF4444', '#06B6D4', '#84CC16', '#F97316'
];

export default function LeaveTypeManagement() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({ name: '', short_name: '', color: PRESET_COLORS[0] });
  const queryClient = useQueryClient();

  const { data: leaveTypes = [], isLoading } = useQuery({
    queryKey: ['leaveTypes'],
    queryFn: async () => {
      const types = await base44.entities.LeaveType.list('sort_order');
      return types.sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999));
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LeaveType.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leaveTypes']);
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LeaveType.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leaveTypes']);
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LeaveType.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['leaveTypes']),
  });

  const handleOpenDialog = (type = null) => {
    if (type) {
      setEditingType(type);
      setFormData({ name: type.name, short_name: type.short_name, color: type.color });
    } else {
      setEditingType(null);
      setFormData({ name: '', short_name: '', color: PRESET_COLORS[0] });
    }
    setIsOpen(true);
  };

  const handleCloseDialog = () => {
    setIsOpen(false);
    setEditingType(null);
    setFormData({ name: '', short_name: '', color: PRESET_COLORS[0] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data: formData });
    } else {
      const maxOrder = Math.max(...leaveTypes.map(t => t.sort_order || 0), 0);
      createMutation.mutate({ ...formData, sort_order: maxOrder + 1 });
    }
  };

  const handleSortOrderChange = async (typeId, newOrder) => {
    const order = parseInt(newOrder);
    if (isNaN(order)) return;
    await base44.entities.LeaveType.update(typeId, { sort_order: order });
    queryClient.invalidateQueries(['leaveTypes']);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">假別管理</h1>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                新增假別
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingType ? '編輯假別' : '新增假別'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name">假別名稱</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="例：年假"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="short_name">簡稱</Label>
                  <Input
                    id="short_name"
                    value={formData.short_name}
                    onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
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
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-full transition-all ${
                          formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-sm text-gray-500">自訂顏色：</span>
                    <Input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-8 p-0 border-0"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-green-600" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-20">排序</TableHead>
                  <TableHead className="w-16">顏色</TableHead>
                  <TableHead>假別名稱</TableHead>
                  <TableHead className="w-24">簡稱</TableHead>
                  <TableHead className="w-16 text-center">編輯</TableHead>
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
                        placeholder={(index + 1).toString()}
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
                      <div className="flex flex-col items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(lt)}
                          className="h-7 w-7"
                        >
                          <Pencil className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(lt.id)}
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
          )}
        </div>
      </div>
    </div>
  );
}