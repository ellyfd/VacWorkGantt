import React from 'react';

export default function LeaveLegend({ leaveTypes }) {
  return (
    <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">圖例說明</h3>
      
      <div className="mb-3">
        <h4 className="text-xs font-medium text-gray-600 mb-2">假別類型</h4>
        <div className="flex flex-wrap gap-3">
          {leaveTypes.map((lt) => (
            <div key={lt.id} className="flex items-center gap-2">
              <span 
                className="w-4 h-4 rounded"
                style={{ backgroundColor: lt.color }}
              />
              <span className="text-sm text-gray-700">
                {lt.short_name} = {lt.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-gray-600 mb-2">日期標示</h4>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-300" />
            <span className="text-sm text-gray-700">假日/週末</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-white border border-gray-200" />
            <span className="text-sm text-gray-700">工作日</span>
          </div>
        </div>
      </div>
    </div>
  );
}