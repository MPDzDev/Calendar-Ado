import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import WorkItem from './WorkItem';

function buildTree(items) {
  const map = new Map();
  items.forEach((item) => {
    map.set(item.id, { ...item, children: [] });
  });
  const roots = [];
  map.forEach((item) => {
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId).children.push(item);
    } else {
      roots.push(item);
    }
  });
  return roots;
}

function renderTree(nodes, level = 0, onNoteDrop, notesMap, highlightIds) {
  return nodes.map((node) => {
    const isFeature = node.type?.toLowerCase() === 'feature';
    const containerClass = isFeature ? 'inline-block' : '';
    return (
      <div key={node.id} className={containerClass}>
        <WorkItem
          item={node}
          level={level}
          notes={notesMap[node.id] || []}
          onNoteDrop={onNoteDrop}
          highlight={highlightIds?.has(node.id)}
        />
        {node.children.length > 0 &&
          renderTree(node.children, level + 1, onNoteDrop, notesMap, highlightIds)}
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
}) {

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [collapsed, setCollapsed] = useState({});
  const [stateCollapsed, setStateCollapsed] = useState({});
  const [activeFilterGroup, setActiveFilterGroup] = useState(null);

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
    acc[project] = {};
    return acc;
  }, {});

  filtered.forEach((item) => {
    const projectKey = item.project || 'Unknown';
    let stateKey = item.state || 'Unknown';
    if (
      item.type?.toLowerCase() === 'task' &&
      item.parentId &&
      itemMap.has(item.parentId)
    ) {
      const parent = itemMap.get(item.parentId);
      stateKey = parent.state || stateKey;
    }
    if (!grouped[projectKey][stateKey]) grouped[projectKey][stateKey] = [];
    grouped[projectKey][stateKey].push(item);
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
    const stateKeys = [];
    keys.forEach((project) => {
      Object.keys(grouped[project]).forEach((state) => {
        stateKeys.push(`${project}|${state}`);
      });
    });
    setStateCollapsed((prev) => {
      const next = { ...prev };
      stateKeys.forEach((k) => {
        if (!(k in next)) next[k] = false;
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

  const toggleState = (project, state) => {
    const key = `${project}|${state}`;
    setStateCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
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

  return (
    <div className="mb-4 flex flex-col flex-grow overflow-y-auto min-h-0">
      <div className="sticky top-0 bg-white dark:bg-gray-800 pb-2">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold">Work Items</h2>
          {onRefresh && (
            <button
              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700"
              onClick={onRefresh}
            >
              Refresh
            </button>
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
            <option value="user story">User Stories</option>
            <option value="bug">Bugs</option>
            <option value="task">Tasks</option>
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
      <div className="flex-grow overflow-y-auto space-y-2 scroll-container min-h-0">
        {Object.entries(grouped).map(([project, states]) => {
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
            const firstState = Object.values(states)[0] || [];
            const firstTree = buildTree(firstState);
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
                  {Object.keys(states)
                    .sort((a, b) => {
                      const order = settings.stateOrder || [];
                      const ia = order.findIndex(
                        (s) => s.toLowerCase() === a.toLowerCase()
                      );
                      const ib = order.findIndex(
                        (s) => s.toLowerCase() === b.toLowerCase()
                      );
                      if (ia === -1 && ib === -1) return a.localeCompare(b);
                      if (ia === -1) return 1;
                      if (ib === -1) return -1;
                      return ia - ib;
                    })
                    .map((state) => {
                      const list = states[state];
                      const tree = buildTree(list);
                      const key = `${project}|${state}`;
                      const collapsedState = stateCollapsed[key];
                      return (
                        <div key={state} className="mb-2">
                          <div
                            className="font-semibold italic cursor-pointer flex items-center justify-between"
                            onClick={() => toggleState(project, state)}
                          >
                            <span>{state}</span>
                            <span>{collapsedState ? '▶' : '▼'}</span>
                          </div>
                          {!collapsedState &&
                            renderTree(tree, 0, onNoteDrop, itemNotes, highlightedIds)}
                        </div>
                      );
                    })}
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