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

  const addBlock = (block) => {
    setBlocks([...blocks, block]);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Calendar-Ado MVP</h1>
      <Settings settings={settings} setSettings={setSettings} />
      <HoursSummary blocks={blocks} />
      <WorkItems />
      <Calendar blocks={blocks} onAdd={addBlock} settings={settings} />
    </div>
  );
}

export default App;
