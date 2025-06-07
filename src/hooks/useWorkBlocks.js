import { useState } from 'react';

export default function useWorkBlocks() {
  const [blocks, setBlocks] = useState([]);

  return {
    blocks,
    setBlocks,
  };
}
