import React from 'react';

function download(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function toCsv(differences = []) {
  const headers = [
    'type',
    'fields',
    'localDate',
    'localMinutes',
    'localExternalId',
    'remoteDate',
    'remoteMinutes',
    'remoteId',
    'message',
  ];
  const rows = differences.map((diff) => [
    diff.type,
    (diff.fields || []).join(';'),
    diff.local?.date || '',
    diff.local?.minutes || '',
    diff.local?.externalId || '',
    diff.remote?.date || '',
    diff.remote?.minutes || '',
    diff.remote?.timeLogId || '',
    diff.message || '',
  ]);
  return [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          if (cell === null || cell === undefined) return '';
          const str = cell.toString().replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    )
    .join('\n');
}

export default function TimeLogReport({ report, onDismiss }) {
  if (!report) return null;
  const {
    summary = {},
    differences = [],
    generatedAt = new Date().toISOString(),
    lookbackDays,
  } = report;

  const exportJson = () => {
    download(
      JSON.stringify(report, null, 2),
      `timelog-report-${Date.now()}.json`,
      'application/json'
    );
  };

  const exportCsv = () => {
    if (!differences.length) return;
    download(
      toCsv(differences),
      `timelog-report-${Date.now()}.csv`,
      'text/csv'
    );
  };

  return (
    <div className="border rounded-md p-3 bg-gray-50 dark:bg-gray-900 text-sm space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base">TimeLog Sync Report</h3>
        <button
          className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      </div>
      <div className="text-xs text-gray-500">
        Window: last {lookbackDays} days • Generated: {new Date(generatedAt).toLocaleString()}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="p-2 bg-white dark:bg-gray-800 rounded shadow">
          <div className="text-gray-500 text-xs">Downloaded</div>
          <div className="text-xl font-semibold">{summary.downloaded || 0}</div>
        </div>
        <div className="p-2 bg-white dark:bg-gray-800 rounded shadow">
          <div className="text-gray-500 text-xs">Created Locally</div>
          <div className="text-xl font-semibold">{summary.created || 0}</div>
        </div>
        <div className="p-2 bg-white dark:bg-gray-800 rounded shadow">
          <div className="text-gray-500 text-xs">Matched & Identical</div>
          <div className="text-xl font-semibold">{summary.identical || 0}</div>
        </div>
        <div className="p-2 bg-white dark:bg-gray-800 rounded shadow">
          <div className="text-gray-500 text-xs">Differences</div>
          <div className="text-xl font-semibold">{summary.differences || 0}</div>
        </div>
      </div>
      <div className="flex gap-2 text-xs">
        <button
          className="px-2 py-1 bg-blue-500 text-white rounded"
          onClick={exportJson}
        >
          Export JSON
        </button>
        <button
          className={`px-2 py-1 rounded ${
            differences.length ? 'bg-blue-500 text-white' : 'bg-gray-400 text-gray-200 cursor-not-allowed'
          }`}
          onClick={differences.length ? exportCsv : undefined}
          disabled={!differences.length}
        >
          Export CSV
        </button>
      </div>
      <div className="max-h-56 overflow-y-auto space-y-2 text-xs">
        {differences.length === 0 && (
          <div className="text-green-700">No differences detected.</div>
        )}
        {differences.map((diff, idx) => (
          <div
            key={`${diff.type}-${idx}`}
            className="border rounded p-2 bg-white dark:bg-gray-800 space-y-1"
          >
            <div className="font-semibold">
              {idx + 1}. {diff.type}
            </div>
            <div>{diff.message}</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[11px] font-semibold">Local</div>
                <pre className="bg-gray-100 dark:bg-gray-900 p-1 overflow-x-auto">
                  {JSON.stringify(diff.local, null, 2)}
                </pre>
              </div>
              <div>
                <div className="text-[11px] font-semibold">Remote</div>
                <pre className="bg-gray-100 dark:bg-gray-900 p-1 overflow-x-auto">
                  {diff.remote ? JSON.stringify(diff.remote, null, 2) : '—'}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
