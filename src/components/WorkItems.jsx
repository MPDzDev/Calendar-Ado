import React, { useState } from 'react';
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

export default function WorkItems({ items }) {

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = items.filter((i) => {
    const matchesSearch = i.title
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesType =
      typeFilter === 'all' ||
      i.type?.toLowerCase() === typeFilter;
    return matchesSearch && matchesType;
  });

  const tree = buildTree(filtered);

  return (
    <div className="mb-4">
      <h2 className="font-semibold">Work Items</h2>
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
      <div>{renderTree(tree)}</div>
    </div>
  );
}
