import React, { useEffect, useState } from 'react';

export default function PATrakLogo({ className = '' }) {
  const [stage, setStage] = useState('done');

  useEffect(() => {
    const timers = [];
    function cycle() {
      const delay = 2000 + Math.random() * 4000; // 2-6s between flips
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
        className={`absolute top-[50%] left-[80%] h-[40px] w-[3px] bg-current transform origin-top ${
          stage !== 'start' ? 'opacity-0' : ''
        }`}
        style={{ transform: 'translate(-50%, -10%)' }}
      />

      {/* Left arm of Y */}
      <div
        className={`absolute top-[25%] left-[80%] w-[3px] h-[30px] bg-current transform origin-bottom ${
          stage === 'start' ? 'animate-flipY' : stage === 'break' ? 'animate-breakLeft' : 'hidden'
        }`}
        style={{ transform: 'translate(-60%, 0%) rotate(-45deg)' }}
      />

      {/* Right arm of Y */}
      <div
        className={`absolute top-[25%] left-[80%] w-[3px] h-[30px] bg-current transform origin-bottom ${
          stage === 'start' ? 'animate-flipY' : stage === 'break' ? 'animate-breakRight' : 'hidden'
        }`}
        style={{ transform: 'translate(60%, 0%) rotate(45deg)' }}
      />

      {/* PATrak label */}
      {stage === 'done' && (
        <svg
          className="absolute inset-0"
          viewBox="0 0 150 60"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <g stroke="#38bdf8">
            {/* P */}
            <path d="M4 56V4h16v24H4z" />
            {/* A without crossbar */}
            <path d="M38 56L48 4l10 52" />
            {/* crossbar */}
            <line
              x1="42"
              y1="32"
              x2="54"
              y2="32"
              stroke="#38bdf8"
              className="origin-left rotate-90"
            />
          </g>
          <g>
            {/* T */}
            <path d="M70 4h20M80 4v52" />
            {/* R */}
            <path d="M102 56V4h16v24h-16l16 28" />
            {/* A */}
            <path d="M118 56L128 4l10 52" />
            <line
              x1="122"
              y1="32"
              x2="134"
              y2="32"
              className={`origin-center transition-transform ${stage === 'done' ? 'rotate-90' : 'rotate-0'}`}
            />
            {/* K */}
            <path d="M144 4v52" />
            <path d="M144 32l10-28" />
            <path d="M144 32l10 24" />
          </g>
        </svg>
      )}
    </div>
  );
}
