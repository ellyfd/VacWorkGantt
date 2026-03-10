import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const getLeavePeriod = (leaveTypeName) => {
  if (['健檢', '上午休'].includes(leaveTypeName)) return 'AM';
  if (['下午休'].includes(leaveTypeName)) return 'PM';
  return 'full';
};

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

export default function MigrateLeaveRecords() {
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);
  const [done, setDone] = useState(false);

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leaveTypes'],
    queryFn: () => base44.entities.LeaveType.list(),
  });

  const addLog = (msg) => setLog(prev => [...prev, msg]);

  const handleMigrate = async () => {
    setRunning(true);
    setLog([]);
    setDone(false);

    try {
      addLog('📥 載入所有 LeaveRecord...');
      const allRecords = await base44.entities.LeaveRecord.list();
      addLog(`共 ${allRecords.length} 筆`);

      const leaveTypeMap = Object.fromEntries(leaveTypes.map(lt => [lt.id, lt]));

      const needUpdate = allRecords.filter(r => !r.period);
      addLog(`需要更新：${needUpdate.length} 筆，無需更新：${allRecords.length - needUpdate.length} 筆`);

      if (needUpdate.length === 0) {
        addLog('✅ 所有資料已是最新！');
        setDone(true);
        setRunning(false);
        return;
      }

      const stats = { full: 0, AM: 0, PM: 0 };

      const batchSize = 3;
      for (let i = 0; i < needUpdate.length; i += batchSize) {
        const batch = needUpdate.slice(i, i + batchSize);
        await Promise.all(batch.map(async (record) => {
          const leaveType = leaveTypeMap[record.leave_type_id];
          const period = getLeavePeriod(leaveType?.name);
          stats[period]++;
          await base44.entities.LeaveRecord.update(record.id, { period });
        }));

        const progress = Math.min(i + batchSize, needUpdate.length);
        addLog(`✏️ ${progress} / ${needUpdate.length} 筆...`);

        if (i + batchSize < needUpdate.length) {
          await sleep(1000);
        }
      }

      addLog('');
      addLog('🎉 遷移完成！');
      addLog(`  full（整天）：${stats.full} 筆`);
      addLog(`  AM（上午）：${stats.AM} 筆`);
      addLog(`  PM（下午）：${stats.PM} 筆`);
      setDone(true);
    } catch (err) {
      addLog(`❌ 錯誤：${err.message}`);
      addLog('💡 可再點「重新執行」繼續（已更新的不會重複）');
    }

    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow p-6">
        <h1 className="text-xl font-bold text-gray-800 mb-2">LeaveRecord Period 資料遷移</h1>
        <p className="text-sm text-gray-500 mb-4">
          將舊資料補上 period 欄位（AM / PM / full）。<br />
          <span className="text-amber-600 font-medium">⚠️ 每批 3 筆間隔 1 秒，約需 1~2 分鐘，請勿關閉頁面。</span>
        </p>

        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs text-gray-600 space-y-1">
          <div>健檢、上午休 → <span className="font-semibold text-blue-600">AM</span></div>
          <div>下午休 → <span className="font-semibold text-purple-600">PM</span></div>
          <div>其他 → <span className="font-semibold text-green-600">full</span></div>
        </div>

        <Button
          onClick={handleMigrate}
          disabled={running || leaveTypes.length === 0}
          className={`w-full mb-4 ${done ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {running
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />執行中...</>
            : done ? '✅ 已完成' : '開始遷移 / 重新執行'}
        </Button>

        {log.length > 0 && (
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-green-400 space-y-0.5 max-h-72 overflow-y-auto">
            {log.map((line, i) => <div key={i}>{line || '\u00A0'}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}