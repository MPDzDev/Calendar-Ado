import React, { useState, useRef, useEffect } from 'react';
import ItemBubble from './ItemBubble';

export default function Calendar({
  blocks,
  onAdd,
  settings,
  onDelete,
  weekStart,
  onUpdate,
  onTimeChange,
  items,
}) {
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const days = settings.workDays;
  const weekDates = days.map((d) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + d);
    return date;
  });
  const hours = Array.from(
    { length: settings.endHour - settings.startHour },
    (_, i) => (i + settings.startHour).toString().padStart(2, '0')
  );
  const hourHeight = 40; // px height for each hour block
  const blockMinutes = settings.blockMinutes || 15;
  const [activeDay, setActiveDay] = useState(null);
  const [form, setForm] = useState({
    start: `${String(settings.startHour).padStart(2, '0')}:00`,
    end: `${String(settings.startHour + 1).padStart(2, '0')}:00`,
    note: '',
    workItem: '',
  });
  const [drag, setDrag] = useState(null); // { day, start, end }
  const [hoveredId, setHoveredId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [taskSelect, setTaskSelect] = useState(null); // {blockId, parent, tasks}
  const [blockDrag, setBlockDrag] = useState(null); // {id, mode, startRel, endRel, dayIndex, rects, minuteHeight, offsetY}
  const dayRefs = useRef({});

  const findItem = (id) => items?.find((i) => i.id === id);
  const getDescendantTasks = (id) => {
    const tasks = [];
    const stack = items?.filter((i) => i.parentId === id) || [];
    while (stack.length) {
      const cur = stack.pop();
      if (cur.type?.toLowerCase() === 'task') tasks.push(cur);
      stack.push(...(items?.filter((i) => i.parentId === cur.id) || []));
    }
    return tasks;
  };
  const findDisplayItem = (item) => {
    if (item.type?.toLowerCase() !== 'task') return item;
    let cur = item;
    while (cur.parentId) {
      const parent = findItem(cur.parentId);
      if (!parent) break;
      if (parent.type?.toLowerCase() !== 'task') return parent;
      cur = parent;
    }
    return item;
  };

  const addBlock = (e) => {
    e.preventDefault();
    if (activeDay === null) return;
    const startDate = new Date(weekStart);
    startDate.setDate(weekStart.getDate() + parseInt(activeDay));
    const endDate = new Date(startDate);
    startDate.setHours(parseInt(form.start.split(':')[0]), parseInt(form.start.split(':')[1]));
    endDate.setHours(parseInt(form.end.split(':')[0]), parseInt(form.end.split(':')[1]));
    onAdd({
      id: Date.now(),
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      note: form.note,
      workItem: form.workItem,
      itemId: null,
    });
    setForm({
      start: `${String(settings.startHour).padStart(2, '0')}:00`,
      end: `${String(settings.startHour + 1).padStart(2, '0')}:00`,
      note: '',
      workItem: '',
    });
    setActiveDay(null);
  };

  const startDrag = (e, dayIdx) => {
    // ignore drags that originate from interactive elements or existing blocks
    if (
      e.target.closest('button') ||
      e.target.closest('input') ||
      e.target.closest('form') ||
      e.target.closest('.work-block')
    ) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const minuteHeight = rect.height / (hours.length * 60);
    const rawStart = (e.clientY - rect.top) / minuteHeight;
    const start = Math.max(0, Math.floor(rawStart / blockMinutes) * blockMinutes);
    setDrag({ day: dayIdx, start, end: start + blockMinutes, rect, minuteHeight });
  };

  const onDrag = (e) => {
    if (!drag) return;
    const y = Math.max(0, Math.min(e.clientY - drag.rect.top, drag.rect.height));
    const cur = Math.floor(y / drag.minuteHeight / blockMinutes) * blockMinutes + blockMinutes;
    const maxMinutes = hours.length * 60;
    const end = Math.min(maxMinutes, Math.max(cur, drag.start + blockMinutes));
    if (end !== drag.end) setDrag({ ...drag, end });
  };

  const endDrag = (dayIdx) => {
    if (!drag) return;
    if (drag.day !== dayIdx) {
      setDrag(null);
      return;
    }
    const startDate = new Date(weekStart);
    startDate.setDate(weekStart.getDate() + dayIdx);
    const endDate = new Date(startDate);
    startDate.setHours(
      settings.startHour + Math.floor(drag.start / 60),
      drag.start % 60,
      0,
      0
    );
    endDate.setHours(
      settings.startHour + Math.floor(drag.end / 60),
      drag.end % 60,
      0,
      0
    );
    onAdd({ id: Date.now(), start: startDate.toISOString(), end: endDate.toISOString(), note: '', workItem: '' });
    setDrag(null);
  };

  const startBlockDrag = (e, block, dayIdx) => {
    if (
      e.target.closest('button') ||
      e.target.closest('input') ||
      e.target.closest('form')
    ) {
      return;
    }
    e.preventDefault();
    const rects = days.map((d) => dayRefs.current[d].getBoundingClientRect());
    const minuteHeight = rects[dayIdx].height / (hours.length * 60);
    const bounds = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - bounds.top;
    let mode = 'move';
    if (offsetY < 5) mode = 'resize-top';
    else if (offsetY > bounds.height - 5) mode = 'resize-bottom';
    const start = new Date(block.start);
    const end = new Date(block.end);
    const startRel = start.getHours() * 60 + start.getMinutes() - settings.startHour * 60;
    const endRel = end.getHours() * 60 + end.getMinutes() - settings.startHour * 60;
    setBlockDrag({
      id: block.id,
      mode,
      startRel,
      endRel,
      dayIndex: days.indexOf(dayIdx),
      rects,
      minuteHeight,
      offsetY,
    });
  };

  useEffect(() => {
    if (!blockDrag) return;
    const move = (e) => {
      let dayIndex = blockDrag.dayIndex;
      for (let i = 0; i < blockDrag.rects.length; i++) {
        const r = blockDrag.rects[i];
        if (e.clientX >= r.left && e.clientX <= r.right) {
          dayIndex = i;
          break;
        }
      }

      const rect = blockDrag.rects[dayIndex];
      let startRel = blockDrag.startRel;
      let endRel = blockDrag.endRel;

      if (blockDrag.mode === 'move') {
        const pos =
          e.clientY - rect.top - blockDrag.offsetY;
        const raw = Math.floor(pos / blockDrag.minuteHeight / blockMinutes) * blockMinutes;
        const length = endRel - startRel;
        startRel = Math.min(Math.max(0, raw), hours.length * 60 - length);
        endRel = startRel + length;
      } else if (blockDrag.mode === 'resize-top') {
        const pos = e.clientY - rect.top;
        startRel = Math.floor(pos / blockDrag.minuteHeight / blockMinutes) * blockMinutes;
        if (startRel < 0) startRel = 0;
        if (endRel - startRel < blockMinutes) startRel = endRel - blockMinutes;
      } else if (blockDrag.mode === 'resize-bottom') {
        const pos = e.clientY - rect.top;
        endRel = Math.floor(pos / blockDrag.minuteHeight / blockMinutes) * blockMinutes;
        const max = hours.length * 60;
        if (endRel > max) endRel = max;
        if (endRel - startRel < blockMinutes) endRel = startRel + blockMinutes;
      }

      setBlockDrag({ ...blockDrag, startRel, endRel, dayIndex });
    };

    const up = () => {
      const startAbs = blockDrag.startRel + settings.startHour * 60;
      const endAbs = blockDrag.endRel + settings.startHour * 60;
      const dayIdx = days[blockDrag.dayIndex];
      const startDate = new Date(weekStart);
      startDate.setDate(weekStart.getDate() + dayIdx);
      startDate.setHours(Math.floor(startAbs / 60), startAbs % 60, 0, 0);
      const endDate = new Date(weekStart);
      endDate.setDate(weekStart.getDate() + dayIdx);
      endDate.setHours(Math.floor(endAbs / 60), endAbs % 60, 0, 0);
      if (onTimeChange)
        onTimeChange(blockDrag.id, startDate.toISOString(), endDate.toISOString());
      setBlockDrag(null);
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [blockDrag, blockMinutes, days, onTimeChange, settings.startHour, weekStart, hours.length]);

  const handleDrop = (e, blockId) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/x-work-item');
    if (!raw) return;
    const item = JSON.parse(raw);
    if (!item) return;
    if (item.type?.toLowerCase() === 'task') {
      const display = findDisplayItem(item);
      if (onUpdate)
        onUpdate(blockId, {
          workItem: display.title,
          taskId: item.id,
          itemId: display.id,
        });
    } else {
      const tasks = getDescendantTasks(item.id);
      if (tasks.length === 1) {
        if (onUpdate)
          onUpdate(blockId, {
            workItem: item.title,
            taskId: tasks[0].id,
            itemId: item.id,
          });
      } else if (tasks.length > 0) {
        setTaskSelect({ blockId, parent: item, tasks });
      }
    }
  };

  return (
    <div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
        {days.map((dayIdx, idx) => (
          <div
            key={dayIdx}
            ref={(el) => (dayRefs.current[dayIdx] = el)}
            className="border p-2 relative"
            onDoubleClick={(e) => {
              if (
                e.target.closest('button') ||
                e.target.closest('input') ||
                e.target.closest('form')
              ) {
                return;
              }
              setActiveDay(dayIdx);
            }}
          >
            <h2 className="font-semibold mb-2">
              {weekDays[dayIdx]} {weekDates[idx].getMonth() + 1}/{weekDates[idx].getDate()}
            </h2>
            <div
              className="relative select-none"
              style={{ height: `${hours.length * hourHeight}px` }}
              onMouseDown={(e) => startDrag(e, dayIdx)}
              onMouseMove={onDrag}
              onMouseUp={() => endDrag(dayIdx)}
            >
              <div className="absolute inset-0 pointer-events-none flex flex-col">
                {hours.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 border-t border-gray-200 text-[10px] text-gray-400"
                  >
                    {h}:00
                  </div>
                ))}
              </div>
              <div
                className="absolute left-0 right-0 bg-yellow-100 text-center text-xs pointer-events-none"
                style={{
                  top: (settings.lunchStart - settings.startHour) * hourHeight,
                  height: (settings.lunchEnd - settings.lunchStart) * hourHeight,
                  lineHeight: `${(settings.lunchEnd - settings.lunchStart) * hourHeight}px`,
                }}
              >
                Lunch
              </div>
              <div className="relative z-10 w-full h-full">
                {blocks
                  .filter((b) => {
                    if (blockDrag && blockDrag.id === b.id) {
                      return days[blockDrag.dayIndex] === dayIdx;
                    }
                    const date = new Date(b.start);
                    const dayDate = new Date(weekStart);
                    dayDate.setDate(weekStart.getDate() + dayIdx);
                    return date.toDateString() === dayDate.toDateString();
                  })
                  .map((b) => {
                    const start = new Date(b.start);
                    const end = new Date(b.end);
                    let startMinutes = start.getHours() * 60 + start.getMinutes();
                    let endMinutes = end.getHours() * 60 + end.getMinutes();
                    if (blockDrag && blockDrag.id === b.id) {
                      startMinutes = settings.startHour * 60 + blockDrag.startRel;
                      endMinutes = settings.startHour * 60 + blockDrag.endRel;
                    }
                    const top =
                      (startMinutes - settings.startHour * 60) * (hourHeight / 60);
                    const height = (endMinutes - startMinutes) * (hourHeight / 60);
                    const highlight = hoveredId === b.id;
                    return (
                      <div
                        key={b.id}
                        onMouseEnter={() => setHoveredId(b.id)}
                        onMouseLeave={(e) => {
                          setHoveredId(null);
                          if (confirmDeleteId !== b.id) setConfirmDeleteId(null);
                          e.currentTarget.style.cursor = 'default';
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, b.id)}
                        onMouseDown={(e) => startBlockDrag(e, b, dayIdx)}
                        onMouseMove={(e) => {
                          const bounds = e.currentTarget.getBoundingClientRect();
                          const offsetY = e.clientY - bounds.top;
                          if (offsetY < 5 || offsetY > bounds.height - 5) {
                            e.currentTarget.style.cursor = 'ns-resize';
                          } else {
                            e.currentTarget.style.cursor = 'move';
                          }
                        }}
                        className={`work-block absolute left-0 right-0 p-1 border rounded-md overflow-hidden select-none text-[10px] leading-tight ${b.taskId ? 'bg-blue-200 dark:bg-blue-800 border-blue-300 dark:border-blue-500' : 'bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500'} ${b.taskId && b.itemId ? 'border-yellow-400' : ''} ${highlight ? 'ring-2 ring-blue-400' : ''}`}
                        style={{ top: `${top}px`, height: `${height}px` }}
                      >
                        <div className="text-[10px]">
                          {(() => {
                            const d = new Date(start);
                            if (blockDrag && blockDrag.id === b.id) {
                              d.setHours(
                                settings.startHour + Math.floor(blockDrag.startRel / 60),
                                blockDrag.startRel % 60,
                                0,
                                0
                              );
                            }
                            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          })()}{' '}
                          -{' '}
                          {(() => {
                            const d = new Date(end);
                            if (blockDrag && blockDrag.id === b.id) {
                              d.setHours(
                                settings.startHour + Math.floor(blockDrag.endRel / 60),
                                blockDrag.endRel % 60,
                                0,
                                0
                              );
                            }
                            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          })()}
                        </div>
                        <div className="text-[10px] flex flex-wrap items-center gap-1">
                          {b.itemId && <ItemBubble item={findItem(b.itemId)} />}
                          {b.note}
                        </div>
                        {highlight && confirmDeleteId !== b.id && (
                          <button
                          className="absolute bottom-0 right-0 p-1 text-red-600 text-xs bg-yellow-50 dark:bg-gray-800"
                            onClick={() => setConfirmDeleteId(b.id)}
                          >
                            🗑
                          </button>
                        )}
                        {confirmDeleteId === b.id && (
                          <div className="absolute bottom-0 right-0 flex space-x-1 text-xs">
                            <button
                              className="px-1 bg-red-500 text-white"
                              onClick={() => {
                                if (onDelete) onDelete(b.id);
                                setConfirmDeleteId(null);
                                setHoveredId(null);
                              }}
                            >
                              Confirm?
                            </button>
                            <button
                              className="px-1 bg-gray-300 dark:bg-gray-600"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              x
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                {activeDay === dayIdx && (
                  <form
                    onSubmit={addBlock}
                    className="absolute top-0 left-0 bg-yellow-50 dark:bg-gray-800 border p-2 space-y-1 z-20"
                  >
                    <input
                      type="time"
                      step={blockMinutes * 60}
                      value={form.start}
                      onChange={(e) => setForm({ ...form, start: e.target.value })}
                      className="border"
                    />
                    <input
                      type="time"
                      step={blockMinutes * 60}
                      value={form.end}
                      onChange={(e) => setForm({ ...form, end: e.target.value })}
                      className="border"
                    />
                    <input
                      type="text"
                      placeholder="Work item"
                      value={form.workItem}
                      onChange={(e) =>
                        setForm({ ...form, workItem: e.target.value })
                      }
                      className="border"
                    />
                    <input
                      type="text"
                      placeholder="Note"
                      value={form.note}
                      onChange={(e) => setForm({ ...form, note: e.target.value })}
                      className="border"
                    />
                    <div className="flex space-x-1">
                      <button
                        type="submit"
                        className="px-2 py-1 bg-blue-500 text-white text-xs"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveDay(null)}
                        className="px-2 py-1 bg-gray-300 dark:bg-gray-600 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
              {drag && drag.day === dayIdx && (
                <div
                  className="absolute left-0 right-0 bg-blue-300 opacity-50 pointer-events-none"
                  style={{
                    top: drag.start * drag.minuteHeight,
                    height: (drag.end - drag.start) * drag.minuteHeight,
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
      {taskSelect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-yellow-50 dark:bg-gray-800 dark:text-white p-4 max-h-64 overflow-y-auto">
            <h3 className="font-semibold mb-2">Select Task for {taskSelect.parent.title}</h3>
            <ul>
              {taskSelect.tasks.map((t) => (
                <li
                  key={t.id}
                  className="p-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                  onClick={() => {
                    if (onUpdate)
                      onUpdate(taskSelect.blockId, {
                        workItem: taskSelect.parent.title,
                        taskId: t.id,
                        itemId: taskSelect.parent.id,
                      });
                    setTaskSelect(null);
                  }}
                >
                  {t.id} {t.title}
                </li>
              ))}
            </ul>
            <button className="mt-2 px-2 py-1 bg-gray-300 dark:bg-gray-600" onClick={() => setTaskSelect(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
