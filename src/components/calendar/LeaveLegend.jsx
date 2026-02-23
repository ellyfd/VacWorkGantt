import React from 'react';

function LeaveLegend({ leaveTypes }) {
  return (
    <div className="flex flex-wrap gap-4 mb-4 p-4 bg-white rounded-lg border border-gray-200">
      <span className="text-sm font-medium text-gray-600">假別說明：</span>
      {leaveTypes.map((lt) => (
        <div key={lt.id} className="flex items-center gap-1.5">
          <span 
            className="w-3 h-3 rounded"
            style={{ backgroundColor: lt.color }}
          />
          <span className="text-sm text-gray-700">
            {lt.short_name} = {lt.name}
          </span>
        </div>
      ))}
    </div>
  );
}

export default React.memo(LeaveLegend);