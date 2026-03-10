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
        addLog('✅ 所有資料已是最新，無需遷移！');
        setDone(true);
        setRunning(false);
        return;
      }

      const stats = { full: 0, AM: 0, PM: 0 };

      const batchSize = 10;
      for (let i = 0; i < needUpdate.length; i += batchSize) {
        const batch = needUpdate.slice(i, i + batchSize);
        await Promise.all(batch.map(async (record) => {
          const leaveType = leaveTypeMap[record.leave_type_id];
          const period = getLeavePeriod(leaveType?.name);
          stats[period]++;
          await base44.entities.LeaveRecord.update(record.id, { period });
        }));
        addLog(`✏️ 已更新 ${Math.min(i + batchSize, needUpdate.length)} / ${needUpdate.length} 筆...`);
      }

      addLog('');
      addLog('🎉 遷移完成！');
      addLog(`  full（整天）：${stats.full} 筆`);
      addLog(`  AM（上午）：${stats.AM} 筆`);
      addLog(`  PM（下午）：${stats.PM} 筆`);
      setDone(true);
    } catch (err) {
      addLog(`❌ 錯誤：${err.message}`);
    }

    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow p-6">
        <h1 className="text-xl font-bold text-gray-800 mb-2">LeaveRecord Period 資料遷移</h1>
        <p className="text-sm text-gray-500 mb-6">
          將所有沒有 period 欄位的舊資料，依照假別自動補上 AM / PM / full。<br />
          <span className="text-amber-600 font-medium">⚠️ 此操作不可逆，執行前請確認假別對應是否正確。</span>
        </p>

        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs text-gray-600 space-y-1">
          <div>健檢、上午休 → <span className="font-semibold text-blue-600">AM（上半天）</span></div>
          <div>下午休 → <span className="font-semibold text-purple-600">PM（下半天）</span></div>
          <div>其他（整天休、出差、病假…）→ <span className="font-semibold text-green-600">full（整天）</span></div>
        </div>

        <Button
          onClick={handleMigrate}
          disabled={running || done || leaveTypes.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 mb-4"
        >
          {running ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />執行中...</>
          ) : done ? (
            '✅ 已完成'
          ) : (
            '開始遷移'
          )}
        </Button>

        {log.length > 0 && (
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-green-400 space-y-1 max-h-64 overflow-y-auto">
            {log.map((line, i) => (
              <div key={i}>{line || '\u00A0'}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}