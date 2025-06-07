import React from 'react';
import Calendar from './components/Calendar';
import HoursSummary from './components/HoursSummary';
import WorkItems from './components/WorkItems';
import Settings from './components/Settings';
import useWorkBlocks from './hooks/useWorkBlocks';
import useSettings from './hooks/useSettings';

function App() {
  const { blocks, setBlocks } = useWorkBlocks();
  const { settings, setSettings } = useSettings();

  const hasOverlap = (newBlock) => {
    const newStart = new Date(newBlock.start);
    const newEnd = new Date(newBlock.end);
    return blocks.some((b) => {
      const start = new Date(b.start);
      const end = new Date(b.end);
      return newStart < end && newEnd > start;
    });
  };

  const adjustForOverlap = (newBlock) => {
    let start = new Date(newBlock.start);
    let end = new Date(newBlock.end);
    const duration = end - start;
    const sorted = [...blocks].sort(
      (a, b) => new Date(a.start) - new Date(b.start)
    );
    for (const b of sorted) {
      const bStart = new Date(b.start);
      const bEnd = new Date(b.end);
      if (start < bEnd && end > bStart) {
        start = new Date(bEnd);
        end = new Date(start.getTime() + duration);
      }
    }
    return { ...newBlock, start: start.toISOString(), end: end.toISOString() };
  };

  const addBlock = (block) => {
    let adjusted = hasOverlap(block) ? adjustForOverlap(block) : block;
    while (hasOverlap(adjusted)) {
      adjusted = adjustForOverlap(adjusted);
    }
    setBlocks((prev) => [...prev, adjusted]);
  };

  const deleteBlock = (id) => {
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Calendar-Ado MVP</h1>
      <Settings settings={settings} setSettings={setSettings} />
      <HoursSummary blocks={blocks} />
      <WorkItems />
      <Calendar blocks={blocks} onAdd={addBlock} settings={settings} onDelete={deleteBlock} />
    </div>
  );
}

export default App;
