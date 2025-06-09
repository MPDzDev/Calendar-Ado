import React, { useEffect, useState } from 'react';

export default function PatrakLogo({ className = '' }) {
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    let rotateTimeout;
    let scheduleTimeout;

    const schedule = () => {
      scheduleTimeout = setTimeout(() => {
        setRotating(true);
        rotateTimeout = setTimeout(() => {
          setRotating(false);
          schedule();
        }, 2000);
      }, 15000);
    };

    schedule();
    return () => {
      clearTimeout(rotateTimeout);
      clearTimeout(scheduleTimeout);
    };
  }, []);

  return (
    <h1 className={`text-3xl font-bold mb-4 font-oswald ${className}`}>
      <span className="logo-letter text-blue-500">P</span>
      <span className="logo-letter text-blue-500">A</span>
      <span className="logo-letter">T</span>
      <span className="logo-letter">R</span>
      <span className={`logo-letter ${rotating ? 'rotate-a' : ''}`}>A</span>
      <span className="logo-letter">K</span>
    </h1>
  );
}
