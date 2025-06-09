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
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-6xl tracking-wide">
            <div>
              <span className="text-[#38bdf8]">PA</span>
              <span className="relative">
                <span className="inline-block w-[6px] h-[40px] bg-white absolute top-3 left-[8px] rotate-90 origin-left" />
                <span>Trak</span>
              </span>
            </div>
            <p className="text-lg mt-2">Personal Assistance Tracker</p>
          </div>
        )}
      </div>
    </div>
  );
}
