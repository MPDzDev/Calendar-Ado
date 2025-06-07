import React, { useState, useEffect } from 'react';
import Calendar from './components/Calendar';
import HoursSummary from './components/HoursSummary';
import WorkItems from './components/WorkItems';
import Settings from './components/Settings';
import ReviewPanel from './components/ReviewPanel';
import useWorkBlocks from './hooks/useWorkBlocks';
import useSettings from './hooks/useSettings';
import useAdoItems from './hooks/useAdoItems';
import AdoService from './services/adoService';

function App() {
  const { blocks, setBlocks } = useWorkBlocks();
  const { settings, setSettings } = useSettings();
  const { items, setItems } = useAdoItems();

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  useEffect(() => {
    const service = new AdoService();
    service.getWorkItems().then(setItems);
  }, [setItems]);

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
    if (!block.status) block.status = 'draft';
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

  const submitBlock = (id) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'submitted' } : b))
    );
  };

  return (
    <div className="p-4 flex min-h-screen bg-yellow-50 text-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="flex-grow">
        <h1 className="text-2xl font-bold mb-4">Calendar-Ado MVP</h1>
        <div className="mb-2 space-x-2">
          <button className="px-2 py-1 bg-gray-200 dark:bg-gray-700" onClick={prevWeek}>
            Prev Week
          </button>
          <button className="px-2 py-1 bg-gray-200 dark:bg-gray-700" onClick={currentWeek}>
            This Week
          </button>
          <button className="px-2 py-1 bg-gray-200 dark:bg-gray-700" onClick={nextWeek}>
            Next Week
          </button>
          <span className="ml-2 font-semibold">{formatRange()}</span>
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
        />
      </div>
      <div className="w-64 pl-4 space-y-4">
        <Settings settings={settings} setSettings={setSettings} />
        <HoursSummary blocks={blocks} weekStart={weekStart} />
        <ReviewPanel
          blocks={blocks}
          weekStart={weekStart}
          onSubmit={submitBlock}
        />
        <WorkItems items={items} setItems={setItems} />
      </div>
    </div>
  );
}

export default App;
