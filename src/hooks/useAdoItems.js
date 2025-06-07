import { useState } from 'react';

export default function useAdoItems() {
  const [items, setItems] = useState([]);

  return {
    items,
    setItems,
  };
}
