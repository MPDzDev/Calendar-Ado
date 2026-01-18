import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import WorkItem from './WorkItem';

export function buildTree(items) {
  const map = new Map();
  items.forEach((item) => {
    map.set(item.id, { ...item, children: [] });
  });

  const placeholderEpic = {
    id: '__placeholder_epic__',
    title: 'Unassigned (No Epic)',
    type: 'Epic',
    children: [],
  };
  const placeholderFeature = {
    id: '__placeholder_feature__',
    title: 'Unassigned (No Feature)',
    type: 'Feature',
    children: [],
  };

  const roots = [];
  map.forEach((item) => {
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId).children.push(item);
    } else {
      const type = (item.type || '').toLowerCase();
      if (type === 'feature') {
        placeholderEpic.children.push(item);
      } else if (type === 'epic') {
        roots.push(item);
      } else {
        placeholderFeature.children.push(item);
      }
    }
  });

  if (placeholderEpic.children.length > 0) roots.push(placeholderEpic);
  if (placeholderFeature.children.length > 0) roots.push(placeholderFeature);

  return roots;
}

function summarizeWorkItems(items) {
  return items.reduce(
    (acc, item) => {
      const type = (item.type || 'item').toLowerCase();
      acc.total += 1;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    { total: 0 }
  );
}

const PROJECT_METRIC_ORDER = [
  { key: 'total', label: 'Work Items' },
  { key: 'epic', label: 'Epics' },
  { key: 'feature', label: 'Features' },
  { key: 'user story', label: 'Stories' },
  { key: 'bug', label: 'Bugs' },
  { key: 'task', label: 'Tasks' },
  { key: 'transversal activity', label: 'Transversal' },
];

function renderTree(
  nodes,
  level = 0,
  onNoteDrop,
  itemDrop,
  notesMap,
  highlightIds,
  featureCollapsed,
  toggleFeature,
  openItem
) {
  return nodes.map((node) => {
    const type = node.type?.toLowerCase();
    const children = node.children || [];
    let taskChildren = [];
    let structuralChildren = children;
    if (type !== 'task' && children.length > 0) {
      taskChildren = children.filter(
        (child) => child.type?.toLowerCase() === 'task'
      );
      structuralChildren = children.filter(
        (child) => child.type?.toLowerCase() !== 'task'
      );
    }
    const hasStructuralChildren = structuralChildren.length > 0;
    const hasTaskChildren = taskChildren.length > 0;
    const isCollapsible =
      (hasStructuralChildren || hasTaskChildren) &&
      (type === 'feature' || type === 'epic');
    const collapsed = featureCollapsed[node.id];
    const indentStyle =
      level > 0 ? { marginLeft: `${level * 0.75}rem` } : undefined;

    return (
      <div
        key={node.id}
        className={`tree-node ${level > 0 ? 'tree-node-branch' : ''}`}
        style={indentStyle}
      >
        <WorkItem
          item={node}
          notes={notesMap[node.id] || []}
          onNoteDrop={onNoteDrop}
          onItemDrop={itemDrop}
          highlight={highlightIds?.has(node.id)}
          onOpen={openItem}
          collapsible={isCollapsible}
          collapsed={collapsed}
          onToggle={() => isCollapsible && toggleFeature(node.id)}
          childTasks={taskChildren.map((child) => ({
            item: child,
            notes: notesMap[child.id] || [],
            highlight: highlightIds?.has(child.id),
          }))}
        />
        {hasStructuralChildren && !collapsed && (
          <div className="tree-children">
            {renderTree(
              structuralChildren,
              level + 1,
              onNoteDrop,
              itemDrop,
              notesMap,
              highlightIds,
              featureCollapsed,
              toggleFeature,
              openItem
            )}
          </div>
        )}
      </div>
    );
  });
}



export default function WorkItems({
  items,
  onRefresh,
  projectColors = {},
  settings,
  setSettings,
  onNoteDrop,
  itemNotes = {},
  highlightedIds = new Set(),
  problems = new Map(),
}) {

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [collapsed, setCollapsed] = useState({});
  const [featureCollapsed, setFeatureCollapsed] = useState({});
  const [activeFilterGroup, setActiveFilterGroup] = useState(null);

  const treeRef = useRef(null);

  const groupRefs = {
    tags: useRef(null),
    areas: useRef(null),
    iterations: useRef(null),
  };

  const pillRowRefs = {
    tags: useRef(null),
    areas: useRef(null),
    iterations: useRef(null),
  };

  const [condensed, setCondensed] = useState({
    tags: false,
    areas: false,
    iterations: false,
  });

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const totalItems = items?.length || 0;

  const handleTreeDragOver = (e) => {
    if (!treeRef.current) return;
    e.preventDefault();
    const rect = treeRef.current.getBoundingClientRect();
    const threshold = 40;
    if (e.clientY - rect.top < threshold) {
      treeRef.current.scrollTop -= threshold - (e.clientY - rect.top);
    } else if (rect.bottom - e.clientY < threshold) {
      treeRef.current.scrollTop += threshold - (rect.bottom - e.clientY);
    }
  };

  useEffect(() => {
    const handler = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useLayoutEffect(() => {
    const groups = ['tags', 'areas', 'iterations'];
    setCondensed((prev) => {
      const next = { ...prev };
      groups.forEach((g) => {
        const el = pillRowRefs[g]?.current;
        if (el) next[g] = el.scrollWidth > el.clientWidth;
      });
      return next;
    });
  }, [settings.azureTags, settings.azureArea, settings.azureIteration, windowWidth]);

  const toggleFilterGroup = (group) =>
    setActiveFilterGroup((prev) => (prev === group ? null : group));

  const updateSettings = (changes) =>
    setSettings((prev) => ({ ...prev, ...changes }));

  const itemMap = new Map(items.map((i) => [i.id, i]));

  const filtered = items.filter((i) => {
    const matchesSearch = i.title
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesType =
      typeFilter === 'all' || i.type?.toLowerCase() === typeFilter;

    const ignoreToggles = search.trim() !== '';

    const matchesTags =
      ignoreToggles ||
      settings.azureTags.length === 0 ||
      settings.azureTags.every((t) => (i.tags || []).includes(t));

    const matchesArea =
      ignoreToggles ||
      !settings.azureArea ||
      (i.area || '').toLowerCase().startsWith(settings.azureArea.toLowerCase());

    const matchesIteration =
      ignoreToggles ||
      !settings.azureIteration ||
      (i.iteration || '')
        .toLowerCase()
        .startsWith(settings.azureIteration.toLowerCase());

    return (
      matchesSearch &&
      matchesType &&
      matchesTags &&
      matchesArea &&
      matchesIteration
    );
  });

  const filteredWithParents = [];
  const seen = new Set();
  const includeWithAncestors = (item) => {
    if (!item || seen.has(item.id)) return;
    seen.add(item.id);
    if (item.parentId && itemMap.has(item.parentId)) {
      includeWithAncestors(itemMap.get(item.parentId));
    }
    filteredWithParents.push(item);
  };
  filtered.forEach(includeWithAncestors);

  const grouped = filteredWithParents.reduce((acc, item) => {
    const projectKey = item.project || 'Unknown';
    if (!acc[projectKey]) acc[projectKey] = [];
    acc[projectKey].push(item);
    return acc;
  }, {});
  const groupedEntries = Object.entries(grouped);

  useEffect(() => {
    const keys = Array.from(new Set(items.map((i) => i.project || 'Unknown')));
    setCollapsed((prev) => {
      const next = { ...prev };
      keys.forEach((k) => {
        if (!(k in next)) next[k] = false;
      });
      return next;
    });

    const featureIds = items
      .filter((i) => ['feature', 'epic'].includes(i.type?.toLowerCase()))
      .map((i) => i.id);

    setFeatureCollapsed((prev) => {
      const next = { ...prev };
      featureIds.forEach((id) => {
        if (!(id in next)) next[id] = false;
      });
      return next;
    });
  }, [items]);

  useEffect(() => {
    const handler = (e) => {
      if (
        activeFilterGroup &&
        groupRefs[activeFilterGroup]?.current &&
        !groupRefs[activeFilterGroup].current.contains(e.target)
      ) {
        setActiveFilterGroup(null);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [activeFilterGroup]);

  const toggle = (project) =>
    setCollapsed((prev) => ({
      ...prev,
      [project]: !prev[project],
    }));

  const toggleFeature = (id) =>
    setFeatureCollapsed((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));

  const availableTags = Array.from(
    new Set(items.flatMap((i) => i.tags || []))
  ).sort();
  const availableAreas = Array.from(
    new Set(items.map((i) => i.area).filter(Boolean))
  ).sort();
  const availableIterations = Array.from(
    new Set(items.map((i) => i.iteration).filter(Boolean))
  ).sort();

  const toggleTag = (tag) => {
    const tags = settings.azureTags.includes(tag)
      ? settings.azureTags.filter((t) => t !== tag)
      : [...settings.azureTags, tag];
    // Update local filter state without refetching from the API.
    updateSettings({ azureTags: tags });
  };

  const toggleArea = (area) => {
    const value = settings.azureArea === area ? '' : area;
    // Update local filter state without triggering a refresh.
    updateSettings({ azureArea: value });
  };

  const toggleIteration = (it) => {
    const value = settings.azureIteration === it ? '' : it;
    // Update local filter state without refetching.
    updateSettings({ azureIteration: value });
  };

  const openItem = (item, message) => {
    const org = settings.azureOrg;
    const url = org
      ? `https://dev.azure.com/${org}/_workitems/edit/${item.id}`
      : `https://dev.azure.com/_workitems/edit/${item.id}`;
    let msg = message || '';
    if (problems.has(item.id)) {
      msg = msg ? `${msg} ${problems.get(item.id)}` : problems.get(item.id);
    }
    const payload = { id: item.id, hours: 0, days: [], url, message: msg };
    if (window.api && window.api.openWorkItems) {
      window.api.openWorkItems([payload]);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleItemDrop = (target, dragged) => {
    const msg = `Dropped item into \"${target.title}\" (${target.id}).`;
    openItem(target, msg);
  };

  const dropHandler = handleItemDrop;

  return (
    <div className="mb-4 flex flex-col flex-grow overflow-y-auto min-h-0">
      <div className="sticky top-0 bg-white dark:bg-gray-800 pb-3 z-10">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/80 backdrop-blur px-4 py-4 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Work Items
              </p>
              <p className="text-xl font-semibold leading-tight text-gray-900 dark:text-gray-50">
                {totalItems.toLocaleString()}
              </p>
            </div>
            {onRefresh && (
              <div className="flex items-center gap-2 ml-auto text-[11px] font-medium">
                <div className="inline-flex rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-inner overflow-hidden">
                  <button
                    type="button"
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 transition"
                    onClick={() => onRefresh(false, true)}
                  >
                    Refresh
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    onClick={() => onRefresh(true, true)}
                  >
                    Full
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center flex-grow min-w-[10rem] rounded-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-sm focus-within:ring-2 focus-within:ring-blue-400">
              <input
                type="text"
                placeholder="Search work items"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent flex-1 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            >
              <option value="all">All Types</option>
              <option value="feature">Features</option>
              <option value="epic">Epics</option>
              <option value="user story">User Stories</option>
              <option value="bug">Bugs</option>
              <option value="task">Tasks</option>
              <option value="transversal activity">Transversal Activity</option>
            </select>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 text-xs">
            <div className="relative" ref={groupRefs.tags}>
              <div className="flex items-center gap-2 flex-wrap" ref={pillRowRefs.tags}>
                <button
                  type="button"
                  className={`px-3 py-1 rounded-full uppercase tracking-wide text-[10px] font-semibold border ${
                    activeFilterGroup === 'tags'
                      ? 'border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-200'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                  onClick={() => toggleFilterGroup('tags')}
                >
                  Tags
                </button>
                <div className="flex flex-wrap gap-1 min-h-[24px] overflow-hidden">
                  {settings.azureTags.length > 0 &&
                    (condensed.tags ? (
                      <span className="px-2 py-0.5 border rounded-full bg-gray-100 dark:bg-gray-800 flex items-center">
                        {`${settings.azureTags.length} filters`}
                        <button
                          className="ml-1 text-xs"
                          onClick={() => {
                            updateSettings({ azureTags: [] });
                          }}
                        >
                          x
                        </button>
                      </span>
                    ) : (
                      settings.azureTags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 border rounded-full bg-gray-100 dark:bg-gray-800 flex items-center"
                        >
                          {tag}
                          <button className="ml-1 text-xs" onClick={() => toggleTag(tag)}>
                            x
                          </button>
                        </span>
                      ))
                    ))}
                </div>
              </div>
              {activeFilterGroup === 'tags' && (
                <div className="absolute left-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-2 z-20 flex flex-wrap gap-1">
                  <button
                    className={`px-2 py-1 rounded-full border ${
                      settings.azureTags.length === 0
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}
                    onClick={() => {
                      updateSettings({ azureTags: [] });
                    }}
                  >
                    All
                  </button>
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      className={`px-2 py-1 rounded-full border ${
                        settings.azureTags.includes(tag)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative" ref={groupRefs.areas}>
              <div className="flex items-center gap-2 flex-wrap" ref={pillRowRefs.areas}>
                <button
                  type="button"
                  className={`px-3 py-1 rounded-full uppercase tracking-wide text-[10px] font-semibold border ${
                    activeFilterGroup === 'areas'
                      ? 'border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-200'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                  onClick={() => toggleFilterGroup('areas')}
                >
                  Areas
                </button>
                <div className="flex flex-wrap gap-1 min-h-[24px] overflow-hidden">
                  {settings.azureArea && (
                    <span className="px-2 py-0.5 border rounded-full bg-gray-100 dark:bg-gray-800 flex items-center">
                      {settings.azureArea}
                      <button className="ml-1 text-xs" onClick={() => toggleArea(settings.azureArea)}>
                        x
                      </button>
                    </span>
                  )}
                </div>
              </div>
              {activeFilterGroup === 'areas' && (
                <div className="absolute left-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-2 z-20 flex flex-wrap gap-1">
                  <button
                    className={`px-2 py-1 rounded-full border ${
                      settings.azureArea === ''
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}
                    onClick={() => {
                      updateSettings({ azureArea: '' });
                    }}
                  >
                    All
                  </button>
                  {availableAreas.map((area) => (
                    <button
                      key={area}
                      className={`px-2 py-1 rounded-full border ${
                        settings.azureArea === area
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}
                      onClick={() => toggleArea(area)}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative" ref={groupRefs.iterations}>
              <div className="flex items-center gap-2 flex-wrap" ref={pillRowRefs.iterations}>
                <button
                  type="button"
                  className={`px-3 py-1 rounded-full uppercase tracking-wide text-[10px] font-semibold border ${
                    activeFilterGroup === 'iterations'
                      ? 'border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-200'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                  onClick={() => toggleFilterGroup('iterations')}
                >
                  Iterations
                </button>
                <div className="flex flex-wrap gap-1 min-h-[24px] overflow-hidden">
                  {settings.azureIteration && (
                    <span className="px-2 py-0.5 border rounded-full bg-gray-100 dark:bg-gray-800 flex items-center">
                      {settings.azureIteration}
                      <button className="ml-1 text-xs" onClick={() => toggleIteration(settings.azureIteration)}>
                        x
                      </button>
                    </span>
                  )}
                </div>
              </div>
              {activeFilterGroup === 'iterations' && (
                <div className="absolute left-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-2 z-20 flex flex-wrap gap-1">
                  <button
                    className={`px-2 py-1 rounded-full border ${
                      settings.azureIteration === ''
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}
                    onClick={() => {
                      updateSettings({ azureIteration: '' });
                    }}
                  >
                    All
                  </button>
                  {availableIterations.map((it) => (
                    <button
                      key={it}
                      className={`px-2 py-1 rounded-full border ${
                        settings.azureIteration === it
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}
                      onClick={() => toggleIteration(it)}
                    >
                      {it}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div
        ref={treeRef}
        onDragOver={handleTreeDragOver}
        className="flex-grow overflow-y-auto space-y-3 scroll-container min-h-0"
      >
        {groupedEntries.length === 0 && (
          <div className="project-empty text-sm text-slate-500 dark:text-slate-400 px-2 py-4">
            No work items match the current filters.
          </div>
        )}
        {groupedEntries.map(([project, list]) => {
          const structuredTree = buildTree(list);
          const metrics = summarizeWorkItems(list);
          const swatch = projectColors[project] || '#94a3b8';
          const allowGroupDrop = (e) => {
            if (e.dataTransfer.types.includes('application/x-note')) {
              e.preventDefault();
            }
          };
          const handleGroupDrop = (e) => {
            const raw = e.dataTransfer.getData('application/x-note');
            if (!raw) return;
            e.preventDefault();
            const note = JSON.parse(raw);
            const first = structuredTree[0];
            if (first) {
              onNoteDrop && onNoteDrop(first.id, note);
            }
          };
          return (
            <div
              key={project}
              className="project-block border border-slate-200 dark:border-slate-700 rounded-xl bg-white/80 dark:bg-slate-900/60"
            >
              <button
                type="button"
                className="project-head flex w-full items-center justify-between px-3 py-2 text-left text-sm"
                onClick={() => toggle(project)}
                aria-expanded={!collapsed[project]}
              >
                <span className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-medium">
                  <span
                    className="project-dot"
                    style={{ backgroundColor: swatch }}
                  />
                  {project}
                </span>
                <span className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="hidden sm:inline">{list.length} items</span>
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-900/50 transition-transform ${
                      collapsed[project] ? '' : 'rotate-90'
                    }`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M7 5l5 5-5 5"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </span>
              </button>
              {!collapsed[project] && (
                <div className="project-body px-3 pb-3 space-y-2">
                  <div className="project-metrics flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                    {PROJECT_METRIC_ORDER.map(({ key, label }) => {
                      const value = metrics[key] || 0;
                      if (key !== 'total' && value === 0) return null;
                      return (
                        <span key={key} className="project-pill">
                          {label}: <span className="font-semibold text-slate-900 dark:text-white ml-1">{value}</span>
                        </span>
                      );
                    })}
                  </div>
                  <div
                    className="project-tree-surface rounded-lg border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-2"
                    onDragOver={allowGroupDrop}
                    onDrop={handleGroupDrop}
                  >
                    {renderTree(
                      structuredTree,
                      0,
                      onNoteDrop,
                      dropHandler,
                      itemNotes,
                      highlightedIds,
                      featureCollapsed,
                      toggleFeature,
                      openItem
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
  </div>
  );
}
