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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [showSampleDialog, setShowSampleDialog] = useState(false);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingType, setEditingType] = useState(null);
  const [sampleFormData, setSampleFormData] = useState({ name: '', type: 'universal', project_id: '' });
  const [projectFormData, setProjectFormData] = useState({ brand_name: '', season: 'SS26', year: 2026 });
  const [searchText, setSearchText] = useState('');
  const [projectSearchText, setProjectSearchText] = useState('');

  // Queries
  const { data: samples = [], isLoading: loadingSamples } = useQuery({
    queryKey: ['samples'],
    queryFn: () => base44.entities.Sample.list('sort_order'),
  });

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('sort_order'),
  });

  // Mutations
  // Sample Mutations
  const createSample = useMutation({
    mutationFn: (data) => base44.entities.Sample.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['samples']);
      setShowSampleDialog(false);
      setSampleFormData({ name: '', type: 'universal', project_id: '' });
    },
  });

  const updateSample = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Sample.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['samples']);
      setShowSampleDialog(false);
      setSampleFormData({ name: '', type: 'universal', project_id: '' });
      setEditingId(null);
    },
  });

  const deleteSample = useMutation({
    mutationFn: (id) => base44.entities.Sample.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['samples']);
    },
  });

  // Project Mutations
  const createProject = useMutation({
    mutationFn: (data) => {
      const name = `${data.brand_name} ${data.season}`;
      return base44.entities.Project.create({ ...data, name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setShowProjectDialog(false);
      setProjectFormData({ brand_name: '', season: 'SS26', year: 2026 });
    },
  });

  const updateProject = useMutation({
    mutationFn: ({ id, data }) => {
      const name = `${data.brand_name} ${data.season}`;
      return base44.entities.Project.update(id, { ...data, name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setShowProjectDialog(false);
      setProjectFormData({ brand_name: '', season: 'SS26', year: 2026 });
      setEditingId(null);
    },
  });

  const deleteProject = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
    },
  });

  const handleOpenSampleDialog = (sample = null) => {
    if (sample) {
      setEditingId(sample.id);
      setEditingType('sample');
      setSampleFormData({
        name: sample.name,
        type: sample.type,
        project_id: sample.project_id || '',
      });
    } else {
      setEditingId(null);
      setEditingType('sample');
      setSampleFormData({ name: '', type: 'universal', project_id: '' });
    }
    setShowSampleDialog(true);
  };

  const handleSaveSample = () => {
    if (!sampleFormData.name.trim()) return;

    const data = {
      name: sampleFormData.name,
      type: sampleFormData.type,
      ...(sampleFormData.type === 'brand' && { project_id: sampleFormData.project_id }),
    };

    if (editingId) {
      updateSample.mutate({ id: editingId, data });
    } else {
      createSample.mutate(data);
    }
  };

  const handleOpenProjectDialog = (project = null) => {
    if (project) {
      setEditingId(project.id);
      setEditingType('project');
      setProjectFormData({
        brand_name: project.brand_name,
        season: project.season,
        year: project.year,
      });
    } else {
      setEditingId(null);
      setEditingType('project');
      setProjectFormData({ brand_name: '', season: 'SS26', year: 2026 });
    }
    setShowProjectDialog(true);
  };

  const handleSaveProject = () => {
    if (!projectFormData.brand_name.trim()) return;

    if (editingId) {
      updateProject.mutate({ id: editingId, data: projectFormData });
    } else {
      createProject.mutate(projectFormData);
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

  const filteredProjects = projects.filter(p =>
    p.name?.toLowerCase().includes(projectSearchText.toLowerCase()) ||
    p.brand_name?.toLowerCase().includes(projectSearchText.toLowerCase())
  );
  
  const getTypeLabel = (type) => type === 'universal' ? '通用' : '品牌專用';
  const getTypeColor = (type) => type === 'universal' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';

  const isLoading = loadingSamples || loadingProjects;

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
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">樣品與品牌管理</h1>
      </div>

      <Tabs defaultValue="samples" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="samples">樣品管理</TabsTrigger>
          <TabsTrigger value="projects">品牌管理</TabsTrigger>
        </TabsList>

        {/* Samples Tab */}
        <TabsContent value="samples" className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">樣品列表</h2>
            <Button onClick={() => handleOpenSampleDialog()} className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto">
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
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow className="bg-gray-50 border-b whitespace-nowrap">
                <TableHead className="w-[35%] md:w-[40%]">名稱</TableHead>
                <TableHead className="w-[20%]">類型</TableHead>
                <TableHead className="w-[25%] md:w-[20%]">品牌/範圍</TableHead>
                <TableHead className="w-[12%] md:w-[10%]">狀態</TableHead>
                <TableHead className="w-[8%] md:w-[10%] text-right">操作</TableHead>
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
                  <TableRow key={sample.id} className="hover:bg-gray-50 whitespace-nowrap">
                    <TableCell className="font-medium text-sm md:text-base truncate">{sample.name}</TableCell>
                    <TableCell className="text-xs md:text-sm">
                      <span className={`px-1.5 md:px-2 py-1 rounded text-[10px] md:text-xs font-medium ${getTypeColor(sample.type)}`}>
                        {getTypeLabel(sample.type)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs md:text-sm text-gray-600 truncate">
                      {sample.type === 'brand' ? getProjectName(sample.project_id) : '-'}
                    </TableCell>
                    <TableCell className="text-xs md:text-sm">
                      <span
                        className={`px-1.5 md:px-2 py-1 rounded text-[10px] md:text-xs font-medium inline-block ${
                          sample.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {sample.status === 'active' ? '啟用' : '停用'}
                      </span>
                    </TableCell>
                    <TableCell className="flex gap-0.5 md:gap-2 justify-end flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 md:w-8 md:h-8"
                        onClick={() => handleOpenDialog(sample)}
                      >
                        <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 md:w-8 md:h-8"
                        onClick={() => deleteSample.mutate(sample.id)}
                        disabled={deleteSample.isPending}
                      >
                        <Trash2 className="w-3 h-3 md:w-4 md:h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sample Dialog */}
      <Dialog open={showSampleDialog} onOpenChange={setShowSampleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId && editingType === 'sample' ? '編輯樣品' : '新增樣品'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>樣品名稱</Label>
              <Input
                value={sampleFormData.name}
                onChange={(e) => setSampleFormData({ ...sampleFormData, name: e.target.value })}
                placeholder="例：玻璃後蓋"
                className="mt-1"
              />
            </div>
            <div>
              <Label>類型</Label>
              <Select
                value={sampleFormData.type}
                onValueChange={(v) => setSampleFormData({ ...sampleFormData, type: v })}
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
            {sampleFormData.type === 'brand' && (
              <div>
                <Label>品牌</Label>
                <Select
                  value={sampleFormData.project_id}
                  onValueChange={(v) => setSampleFormData({ ...sampleFormData, project_id: v })}
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
            <Button variant="outline" onClick={() => setShowSampleDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleSaveSample}
              disabled={!sampleFormData.name || (sampleFormData.type === 'brand' && !sampleFormData.project_id)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {editingId && editingType === 'sample' ? '更新' : '建立'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Dialog */}
      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId && editingType === 'project' ? '編輯品牌' : '新增品牌'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>品牌名稱</Label>
              <Input
                value={projectFormData.brand_name}
                onChange={(e) => setProjectFormData({ ...projectFormData, brand_name: e.target.value })}
                placeholder="例：iPhone"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>季節</Label>
                <Select
                  value={projectFormData.season}
                  onValueChange={(v) => setProjectFormData({ ...projectFormData, season: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['SS25', 'FW25', 'SS26', 'FW26', 'SS27', 'FW27'].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>年份</Label>
                <Select
                  value={projectFormData.year.toString()}
                  onValueChange={(v) => setProjectFormData({ ...projectFormData, year: parseInt(v) })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2025, 2026, 2027].map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProjectDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleSaveProject}
              disabled={!projectFormData.brand_name}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {editingId && editingType === 'project' ? '更新' : '建立'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}