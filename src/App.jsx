import React from 'react';
import Calendar from './components/Calendar';
import HoursSummary from './components/HoursSummary';
import WorkItems from './components/WorkItems';
import useWorkBlocks from './hooks/useWorkBlocks';

function App() {
  const { blocks, setBlocks } = useWorkBlocks();

  const addBlock = (block) => {
    setBlocks([...blocks, block]);
  };

  const deleteBlock = (id) => {
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Calendar-Ado MVP</h1>
      <HoursSummary blocks={blocks} />
      <WorkItems />
      <Calendar blocks={blocks} onAdd={addBlock} onDelete={deleteBlock} />
    </div>
  );
}

export default App;
