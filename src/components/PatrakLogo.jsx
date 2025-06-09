import React, { useEffect, useState } from 'react';

export default function PatrakLogo({ className = '' }) {
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    let flipTimeout;
    let scheduleTimeout;

    const schedule = () => {
      scheduleTimeout = setTimeout(() => {
        setFlipping(true);
        flipTimeout = setTimeout(() => {
          setFlipping(false);
          schedule();
        }, 2300);
      }, 15000);
    };

    schedule();
    return () => {
      clearTimeout(flipTimeout);
      clearTimeout(scheduleTimeout);
    };
  }, []);

  return (
    <h1 className={`text-2xl font-bold mb-4 font-oswald ${className}`}>
      <span className="logo-letter">P</span>
      <span className="logo-letter">A</span>
      <span className="logo-letter">T</span>
      <span className="logo-letter">R</span>
      <span className={`logo-letter ${flipping ? 'flip-a' : ''}`}>A</span>
      <span className="logo-letter">K</span>
    </h1>
  );
}
