import React, { useState, useEffect } from 'react';
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

function renderTree(nodes, level = 0) {
  return nodes.map((node) => {
    const isFeature = node.type?.toLowerCase() === 'feature';
    const containerClass = isFeature ? 'inline-block' : '';
    return (
      <div key={node.id} className={containerClass}>
        <WorkItem item={node} level={level} />
        {node.children.length > 0 && renderTree(node.children, level + 1)}
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
}) {

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [collapsed, setCollapsed] = useState({});

  const updateSettings = (changes) =>
    setSettings((prev) => ({ ...prev, ...changes }));

  const filtered = items.filter((i) => {
    const matchesSearch = i.title
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesType =
      typeFilter === 'all' ||
      i.type?.toLowerCase() === typeFilter;
    return matchesSearch && matchesType;
  });

  const grouped = filtered.reduce((acc, item) => {
    const key = item.project || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
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
      <div className="flex flex-wrap gap-1 mb-2">
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
      <div className="flex flex-wrap gap-1 mb-2">
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
      <div className="flex flex-wrap gap-1 mb-2">
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
      <div className="flex-grow overflow-y-auto space-y-2 scroll-container min-h-0">
        {Object.entries(grouped).map(([project, list]) => {
          const tree = buildTree(list);
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
                <div className="mt-1 ml-2 bg-white dark:bg-gray-800 border p-1">
                  {renderTree(tree)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
