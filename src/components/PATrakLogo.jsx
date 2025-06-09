import React, { useEffect, useState } from 'react';

export default function PATrakLogo({ className = '' }) {
  const [stage, setStage] = useState('done');

  useEffect(() => {
    const timers = [];
    function cycle() {
      const delay = 15000 + Math.random() * 15000; // 15-30s between animations
      timers.push(
        setTimeout(() => {
          setStage('start');
          timers.push(setTimeout(() => setStage('break'), 300));
          timers.push(
            setTimeout(() => {
              setStage('done');
              cycle();
            }, 900)
          );
        }, delay)
      );
    }
    cycle();
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className={`relative inline-block w-[120px] h-[60px] ${className}`}
    >
      {/* Stem of Y */}
      <div
        className={`absolute top-[50%] left-[50%] h-[40px] w-[3px] bg-current transform origin-top ${
          stage !== 'start' ? 'opacity-0' : ''
        }`}
        style={{ transform: 'translate(-50%, -10%)' }}
      />

      {/* Left arm of Y */}
      <div
        className={`absolute top-[25%] left-[50%] w-[3px] h-[30px] bg-current transform origin-bottom ${
          stage === 'start' ? 'animate-flipY' : stage === 'break' ? 'animate-breakLeft' : 'hidden'
        }`}
        style={{ transform: 'translate(-60%, 0%) rotate(-45deg)' }}
      />

      {/* Right arm of Y */}
      <div
        className={`absolute top-[25%] left-[50%] w-[3px] h-[30px] bg-current transform origin-bottom ${
          stage === 'start' ? 'animate-flipY' : stage === 'break' ? 'animate-breakRight' : 'hidden'
        }`}
        style={{ transform: 'translate(60%, 0%) rotate(45deg)' }}
      />

      {/* PATrak label */}
      {stage === 'done' && (
        <div className="absolute inset-0 flex items-center justify-center font-bold text-2xl tracking-wide select-none">
          <span className="text-[#38bdf8]">PA</span>
          <span className="relative">
            <span className="inline-block w-[3px] h-[20px] bg-current absolute top-2 left-[6px] rotate-90 origin-left" />
            <span>Trak</span>
          </span>
        </div>
      )}
    </div>
  );
}
