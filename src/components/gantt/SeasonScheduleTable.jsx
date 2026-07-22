import React, { memo, useMemo, useState } from 'react';
import { CalendarRange, RotateCcw } from 'lucide-react';
import { format, parseISO } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ALL = '__all__';
const SEASON_ORDER = ['SP', 'SU', 'HO', 'FW', 'C1', 'C2', 'C3', 'C4'];

function getSeasonMeta(project) {
  const source = `${project.season || ''} ${project.name || ''}`.toUpperCase();
  const combinedMatch = source.match(/(?:^|\s)(SP|SU|HO|FW|C[1-4])\s*([0-9]{2}|[0-9]{4})(?=\s|$)/);
  const seasonMatch = source.match(/(?:^|\s)(SP|SU|HO|FW|C[1-4])(?=\s|[0-9]|$)/);
  const rawYear = project.year || combinedMatch?.[2] || source.match(/(?:^|\D)(20[0-9]{2})(?:\D|$)/)?.[1];
  const year = rawYear
    ? String(rawYear).length === 2
      ? String(2000 + Number(rawYear))
      : String(rawYear)
    : '';

  return {
    season: combinedMatch?.[1] || seasonMatch?.[1] || '',
    year,
  };
}

function formatTaskDate(task) {
  if (!task.start_date) return '—';

  const start = format(parseISO(task.start_date), 'M/d');
  if (task.time_type === 'rolling') return `${start} 起`;
  if (task.end_date && task.end_date !== task.start_date) {
    return `${start}–${format(parseISO(task.end_date), 'M/d')}`;
  }
  return start;
}

function FilterSelect({ label, value, onValueChange, options, placeholder }) {
  return (
    <label className="flex min-w-[140px] flex-1 flex-col gap-1.5 sm:max-w-[210px]">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger aria-label={label} className="bg-white">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

const SeasonScheduleTable = memo(function SeasonScheduleTable({ ganttProjects, ganttTasks, brands }) {
  const [brandId, setBrandId] = useState(ALL);
  const [season, setSeason] = useState(ALL);
  const [year, setYear] = useState(ALL);

  const brandMap = useMemo(
    () => Object.fromEntries(brands.map((brand) => [brand.id, brand])),
    [brands],
  );
  const projectsWithMeta = useMemo(
    () => ganttProjects.map((project) => ({ ...project, ...getSeasonMeta(project) })),
    [ganttProjects],
  );

  const brandOptions = useMemo(() => {
    const ids = [...new Set(projectsWithMeta.map((project) => project.brand_id).filter(Boolean))];
    return ids.map((id) => ({
      value: id,
      label: brandMap[id]?.short_name || brandMap[id]?.name || brandMap[id]?.full_name || '未命名客人',
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [brandMap, projectsWithMeta]);

  const seasonOptions = useMemo(() => {
    const seasons = [...new Set(projectsWithMeta.map((project) => project.season).filter(Boolean))];
    return seasons
      .sort((a, b) => SEASON_ORDER.indexOf(a) - SEASON_ORDER.indexOf(b))
      .map((value) => ({ value, label: value }));
  }, [projectsWithMeta]);

  const yearOptions = useMemo(
    () => [...new Set(projectsWithMeta.map((project) => project.year).filter(Boolean))]
      .sort((a, b) => Number(b) - Number(a))
      .map((value) => ({ value, label: `${value} 年` })),
    [projectsWithMeta],
  );

  const filteredProjects = useMemo(
    () => projectsWithMeta.filter((project) => (
      (brandId === ALL || project.brand_id === brandId)
      && (season === ALL || project.season === season)
      && (year === ALL || project.year === year)
    )),
    [brandId, projectsWithMeta, season, year],
  );
  const filteredProjectIds = useMemo(
    () => new Set(filteredProjects.map((project) => project.id)),
    [filteredProjects],
  );

  const taskColumns = useMemo(() => {
    const columns = new Map();
    ganttTasks.forEach((task) => {
      if (!filteredProjectIds.has(task.gantt_project_id) || !task.name) return;
      const previousOrder = columns.get(task.name);
      columns.set(task.name, Math.min(previousOrder ?? Number.MAX_SAFE_INTEGER, task.sort_order ?? Number.MAX_SAFE_INTEGER));
    });
    return [...columns.entries()]
      .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name);
  }, [filteredProjectIds, ganttTasks]);

  const tasksByProjectAndName = useMemo(() => {
    const result = new Map();
    ganttTasks.forEach((task) => {
      if (!filteredProjectIds.has(task.gantt_project_id) || !task.name) return;
      const key = `${task.gantt_project_id}::${task.name}`;
      result.set(key, [...(result.get(key) || []), task]);
    });
    return result;
  }, [filteredProjectIds, ganttTasks]);

  const hasActiveFilters = brandId !== ALL || season !== ALL || year !== ALL;
  const resetFilters = () => {
    setBrandId(ALL);
    setSeason(ALL);
    setYear(ALL);
  };

  return (
    <Card className="mt-4 overflow-hidden border-slate-200 shadow-sm">
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CalendarRange className="h-5 w-5 text-blue-600" aria-hidden="true" />
              <h2 className="text-base font-semibold text-slate-900">開發季時間表</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">由上方甘特資料自動整理，日期調整後會同步更新。</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <FilterSelect label="客人" value={brandId} onValueChange={setBrandId} options={brandOptions} placeholder="全部客人" />
            <FilterSelect label="季節" value={season} onValueChange={setSeason} options={seasonOptions} placeholder="全部季節" />
            <FilterSelect label="年份" value={year} onValueChange={setYear} options={yearOptions} placeholder="全部年份" />
            <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" disabled={!hasActiveFilters} onClick={resetFilters}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              清除
            </Button>
          </div>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center px-6 py-10 text-center">
          <CalendarRange className="mb-3 h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="font-medium text-slate-700">找不到符合條件的開發季</p>
          <p className="mt-1 text-sm text-slate-500">請調整篩選條件，或先在上方建立開發季資料。</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-sm">
            <caption className="sr-only">依客人、開發季與工作項目整理的時間表</caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
                <th scope="col" className="sticky left-0 z-20 min-w-28 bg-slate-50 px-4 py-3">客人</th>
                <th scope="col" className="sticky left-28 z-20 min-w-40 border-r border-slate-200 bg-slate-50 px-4 py-3">開發季</th>
                {taskColumns.map((taskName) => <th key={taskName} scope="col" className="min-w-32 px-4 py-3">{taskName}</th>)}
                {taskColumns.length === 0 && <th scope="col" className="min-w-48 px-4 py-3">工作時間</th>}
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => {
                const brand = brandMap[project.brand_id];
                return (
                  <tr key={project.id} className="group border-b border-slate-100 last:border-b-0 hover:bg-blue-50/40">
                    <th scope="row" className="sticky left-0 z-10 bg-white px-4 py-3 text-left font-medium text-slate-700 group-hover:bg-blue-50/40">
                      {brand?.short_name || brand?.name || brand?.full_name || '—'}
                    </th>
                    <td className="sticky left-28 z-10 border-r border-slate-200 bg-white px-4 py-3 group-hover:bg-blue-50/40">
                      <span className="font-medium text-slate-900">{project.name}</span>
                      {project.archived_at && <span className="ml-2 text-xs text-slate-400">已歸檔</span>}
                    </td>
                    {taskColumns.map((taskName) => {
                      const tasks = tasksByProjectAndName.get(`${project.id}::${taskName}`) || [];
                      return (
                        <td key={taskName} className="px-4 py-3 tabular-nums text-slate-700">
                          {tasks.length > 0
                            ? tasks.map((task) => <div key={task.id} className="whitespace-nowrap">{formatTaskDate(task)}</div>)
                            : <span className="text-slate-300">—</span>}
                        </td>
                      );
                    })}
                    {taskColumns.length === 0 && <td className="px-4 py-3 text-slate-400">尚未設定工作時間</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-500 sm:px-5">
        顯示 {filteredProjects.length} 個開發季 · 日期格式為月／日
      </div>
    </Card>
  );
});

export default SeasonScheduleTable;
