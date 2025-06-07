import React, { useEffect } from 'react';
import useAdoItems from '../hooks/useAdoItems';
import AdoService from '../services/adoService';

export default function TaskList() {
  const { items, setItems } = useAdoItems();

  useEffect(() => {
    const service = new AdoService();
    service.getWorkItems().then(setItems);
  }, []);

  return (
    <div className="mb-4">
      <h2 className="font-semibold">Work Items</h2>
      <ul className="list-disc ml-4 text-xs space-y-1">
        {items.map((item) => (
          <li key={item.id} className="truncate">
            {item.id}: {item.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
