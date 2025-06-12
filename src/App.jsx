import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Calendar from './components/Calendar';
import HoursSummary from './components/HoursSummary';
import WorkItems from './components/WorkItems';
import DevOpsReview from './components/DevOpsReview';
import Settings from './components/Settings';
import YearHint from './components/YearHint';
import Notes from './components/Notes';
import PatrakLogo from './components/PatrakLogo';
import useWorkBlocks from './hooks/useWorkBlocks';
import useSettings from './hooks/useSettings';
import useAdoItems from './hooks/useAdoItems';
import useNotes from './hooks/useNotes';
import useDayLocks from './hooks/useDayLocks';
import useAreaAliases from './hooks/useAreaAliases';
import AdoService from './services/adoService';
import {
  trimLunchOverlap,
  splitByLunch,
  splitForOverlaps,
} from './utils/timeAdjust';
import { getWeekNumber } from './utils/date';

function App() {
  const { blocks, setBlocks } = useWorkBlocks();
  const { settings, setSettings } = useSettings();
  const { items, setItems, lastFetch, setLastFetch } = useAdoItems();
  const { notes, setNotes, itemNotes, setItemNotes } = useNotes();
  const { lockedDays, setLockedDays } = useDayLocks();
  const { aliases: areaAliases, setAliases: setAreaAliases } = useAreaAliases();
  const [itemsFetched, setItemsFetched] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(
    settings.sidebarWidth || 320
  );
  const containerRef = useRef(null);
  const [resizing, setResizing] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [panelTab, setPanelTab] = useState('workItems');

  const usedAreas = useMemo(() => {
    const set = new Set();
    const itemMap = Object.fromEntries(items.map((i) => [i.id, i]));
    for (const b of blocks) {
      const item = itemMap[b.itemId || b.taskId];
      const area = item?.area || 'Unassigned';
      if (area) set.add(area);
    }
    return Array.from(set).sort();
  }, [blocks, items]);

  const addNote = (text) =>
    setNotes((prev) => [...prev, { id: Date.now(), text }]);

  const deleteNote = (id) =>
    setNotes((prev) => prev.filter((n) => n.id !== id));

  const handleNoteDrop = (itemId, note) => {
    setItemNotes((prev) => {
      const list = prev[itemId] ? [...prev[itemId], note.text] : [note.text];
      return { ...prev, [itemId]: list };
    });
    deleteNote(note.id);
  };

  const handleBlockCommentDrop = (blockId, note) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? { ...b, comments: [...(b.comments || []), note.text] }
          : b
      )
    );
    deleteNote(note.id);
  };

  const fetchWorkItems = useCallback((full = false) => {
    const {
      azureOrg,
      azurePat,
      azureProjects,
      azureTags,
      azureArea,
      azureIteration,
    } = settings;
    if (!azureOrg || !azurePat) return;
    const service = new AdoService(
      azureOrg,
      azurePat,
      azureProjects,
      azureTags,
      azureArea,
      azureIteration
    );
    let since = null;
    if (!full) {
      since = lastFetch ? new Date(lastFetch) : null;
      if (since) {
        const now = new Date();
        if (since.toDateString() === now.toDateString()) {
          since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }
      }
    }
    service.getWorkItems(since).then((data) => {
      setItems((prev) => {
        const map = new Map(prev.map((i) => [i.id, i]));
        data.forEach((item) => {
          map.set(item.id, item);
        });
        return Array.from(map.values());
      });
      setItemsFetched(true);
      setLastFetch(Date.now());
    });
  }, [
    settings.azureOrg,
    settings.azurePat,
    settings.azureProjects,
    settings.azureTags,
    settings.azureArea,
    settings.azureIteration,
    setItems,
    blocks,
    lastFetch,
  ]);

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  useEffect(() => {
    setSidebarWidth(settings.sidebarWidth || 320);
  }, [settings.sidebarWidth]);

  useEffect(() => {
    if (!itemsFetched) {
      fetchWorkItems();
    }
  }, [fetchWorkItems, itemsFetched]);

  // Previously we refetched work items whenever the Azure filter
  // settings changed. This caused unnecessary API requests when
  // users merely tweaked the local filters via the pill UI. Work
  // items should only be refetched when the user explicitly refreshes
  // or when configuration such as organization or project changes.
  // Therefore this effect has been removed to avoid automatic
  // refetching on filter changes.

  useEffect(() => {
    const handleMove = (e) => {
      if (!resizing || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let width = rect.right - e.clientX;
      width = Math.min(Math.max(200, width), 600);
      setSidebarWidth(width);
    };

    const handleUp = () => {
      if (resizing) {
        setResizing(false);
        setSettings((prev) => ({ ...prev, sidebarWidth }));
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [resizing, sidebarWidth, setSettings]);

  useEffect(() => {
    if (!settings.enableReminders) {
      setShowReminder(false);
      return;
    }

    const checkDay = () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      const hasBlocks = blocks.some((b) => {
        const bs = new Date(b.start);
        return bs >= start && bs < end;
      });
      setShowReminder(!hasBlocks);
    };

    let timeoutId;
    const schedule = () => {
      const now = new Date();
      let checkTime = new Date(now);
      checkTime.setHours(18, 0, 0, 0);
      if (now >= checkTime) {
        checkDay();
        checkTime.setDate(checkTime.getDate() + 1);
      }
      const delay = checkTime - now;
      timeoutId = setTimeout(() => {
        checkDay();
        schedule();
      }, delay);
    };

    schedule();
    return () => clearTimeout(timeoutId);
  }, [blocks, settings.enableReminders]);

  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
  const [weekAnim, setWeekAnim] = useState(null);
  const weekNumber = getWeekNumber(weekStart);

  const prevWeek = () => {
    setWeekAnim('right');
    setWeekStart((w) => new Date(w.getTime() - 7 * 24 * 60 * 60 * 1000));
  };
  const nextWeek = () => {
    setWeekAnim('left');
    setWeekStart((w) => new Date(w.getTime() + 7 * 24 * 60 * 60 * 1000));
  };
  const currentWeek = () => setWeekStart(getWeekStart(new Date()));

  useEffect(() => {
    if (!weekAnim) return;
    const t = setTimeout(() => setWeekAnim(null), 200);
    return () => clearTimeout(t);
  }, [weekAnim]);

  const formatRange = () => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    return `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${
      end.getMonth() + 1
    }/${end.getDate()}`;
  };


  const addBlock = (block) => {
    setBlocks((prev) => {
      const pieces = splitByLunch(block, settings);
      let updated = [...prev];
      for (const part of pieces) {
        let segments = splitForOverlaps(updated, part);
        segments.forEach((seg) => {
          let adjusted = trimLunchOverlap(seg, settings);
          if (adjusted) {
            updated.push(adjusted);
          }
        });
      }
      return updated;
    });
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
    const pieces = splitByLunch(
      { ...current, start: startISO, end: endISO },
      settings
    );

    let updated = [...others];
    pieces.forEach((part, index) => {
      const baseId = index === 0 ? id : Date.now() + index;
      const segments = splitForOverlaps(updated, part);
      segments.forEach((seg, idx) => {
        const blockData = { ...seg, id: idx === 0 ? baseId : Date.now() + index * 100 + idx };
        const adjusted = trimLunchOverlap(blockData, settings);
        if (adjusted) {
          updated.push(adjusted);
        }
      });
    });

    setBlocks(updated);
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
    const itemsToOpen = Object.entries(map).map(([id, data]) => {
      const task = items.find((it) => it.id === id) || {};
      const message = !task.area
        ? `Please assign area path ${settings.azureArea || '(set area path)'} before logging time.`
        : '';
      return {
        id,
        hours: data.total,
        days: data.days,
        url: settings.azureOrg
          ? `https://dev.azure.com/${settings.azureOrg}/_workitems/edit/${id}`
          : `https://dev.azure.com/_workitems/edit/${id}`,
        message,
      };
    });
    if (window.api && window.api.openWorkItems) {
      window.api.openWorkItems(itemsToOpen);
    } else {
      itemsToOpen.forEach((i) => window.open(i.url, '_blank'));
    }
  };

  const reviewService = new AdoService(
    settings.azureOrg,
    settings.azurePat,
    settings.azureProjects,
    settings.azureTags,
    settings.azureArea,
    settings.azureIteration
  );
  const treeProblems = reviewService.findTreeProblems(items);
  const highlightedIds = new Set(treeProblems.map((i) => i.id));

  return (
    <div
      ref={containerRef}
      className="p-6 flex gap-4 h-full w-full overflow-hidden bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-100"
    >
      <div className="flex flex-col flex-grow overflow-y-auto">
        {showReminder && (
          <div className="mb-2 p-2 bg-yellow-200 text-center text-sm text-red-800 fade-in">
            No time logged today. Don't forget to log your work!
          </div>
        )}
        <PatrakLogo />
        <div className="mb-2 flex items-center space-x-2">
          <button className="week-nav-button" onClick={prevWeek}>
            ◀ Prev
          </button>
          <button className="week-nav-button" onClick={currentWeek}>
            This Week
          </button>
          <button className="week-nav-button" onClick={nextWeek}>
            Next ▶
          </button>
          <span className="week-range ml-4 font-semibold">{formatRange()}</span>
          <span className="ml-2 font-semibold text-blue-600 dark:text-blue-400">Week {weekNumber}</span>
          <YearHint
            weekStart={weekStart}
            blocks={blocks}
            settings={settings}
            items={items}
          />
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
          onCommentDrop={handleBlockCommentDrop}
          lockedDays={lockedDays}
          setLockedDays={setLockedDays}
          areaAliases={areaAliases}
          setAreaAliases={setAreaAliases}
          animDirection={weekAnim}
        />
        <Notes
          notes={notes}
          onAdd={addNote}
          onDelete={deleteNote}
          areas={usedAreas}
          areaAliases={areaAliases}
          setAreaAliases={setAreaAliases}
        />
      </div>
      <div
        className="resizer"
        onMouseDown={() => setResizing(true)}
      />
      <div
        className="pl-6 space-y-4 flex flex-col h-full overflow-y-auto bg-white dark:bg-gray-800 shadow rounded-md"
        style={{ width: sidebarWidth }}
      >
        <Settings settings={settings} setSettings={setSettings} />
        <HoursSummary blocks={blocks} weekStart={weekStart} items={items} />
        <div>
          <button
            className="w-full flex items-center justify-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full shadow"
            onClick={startSubmitSession}
          >
            <span role="img" aria-label="rocket">🚀</span>
            <span>Start Submit Session</span>
          </button>
        </div>
        <div className="flex space-x-2">
          <button
            className={`px-2 py-1 text-xs ${
              panelTab === 'workItems'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
            onClick={() => setPanelTab('workItems')}
          >
            Work Items
          </button>
          <button
            className={`px-2 py-1 text-xs ${
              panelTab === 'review'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
            onClick={() => setPanelTab('review')}
          >
            DevOps Review
          </button>
        </div>
        {panelTab === 'workItems' && (
          <WorkItems
            items={items}
            onRefresh={fetchWorkItems}
            projectColors={settings.projectColors}
            settings={settings}
            setSettings={setSettings}
            onNoteDrop={handleNoteDrop}
            itemNotes={itemNotes}
            highlightedIds={highlightedIds}
          />
        )}
        {panelTab === 'review' && (
          <DevOpsReview items={items} settings={settings} />
        )}
      </div>
    </div>
  );
}

export default App;
