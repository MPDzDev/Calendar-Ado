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

  const addBlock = (block) => {
    if (hasOverlap(block)) {
      alert('Cannot create overlapping work blocks.');
      return;
    }
    setBlocks((prev) => [...prev, block]);
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
