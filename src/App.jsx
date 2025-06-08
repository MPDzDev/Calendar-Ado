import React, { useState, useEffect, useCallback } from 'react';
import Calendar from './components/Calendar';
import HoursSummary from './components/HoursSummary';
import WorkItems from './components/WorkItems';
import Settings from './components/Settings';
import YearHint from './components/YearHint';
import useWorkBlocks from './hooks/useWorkBlocks';
import useSettings from './hooks/useSettings';
import useAdoItems from './hooks/useAdoItems';
import AdoService from './services/adoService';

function App() {
  const { blocks, setBlocks } = useWorkBlocks();
  const { settings, setSettings } = useSettings();
  const { items, setItems } = useAdoItems();
  const [itemsFetched, setItemsFetched] = useState(false);

  const fetchWorkItems = useCallback(() => {
    const { azureOrg, azurePat, azureProjects } = settings;
    if (!azureOrg || !azurePat) return;
    const service = new AdoService(azureOrg, azurePat, azureProjects);
    service.getWorkItems().then((data) => {
      setItems(data);
      setItemsFetched(true);
    });
  }, [settings.azureOrg, settings.azurePat, settings.azureProjects, setItems]);

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  useEffect(() => {
    if (!itemsFetched) {
      fetchWorkItems();
    }
  }, [fetchWorkItems, itemsFetched]);

  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));

  const prevWeek = () =>
    setWeekStart((w) => new Date(w.getTime() - 7 * 24 * 60 * 60 * 1000));
  const nextWeek = () =>
    setWeekStart((w) => new Date(w.getTime() + 7 * 24 * 60 * 60 * 1000));
  const currentWeek = () => setWeekStart(getWeekStart(new Date()));

  const formatRange = () => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    return `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${
      end.getMonth() + 1
    }/${end.getDate()}`;
  };

  const isOverlappingLunch = (block) => {
    const start = new Date(block.start);
    const end = new Date(block.end);
    const lunchStart = new Date(start);
    lunchStart.setHours(settings.lunchStart, 0, 0, 0);
    const lunchEnd = new Date(start);
    lunchEnd.setHours(settings.lunchEnd, 0, 0, 0);
    return start < lunchEnd && end > lunchStart;
  };

  const trimLunchOverlap = (block) => {
    if (!isOverlappingLunch(block)) return block;
    const start = new Date(block.start);
    const end = new Date(block.end);
    const lunchStart = new Date(start);
    lunchStart.setHours(settings.lunchStart, 0, 0, 0);
    const lunchEnd = new Date(start);
    lunchEnd.setHours(settings.lunchEnd, 0, 0, 0);

    if (start >= lunchStart && end <= lunchEnd) {
      return null;
    }

    if (start < lunchStart && end > lunchStart && end <= lunchEnd) {
      end.setTime(lunchStart.getTime());
    } else if (start >= lunchStart && start < lunchEnd && end > lunchEnd) {
      start.setTime(lunchEnd.getTime());
    } else if (start < lunchStart && end > lunchEnd) {
      const before = lunchStart - start;
      const after = end - lunchEnd;
      if (before >= after) {
        end.setTime(lunchStart.getTime());
      } else {
        start.setTime(lunchEnd.getTime());
      }
    }

    if (end <= start) return null;

    return { ...block, start: start.toISOString(), end: end.toISOString() };
  };

  const hasOverlap = (newBlock) => {
    const newStart = new Date(newBlock.start);
    const newEnd = new Date(newBlock.end);
    return blocks.some((b) => {
      const start = new Date(b.start);
      const end = new Date(b.end);
      return newStart < end && newEnd > start;
    });
  };

  const adjustForOverlap = (newBlock) => {
    let start = new Date(newBlock.start);
    let end = new Date(newBlock.end);

    const sorted = [...blocks].sort(
      (a, b) => new Date(a.start) - new Date(b.start)
    );

    for (const b of sorted) {
      const bStart = new Date(b.start);
      const bEnd = new Date(b.end);

      if (end > bStart && start < bEnd) {
        if (start < bStart) {
          // overlap at the end of the new block, trim the end
          end = new Date(Math.min(end, bStart));
        } else {
          // new block starts inside an existing one, move start after it
          start = new Date(Math.max(start, bEnd));
        }
      }
    }

    if (end <= start) {
      return null;
    }

    return { ...newBlock, start: start.toISOString(), end: end.toISOString() };
  };

  const addBlock = (block) => {
    let adjusted = trimLunchOverlap(block);
    if (!adjusted) return;

    adjusted = hasOverlap(adjusted) ? adjustForOverlap(adjusted) : adjusted;
    adjusted = adjusted ? trimLunchOverlap(adjusted) : null;

    while (adjusted && hasOverlap(adjusted)) {
      adjusted = adjustForOverlap(adjusted);
      adjusted = adjusted ? trimLunchOverlap(adjusted) : null;
    }

    if (!adjusted) {
      return;
    }

    setBlocks((prev) => [...prev, adjusted]);
  };

  const updateBlock = (id, data) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...data } : b))
    );
  };

  const updateBlockTime = (id, startISO, endISO) => {
    const current = blocks.find((b) => b.id === id);
    if (!current) return;

    const others = blocks.filter((b) => b.id !== id);

    const hasOverlapLocal = (newBlock) => {
      const newStart = new Date(newBlock.start);
      const newEnd = new Date(newBlock.end);
      return others.some((b) => {
        const start = new Date(b.start);
        const end = new Date(b.end);
        return newStart < end && newEnd > start;
      });
    };

    const adjustForOverlapLocal = (newBlock) => {
      let start = new Date(newBlock.start);
      let end = new Date(newBlock.end);

      const sorted = [...others].sort(
        (a, b) => new Date(a.start) - new Date(b.start)
      );

      for (const b of sorted) {
        const bStart = new Date(b.start);
        const bEnd = new Date(b.end);

        if (end > bStart && start < bEnd) {
          if (start < bStart) {
            end = new Date(Math.min(end, bStart));
          } else {
            start = new Date(Math.max(start, bEnd));
          }
        }
      }

      if (end <= start) {
        return null;
      }

      return { ...newBlock, start: start.toISOString(), end: end.toISOString() };
    };

    let adjusted = trimLunchOverlap({ ...current, start: startISO, end: endISO });
    if (!adjusted) return;

    adjusted = hasOverlapLocal(adjusted)
      ? adjustForOverlapLocal(adjusted)
      : adjusted;
    adjusted = adjusted ? trimLunchOverlap(adjusted) : null;

    while (adjusted && hasOverlapLocal(adjusted)) {
      adjusted = adjustForOverlapLocal(adjusted);
      adjusted = adjusted ? trimLunchOverlap(adjusted) : null;
    }

    if (!adjusted) return;

    setBlocks([...others, adjusted]);
  };

  const deleteBlock = (id) => {
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  const startSubmitSession = () => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const map = {};
    blocks.forEach((b) => {
      const start = new Date(b.start);
      if (start >= weekStart && start < weekEnd && b.taskId) {
        const end = new Date(b.end);
        const hours = (end - start) / (1000 * 60 * 60);
        const dayKey = start.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
        if (!map[b.taskId]) map[b.taskId] = { total: 0, days: {} };
        map[b.taskId].total += hours;
        map[b.taskId].days[dayKey] = (map[b.taskId].days[dayKey] || 0) + hours;
      }
    });
    const items = Object.entries(map).map(([id, data]) => ({
      id,
      hours: data.total,
      days: data.days,
      url: settings.azureOrg
        ? `https://dev.azure.com/${settings.azureOrg}/_workitems/edit/${id}`
        : `https://dev.azure.com/_workitems/edit/${id}`,
    }));
    if (window.api && window.api.openWorkItems) {
      window.api.openWorkItems(items);
    } else {
      items.forEach((i) => window.open(i.url, '_blank'));
    }
  };

  return (
    <div className="p-4 flex min-h-screen bg-yellow-50 text-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="flex-grow">
        <h1 className="text-2xl font-bold mb-4">Calendar-Ado MVP</h1>
        <div className="mb-2 flex items-center space-x-2">
          <button
            className="px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white"
            onClick={prevWeek}
          >
            ◀ Prev
          </button>
          <button
            className="px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white"
            onClick={currentWeek}
          >
            This Week
          </button>
          <button
            className="px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white"
            onClick={nextWeek}
          >
            Next ▶
          </button>
          <span className="ml-4 font-semibold">{formatRange()}</span>
          <YearHint weekStart={weekStart} />
        </div>
        <Calendar
          blocks={blocks}
          onAdd={addBlock}
          onUpdate={updateBlock}
          onTimeChange={updateBlockTime}
          settings={settings}
          onDelete={deleteBlock}
          weekStart={weekStart}
          items={items}
          projectColors={settings.projectColors}
        />
      </div>
      <div className="w-64 pl-4 space-y-4 flex flex-col h-full">
        <Settings settings={settings} setSettings={setSettings} />
        <HoursSummary blocks={blocks} weekStart={weekStart} />
        <div>
          <button
            className="w-full px-2 py-1 bg-green-600 text-white"
            onClick={startSubmitSession}
          >
            Start Submit Session
          </button>
        </div>
        <WorkItems
          items={items}
          onRefresh={fetchWorkItems}
          projectColors={settings.projectColors}
        />
      </div>
    </div>
  );
}

export default App;
