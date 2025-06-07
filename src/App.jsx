import React from 'react';
import Calendar from './components/Calendar';
import TaskList from './components/TaskList';
import HoursSummary from './components/HoursSummary';
import WorkItems from './components/WorkItems';
import useWorkBlocks from './hooks/useWorkBlocks';

function App() {
  const { blocks, setBlocks } = useWorkBlocks();

  const addBlock = (block) => {
    setBlocks([...blocks, block]);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Calendar-Ado MVP</h1>
      <TaskList />
      <HoursSummary blocks={blocks} />
      <WorkItems />
      <Calendar blocks={blocks} onAdd={addBlock} />
    </div>
  );
}

export default App;
