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

function countDescendants(node) {
  if (!node.children || node.children.length === 0) return 0;
  return node.children.reduce(
    (sum, child) => sum + 1 + countDescendants(child),
    0
  );
}

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
    const isCollapsible = type === 'feature' || type === 'epic';
    const collapsed = featureCollapsed[node.id];
    const containerClass = isCollapsible ? 'block w-full' : 'inline-block';
    return (
      <div key={node.id} className={containerClass}>
        <div className={isCollapsible ? 'flex items-center cursor-pointer' : ''} onClick={() => isCollapsible && toggleFeature(node.id)}>
          <WorkItem
            item={node}
            level={level}
            notes={notesMap[node.id] || []}
            onNoteDrop={onNoteDrop}
            onItemDrop={itemDrop}
            highlight={highlightIds?.has(node.id)}
            pill={node.type?.toLowerCase() === 'task' && level > 0}
            onOpen={openItem}
          />
          {isCollapsible && node.children.length > 0 && (
            <span className="ml-1 text-xs">
              {collapsed
                ? `▶ (${countDescendants(node)})`
                : '▼'}
            </span>
          )}
        </div>
        {node.children.length > 0 && !collapsed &&
          renderTree(
            node.children,
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

  const itemMap = new Map(items.map((i) => [i.id, i]));

  const allProjects = Array.from(
    new Set(items.map((i) => i.project || 'Unknown'))
  );

  const grouped = allProjects.reduce((acc, project) => {
    acc[project] = [];
    return acc;
  }, {});

  filtered.forEach((item) => {
    const projectKey = item.project || 'Unknown';
    grouped[projectKey].push(item);
  });

  useEffect(() => {
    const keys = Object.keys(grouped);
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
    setCollapsed((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => {
        next[k] = k === project ? !prev[project] : true;
      });
      return next;
    });

  const toggleFeature = (id) =>
    setFeatureCollapsed((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));

  const collapseAll = () => {
    const next = {};
    items.forEach((i) => {
      const type = (i.type || '').toLowerCase();
      if (type === 'feature' || type === 'epic') {
        next[i.id] = true;
      }
    });
    setFeatureCollapsed(next);
  };

  const expandAll = () => {
    const next = {};
    items.forEach((i) => {
      const type = (i.type || '').toLowerCase();
      if (type === 'feature' || type === 'epic') {
        next[i.id] = false;
      }
    });
    setFeatureCollapsed(next);
  };

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
      <div className="sticky top-0 bg-white dark:bg-gray-800 pb-2">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold">Work Items</h2>
          {onRefresh && (
            <div className="space-x-2">
              <button
                className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700"
                onClick={() => onRefresh(false, true)}
              >
                Refresh
              </button>
              <button
                className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700"
                onClick={() => onRefresh(true, true)}
              >
                Full Refresh
              </button>
              <button
                className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700"
                onClick={collapseAll}
              >
                Collapse All
              </button>
              <button
                className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700"
                onClick={expandAll}
              >
                Expand All
              </button>
            </div>
          )}
        </div>
        <div className="flex space-x-2 mb-2">
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border px-1 text-sm flex-grow"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border text-sm"
          >
            <option value="all">All</option>
            <option value="feature">Features</option>
            <option value="epic">Epics</option>
            <option value="user story">User Stories</option>
            <option value="bug">Bugs</option>
            <option value="task">Tasks</option>
            <option value="transversal activity">Transversal Activity</option>
          </select>
        </div>
        <div className="mb-2 relative" ref={groupRefs.tags}>
          <div className="flex items-center flex-wrap" ref={pillRowRefs.tags}>
          <div
            className="font-semibold cursor-pointer"
            onClick={() => toggleFilterGroup('tags')}
          >
            Tags
          </div>
          <div className="flex items-center flex-wrap ml-2 space-x-1 overflow-hidden">
            {settings.azureTags.length > 0 &&
              (condensed.tags ? (
                <span className="px-2 py-1 text-xs border rounded-full bg-gray-200 dark:bg-gray-700 flex items-center">
                  {`${settings.azureTags.length} filters`}
                  <button
                    className="ml-1"
                    onClick={() => {
                      // Clear all tag filters locally.
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
                    className="px-2 py-1 text-xs border rounded-full bg-gray-200 dark:bg-gray-700 flex items-center"
                  >
                    {tag}
                    <button className="ml-1" onClick={() => toggleTag(tag)}>
                      x
                    </button>
                  </span>
                ))
              ))}
          </div>
        </div>
        {activeFilterGroup === 'tags' && (
          <div className="absolute left-0 mt-1 bg-white dark:bg-gray-800 border p-2 z-10 flex flex-wrap gap-1">
            <button
              className={`px-2 py-1 text-xs border ${settings.azureTags.length === 0 ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
              onClick={() => {
                // Reset tag filters without refetching.
                updateSettings({ azureTags: [] });
              }}
            >
              All
            </button>
            {availableTags.map((tag) => (
              <button
                key={tag}
                className={`px-2 py-1 text-xs border ${settings.azureTags.includes(tag) ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mb-2 relative" ref={groupRefs.areas}>
        <div className="flex items-center flex-wrap" ref={pillRowRefs.areas}>
          <div
            className="font-semibold cursor-pointer"
            onClick={() => toggleFilterGroup('areas')}
          >
            Areas
          </div>
          <div className="flex items-center flex-wrap ml-2 space-x-1 overflow-hidden">
            {settings.azureArea && (
              <span className="px-2 py-1 text-xs border rounded-full bg-gray-200 dark:bg-gray-700 flex items-center">
                {settings.azureArea}
                <button className="ml-1" onClick={() => toggleArea(settings.azureArea)}>
                  x
                </button>
              </span>
            )}
          </div>
        </div>
        {activeFilterGroup === 'areas' && (
          <div className="absolute left-0 mt-1 bg-white dark:bg-gray-800 border p-2 z-10 flex flex-wrap gap-1">
            <button
              className={`px-2 py-1 text-xs border ${settings.azureArea === '' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
              onClick={() => {
                // Clear area filter locally without refreshing.
                updateSettings({ azureArea: '' });
              }}
            >
              All
            </button>
            {availableAreas.map((area) => (
              <button
                key={area}
                className={`px-2 py-1 text-xs border ${settings.azureArea === area ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                onClick={() => toggleArea(area)}
              >
                {area}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mb-2 relative" ref={groupRefs.iterations}>
        <div className="flex items-center flex-wrap" ref={pillRowRefs.iterations}>
          <div
            className="font-semibold cursor-pointer"
            onClick={() => toggleFilterGroup('iterations')}
          >
            Iterations
          </div>
          <div className="flex items-center flex-wrap ml-2 space-x-1 overflow-hidden">
            {settings.azureIteration && (
              <span className="px-2 py-1 text-xs border rounded-full bg-gray-200 dark:bg-gray-700 flex items-center">
                {settings.azureIteration}
                <button className="ml-1" onClick={() => toggleIteration(settings.azureIteration)}>
                  x
                </button>
              </span>
            )}
          </div>
        </div>
        {activeFilterGroup === 'iterations' && (
          <div className="absolute left-0 mt-1 bg-white dark:bg-gray-800 border p-2 z-10 flex flex-wrap gap-1">
            <button
              className={`px-2 py-1 text-xs border ${settings.azureIteration === '' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
              onClick={() => {
                // Reset iteration filter locally without refetching.
                updateSettings({ azureIteration: '' });
              }}
            >
              All
            </button>
            {availableIterations.map((it) => (
              <button
                key={it}
                className={`px-2 py-1 text-xs border ${settings.azureIteration === it ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                onClick={() => toggleIteration(it)}
              >
                {it}
              </button>
            ))}
          </div>
        )}
      </div>
      <div
        ref={treeRef}
        onDragOver={handleTreeDragOver}
        className="flex-grow overflow-y-auto space-y-2 scroll-container min-h-0"
      >
        {Object.entries(grouped).map(([project, list]) => {
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
            const firstTree = buildTree(list);
            const first = firstTree[0];
            if (first) {
              onNoteDrop && onNoteDrop(first.id, note);
            }
          };
          return (
            <div key={project} className="">
              <div
                className="px-2 py-1 cursor-pointer font-semibold"
                style={{ backgroundColor: projectColors[project] || undefined }}
                onClick={() => toggle(project)}
              >
                {project}
              </div>
              {!collapsed[project] && (
                <div
                  className="mt-1 ml-2 bg-white dark:bg-gray-800 border p-1"
                  onDragOver={allowGroupDrop}
                  onDrop={handleGroupDrop}
                >
                  {renderTree(
                    buildTree(list),
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  </div>
  );
}