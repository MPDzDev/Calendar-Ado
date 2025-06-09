import React, { useEffect, useState } from 'react';

export default function PATrakLoading() {
  const [stage, setStage] = useState('start');

  useEffect(() => {
    const t1 = setTimeout(() => setStage('break'), 1000);
    const t2 = setTimeout(() => setStage('done'), 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="w-full h-screen flex items-center justify-center bg-black text-white font-mono text-5xl relative overflow-hidden">
      <div className="relative w-[200px] h-[200px]">
        {/* Stem of Y */}
        <div
          className={`absolute top-[50%] left-[50%] h-[80px] w-[6px] bg-white transform origin-top ${
            stage !== 'start' ? 'opacity-0' : ''
          }`}
          style={{ transform: 'translate(-50%, -10%)' }}
        />

        {/* Left arm of Y */}
        <div
          className={`absolute top-[30%] left-[50%] w-[6px] h-[60px] bg-white transform origin-bottom ${
            stage === 'start' ? 'animate-flipY' : stage === 'break' ? 'animate-breakLeft' : 'hidden'
          }`}
          style={{ transform: 'translate(-60%, 0%) rotate(-45deg)' }}
        />

        {/* Right arm of Y */}
        <div
          className={`absolute top-[30%] left-[50%] w-[6px] h-[60px] bg-white transform origin-bottom ${
            stage === 'start' ? 'animate-flipY' : stage === 'break' ? 'animate-breakRight' : 'hidden'
          }`}
          style={{ transform: 'translate(60%, 0%) rotate(45deg)' }}
        />

        {/* PATrak logo */}
        {stage === 'done' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <svg
              className="w-[180px] h-[80px]"
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
                {/* r */}
                <path d="M102 32v24" />
                <path d="M102 32q6-8 12 0" />
                {/* a */}
                <circle cx="126" cy="46" r="8" />
                <path d="M134 46v10" />
                {/* k */}
                <path d="M144 4v52" />
                <path d="M144 32l10-28" />
                <path d="M144 32l10 24" />
              </g>
            </svg>
            <p className="text-lg mt-2">Personal Assistance Tracker</p>
          </div>
        )}
      </div>
    </div>
  );
}
