import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Edit2, Trash2, Search } from 'lucide-react';

export default function SampleManagement() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', type: 'universal', project_id: '' });
  const [searchText, setSearchText] = useState('');

  // Queries
  const { data: samples = [], isLoading } = useQuery({
    queryKey: ['samples'],
    queryFn: () => base44.entities.Sample.list('sort_order'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
  });

  // Mutations
  const createSample = useMutation({
    mutationFn: (data) => base44.entities.Sample.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['samples']);
      setShowDialog(false);
      setFormData({ name: '', type: 'universal', project_id: '' });
    },
  });

  const updateSample = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Sample.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['samples']);
      setShowDialog(false);
      setFormData({ name: '', type: 'universal', project_id: '' });
      setEditingId(null);
    },
  });

  const deleteSample = useMutation({
    mutationFn: (id) => base44.entities.Sample.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['samples']);
    },
  });

  const handleOpenDialog = (sample = null) => {
    if (sample) {
      setEditingId(sample.id);
      setFormData({
        name: sample.name,
        type: sample.type,
        project_id: sample.project_id || '',
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', type: 'universal', project_id: '' });
    }
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;

    const data = {
      name: formData.name,
      type: formData.type,
      ...(formData.type === 'brand' && { project_id: formData.project_id }),
    };

    if (editingId) {
      updateSample.mutate({ id: editingId, data });
    } else {
      createSample.mutate(data);
    }
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : '-';
  };

  const filteredSamples = samples.filter(s =>
    s.name?.toLowerCase().includes(searchText.toLowerCase()) ||
    getProjectName(s.project_id)?.toLowerCase().includes(searchText.toLowerCase())
  );
  
  const getTypeLabel = (type) => type === 'universal' ? '通用' : '品牌專用';
  const getTypeColor = (type) => type === 'universal' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">樣品種類管理</h1>
        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          新增樣品
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Input
          placeholder="搜尋樣品名稱或品牌..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="pl-10"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>

      {/* Samples List */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 border-b">
                <TableHead className="w-[40%]">名稱</TableHead>
                <TableHead className="w-[20%]">類型</TableHead>
                <TableHead className="w-[20%]">品牌/範圍</TableHead>
                <TableHead className="w-[10%]">狀態</TableHead>
                <TableHead className="w-[10%] text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSamples.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                    {searchText ? '未找到匹配的樣品' : '沒有樣品資料'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSamples.map((sample) => (
                  <TableRow key={sample.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{sample.name}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(sample.type)}`}>
                        {getTypeLabel(sample.type)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {sample.type === 'brand' ? getProjectName(sample.project_id) : '-'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          sample.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {sample.status === 'active' ? '啟用' : '停用'}
                      </span>
                    </TableCell>
                    <TableCell className="flex gap-1 md:gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => handleOpenDialog(sample)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => deleteSample.mutate(sample.id)}
                        disabled={deleteSample.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? '編輯樣品' : '新增樣品'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>樣品名稱</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例：玻璃後蓋"
                className="mt-1"
              />
            </div>
            <div>
              <Label>類型</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="universal">通用</SelectItem>
                  <SelectItem value="brand">品牌專用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.type === 'brand' && (
              <div>
                <Label>品牌</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(v) => setFormData({ ...formData, project_id: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="選擇品牌..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name || (formData.type === 'brand' && !formData.project_id)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {editingId ? '更新' : '建立'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}