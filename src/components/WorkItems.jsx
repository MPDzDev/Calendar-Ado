import React, { useState, useEffect, useRef } from 'react';
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

function renderTree(nodes, level = 0, onNoteDrop, notesMap) {
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
        />
        {node.children.length > 0 &&
          renderTree(node.children, level + 1, onNoteDrop, notesMap)}
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
}) {

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [collapsed, setCollapsed] = useState({});
  const [activeFilterGroup, setActiveFilterGroup] = useState(null);

  const groupRefs = {
    tags: useRef(null),
    areas: useRef(null),
    iterations: useRef(null),
  };

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

    const matchesTags =
      settings.azureTags.length === 0 ||
      settings.azureTags.every((t) => (i.tags || []).includes(t));

    const matchesArea =
      !settings.azureArea ||
      (i.area || '').toLowerCase().startsWith(settings.azureArea.toLowerCase());

    const matchesIteration =
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

  const grouped = filtered.reduce((acc, item) => {
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
    if (!acc[projectKey]) acc[projectKey] = {};
    if (!acc[projectKey][stateKey]) acc[projectKey][stateKey] = [];
    acc[projectKey][stateKey].push(item);
    return acc;
  }, {});

  useEffect(() => {
    const keys = Object.keys(grouped);
    setCollapsed((prev) => {
      const next = { ...prev };
      keys.forEach((k) => {
        if (!(k in next)) next[k] = false;
      });
      return next;
    });
  }, [filtered]);

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
    updateSettings({ azureTags: tags });
    onRefresh && onRefresh();
  };

  const toggleArea = (area) => {
    const value = settings.azureArea === area ? '' : area;
    updateSettings({ azureArea: value });
    onRefresh && onRefresh();
  };

  const toggleIteration = (it) => {
    const value = settings.azureIteration === it ? '' : it;
    updateSettings({ azureIteration: value });
    onRefresh && onRefresh();
  };

  return (
    <div className="mb-4 flex flex-col flex-grow overflow-y-auto min-h-0">
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
        <div className="flex items-center">
          <div
            className="font-semibold cursor-pointer flex-grow"
            onClick={() => toggleFilterGroup('tags')}
          >
            Tags
          </div>
          {settings.azureTags.length > 0 && (
            <button
              className="ml-1 text-red-600 text-xs"
              onClick={() => {
                updateSettings({ azureTags: [] });
                onRefresh && onRefresh();
              }}
            >
              x
            </button>
          )}
        </div>
        {activeFilterGroup === 'tags' && (
          <div className="absolute left-0 mt-1 bg-white dark:bg-gray-800 border p-2 z-10 flex flex-wrap gap-1">
            <button
              className={`px-2 py-1 text-xs border ${settings.azureTags.length === 0 ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
              onClick={() => {
                updateSettings({ azureTags: [] });
                onRefresh && onRefresh();
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
        <div className="flex items-center">
          <div
            className="font-semibold cursor-pointer flex-grow"
            onClick={() => toggleFilterGroup('areas')}
          >
            Areas
          </div>
          {settings.azureArea && (
            <button
              className="ml-1 text-red-600 text-xs"
              onClick={() => {
                updateSettings({ azureArea: '' });
                onRefresh && onRefresh();
              }}
            >
              x
            </button>
          )}
        </div>
        {activeFilterGroup === 'areas' && (
          <div className="absolute left-0 mt-1 bg-white dark:bg-gray-800 border p-2 z-10 flex flex-wrap gap-1">
            <button
              className={`px-2 py-1 text-xs border ${settings.azureArea === '' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
              onClick={() => {
                updateSettings({ azureArea: '' });
                onRefresh && onRefresh();
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
        <div className="flex items-center">
          <div
            className="font-semibold cursor-pointer flex-grow"
            onClick={() => toggleFilterGroup('iterations')}
          >
            Iterations
          </div>
          {settings.azureIteration && (
            <button
              className="ml-1 text-red-600 text-xs"
              onClick={() => {
                updateSettings({ azureIteration: '' });
                onRefresh && onRefresh();
              }}
            >
              x
            </button>
          )}
        </div>
        {activeFilterGroup === 'iterations' && (
          <div className="absolute left-0 mt-1 bg-white dark:bg-gray-800 border p-2 z-10 flex flex-wrap gap-1">
            <button
              className={`px-2 py-1 text-xs border ${settings.azureIteration === '' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
              onClick={() => {
                updateSettings({ azureIteration: '' });
                onRefresh && onRefresh();
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
                      return (
                        <div key={state} className="mb-2">
                          <div className="font-semibold italic">{state}</div>
                          {renderTree(tree, 0, onNoteDrop, itemNotes)}
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
  );
}
