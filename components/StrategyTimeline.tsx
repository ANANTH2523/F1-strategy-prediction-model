import React from 'react';
import { StrategyAnalysis, TireCompound } from '../types';

interface StrategyTimelineProps {
  strategy: StrategyAnalysis;
  totalLaps: number;
}

const getTireInfo = (tire: TireCompound): { bg: string, text: string, name: string } => {
  const tireLower = tire.toLowerCase();
  if (tireLower === 'soft') {
    return { bg: 'bg-red-600', text: 'text-white', name: 'Soft' };
  }
  if (tireLower === 'medium') {
    return { bg: 'bg-yellow-400', text: 'text-black', name: 'Medium' };
  }
  if (tireLower === 'hard') {
    return { bg: 'bg-gray-200', text: 'text-black', name: 'Hard' };
  }
  if (tireLower === 'intermediate') {
    return { bg: 'bg-green-500', text: 'text-white', name: 'Inter' };
  }
  if (tireLower === 'wet') {
    return { bg: 'bg-blue-500', text: 'text-white', name: 'Wet' };
  }
  return { bg: 'bg-purple-500', text: 'text-white', name: 'Unknown' };
};


const StrategyTimeline: React.FC<StrategyTimelineProps> = ({ strategy, totalLaps }) => {
  const renderPlan = (plan: StrategyAnalysis['planA'] | StrategyAnalysis['planB']) => (
    <div>
      <h4 className="font-bold text-lg mb-3 text-gray-300">{plan.name}</h4>
      <div className="w-full bg-gray-700 rounded-full h-10 flex relative overflow-hidden border-2 border-gray-600">
        {plan.stints.map((stint, index) => {
          const width = ((stint.endLap - stint.startLap + 1) / totalLaps) * 100;
          const tireInfo = getTireInfo(stint.tireCompound);
          return (
            <div
              key={index}
              className={`h-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${tireInfo.bg} ${tireInfo.text}`}
              style={{ width: `${width}%` }}
              title={`Laps ${stint.startLap}-${stint.endLap} on ${stint.tireCompound}`}
            >
              <span className="hidden sm:inline">{tireInfo.name}</span>
              <span className="sm:hidden">{tireInfo.name.charAt(0)}</span>
            </div>
          );
        })}
        {/* Pit Stop Markers */}
        {plan.stints.slice(0, -1).map((stint, index) => (
            <div 
                key={`pit-${index}`}
                className="absolute top-0 h-full w-1.5 bg-gray-900/80 backdrop-blur-sm transform -translate-x-1/2 z-10 flex items-center justify-center"
                style={{ left: `${(stint.endLap / totalLaps) * 100}%` }}
                title={`Pit after lap ${stint.endLap}`}
            >
               <span className="absolute -top-6 text-white text-xs font-mono">{stint.endLap}</span>
            </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="mt-8 pt-6 border-t border-gray-700 space-y-8">
        <h3 className="text-xl font-bold mb-4 text-gray-100">Strategy Timelines</h3>
        {renderPlan(strategy.planA)}
        {renderPlan(strategy.planB)}
    </div>
  );
};

export default StrategyTimeline;
