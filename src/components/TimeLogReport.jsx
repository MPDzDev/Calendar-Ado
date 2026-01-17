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

export default function TimeLogReport({
  report,
  onDismiss,
  onFullRefresh,
  onCreateMissing,
  onOpenTimeLogSummary,
}) {
  if (!report) return null;
  const {
    summary = {},
    differences = [],
    generatedAt = new Date().toISOString(),
    lookbackDays,
    recommendationDate,
    unsyncedWeeklyBlocks = [],
    focusRange = null,
    limitToFocusRange = false,
  } = report;
  const dailyLimitIssues = differences.filter(
    (diff) => diff.type === 'daily-limit-exceeded'
  );
  const recommendDateObj = recommendationDate ? new Date(recommendationDate) : null;
  const focusStart = focusRange?.start ? new Date(focusRange.start) : null;
  const focusEnd = focusRange?.end ? new Date(focusRange.end) : null;
  let windowDescription = 'Window: custom range';
  if (limitToFocusRange && focusStart && focusEnd) {
    windowDescription = `Focused Week: ${focusStart.toLocaleDateString()} - ${focusEnd.toLocaleDateString()}`;
  } else if (lookbackDays) {
    windowDescription = `Window: last ${lookbackDays} days`;
  }

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
        {windowDescription} - Generated: {new Date(generatedAt).toLocaleString()}
      </div>
      {limitToFocusRange && focusStart && focusEnd && (
        <div className="text-[11px] text-blue-600 dark:text-blue-300">
          This delta refresh only analyzed the focused calendar week above.
        </div>
      )}
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
      {recommendDateObj && (
        <div className="p-2 bg-yellow-100 dark:bg-yellow-900 text-xs rounded flex flex-col gap-1">
          <span>
            Local blocks have unsynced edits dating back to{' '}
            {recommendDateObj.toLocaleDateString()}. Consider running a full refresh from this date.
          </span>
          {onFullRefresh && (
            <button
              className="self-start px-2 py-1 bg-blue-500 text-white rounded"
              onClick={() => onFullRefresh(recommendDateObj)}
            >
              Full Refresh from {recommendDateObj.toLocaleDateString()}
            </button>
          )}
        </div>
      )}
      {unsyncedWeeklyBlocks.length > 0 && (
        <div className="p-2 bg-blue-50 dark:bg-blue-900 text-xs rounded flex flex-col gap-1">
          <span>
            {unsyncedWeeklyBlocks.length} local block(s) in the current week are not synced yet.
            Create them remotely to avoid data loss.
          </span>
          {onCreateMissing && (
            <button
              className="self-start px-2 py-1 bg-blue-600 text-white rounded"
              onClick={() => onCreateMissing(unsyncedWeeklyBlocks)}
            >
              Review Push Suggestions
            </button>
          )}
          {onOpenTimeLogSummary && (
            <button
              className="self-start px-2 py-1 bg-indigo-600 text-white rounded"
              onClick={onOpenTimeLogSummary}
            >
              Open Azure TimeLog
            </button>
          )}
        </div>
      )}
      {dailyLimitIssues.length > 0 && (
        <div className="p-2 bg-red-50 dark:bg-red-900 text-xs rounded flex flex-col gap-1">
          <span>
            Daily cap reached on {dailyLimitIssues.length} remote block(s). These were skipped to avoid
            logging more than 8 hours in a day. Adjust your entries manually in Azure TimeLog.
          </span>
          {onOpenTimeLogSummary && (
            <button
              className="self-start px-2 py-1 bg-red-600 text-white rounded"
              onClick={onOpenTimeLogSummary}
            >
              Go to Azure TimeLog
            </button>
          )}
        </div>
      )}
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
