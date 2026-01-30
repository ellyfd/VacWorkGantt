import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function DataImport() {
  const queryClient = useQueryClient();
  const [uploadStatus, setUploadStatus] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Queries
  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => base44.entities.Group.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  // Parse CSV
  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/\uFEFF/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      data.push(row);
    }

    return data;
  };

  // Handle Group Import
  const handleGroupImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setUploadStatus({ type: 'group', status: 'processing' });

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        throw new Error('CSV 檔案為空或格式不正確');
      }

      const toCreate = rows.map(row => ({
        name: row.name,
        status: row.status || 'active',
        sort_order: parseInt(row.sort_order) || 0,
      }));

      await base44.entities.Group.bulkCreate(toCreate);
      queryClient.invalidateQueries(['groups']);
      setUploadStatus({ type: 'group', status: 'success', count: toCreate.length });
    } catch (error) {
      setUploadStatus({ type: 'group', status: 'error', message: error.message });
    } finally {
      setIsLoading(false);
      event.target.value = '';
    }
  };

  // Handle Project Import
  const handleProjectImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setUploadStatus({ type: 'project', status: 'processing' });

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        throw new Error('CSV 檔案為空或格式不正確');
      }

      const toCreate = rows.map(row => {
        const groupId = row.group_name 
          ? groups.find(g => g.name === row.group_name)?.id 
          : '';

        return {
          name: row.name || row.short_name,
          full_name: row.full_name,
          short_name: row.short_name,
          group_id: groupId || null,
          status: row.status || 'active',
          sort_order: parseInt(row.sort_order) || 0,
        };
      });

      await base44.entities.Project.bulkCreate(toCreate);
      queryClient.invalidateQueries(['projects']);
      setUploadStatus({ type: 'project', status: 'success', count: toCreate.length });
    } catch (error) {
      setUploadStatus({ type: 'project', status: 'error', message: error.message });
    } finally {
      setIsLoading(false);
      event.target.value = '';
    }
  };

  // Handle Sample Import
  const handleSampleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setUploadStatus({ type: 'sample', status: 'processing' });

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        throw new Error('CSV 檔案為空或格式不正確');
      }

      const toCreate = rows.map(row => {
        const projectId = row.brand_short_name
          ? projects.find(p => p.short_name === row.brand_short_name)?.id
          : '';

        if (!projectId) {
          throw new Error(`找不到品牌: ${row.brand_short_name}`);
        }

        return {
          name: row.name,
          full_name: row.full_name || row.name,
          short_name: row.short_name || row.name,
          project_id: projectId,
          sort_order: parseInt(row.sort_order) || 0,
          status: 'active',
        };
      });

      await base44.entities.Sample.bulkCreate(toCreate);
      queryClient.invalidateQueries(['samples']);
      setUploadStatus({ type: 'sample', status: 'success', count: toCreate.length });
    } catch (error) {
      setUploadStatus({ type: 'sample', status: 'error', message: error.message });
    } finally {
      setIsLoading(false);
      event.target.value = '';
    }
  };

  const getStatusDisplay = (type) => {
    const status = uploadStatus[type] || uploadStatus;
    if (status.type !== type) return null;

    if (status.status === 'processing') {
      return (
        <div className="flex items-center gap-2 text-blue-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>匯入中...</span>
        </div>
      );
    }

    if (status.status === 'success') {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span>成功匯入 {status.count} 筆資料</span>
        </div>
      );
    }

    if (status.status === 'error') {
      return (
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>{status.message}</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">資料匯入</h1>

        <Tabs defaultValue="groups" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="groups">集團</TabsTrigger>
            <TabsTrigger value="projects">品牌</TabsTrigger>
            <TabsTrigger value="samples">樣品</TabsTrigger>
          </TabsList>

          {/* Groups Tab */}
          <TabsContent value="groups">
            <Card>
              <CardHeader>
                <CardTitle>匯入集團資料</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
                  <p className="font-semibold mb-2">CSV 格式：</p>
                  <pre className="text-xs overflow-x-auto">name,status,sort_order
GAP,active,1
Walmart,active,2</pre>
                </div>

                <label htmlFor="group-upload" className="block">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => document.getElementById('group-upload').click()}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    選擇 CSV 檔案
                  </Button>
                </label>
                <input
                  id="group-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleGroupImport}
                  className="hidden"
                />

                {getStatusDisplay('group') && (
                  <div className="mt-4">{getStatusDisplay('group')}</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <CardTitle>匯入品牌資料</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
                  <p className="font-semibold mb-2">CSV 格式：</p>
                  <pre className="text-xs overflow-x-auto">name,full_name,short_name,group_name,status,sort_order
A&F,Abercrombie & Fitch,A&F,,active,1
ATH,ATHLETA,ATH,GAP,active,2</pre>
                  <p className="mt-2 text-xs">注：group_name 要與已匯入的集團名稱相符</p>
                </div>

                <label htmlFor="project-upload" className="block">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading || groups.length === 0}
                    onClick={() => document.getElementById('project-upload').click()}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    選擇 CSV 檔案
                  </Button>
                </label>
                {groups.length === 0 && (
                  <p className="text-xs text-red-600">請先匯入集團資料</p>
                )}
                <input
                  id="project-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleProjectImport}
                  className="hidden"
                />

                {getStatusDisplay('project') && (
                  <div className="mt-4">{getStatusDisplay('project')}</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Samples Tab */}
          <TabsContent value="samples">
            <Card>
              <CardHeader>
                <CardTitle>匯入樣品資料</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
                  <p className="font-semibold mb-2">CSV 格式：</p>
                  <pre className="text-xs overflow-x-auto">name,full_name,short_name,brand_short_name,sort_order
FSS,FSS,FSS,A&F,1
Fit,Fit,Fit,A&F,2</pre>
                  <p className="mt-2 text-xs">注：brand_short_name 要與已匯入的品牌縮寫相符</p>
                </div>

                <label htmlFor="sample-upload" className="block">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading || projects.length === 0}
                    onClick={() => document.getElementById('sample-upload').click()}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    選擇 CSV 檔案
                  </Button>
                </label>
                {projects.length === 0 && (
                  <p className="text-xs text-red-600">請先匯入品牌資料</p>
                )}
                <input
                  id="sample-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleSampleImport}
                  className="hidden"
                />

                {getStatusDisplay('sample') && (
                  <div className="mt-4">{getStatusDisplay('sample')}</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 p-4 bg-amber-50 rounded-lg text-sm text-amber-800">
          <p className="font-semibold mb-2">匯入順序：</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>先匯入集團 (Group)</li>
            <li>再匯入品牌 (Project)，關聯到集團</li>
            <li>最後匯入樣品 (Sample)，關聯到品牌</li>
          </ol>
        </div>
      </div>
    </div>
  );
}