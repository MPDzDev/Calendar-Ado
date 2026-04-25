import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Calendar from './components/Calendar';
import HoursSummary from './components/HoursSummary';
import WorkItems from './components/WorkItems';
import DevOpsReview from './components/DevOpsReview';
import Settings from './components/Settings';
import YearHint from './components/YearHint';
import Notes from './components/Notes';
import PatrakLogo from './components/PatrakLogo';
import TodoBar from './components/TodoBar';
import TimeLogReport from './components/TimeLogReport';
import TimeLogPushSuggestions from './components/TimeLogPushSuggestions';
import ToastStack from './components/ToastStack';
import ReleaseNotesModal from './components/ReleaseNotesModal';
import useWorkBlocks from './hooks/useWorkBlocks';
import useSettings from './hooks/useSettings';
import useAdoItems from './hooks/useAdoItems';
import useNotes from './hooks/useNotes';
import useTodos from './hooks/useTodos';
import useDayLocks, { normalizeLockedDays } from './hooks/useDayLocks';
import useAreaAliases from './hooks/useAreaAliases';
import AdoService from './services/adoService';
import StorageService from './services/storageService';
import TimeLogSyncService from './services/timeLogSyncService';
import { createTimeLogEntry } from './services/timeLogPublishService';
import {
  trimLunchOverlap,
  splitByLunch,
  splitForOverlaps,
} from './utils/timeAdjust';
import { getWeekNumber, formatLocalDateKey } from './utils/date';
import { APP_CHANGELOG, getPendingChangelogEntries } from './utils/changelog';

function buildTimeLogAlerts(report) {
  if (!report?.differences) return {};
  const alerts = {};
  report.differences.forEach((diff) => {
    if (diff.type !== 'daily-limit-exceeded') return;
    const dateKey = diff.remote?.date || diff.local?.date;
    if (!dateKey) return;
    const list = alerts[dateKey] || [];
    list.push({
      type: diff.type,
      message:
        diff.message ||
        'Daily limit exceeded. Review remote entries before importing.',
    });
    alerts[dateKey] = list;
  });
  return alerts;
}

const UNCHANGED_ITEMS_TOAST_MESSAGE =
  "Work item count didn't change. Some items may have been skipped due to earlier fetch failures (for example permissions, moved/deleted items, or temporary API errors). Clear the skip list and run a full refresh?";

const BLACKLIST_INFO_TEXT =
  'The app keeps a temporary skip list ("blacklist") for item IDs that previously failed to load, so one problematic item does not block the whole refresh. Typical causes include restricted access rights, missing or inaccessible parent links, items moved/deleted, or Azure DevOps timeout/throttling responses. Retry clears this list and requests those items again. No work items are deleted.';

const PUSH_REQUIRES_SYNC_MESSAGE =
  'A TimeLog push request may have already created a remote entry. Run a TimeLog sync before pushing any more changes.';

function App() {
  const { blocks, setBlocks } = useWorkBlocks();
  const { settings, setSettings } = useSettings();
  const { items, setItems, lastFetch, setLastFetch } = useAdoItems();
  const { notes, setNotes, itemNotes, setItemNotes } = useNotes();
  const { todos, setTodos } = useTodos();
  const { lockedDays, setLockedDays } = useDayLocks();
  const { aliases: areaAliases, setAliases: setAreaAliases } = useAreaAliases();
  const [itemsFetched, setItemsFetched] = useState(false);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(
    settings.sidebarWidth || 320
  );
  const containerRef = useRef(null);
  const [resizing, setResizing] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [panelTab, setPanelTab] = useState('workItems');
  const [toasts, setToasts] = useState([]);
  const [workItemsRefreshing, setWorkItemsRefreshing] = useState(false);
  const workItemsRefreshInFlightRef = useRef(false);
  const toastTimersRef = useRef(new Map());
  const toastsRef = useRef([]);
  const workItemSearchToastIdRef = useRef(null);
  const [timeLogSyncing, setTimeLogSyncing] = useState(false);
  const [timeLogReport, setTimeLogReport] = useState(null);
  const [timeLogError, setTimeLogError] = useState('');
  const [timeLogAlerts, setTimeLogAlerts] = useState({});
  const [pushSuggestions, setPushSuggestions] = useState([]);
  const [showPushSuggestions, setShowPushSuggestions] = useState(false);
  const [pushCreateStatus, setPushCreateStatus] = useState({});
  const [pushCreateError, setPushCreateError] = useState('');
  const [pushRequiresResync, setPushRequiresResync] = useState(false);
  const [releaseNotes, setReleaseNotes] = useState(null);

  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const shiftWeekStart = useCallback((date, weekOffset) => {
    const next = new Date(date);
    next.setDate(next.getDate() + weekOffset * 7);
    next.setHours(0, 0, 0, 0);
    return next;
  }, []);

  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
  const [weekAnim, setWeekAnim] = useState(null);
  const itemsRef = useRef(items);
  const weekNumber = getWeekNumber(weekStart);
  const FULL_DAY_MINUTES = 8 * 60;

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    toastsRef.current = toasts;
    if (
      workItemSearchToastIdRef.current
      && !toasts.some((toast) => toast.id === workItemSearchToastIdRef.current)
    ) {
      workItemSearchToastIdRef.current = null;
    }
  }, [toasts]);

  useEffect(() => {
    let cancelled = false;

    const maybeShowReleaseNotes = async () => {
      let runtimeVersion = '';
      if (typeof window !== 'undefined' && window.api?.getAppVersion) {
        try {
          runtimeVersion = await window.api.getAppVersion();
        } catch (err) {
          runtimeVersion = '';
        }
      }

      const appVersion =
        (runtimeVersion || APP_CHANGELOG.fallbackVersion || '').toString().trim();
      if (!appVersion) return;

      const storage = new StorageService('releaseNotesMeta', {
        lastSeenVersion: '',
      });
      const meta = storage.read() || {};

      const pendingEntries = getPendingChangelogEntries(
        APP_CHANGELOG.entries,
        appVersion,
        (meta.lastSeenVersion || '').toString().trim()
      );
      if (!pendingEntries.length) return;

      storage.write({
        ...meta,
        lastSeenVersion: appVersion,
        seenAt: new Date().toISOString(),
      });

      if (!cancelled) {
        const latestEntry = pendingEntries[pendingEntries.length - 1] || {};
        setReleaseNotes({
          version: appVersion,
          fromVersion: (meta.lastSeenVersion || '').toString().trim(),
          releases: pendingEntries,
          title: latestEntry.title || '',
          summary: latestEntry.summary || '',
        });
      }
    };

    maybeShowReleaseNotes();

    return () => {
      cancelled = true;
    };
  }, []);

  const getBlockDurationMinutes = (block) => {
    if (!block?.start || !block?.end) return 0;
    const startDate = new Date(block.start);
    const endDate = new Date(block.end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
    return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
  };

  const fullySyncedDays = useMemo(() => {
    const statusMap = {};
    blocks.forEach((block) => {
      const key = getBlockDayKey(block);
      if (!key) return;
      if (!statusMap[key]) {
        statusMap[key] = { total: 0, synced: true, minutes: 0 };
      }
      statusMap[key].total += 1;
      statusMap[key].minutes += getBlockDurationMinutes(block);
      if ((block.syncStatus || '').toLowerCase() !== 'synced') {
        statusMap[key].synced = false;
      }
    });
    return Object.fromEntries(
      Object.entries(statusMap).map(([key, info]) => [
        key,
        info.total > 0 && info.synced && info.minutes >= FULL_DAY_MINUTES,
      ])
    );
  }, [blocks]);

  const dismissTimeLogReport = useCallback(() => {
    setTimeLogReport((prev) => (prev ? null : prev));
    setTimeLogAlerts({});
  }, []);

  const applyTimeLogMetadata = useCallback(
    (metadata = {}) => {
      if (!metadata || typeof metadata !== 'object') return;
      setSettings((prev) => {
        let changed = false;
        const next = { ...prev };
        if (metadata.userName && metadata.userName !== prev.timeLogUserName) {
          next.timeLogUserName = metadata.userName;
          changed = true;
        }
        if (metadata.projectId && metadata.projectId !== prev.timeLogProjectId) {
          next.timeLogProjectId = metadata.projectId;
          changed = true;
        }
        const incomingMap = metadata.projectMap || {};
        const existingMap = prev.timeLogProjectMap || {};
        const mergedMap = { ...existingMap };
        let mapChanged = false;
        Object.entries(incomingMap).forEach(([projectName, projectId]) => {
          if (!projectName || !projectId) return;
          if (mergedMap[projectName] !== projectId) {
            mergedMap[projectName] = projectId;
            mapChanged = true;
          }
        });
        if (mapChanged) {
          next.timeLogProjectMap = mergedMap;
          changed = true;
        }
        return changed ? next : prev;
      });
    },
    [setSettings]
  );

  const dirtyClone = (block = {}, extra = {}) => {
    const updatedAt = new Date().toISOString();
    const status =
      block.syncStatus === 'synced'
        ? 'modified'
        : block.syncStatus || 'draft';
    return { ...block, ...extra, updatedAt, syncStatus: status };
  };

  const dismissToast = useCallback((toastId) => {
    const existingTimer = toastTimersRef.current.get(toastId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      toastTimersRef.current.delete(toastId);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  }, []);

  const pushToast = useCallback((toastConfig) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const nextToast = {
      id,
      type: 'info',
      message: '',
      duration: null,
      persistent: false,
      infoText: '',
      actionLabel: '',
      onAction: null,
      ...toastConfig,
    };
    setToasts((prev) => [...prev, nextToast]);
    if (!nextToast.persistent) {
      const defaultDuration =
        nextToast.type === 'success'
          ? 2500
          : nextToast.type === 'error'
            ? 5000
            : 4000;
      const timeoutMs = Number.isFinite(nextToast.duration)
        ? nextToast.duration
        : defaultDuration;
      if (timeoutMs > 0) {
        const timer = setTimeout(() => {
          toastTimersRef.current.delete(id);
          setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, timeoutMs);
        toastTimersRef.current.set(id, timer);
      }
    }
    return id;
  }, []);

  const updateToast = useCallback((toastId, updates = {}) => {
    if (!toastId) return;
    setToasts((prev) =>
      prev.map((toast) =>
        toast.id === toastId
          ? { ...toast, ...updates, id: toast.id }
          : toast
      )
    );
  }, []);

  useEffect(() => () => {
    toastTimersRef.current.forEach((timer) => clearTimeout(timer));
    toastTimersRef.current.clear();
  }, []);

  const handleToastAction = useCallback(
    async (toast) => {
      if (!toast || typeof toast.onAction !== 'function') return;
      dismissToast(toast.id);
      try {
        await toast.onAction();
      } catch (err) {
        pushToast({
          type: 'error',
          message: err?.message || 'Failed to perform toast action.',
        });
      }
    },
    [dismissToast, pushToast]
  );

  const dismissReleaseNotes = useCallback(() => {
    setReleaseNotes(null);
  }, []);


  const handleExport = async () => {
    if (!window.api?.exportData) return;
    const data = {
      workBlocks: { workBlocks: blocks },
      notes: { notes, itemNotes },
      todos: { todos },
      lockedDays: { lockedDays },
      areaAliases: { aliases: areaAliases },
      settings: { ...settings, azurePat: '' },
    };
    try {
      await window.api.exportData(data);
    } catch (e) {
      console.error('Failed to export data', e);
    }
  };

  const handleImport = async () => {
    if (!window.api?.importData) return;
    try {
      const data = await window.api.importData();
      if (!data) return;
      if (data.workBlocks) setBlocks(data.workBlocks.workBlocks || []);
      if (data.notes) {
        const loaded = (data.notes.notes || []).map((n) => ({ starred: false, ...n }));
        setNotes(loaded);
        setItemNotes(data.notes.itemNotes || {});
      }
      if (data.todos) setTodos(data.todos.todos || []);
      if (data.lockedDays) setLockedDays(normalizeLockedDays(data.lockedDays.lockedDays || {}));
      if (data.areaAliases) setAreaAliases(data.areaAliases.aliases || {});
      if (data.settings) {
        setSettings((prev) => ({
          ...prev,
          ...data.settings,
          azurePat: prev.azurePat,
          timeLogApiKey: prev.timeLogApiKey,
        }));
      }
    } catch (e) {
      console.error('Failed to import data', e);
    }
  };

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
    setNotes((prev) => [...prev, { id: Date.now(), text, starred: false }]);

  const toggleNoteStar = (id) =>
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, starred: !n.starred } : n))
    );

  const deleteNote = useCallback(
    (id, options = {}) => {
      const { showUndo = true } = options;
      const removedIndex = notes.findIndex((note) => note.id === id);
      if (removedIndex < 0) return;
      const removedNote = notes[removedIndex];
      setNotes((prev) => prev.filter((note) => note.id !== id));
      if (!showUndo) return;
      pushToast({
        type: 'info',
        message: 'Note deleted.',
        actionLabel: 'Undo',
        duration: 8000,
        onAction: () => {
          setNotes((prev) => {
            if (prev.some((note) => note.id === removedNote.id)) {
              return prev;
            }
            const next = [...prev];
            const targetIndex = Math.min(Math.max(removedIndex, 0), next.length);
            next.splice(targetIndex, 0, removedNote);
            return next;
          });
        },
      });
    },
    [notes, setNotes, pushToast]
  );

  const addTodo = (text) =>
    setTodos((prev) => [...prev, { id: Date.now(), text, done: false }]);

  const toggleTodo = (id) =>
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );

  const deleteTodo = useCallback(
    (id, options = {}) => {
      const { showUndo = true } = options;
      const removedIndex = todos.findIndex((todo) => todo.id === id);
      if (removedIndex < 0) return;
      const removedTodo = todos[removedIndex];
      setTodos((prev) => prev.filter((todo) => todo.id !== id));
      if (!showUndo) return;
      pushToast({
        type: 'info',
        message: 'Todo removed.',
        actionLabel: 'Undo',
        duration: 8000,
        onAction: () => {
          setTodos((prev) => {
            if (prev.some((todo) => todo.id === removedTodo.id)) {
              return prev;
            }
            const next = [...prev];
            const targetIndex = Math.min(Math.max(removedIndex, 0), next.length);
            next.splice(targetIndex, 0, removedTodo);
            return next;
          });
        },
      });
    },
    [todos, setTodos, pushToast]
  );

  const handleTodoDrop = (note) => {
    addTodo(note.text);
    if (!note.starred) deleteNote(note.id, { showUndo: false });
  };

  const handleNoteDrop = (itemId, note) => {
    setItemNotes((prev) => {
      const list = prev[itemId] ? [...prev[itemId], note.text] : [note.text];
      return { ...prev, [itemId]: list };
    });
    if (!note.starred) deleteNote(note.id, { showUndo: false });
  };

  const handleBlockCommentDrop = (blockId, note) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? dirtyClone(b, { comments: [...(b.comments || []), note.text] })
          : b
      )
    );
    dismissTimeLogReport();
    if (!note.starred) deleteNote(note.id, { showUndo: false });
  };

  function getReferenceDateFromBlock(block) {
    if (!block) return null;
    if (block.start) {
      const startDate = new Date(block.start);
      if (!Number.isNaN(startDate.getTime())) {
        return startDate;
      }
    }
    const dateKey = block.date || block.timeLogMeta?.workDate || null;
    if (dateKey) {
      const normalized = new Date(`${dateKey}T00:00:00`);
      if (!Number.isNaN(normalized.getTime())) {
        return normalized;
      }
    }
    return null;
  }

  function getBlockDayKey(block) {
    if (!block) return null;
    if (block.timeLogMeta?.workDate) return block.timeLogMeta.workDate;
    const reference = getReferenceDateFromBlock(block);
    if (!reference) return null;
    return formatLocalDateKey(reference);
  }

  useEffect(() => {
    setLockedDays((prev) => {
      let changed = false;
      const next = { ...prev };
      Object.entries(fullySyncedDays).forEach(([key, synced]) => {
        if (synced) {
          if (!next[key]) {
            next[key] = 'auto';
            changed = true;
          } else if (next[key] !== 'manual' && next[key] !== 'auto') {
            next[key] = 'auto';
            changed = true;
          }
        } else if (next[key] === 'auto') {
          delete next[key];
          changed = true;
        }
      });
      Object.keys(next).forEach((key) => {
        if (!fullySyncedDays[key] && next[key] === 'auto') {
          delete next[key];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [fullySyncedDays, setLockedDays]);

  const focusWeekFromBlock = useCallback(
    (block) => {
      const reference = getReferenceDateFromBlock(block);
      if (!reference) return;
      const monday = new Date(reference);
      const day = monday.getDay();
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);
      setWeekStart(monday);
    },
    [setWeekStart]
  );

  const itemProjectMap = useMemo(() => {
    const map = new Map();
    (items || []).forEach((item) => {
      if (item?.id === null || item?.id === undefined) return;
      const name =
        item.project ||
        item.projectName ||
        item.fields?.['System.TeamProject'] ||
        '';
      if (name) map.set(item.id.toString(), name);
    });
    return map;
  }, [items]);

  const buildPushSuggestions = useCallback(
    (blocksNeedingAttention = []) => {
      if (!Array.isArray(blocksNeedingAttention)) return [];
      const itemMap = new Map();
      (items || []).forEach((item) => {
        if (item?.id !== null && item?.id !== undefined) {
          itemMap.set(item.id.toString(), item);
        }
      });
      const knownProjects = settings.timeLogProjectMap || {};
      const groupMap = new Map();
      blocksNeedingAttention.forEach((block) => {
        if (!block) return;
        const dateKey = block.date || block.timeLogMeta?.workDate || 'unknown';
        const hasConcreteDate = dateKey !== 'unknown';
        const workItemIdRaw =
          block.taskId ??
          block.itemId ??
          block.workItemId ??
          block.timeLogMeta?.workItemId ??
          null;
        const workItemId =
          workItemIdRaw !== null && workItemIdRaw !== undefined
            ? workItemIdRaw.toString()
            : null;
        const groupKey = `${dateKey}|${workItemId || 'unassigned'}`;
        if (!groupMap.has(groupKey)) {
          const day = hasConcreteDate ? new Date(`${dateKey}T00:00:00`) : null;
          const dayLabel =
            hasConcreteDate && day && !Number.isNaN(day.getTime())
              ? day.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })
              : 'Date unknown';
          const linkedItem = workItemId ? itemMap.get(workItemId) : null;
          const workItemTitle =
            linkedItem?.title ||
            linkedItem?.name ||
            block.workItem ||
            (workItemId ? `Azure #${workItemId}` : 'Unassigned');
          const projectName =
            linkedItem?.project ||
            block.timeLogMeta?.projectName ||
            block.project ||
            'Unassigned Project';
          groupMap.set(groupKey, {
            id: groupKey,
            date: dateKey,
            dayLabel,
            workItemId,
            workItemTitle,
            projectName,
            minutes: 0,
            projectId: block.timeLogMeta?.projectId || knownProjects[projectName] || null,
            userName: block.timeLogMeta?.userName || null,
            blocks: [],
          });
        }
        const group = groupMap.get(groupKey);
        const projectName =
          group.projectName ||
          block.timeLogMeta?.projectName ||
          block.project ||
          'Unassigned Project';
        group.projectName = projectName;
        if (!group.projectId) {
          if (block.timeLogMeta?.projectId) {
            group.projectId = block.timeLogMeta.projectId;
          } else if (projectName && knownProjects[projectName]) {
            group.projectId = knownProjects[projectName];
          }
        }
        if (!group.userName && block.timeLogMeta?.userName) {
          group.userName = block.timeLogMeta.userName;
        }
        const blockMinutes = Number.isFinite(block.minutes) ? block.minutes : 0;
        group.minutes += blockMinutes;
        group.blocks.push(block);
      });
      return Array.from(groupMap.values()).sort((a, b) => {
        if (a.date === b.date) {
          return (a.workItemTitle || '').localeCompare(b.workItemTitle || '');
        }
        return (a.date || '').localeCompare(b.date || '');
      });
    },
    [items, settings.timeLogProjectMap]
  );

  const deriveProjectIdMap = useCallback(
    (blockList = []) => {
      const derived = {};
      blockList.forEach((block) => {
        const projectIdRaw = block?.timeLogMeta?.projectId;
        if (!projectIdRaw) return;
        const projectId = projectIdRaw.toString();
        const candidateNames = [
          block?.timeLogMeta?.projectName,
          block?.project,
          block?.workItemProject,
        ];
        let projectName =
          candidateNames.find((name) => typeof name === 'string' && name.trim())?.trim() || '';
        if (!projectName) {
          const keys = [
            block?.itemId,
            block?.taskId,
            block?.timeLogMeta?.workItemId,
          ]
            .map((key) =>
              key !== null && key !== undefined ? key.toString() : null
            )
            .filter(Boolean);
          for (const key of keys) {
            if (itemProjectMap.has(key)) {
              projectName = itemProjectMap.get(key);
              break;
            }
          }
        }
        if (!projectName) return;
        if (derived[projectName] !== projectId) {
          derived[projectName] = projectId;
        }
      });
      return derived;
    },
    [itemProjectMap]
  );

  const handleViewPushSuggestions = useCallback(
    (blocksNeedingAttention = []) => {
      if (blocksNeedingAttention.length > 0) {
        focusWeekFromBlock(blocksNeedingAttention[0]);
      }
      const suggestions = buildPushSuggestions(blocksNeedingAttention);
      setPushSuggestions(suggestions);
      setPushCreateStatus({});
      if (!pushRequiresResync) {
        setPushCreateError('');
      }
      setShowPushSuggestions(true);
    },
    [buildPushSuggestions, focusWeekFromBlock, pushRequiresResync]
  );

  const handleClosePushSuggestions = useCallback(() => {
    setShowPushSuggestions(false);
    setPushSuggestions([]);
    setPushCreateStatus({});
    if (!pushRequiresResync) {
      setPushCreateError('');
    }
  }, [pushRequiresResync]);

  const buildSuggestionPayload = useCallback(
    (suggestion) => {
      if (!suggestion) {
        return { error: 'Suggestion is not available.' };
      }
      if (
        !settings.timeLogBaseUrl ||
        !settings.timeLogOrgId ||
        !settings.timeLogApiKey
      ) {
        return { error: 'Complete the TimeLog settings before publishing entries.' };
      }
      if (!settings.timeLogUserId) {
        return { error: 'TimeLog User ID is missing. Update Settings to continue.' };
      }
      const resolvedUserName =
        (suggestion.userName && suggestion.userName.trim()) ||
        (settings.timeLogUserName && settings.timeLogUserName.trim()) ||
        '';
      const projectMap = settings.timeLogProjectMap || {};
      const resolvedProjectId =
        (suggestion.projectId && suggestion.projectId.toString()) ||
        (suggestion.projectName &&
          projectMap[suggestion.projectName] &&
          projectMap[suggestion.projectName].toString()) ||
        (settings.timeLogProjectId && settings.timeLogProjectId.toString()) ||
        '';
      if (!resolvedUserName) {
        return {
          error: 'Run a TimeLog sync to capture your user name automatically.',
        };
      }
      if (!resolvedProjectId) {
        const label = suggestion.projectName || 'this project';
        return {
          error:
            `Project mapping missing for ${label}. Run a TimeLog sync after logging time remotely to learn the project ID.`,
        };
      }
      if (!suggestion.date || !/^\d{4}-\d{2}-\d{2}$/.test(suggestion.date)) {
        return { error: 'Suggestion is missing a valid date.' };
      }
      const minutes = Math.max(0, Math.round(suggestion.minutes || 0));
      if (minutes <= 0) {
        return { error: 'Suggestion must contain minutes to publish.' };
      }
      const includeNotes = Boolean(settings.timeLogIncludeBlockNotes);
      const noteSamples = includeNotes && Array.isArray(suggestion.blocks)
        ? suggestion.blocks
            .map((block) => (block.note || '').trim())
            .filter(Boolean)
        : [];
      const commentSource = includeNotes && noteSamples.length
        ? noteSamples.slice(0, 3).join(' | ')
        : '';
      const comment = commentSource.slice(0, 512);
      const workItemId = suggestion.workItemId
        ? Number(suggestion.workItemId)
        : null;
      const payload = {
        comment,
        minutes,
        timeTypeDescription: 'WORK_TIME',
        date: suggestion.date,
        userId: settings.timeLogUserId,
        userName: resolvedUserName,
        userMakingChange: resolvedUserName,
        projectId: resolvedProjectId,
      };
      if (workItemId) {
        payload.workItemId = workItemId;
      }
      return {
        payload,
        config: {
          baseUrl: settings.timeLogBaseUrl,
          orgId: settings.timeLogOrgId,
          apiKey: settings.timeLogApiKey,
        },
      };
    },
    [
      settings.timeLogApiKey,
      settings.timeLogBaseUrl,
      settings.timeLogOrgId,
      settings.timeLogProjectMap,
      settings.timeLogProjectId,
      settings.timeLogUserId,
      settings.timeLogUserName,
      settings.timeLogIncludeBlockNotes,
    ]
  );

  const handleCreateTimeLogSuggestion = useCallback(
    async (suggestion) => {
      if (pushRequiresResync) {
        setPushCreateStatus((prev) => ({
          ...prev,
          [suggestion?.id || 'unknown']: {
            state: 'sync_required',
            message: PUSH_REQUIRES_SYNC_MESSAGE,
          },
        }));
        setPushCreateError(PUSH_REQUIRES_SYNC_MESSAGE);
        return { success: false, error: PUSH_REQUIRES_SYNC_MESSAGE };
      }
      const result = buildSuggestionPayload(suggestion);
      if (!result || !result.payload) {
        const message =
          result?.error || 'Suggestion is not ready for publishing.';
        setPushCreateStatus((prev) => ({
          ...prev,
          [suggestion?.id || 'unknown']: { state: 'error', message },
        }));
        setPushCreateError(message);
        return { success: false, error: message };
      }
      const { payload, config } = result;
      setPushCreateStatus((prev) => ({
        ...prev,
        [suggestion.id]: { state: 'creating' },
      }));
      setPushCreateError('');
      try {
        const response = await createTimeLogEntry(config, payload);
        setPushCreateStatus((prev) => ({
          ...prev,
          [suggestion.id]: { state: 'success', remote: response },
        }));
        return { success: true };
      } catch (err) {
        const baseMessage = err.message || 'Failed to create TimeLog entry.';
        const message = `${baseMessage} The API may still have created the entry, so run a TimeLog delta sync before retrying.`;
        setPushRequiresResync(true);
        setPushCreateStatus((prev) => ({
          ...prev,
          [suggestion.id]: {
            state: 'sync_required',
            message,
          },
        }));
        setPushCreateError(message);
        return { success: false, error: message };
      }
    },
    [
        buildSuggestionPayload,
        pushRequiresResync,
    ]
  );

  const handleCreateAllTimeLogSuggestions = useCallback(async () => {
    if (pushRequiresResync) {
      setPushCreateError(PUSH_REQUIRES_SYNC_MESSAGE);
      return;
    }
    if (!pushSuggestions.length) {
      setPushCreateError('No suggestions available to publish.');
      return;
    }
    let attempted = false;
    // eslint-disable-next-line no-restricted-syntax
    for (const suggestion of pushSuggestions) {
      const status = pushCreateStatus[suggestion.id];
      if (status?.state === 'success' || status?.state === 'creating') {
        // Already processed or inflight
        // eslint-disable-next-line no-continue
        continue;
      }
      const buildResult = buildSuggestionPayload(suggestion);
      if (!buildResult || !buildResult.payload) {
        // Skip suggestions that are not ready to publish
        // eslint-disable-next-line no-continue
        continue;
      }
      attempted = true;
      // eslint-disable-next-line no-await-in-loop
      await handleCreateTimeLogSuggestion(suggestion);
    }
    if (!attempted) {
      setPushCreateError(
        'No suggestions are ready to push. Hover a block to review the payload requirements.'
      );
    }
  }, [
    pushSuggestions,
    pushCreateStatus,
    pushRequiresResync,
    buildSuggestionPayload,
    handleCreateTimeLogSuggestion,
  ]);

  const clearWorkItemBlacklist = useCallback(() => {
    const storage = new StorageService('workItemBlacklist', []);
    storage.write([]);
  }, []);

  const getBlacklistedWorkItemIds = useCallback(() => {
    const storage = new StorageService('workItemBlacklist', []);
    const raw = storage.read();
    if (!Array.isArray(raw)) return [];
    return raw
      .map((id) => (id === null || id === undefined ? '' : id.toString().trim()))
      .filter(Boolean);
  }, []);

  const buildBlacklistRetryAction = useCallback(
    (retryFn) => async () => {
      clearWorkItemBlacklist();
      pushToast({
        type: 'info',
        message: 'Skip list cleared. Running full refresh...',
        duration: 2200,
      });
      if (typeof retryFn === 'function') {
        await retryFn();
      }
    },
    [clearWorkItemBlacklist, pushToast]
  );

  const openTimeLogSummary = useCallback(() => {
    const org = (settings.azureOrg || '').trim();
    const project = Array.isArray(settings.azureProjects)
      ? settings.azureProjects[0]
      : null;
    if (!org || !project) {
      pushToast({
        type: 'info',
        message: 'Set Azure organization and at least one project to open TimeLog summary.',
      });
      return;
    }
    const encodedProject = encodeURIComponent(project);
    const url = `https://dev.azure.com/${org}/${encodedProject}/_apps/hub/TimeLog.time-logging.time-log-summary`;
    if (window.api?.openExternal) {
      window.api.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  }, [settings.azureOrg, settings.azureProjects, pushToast]);

  const fetchWorkItems = useCallback(async (full = false, fromUser = false, options = {}) => {
    if (workItemsRefreshInFlightRef.current) {
      return;
    }
    const {
      azureOrg,
      azurePat,
      azureProjects,
      azureTags,
      azureArea,
      azureIteration,
    } = settings;
    if (!azureOrg || !azurePat) {
      if (fromUser) {
        pushToast({
          type: 'error',
          message: 'Set Azure organization and PAT before refreshing work items.',
        });
      }
      return;
    }

    workItemsRefreshInFlightRef.current = true;
    setWorkItemsRefreshing(true);

    const { suppressUnchangedPrompt = false } = options || {};
    const previousItems = itemsRef.current || [];
    const previousCount = previousItems.length;
    let loadingToastId = null;

    if (fromUser) {
      setFetchFailed(false);
      loadingToastId = pushToast({
        type: 'loading',
        message: full
          ? 'Running full work item refresh...'
          : 'Refreshing work items...',
        persistent: true,
      });
    }

    const service = new AdoService(
      azureOrg,
      azurePat,
      azureProjects,
      azureTags,
      azureArea,
      azureIteration,
      settings.enableDevOpsReview,
      settings.projectItems,
      settings.fetchParents
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
    try {
      const data = await service.getWorkItems(since);
      const mergedMap = new Map(previousItems.map((item) => [item.id, item]));
      data.forEach((item) => {
        mergedMap.set(item.id, item);
      });
      const mergedItems = Array.from(mergedMap.values());
      const nextCount = mergedItems.length;

      setItems(mergedItems);
      setItemsFetched(true);
      setLastFetch(Date.now());

      if (loadingToastId) {
        dismissToast(loadingToastId);
        loadingToastId = null;
      }

      if (fromUser && !suppressUnchangedPrompt && nextCount === previousCount) {
        pushToast({
          type: 'info',
          message: UNCHANGED_ITEMS_TOAST_MESSAGE,
          infoText: BLACKLIST_INFO_TEXT,
          actionLabel: 'Clear list + full refresh',
          persistent: true,
          onAction: buildBlacklistRetryAction(() =>
            fetchWorkItems(true, true, { suppressUnchangedPrompt: true })
          ),
        });
      }
    } catch (e) {
      console.error('Failed to fetch work items', e);
      setFetchFailed(true);
      if (fromUser) {
        pushToast({
          type: 'error',
          message: e?.message || 'Failed to refresh work items.',
        });
      }
    } finally {
      if (loadingToastId) {
        dismissToast(loadingToastId);
      }
      workItemsRefreshInFlightRef.current = false;
      setWorkItemsRefreshing(false);
    }
  }, [
    settings.azureOrg,
    settings.azurePat,
    settings.azureProjects,
    settings.azureTags,
    settings.azureArea,
    settings.azureIteration,
    settings.enableDevOpsReview,
    settings.projectItems,
    settings.fetchParents,
    setItems,
    lastFetch,
    dismissToast,
    pushToast,
    buildBlacklistRetryAction,
  ]);

  const dismissWorkItemSearchToast = useCallback(() => {
    const toastId = workItemSearchToastIdRef.current;
    if (!toastId) return;
    dismissToast(toastId);
    workItemSearchToastIdRef.current = null;
  }, [dismissToast]);

  const upsertWorkItemSearchToast = useCallback(
    (toastConfig = {}) => {
      const currentToastId = workItemSearchToastIdRef.current;
      const toastExists =
        !!currentToastId
        && toastsRef.current.some((toast) => toast.id === currentToastId);

      const nextConfig = {
        type: 'info',
        persistent: true,
        message: '',
        infoText: '',
        actionLabel: '',
        onAction: null,
        ...toastConfig,
      };

      if (toastExists) {
        updateToast(currentToastId, nextConfig);
        return currentToastId;
      }

      const createdId = pushToast(nextConfig);
      workItemSearchToastIdRef.current = createdId;
      return createdId;
    },
    [pushToast, updateToast]
  );

  const handleWorkItemSearchNoResults = useCallback(
    (searchTerm = '') => {
      const term = (searchTerm || '').trim();
      if (!term) {
        dismissWorkItemSearchToast();
        return;
      }

      const looksLikeId = /^\d+$/.test(term);
      if (looksLikeId) {
        const blacklistIds = getBlacklistedWorkItemIds();
        if (blacklistIds.includes(term)) {
          upsertWorkItemSearchToast({
            message: `No result for #${term}. This ID is currently in the skip list (blacklist), so it is excluded from refresh results.`,
            infoText: BLACKLIST_INFO_TEXT,
            actionLabel: 'Clear list + full refresh',
            onAction: buildBlacklistRetryAction(() =>
              fetchWorkItems(true, true, { suppressUnchangedPrompt: true })
            ),
          });
          return;
        }

        upsertWorkItemSearchToast({
          message: `No result for #${term}. This ID is not in the skip list. It may be outside your current filters, inaccessible with current permissions, or not in this local cache yet.`,
        });
        return;
      }

      upsertWorkItemSearchToast({
        message:
          'No work items matched your search. Tip: paste a numeric work item ID to check whether it is in the skip list (blacklist).',
      });
    },
    [
      fetchWorkItems,
      getBlacklistedWorkItemIds,
      buildBlacklistRetryAction,
      upsertWorkItemSearchToast,
      dismissWorkItemSearchToast,
    ]
  );

  const handleWorkItemSearchResultsRecovered = useCallback(() => {
    dismissWorkItemSearchToast();
  }, [dismissWorkItemSearchToast]);

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
    if (!itemsFetched && !fetchFailed) {
      fetchWorkItems();
    }
  }, [fetchWorkItems, itemsFetched, fetchFailed]);

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

  const prevWeek = () => {
    setWeekAnim('right');
    setWeekStart((w) => shiftWeekStart(w, -1));
  };
  const nextWeek = () => {
    setWeekAnim('left');
    setWeekStart((w) => shiftWeekStart(w, 1));
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
      const baseTime = Date.now();
      const pieces = splitByLunch(block, settings);
      let updated = [...prev];
      const updatedAt = new Date().toISOString();
      pieces.forEach((part, pIdx) => {
        const segments = splitForOverlaps(updated, part);
        segments.forEach((seg, idx) => {
          const blockData = {
            ...seg,
            id: baseTime + pIdx * 100 + idx,
          };
          const adjusted = trimLunchOverlap(blockData, settings);
          if (adjusted) {
            updated.push({ ...adjusted, updatedAt, syncStatus: adjusted.syncStatus || 'draft' });
          }
        });
      });
      return updated;
    });
    dismissTimeLogReport();
  };

  const updateBlock = (id, data) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? dirtyClone(b, data) : b))
    );
    dismissTimeLogReport();
  };

  const updateBlockTime = (id, startISO, endISO) => {
    const current = blocks.find((b) => b.id === id);
    if (!current) return;

    const currentStart = current.start ? new Date(current.start).getTime() : null;
    const currentEnd = current.end ? new Date(current.end).getTime() : null;
    const nextStart = startISO ? new Date(startISO).getTime() : null;
    const nextEnd = endISO ? new Date(endISO).getTime() : null;

    // Avoid marking the block dirty when the effective time range is unchanged
    if (
      currentStart !== null &&
      currentEnd !== null &&
      currentStart === nextStart &&
      currentEnd === nextEnd
    ) {
      return;
    }

    const others = blocks.filter((b) => b.id !== id);
    const pieces = splitByLunch(
      { ...current, start: startISO, end: endISO },
      settings
    );

    let updated = [...others];
    const updatedAt = new Date().toISOString();
    const targetStatus =
      current.syncStatus === 'synced'
        ? 'modified'
        : current.syncStatus || 'draft';
    pieces.forEach((part, index) => {
      const baseId = index === 0 ? id : Date.now() + index;
      const segments = splitForOverlaps(updated, part);
      segments.forEach((seg, idx) => {
        const blockData = { ...seg, id: idx === 0 ? baseId : Date.now() + index * 100 + idx };
        const adjusted = trimLunchOverlap(blockData, settings);
        if (adjusted) {
          updated.push({ ...adjusted, updatedAt, syncStatus: targetStatus });
        }
      });
    });

    setBlocks(updated);
    dismissTimeLogReport();
  };

  const deleteBlock = useCallback(
    (id, options = {}) => {
      const { showUndo = true } = options;
      const removedIndex = blocks.findIndex((block) => block.id === id);
      if (removedIndex < 0) return;
      const removedBlock = blocks[removedIndex];
      setBlocks((prev) => prev.filter((block) => block.id !== id));
      dismissTimeLogReport();
      if (!showUndo) return;
      pushToast({
        type: 'info',
        message: 'Work block deleted.',
        actionLabel: 'Undo',
        duration: 8000,
        onAction: () => {
          setBlocks((prev) => {
            if (prev.some((block) => block.id === removedBlock.id)) {
              return prev;
            }
            const next = [...prev];
            const targetIndex = Math.min(Math.max(removedIndex, 0), next.length);
            next.splice(targetIndex, 0, removedBlock);
            return next;
          });
        },
      });
    },
    [blocks, setBlocks, dismissTimeLogReport, pushToast]
  );

  const reviewService = new AdoService(
    settings.azureOrg,
    settings.azurePat,
    settings.azureProjects,
    settings.azureTags,
    settings.azureArea,
    settings.azureIteration,
    settings.enableDevOpsReview,
    settings.projectItems,
    settings.fetchParents
  );
  const treeProblems = settings.enableDevOpsReview
    ? reviewService.findTreeProblems(items)
    : [];
  const highlightedIds = new Set(treeProblems.map((i) => i.id));
  const problemMap = new Map(treeProblems.map((p) => [p.id, p.issue]));
  
  const openWorkItemsForWeek = useCallback(() => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const map = {};
    blocks.forEach((b) => {
      const start = new Date(b.start);
      const iso = formatLocalDateKey(start);
      if (start >= weekStart && start < weekEnd && b.taskId && !lockedDays[iso]) {
        const end = new Date(b.end);
        const hours = (end - start) / (1000 * 60 * 60);
        const label = start.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'numeric',
          day: 'numeric',
        });
        if (!map[b.taskId]) map[b.taskId] = { total: 0, days: {} };
        map[b.taskId].total += hours;
        if (!map[b.taskId].days[iso]) {
          map[b.taskId].days[iso] = { label, hours: 0 };
        }
        map[b.taskId].days[iso].hours += hours;
      }
    });
    const itemsToOpen = Object.entries(map).map(([id, data]) => {
      const task = items.find((it) => it.id === id) || {};
      const messages = [];
      if (!task.area) {
        messages.push(
          `Please assign area path ${settings.azureArea || '(set area path)'} before logging time.`
        );
      }
      if (problemMap.has(id)) {
        messages.push(problemMap.get(id));
      }
      const dayList = Object.values(data.days)
        .sort((a, b) => (a.label > b.label ? 1 : -1))
        .map((d) => [d.label, d.hours]);
      return {
        id,
        hours: data.total,
        days: dayList,
        url: settings.azureOrg
          ? `https://dev.azure.com/${settings.azureOrg}/_workitems/edit/${id}`
          : `https://dev.azure.com/_workitems/edit/${id}`,
        message: messages.join(' '),
      };
    });
    if (window.api && window.api.openWorkItems) {
      window.api.openWorkItems(itemsToOpen);
    } else {
      itemsToOpen.forEach((i) => window.open(i.url, '_blank'));
    }
  }, [blocks, items, settings, weekStart, lockedDays, problemMap]);

  const handleTimeLogSync = useCallback(async () => {
    setTimeLogError('');
    setTimeLogSyncing(true);
    const service = new TimeLogSyncService();
    try {
      const lastSyncDate = settings.timeLogLastSync
        ? new Date(settings.timeLogLastSync)
        : null;
      const focusStart = new Date(weekStart);
      focusStart.setHours(0, 0, 0, 0);
      const focusEnd = new Date(focusStart);
      focusEnd.setDate(focusEnd.getDate() + 7);
      const result = await service.sync({
        settings,
        blocks,
        createdOnFromDate: lastSyncDate,
        focusRange: { start: focusStart, end: focusEnd },
        limitToFocusRange: true,
      });
      if (result.blocks) {
        setBlocks(result.blocks);
      }
      setTimeLogReport(result.report);
      setTimeLogAlerts(buildTimeLogAlerts(result.report));
      const derivedMap = deriveProjectIdMap(result.blocks || []);
      const metadata = {
        ...(result.metadata || {}),
        projectMap: {
          ...(result.metadata?.projectMap || {}),
          ...derivedMap,
        },
      };
      applyTimeLogMetadata(metadata);
      setPushRequiresResync(false);
      setPushCreateStatus({});
      setPushCreateError('');
      pushToast({
        type: 'success',
        message: 'TimeLog delta sync completed.',
      });
      setSettings((prev) => ({
        ...prev,
        timeLogLastSync: new Date().toISOString(),
      }));
    } catch (e) {
      setTimeLogError(e.message || 'Failed to sync TimeLog entries');
    } finally {
      setTimeLogSyncing(false);
    }
  }, [
    settings,
    blocks,
    setBlocks,
    setSettings,
    weekStart,
    applyTimeLogMetadata,
    deriveProjectIdMap,
    pushToast,
  ]);

  const handleFullTimeLogSync = useCallback(async (startDateOverride = null) => {
    setTimeLogError('');
    setTimeLogSyncing(true);
    const service = new TimeLogSyncService();
    try {
      const focusStart = new Date(weekStart);
      focusStart.setHours(0, 0, 0, 0);
      const focusEnd = new Date(focusStart);
      focusEnd.setDate(focusEnd.getDate() + 7);
      const result = await service.sync({
        settings,
        blocks,
        createdOnFromDate: startDateOverride,
        focusRange: { start: focusStart, end: focusEnd },
      });
      if (result.blocks) {
        setBlocks(result.blocks);
      }
      setTimeLogReport(result.report);
      setTimeLogAlerts(buildTimeLogAlerts(result.report));
      const derivedMap = deriveProjectIdMap(result.blocks || []);
      const metadata = {
        ...(result.metadata || {}),
        projectMap: {
          ...(result.metadata?.projectMap || {}),
          ...derivedMap,
        },
      };
      applyTimeLogMetadata(metadata);
      setPushRequiresResync(false);
      setPushCreateStatus({});
      setPushCreateError('');
      pushToast({
        type: 'success',
        message: 'Full TimeLog sync completed.',
      });
      setSettings((prev) => ({
        ...prev,
        timeLogLastSync: new Date().toISOString(),
      }));
    } catch (e) {
      setTimeLogError(e.message || 'Failed to sync TimeLog entries');
    } finally {
      setTimeLogSyncing(false);
    }
  }, [
    settings,
    blocks,
    setBlocks,
    setSettings,
    weekStart,
    applyTimeLogMetadata,
    deriveProjectIdMap,
    pushToast,
  ]);

  const startSubmitSession = () => {
    openWorkItemsForWeek();
  };

  return (
    <>
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
        <div className="flex items-start justify-between">
          <Settings
            settings={settings}
            setSettings={setSettings}
            onExport={handleExport}
            onImport={handleImport}
            onFullTimeLogSync={handleFullTimeLogSync}
            timeLogSyncing={timeLogSyncing}
            renderTrigger={(openSettings) => (
              <div className="relative inline-flex items-center group">
                <PatrakLogo />
                <button
                  type="button"
                  onClick={() => openSettings('general')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 -translate-x-10 group-hover:translate-x-8 focus-visible:translate-x-8 transition-all duration-200 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-events-none group-hover:pointer-events-auto focus-visible:pointer-events-auto bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-full shadow px-2 py-1"
                >
                  <span className="sr-only">Open settings</span>
                  ⚙
                </button>
              </div>
            )}
          />
          <TodoBar
            todos={todos}
            onToggleTodo={toggleTodo}
            onDeleteTodo={deleteTodo}
            onNoteDrop={handleTodoDrop}
          />
        </div>
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
            onWeekClick={(d) => setWeekStart(d)}
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
          timeLogAlerts={timeLogAlerts}
        />
        <Notes
          notes={notes}
          onAdd={addNote}
          onDelete={deleteNote}
          onToggleStar={toggleNoteStar}
          onAddTodo={addTodo}
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
        <div className="space-y-2">
          <button
            className={`w-full flex items-center justify-center gap-1 px-4 py-2 rounded-full shadow ${
              timeLogSyncing ? 'bg-gray-400 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            onClick={handleTimeLogSync}
            disabled={timeLogSyncing}
          >
            <span>{timeLogSyncing ? 'Syncing...' : 'Sync Delta'}</span>
          </button>
          {timeLogError && (
            <div className="text-xs text-red-600">{timeLogError}</div>
          )}
        </div>
        {timeLogReport && (
          <TimeLogReport
            report={timeLogReport}
            onDismiss={() => setTimeLogReport(null)}
            onFullRefresh={handleFullTimeLogSync}
            onCreateMissing={handleViewPushSuggestions}
            onOpenTimeLogSummary={openTimeLogSummary}
          />
        )}
        <HoursSummary blocks={blocks} weekStart={weekStart} items={items} />
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
          {settings.enableDevOpsReview && (
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
          )}
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
            problems={problemMap}
            isRefreshing={workItemsRefreshing}
            onSearchNoResults={handleWorkItemSearchNoResults}
            onSearchResultsRecovered={handleWorkItemSearchResultsRecovered}
          />
        )}
        {panelTab === 'review' && settings.enableDevOpsReview && (
          <DevOpsReview items={items} settings={settings} />
        )}
      </div>
    </div>
    {showPushSuggestions && (
      <TimeLogPushSuggestions
        suggestions={pushSuggestions}
        onClose={handleClosePushSuggestions}
        onCreateEntry={handleCreateTimeLogSuggestion}
        onCreateAll={handleCreateAllTimeLogSuggestions}
        statusMap={pushCreateStatus}
        requiresResync={pushRequiresResync}
        errorMessage={pushCreateError}
        metadata={{
          userName: settings.timeLogUserName,
          userId: settings.timeLogUserId,
          projectMap: settings.timeLogProjectMap,
          defaultProjectId: settings.timeLogProjectId,
        }}
        buildPayload={buildSuggestionPayload}
      />
    )}
    <ToastStack
      toasts={toasts}
      onDismiss={dismissToast}
      onAction={handleToastAction}
    />
    <ReleaseNotesModal release={releaseNotes} onClose={dismissReleaseNotes} />
    </>
  );
}

export default App;
