import React, { useState, useMemo } from 'react';
import { LapSimulation, RaceEvent, DriverStats, StartingGridEntry } from '../types';
import { PitStopIcon } from './icons/PitStopIcon';
import { OvertakeIcon } from './icons/OvertakeIcon';
import { FastestLapIcon } from './icons/FastestLapIcon';
import { InfoIcon } from './icons/InfoIcon';
import { DRSIcon } from './icons/DRSIcon';
import { VscIcon } from './icons/VscIcon';
import { MechanicalIssueIcon } from './icons/MechanicalIssueIcon';

interface RaceSimulationProps {
  simulation: LapSimulation[];
}

const getEventIcon = (type: RaceEvent['type']) => {
  const iconClass = "w-5 h-5 flex-shrink-0";
  switch (type) {
    case 'PIT': return <PitStopIcon className={`${iconClass} text-blue-400`} />;
    case 'OVERTAKE': return <OvertakeIcon className={`${iconClass} text-green-400`} />;
    case 'FASTEST_LAP': return <FastestLapIcon className={`${iconClass} text-purple-400`} />;
    case 'DRS': return <DRSIcon className={`${iconClass} text-cyan-400`} />;
    case 'VSC': return <VscIcon className={`${iconClass} text-yellow-400`} />;
    case 'MECHANICAL_ISSUE': return <MechanicalIssueIcon className={`${iconClass} text-orange-400`} />;
    case 'INFO': default: return <InfoIcon className={`${iconClass} text-gray-400`} />;
  }
};

const getEventSeverityStyles = (severity?: 'minor' | 'moderate' | 'major') => {
  switch (severity) {
    case 'moderate':
      return 'border-l-4 border-yellow-500 bg-yellow-900/20';
    case 'major':
      return 'border-l-4 border-red-500 bg-red-900/20 animate-pulse-border';
    default:
      return 'border-l-4 border-transparent';
  }
};

const RaceSimulation: React.FC<RaceSimulationProps> = ({ simulation }) => {
  const [hoveredDrivers, setHoveredDrivers] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: keyof DriverStats, direction: 'asc' | 'desc' } | null>({ key: 'finalPosition', direction: 'asc' });

  const handleEventHover = (event: RaceEvent) => {
    const driversInvolved = event.description.match(/[A-Z]\.\s[A-Z][a-z]+/g) || [];
    setHoveredDrivers(driversInvolved);
  };
  
  const driverStats: DriverStats[] = useMemo(() => {
    if (!simulation || simulation.length === 0) return [];
    
    const finalLap = simulation[simulation.length - 1];
    const allDrivers = finalLap.positions.map(p => p.driver);
    const fastestLapEvent = simulation.flatMap(l => l.events).find(e => e.type === 'FASTEST_LAP');
    const fastestLapDriverMatch = fastestLapEvent ? fastestLapEvent.description.match(/[A-Z]\.\s[A-Z][a-z]+/) : null;
    const fastestLapDriver = fastestLapDriverMatch ? fastestLapDriverMatch[0] : null;

    const stats = allDrivers.map(driver => {
      let pitStops = 0;
      let overtakes = 0;
      let drsUses = 0;
      simulation.forEach(lap => {
        lap.events.forEach(event => {
          if (event.description.includes(driver)) {
            if (event.type === 'PIT') pitStops++;
            if (event.type === 'OVERTAKE') overtakes++;
            if (event.type === 'DRS') drsUses++;
          }
        });
      });
      const finalPosition = finalLap.positions.find(p => p.driver === driver)?.position || 0;
      
      return { driver, finalPosition, pitStops, overtakes, drsUses, hasFastestLap: driver === fastestLapDriver };
    });

    if (sortConfig !== null) {
      stats.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return stats;
  }, [simulation, sortConfig]);

  const requestSort = (key: keyof DriverStats) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  if (!simulation || simulation.length === 0) return null;

  const currentLapData = simulation[simulation.length - 1]; // Show final lap by default in this view

  return (
    <div className="mt-8 bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-6 border border-gray-700">
      <h3 className="text-xl font-bold mb-6 text-gray-100 border-b-2 border-green-500 pb-2">Race Simulation Results</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Events Log */}
        <div className="lg:col-span-3">
          <h4 className="font-semibold text-lg text-gray-200 mb-3">Full Race Event Log</h4>
          <div className="bg-gray-900/50 rounded-lg p-3 max-h-[500px] overflow-y-auto space-y-4">
            {simulation.map(lap => (
              lap.events.length > 0 && (
                <div key={lap.lap}>
                  <p className="font-bold text-sm text-gray-400 sticky top-0 bg-gray-900/80 backdrop-blur-sm py-1 px-2 rounded -mx-2 mb-1">Lap {lap.lap}</p>
                  <ul className="space-y-2">
                    {lap.events.map((event, index) => (
                      <li 
                        key={`${lap.lap}-${index}`} 
                        className={`flex items-start gap-3 p-2 rounded-md transition-all duration-200 ${getEventSeverityStyles(event.severity)}`}
                        onMouseEnter={() => handleEventHover(event)}
                        onMouseLeave={() => setHoveredDrivers([])}
                      >
                        <div className="mt-0.5">{getEventIcon(event.type)}</div>
                        <p className="text-sm text-gray-300">{event.description}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            ))}
          </div>
        </div>
        
        {/* Final Standings */}
        <div className="lg:col-span-2">
            <h4 className="font-semibold text-lg text-gray-200 mb-3">Final Standings</h4>
            <div className="bg-gray-900/50 rounded-lg max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-400 uppercase sticky top-0 bg-gray-900/80 backdrop-blur-sm">
                      <tr>
                          <th scope="col" className="px-4 py-2 text-center">Pos</th>
                          <th scope="col" className="px-4 py-2">Driver</th>
                      </tr>
                  </thead>
                  <tbody>
                      {currentLapData.positions.map((p, index) => (
                          <tr key={p.driver} className={`border-b border-gray-700 transition-colors duration-300 ${hoveredDrivers.includes(p.driver) ? 'bg-blue-900/50' : ''} ${index < 3 ? 'font-bold text-gray-100' : 'text-gray-300'}`}>
                              <td className="px-4 py-2 text-center">{p.position}</td>
                              <td className="px-4 py-2">{p.driver}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
            </div>
        </div>
      </div>
      
      {/* Post-Race Summary */}
      <div className="mt-8 pt-6 border-t border-gray-700">
        <h3 className="text-xl font-bold mb-4 text-gray-100">Post-Race Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-gray-400 uppercase bg-gray-700/30">
              <tr>
                <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => requestSort('finalPosition')}>Pos</th>
                <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => requestSort('driver')}>Driver</th>
                <th scope="col" className="px-4 py-3 text-center cursor-pointer" onClick={() => requestSort('pitStops')}>Pits</th>
                <th scope="col" className="px-4 py-3 text-center cursor-pointer" onClick={() => requestSort('overtakes')}>Overtakes</th>
                <th scope="col" className="px-4 py-3 text-center cursor-pointer" onClick={() => requestSort('drsUses')}>DRS Uses</th>
                <th scope="col" className="px-4 py-3 text-center cursor-pointer" onClick={() => requestSort('hasFastestLap')}>Fastest Lap</th>
              </tr>
            </thead>
            <tbody>
              {driverStats.map((stats) => (
                <tr key={stats.driver} className="border-b border-gray-700 hover:bg-gray-800/50">
                  <td className="px-4 py-2 font-bold">{stats.finalPosition}</td>
                  <td className="px-4 py-2">{stats.driver}</td>
                  <td className="px-4 py-2 text-center">{stats.pitStops}</td>
                  <td className="px-4 py-2 text-center">{stats.overtakes}</td>
                  <td className="px-4 py-2 text-center">{stats.drsUses}</td>
                  <td className="px-4 py-2 text-center">
                    {stats.hasFastestLap && (
                      <span title="Fastest Lap of the Race">
                        <FastestLapIcon className="w-5 h-5 text-purple-400 mx-auto" />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`
          @keyframes pulse-border {
            0%, 100% { border-color: #ef4444; } /* red-500 */
            50% { border-color: #f87171; } /* red-400 */
          }
          .animate-pulse-border {
            animation: pulse-border 2s infinite;
          }
      `}</style>
    </div>
  );
};

export default RaceSimulation;