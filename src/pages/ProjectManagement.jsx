import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, BarChart3, Plus, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ProjectManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({ name: '', brand_name: '', season: '', year: new Date().getFullYear(), status: 'active' });
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('sort_order'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const name = `${data.brand_name} ${data.season}`;
      return base44.entities.Project.create({ ...data, name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setDialogOpen(false);
      setFormData({ name: '', brand_name: '', season: '', year: new Date().getFullYear(), status: 'active' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => {
      const name = `${data.brand_name} ${data.season}`;
      return base44.entities.Project.update(id, { ...data, name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setDialogOpen(false);
      setEditingProject(null);
      setFormData({ name: '', brand_name: '', season: '', year: new Date().getFullYear(), status: 'active' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setFormData({ name: project.name, brand_name: project.brand_name, season: project.season, year: project.year, status: project.status || 'active' });
    setDialogOpen(true);
  };

  const handleDelete = (id) => {
    if (confirm('確定要刪除此專案嗎？')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">專案管理</h1>
          </div>
          <Button onClick={() => { setEditingProject(null); setFormData({ name: '', brand_name: '', season: '', year: new Date().getFullYear(), status: 'active' }); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-5 h-5 mr-2" />
            新增專案
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>專案列表</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>專案名稱</TableHead>
                  <TableHead>品牌</TableHead>
                  <TableHead>季度</TableHead>
                  <TableHead>年份</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>{project.brand_name}</TableCell>
                    <TableCell className="font-medium">{project.season}</TableCell>
                    <TableCell>{project.year}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        project.status === 'active' ? 'bg-green-100 text-green-700' :
                        project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {project.status === 'active' ? '進行中' : project.status === 'completed' ? '已完成' : '已封存'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(project)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(project.id)} className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProject ? '編輯專案' : '新增專案'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name">專案名稱</Label>
                  <Input
                    id="name"
                    value={formData.brand_name && formData.season ? `${formData.brand_name} ${formData.season}` : ''}
                    placeholder="例: iPhone SS26"
                    disabled
                    className="bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">自動由品牌和季度生成</p>
                </div>
                <div>
                  <Label htmlFor="brand_name">品牌名稱</Label>
                  <Input
                    id="brand_name"
                    value={formData.brand_name}
                    onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                    placeholder="例: iPhone"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="season">季度</Label>
                  <Input
                    id="season"
                    value={formData.season}
                    onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                    placeholder="例: SS26, FW26"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="year">年份</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="status">狀態</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">進行中</SelectItem>
                      <SelectItem value="completed">已完成</SelectItem>
                      <SelectItem value="archived">已封存</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">儲存</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}