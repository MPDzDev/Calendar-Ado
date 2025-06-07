import React, { useEffect } from 'react';
import AdoService from '../services/adoService';
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

export default function WorkItems({ items, setItems }) {
  useEffect(() => {
    if (items.length === 0) {
      const service = new AdoService();
      service.getWorkItems().then(setItems);
    }
  }, [items, setItems]);

  const tree = buildTree(items);

  return (
    <div className="mb-4">
      <h2 className="font-semibold">Work Items</h2>
      <div>{renderTree(tree)}</div>
    </div>
  );
}
