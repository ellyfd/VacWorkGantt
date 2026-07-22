import React, { memo, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarRange, ListFilter, RotateCcw } from 'lucide-react';
import { eachDayOfInterval, format, isWeekend, parseISO } from 'date-fns';

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
    ? String(rawYear).length === 2 ? String(2000 + Number(rawYear)) : String(rawYear)
    : '';
  const season = combinedMatch?.[1] || seasonMatch?.[1] || '';

  return {
    season,
    year,
    seasonLabel: season ? `${season}${year.slice(-2)}` : '未設定季別',
  };
}

function getCanonicalTaskName(name) {
  const compactName = name.trim().replace(/[\s_-]+/g, '').toLowerCase();
  return compactName === 'proto' || compactName === '3dproto' ? 'PROTO' : name.trim();
}

function getTaskTimestamp(task) {
  return task?.start_date ? parseISO(task.start_date).getTime() : Number.MAX_SAFE_INTEGER;
}

function countWorkingDays(startDate, endDate) {
  const start = parseISO(startDate);
  const end = parseISO(endDate || startDate);
  const interval = start <= end ? { start, end } : { start: end, end: start };
  return eachDayOfInterval(interval).filter((day) => !isWeekend(day)).length;
}

function formatTaskDate(task) {
  if (!task.start_date) return '';
  const start = format(parseISO(task.start_date), 'M/d');
  if (task.time_type === 'rolling') return `${start} 起`;
  const dateText = task.end_date && task.end_date !== task.start_date
    ? `${start}–${format(parseISO(task.end_date), 'M/d')}`
    : start;
  return `${dateText}（${countWorkingDays(task.start_date, task.end_date)}天）`;
}

function HeaderFilterSelect({ label, value, onValueChange, options, placeholder, className = 'w-36' }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger aria-label={label} className={`h-8 bg-white px-2 text-xs font-normal ${className}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export const SeasonScheduleTable = memo(function SeasonScheduleTable({ ganttProjects, ganttTasks, brands }) {
  const [brandId, setBrandId] = useState(ALL);
  const [season, setSeason] = useState(ALL);
  const [year, setYear] = useState(ALL);
  const [requiredTask, setRequiredTask] = useState(ALL);
  const [sortState, setSortState] = useState({ key: 'customer', direction: 'asc' });

  const brandMap = useMemo(
    () => Object.fromEntries(brands.map((brand) => [brand.id, brand])),
    [brands],
  );
  const scheduledProjectIds = useMemo(
    () => new Set(ganttTasks.filter((task) => task.start_date).map((task) => task.gantt_project_id)),
    [ganttTasks],
  );
  const scheduleProjects = useMemo(
    () => ganttProjects
      .filter((project) => scheduledProjectIds.has(project.id))
      .map((project) => ({ ...project, ...getSeasonMeta(project) })),
    [ganttProjects, scheduledProjectIds],
  );

  const brandOptions = useMemo(() => {
    const ids = [...new Set(scheduleProjects.map((project) => project.brand_id).filter(Boolean))];
    return ids.map((id) => ({
      value: id,
      label: brandMap[id]?.short_name || brandMap[id]?.name || brandMap[id]?.full_name || '未命名客人',
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [brandMap, scheduleProjects]);

  const seasonOptions = useMemo(() => [...new Set(scheduleProjects.map((project) => project.season).filter(Boolean))]
    .sort((a, b) => SEASON_ORDER.indexOf(a) - SEASON_ORDER.indexOf(b))
    .map((value) => ({ value, label: value })), [scheduleProjects]);

  const yearOptions = useMemo(() => [...new Set(scheduleProjects.map((project) => project.year).filter(Boolean))]
    .sort((a, b) => Number(b) - Number(a))
    .map((value) => ({ value, label: `${value} 年` })), [scheduleProjects]);

  const filteredProjects = useMemo(() => scheduleProjects.filter((project) => (
    (brandId === ALL || project.brand_id === brandId)
    && (season === ALL || project.season === season)
    && (year === ALL || project.year === year)
  )), [brandId, scheduleProjects, season, year]);

  const filteredProjectIds = useMemo(() => new Set(filteredProjects.map((project) => project.id)), [filteredProjects]);
  const tasksByProjectAndName = useMemo(() => {
    const result = new Map();
    ganttTasks.forEach((task) => {
      if (!filteredProjectIds.has(task.gantt_project_id) || !task.name || !task.start_date) return;
      const taskName = getCanonicalTaskName(task.name);
      const key = `${task.gantt_project_id}::${taskName}`;
      result.set(key, [...(result.get(key) || []), task].sort((a, b) => getTaskTimestamp(a) - getTaskTimestamp(b)));
    });
    return result;
  }, [filteredProjectIds, ganttTasks]);

  const taskColumns = useMemo(() => {
    const columns = new Map();
    ganttTasks.forEach((task) => {
      if (!filteredProjectIds.has(task.gantt_project_id) || !task.name || !task.start_date) return;
      const taskName = getCanonicalTaskName(task.name);
      const entry = columns.get(taskName) || { name: taskName, projectIds: new Set() };
      entry.projectIds.add(task.gantt_project_id);
      columns.set(taskName, entry);
    });
    return [...columns.values()]
      .map((entry) => ({ name: entry.name, count: entry.projectIds.size }))
      .sort((a, b) => {
        const aPinnedRight = /專案|數位|digital/i.test(a.name);
        const bPinnedRight = /專案|數位|digital/i.test(b.name);
        if (aPinnedRight !== bPinnedRight) return aPinnedRight ? 1 : -1;
        return b.count - a.count || a.name.localeCompare(b.name);
      });
  }, [filteredProjectIds, ganttTasks]);

  const effectiveRequiredTask = taskColumns.some((column) => column.name === requiredTask) ? requiredTask : ALL;
  const displayedProjects = useMemo(() => effectiveRequiredTask === ALL
    ? filteredProjects
    : filteredProjects.filter((project) => tasksByProjectAndName.has(`${project.id}::${effectiveRequiredTask}`)),
  [effectiveRequiredTask, filteredProjects, tasksByProjectAndName]);

  const brandFrequency = useMemo(() => displayedProjects.reduce((result, project) => {
    result[project.brand_id] = (result[project.brand_id] || 0) + 1;
    return result;
  }, {}), [displayedProjects]);

  const sortedProjects = useMemo(() => [...displayedProjects].sort((a, b) => {
    let comparison = 0;
    if (sortState.key === 'frequency') {
      comparison = (brandFrequency[a.brand_id] || 0) - (brandFrequency[b.brand_id] || 0);
    } else if (sortState.key === 'season') {
      comparison = `${a.year}${String(SEASON_ORDER.indexOf(a.season)).padStart(2, '0')}`
        .localeCompare(`${b.year}${String(SEASON_ORDER.indexOf(b.season)).padStart(2, '0')}`);
    } else if (sortState.key === 'customer') {
      const aName = brandMap[a.brand_id]?.short_name || brandMap[a.brand_id]?.name || '';
      const bName = brandMap[b.brand_id]?.short_name || brandMap[b.brand_id]?.name || '';
      comparison = aName.localeCompare(bName);
    } else if (sortState.key.startsWith('task:')) {
      const taskName = sortState.key.slice(5);
      const aTimestamp = getTaskTimestamp(tasksByProjectAndName.get(`${a.id}::${taskName}`)?.[0]);
      const bTimestamp = getTaskTimestamp(tasksByProjectAndName.get(`${b.id}::${taskName}`)?.[0]);
      if (aTimestamp === Number.MAX_SAFE_INTEGER && bTimestamp !== Number.MAX_SAFE_INTEGER) return 1;
      if (bTimestamp === Number.MAX_SAFE_INTEGER && aTimestamp !== Number.MAX_SAFE_INTEGER) return -1;
      comparison = aTimestamp - bTimestamp;
    }
    if (comparison === 0) comparison = (a.sort_order || 0) - (b.sort_order || 0);
    return sortState.direction === 'asc' ? comparison : -comparison;
  }), [brandFrequency, brandMap, displayedProjects, sortState, tasksByProjectAndName]);

  const updateSort = (key) => setSortState((current) => ({
    key,
    direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
  }));
  const hasActiveFilters = brandId !== ALL || season !== ALL || year !== ALL || effectiveRequiredTask !== ALL;
  const resetFilters = () => {
    setBrandId(ALL);
    setSeason(ALL);
    setYear(ALL);
    setRequiredTask(ALL);
  };
  const SortIcon = sortState.direction === 'asc' ? ArrowUp : ArrowDown;

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm">
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarRange className="h-5 w-5 text-blue-600" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-slate-900">開發季時間表</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">直接在欄位標題排序與篩選；專案、數位相關項目固定置於最右側。</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 gap-1.5" disabled={!hasActiveFilters} onClick={resetFilters}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />清除篩選
          </Button>
        </div>
      </div>

      {sortedProjects.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center px-6 py-10 text-center">
          <CalendarRange className="mb-3 h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="font-medium text-slate-700">找不到符合條件的開發季</p>
          <p className="mt-1 text-sm text-slate-500">請調整篩選條件，或先在甘特圖設定工作日期。</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-[15px]">
            <caption className="sr-only">依客人、開發季與工作項目整理的時間表</caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm font-semibold text-slate-600">
                <th scope="col" aria-sort={sortState.key === 'customer' ? (sortState.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="sticky left-0 z-20 min-w-44 whitespace-nowrap bg-slate-50 px-4 py-3">
                  <button type="button" className="mb-2 flex items-center gap-1 whitespace-nowrap hover:text-slate-900" onClick={() => updateSort('customer')}>客人{sortState.key === 'customer' ? <SortIcon className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5" />}</button>
                  <HeaderFilterSelect label="篩選客人" value={brandId} onValueChange={setBrandId} options={brandOptions} placeholder="全部客人" className="w-36" />
                </th>
                <th scope="col" className="sticky left-44 z-20 min-w-64 whitespace-nowrap border-r border-slate-200 bg-slate-50 px-4 py-3">
                  <button type="button" className="mb-2 flex items-center gap-1 whitespace-nowrap hover:text-slate-900" onClick={() => updateSort('season')}>開發季<ArrowUpDown className="h-3.5 w-3.5" /></button>
                  <div className="flex gap-1.5">
                    <HeaderFilterSelect label="篩選季節" value={season} onValueChange={setSeason} options={seasonOptions} placeholder="全部季節" className="w-28" />
                    <HeaderFilterSelect label="篩選年份" value={year} onValueChange={setYear} options={yearOptions} placeholder="全部年份" className="w-28" />
                  </div>
                </th>
                {taskColumns.map(({ name, count }) => {
                  const isSorted = sortState.key === `task:${name}`;
                  return (
                    <th key={name} scope="col" aria-sort={isSorted ? (sortState.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="min-w-48 whitespace-nowrap px-4 py-3 align-top">
                      <button type="button" className="mb-2 flex items-center gap-1 whitespace-nowrap hover:text-slate-900" onClick={() => updateSort(`task:${name}`)} title={`出現 ${count} 次；點擊依日期排序`}>
                        {name}<span className="font-normal text-slate-400">{count}</span>{isSorted ? <SortIcon className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        className={`flex h-8 items-center gap-1 rounded-md border px-2 text-xs font-normal ${effectiveRequiredTask === name ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800'}`}
                        onClick={() => setRequiredTask((current) => current === name ? ALL : name)}
                        aria-pressed={effectiveRequiredTask === name}
                      >
                        <ListFilter className="h-3.5 w-3.5" aria-hidden="true" />{effectiveRequiredTask === name ? '已篩選' : '只看此項'}
                      </button>
                    </th>
                  );
                })}
                {taskColumns.length === 0 && <th scope="col" className="min-w-48 px-4 py-3">工作時間</th>}
              </tr>
            </thead>
            <tbody>
              {sortedProjects.map((project) => {
                const brand = brandMap[project.brand_id];
                return (
                  <tr key={project.id} className="group border-b border-slate-100 last:border-b-0 hover:bg-blue-50/40">
                    <th scope="row" className="sticky left-0 z-10 whitespace-nowrap bg-white px-5 py-3.5 text-left font-medium text-slate-700 group-hover:bg-blue-50/40">{brand?.short_name || brand?.name || brand?.full_name || '未設定客人'}</th>
                    <td className="sticky left-44 z-10 whitespace-nowrap border-r border-slate-200 bg-white px-5 py-3.5 font-semibold text-slate-900 group-hover:bg-blue-50/40">{project.seasonLabel}</td>
                    {taskColumns.map(({ name }) => {
                      const tasks = tasksByProjectAndName.get(`${project.id}::${name}`) || [];
                      return (
                        <td key={name} className="whitespace-nowrap px-5 py-3.5 tabular-nums text-slate-700">
                          {tasks.map((task) => <div key={task.id} className="whitespace-nowrap">{formatTaskDate(task)}</div>)}
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
      <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-sm text-slate-500 sm:px-5">顯示 {sortedProjects.length} 個開發季 · 日期格式為月／日，工作天不含週六、週日</div>
    </Card>
  );
});
