import React from 'react';

const TYPE_ACCENTS = {
  epic: '#f5cba7',
  feature: '#d7c6f6',
  'user story': '#cce5ff',
  bug: '#f7c4c4',
  task: '#fae3a7',
  'transversal activity': '#cbe9d8',
};

function TaskPill({
  task,
  notes = [],
  onNoteDrop,
  onItemDrop,
  onOpen,
  highlight = false,
}) {
  const accent = TYPE_ACCENTS.task || '#facc15';
  const dragStart = (e) => {
    e.dataTransfer.setData('application/x-work-item', JSON.stringify(task));
  };
  const allowDrop = (e) => {
    if (
      e.dataTransfer.types.includes('application/x-note') ||
      e.dataTransfer.types.includes('application/x-work-item')
    ) {
      e.preventDefault();
    }
  };
  const handleDrop = (e) => {
    const noteRaw = e.dataTransfer.getData('application/x-note');
    const itemRaw = e.dataTransfer.getData('application/x-work-item');
    if (noteRaw) {
      e.preventDefault();
      const note = JSON.parse(noteRaw);
      onNoteDrop && onNoteDrop(task.id, note);
    } else if (itemRaw) {
      e.preventDefault();
      const dragged = JSON.parse(itemRaw);
      onItemDrop && onItemDrop(task, dragged);
    }
  };
  const handleDoubleClick = (e) => {
    e.stopPropagation();
    onOpen && onOpen(task);
  };
  return (
    <div
      className={`task-pill ${highlight ? 'task-pill-highlight' : ''}`}
      draggable
      onDragStart={dragStart}
      onDragOver={allowDrop}
      onDrop={handleDrop}
      onDoubleClick={handleDoubleClick}
      style={{ backgroundColor: accent }}
      title={task.title}
    >
      <span className="task-pill-title">{task.title}</span>
      {notes.length > 0 && <span className="task-pill-note">{notes.length}</span>}
    </div>
  );
}

export default function WorkItem({
  item,
  notes = [],
  onNoteDrop,
  onItemDrop,
  highlight = false,
  onOpen,
  collapsible = false,
  collapsed = false,
  onToggle,
  childTasks = [],
}) {
  const type = item.type?.toLowerCase() || 'work item';
  const accent = TYPE_ACCENTS[type] || '#94a3b8';
  const textColor = '#0f172a';

  const dragStart = (e) => {
    e.dataTransfer.setData('application/x-work-item', JSON.stringify(item));
  };

  const allowDrop = (e) => {
    if (
      e.dataTransfer.types.includes('application/x-note') ||
      e.dataTransfer.types.includes('application/x-work-item')
    ) {
      e.preventDefault();
    }
  };

  const handleDrop = (e) => {
    const noteRaw = e.dataTransfer.getData('application/x-note');
    const itemRaw = e.dataTransfer.getData('application/x-work-item');
    if (noteRaw) {
      e.preventDefault();
      const note = JSON.parse(noteRaw);
      onNoteDrop && onNoteDrop(item.id, note);
    } else if (itemRaw) {
      e.preventDefault();
      const dragged = JSON.parse(itemRaw);
      onItemDrop && onItemDrop(item, dragged);
    }
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (onOpen) onOpen(item);
  };

  const handleToggle = (e) => {
    if (!collapsible) return;
    e.preventDefault();
    e.stopPropagation();
    onToggle && onToggle();
  };

  const highlightClass = highlight ? 'tree-pill-highlight' : '';

  if (type === 'task') {
    return (
      <TaskPill
        task={item}
        notes={notes}
        onNoteDrop={onNoteDrop}
        onItemDrop={onItemDrop}
        onOpen={onOpen}
        highlight={highlight}
      />
    );
  }

  return (
    <div className="tree-pill-wrapper">
      <div
        draggable
        onDragStart={dragStart}
        onDragOver={allowDrop}
        onDrop={handleDrop}
        onDoubleClick={handleDoubleClick}
        className={`tree-pill ${highlightClass}`}
        style={{ backgroundColor: accent, borderColor: accent, color: textColor }}
        title={item.title}
      >
        {collapsible ? (
          <button
            type="button"
            className={`tree-pill-toggle ${collapsed ? '' : 'rotate-90'}`}
            aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${item.title}`}
            onClick={handleToggle}
          >
            <svg
              width="12"
              height="12"
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
          </button>
        ) : (
          <span className="tree-pill-dot" style={{ backgroundColor: textColor }} />
        )}
        <span className="tree-pill-title">{item.title}</span>
      </div>
      {!collapsed && childTasks.length > 0 && (
        <div className="tree-task-row">
          {childTasks.map((task) => (
            <TaskPill
              key={task.item.id}
              task={task.item}
              notes={task.notes}
              onNoteDrop={onNoteDrop}
              onItemDrop={onItemDrop}
              onOpen={onOpen}
              highlight={task.highlight}
            />
          ))}
        </div>
      )}
      {!collapsed && notes.length > 0 && (
        <div className="tree-note-row">
          {notes.map((n, idx) => (
            <span key={idx} className="tree-note-chip">
              {n}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
