import React, { useState, useMemo } from 'react';
import { LapSimulation, RaceEvent, DriverStats, TireCondition } from '../types';
import { PitStopIcon } from './icons/PitStopIcon';
import { OvertakeIcon } from './icons/OvertakeIcon';
import { FastestLapIcon } from './icons/FastestLapIcon';
import { InfoIcon } from './icons/InfoIcon';
import { DRSIcon } from './icons/DRSIcon';
import { VscIcon } from './icons/VscIcon';
import { MechanicalIssueIcon } from './icons/MechanicalIssueIcon';
import { TireWearIcon } from './icons/TireWearIcon';
import { DownloadIcon } from './icons/DownloadIcon';

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
    case 'TIRE_WEAR': return <TireWearIcon className={`${iconClass} text-pink-400`} />;
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

const getTireConditionIndicator = (condition: TireCondition) => {
    const baseClasses = "w-3 h-3 rounded-full inline-block mr-2 border-2 flex-shrink-0";
    switch (condition) {
        case 'Fresh':
            return <span className={`${baseClasses} bg-green-400 border-green-200`} title="Fresh Tires"></span>;
        case 'Good':
            return <span className={`${baseClasses} bg-green-600 border-green-400`} title="Good Tire Life"></span>;
        case 'Worn':
            return <span className={`${baseClasses} bg-yellow-400 border-yellow-200`} title="Worn Tires"></span>;
        case 'Aged':
            return <span className={`${baseClasses} bg-red-500 border-red-300 animate-pulse`} title="Aged Tires (High Risk)"></span>;
        default:
            return null;
    }
}

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
  
  const handleExport = (format: 'csv' | 'json') => {
    // Escape commas and quotes for CSV
    const escapeCsvField = (field: any): string => {
        const stringField = String(field);
        // If the field contains a comma, a newline, or a double quote, it needs to be enclosed in double quotes.
        if (stringField.search(/("|,|\n)/g) >= 0) {
            // Enclose in double quotes and escape any existing double quotes by doubling them.
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
    };
    
    let dataString: string;
    let mimeType: string;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `f1-race-simulation-${timestamp}.${format}`;

    if (format === 'json') {
        const jsonData = {
            summary: driverStats,
            events: simulation.flatMap(lap => lap.events.map(event => ({ lap: lap.lap, ...event }))),
            laps: simulation.map(lap => ({ lap: lap.lap, positions: lap.positions })),
        };
        dataString = JSON.stringify(jsonData, null, 2);
        mimeType = 'application/json;charset=utf-8;';
    } else { // CSV
        const sections: string[] = [];

        // Section 1: Post-Race Summary
        let summaryCsv = 'POST-RACE SUMMARY\n';
        const summaryHeaders = ['Driver', 'Final Position', 'Pit Stops', 'Overtakes', 'DRS Uses', 'Has Fastest Lap'];
        summaryCsv += summaryHeaders.join(',') + '\n';
        driverStats.forEach(stats => {
            const row = [stats.driver, stats.finalPosition, stats.pitStops, stats.overtakes, stats.drsUses, stats.hasFastestLap].map(escapeCsvField);
            summaryCsv += row.join(',') + '\n';
        });
        sections.push(summaryCsv);

        // Section 2: Full Race Event Log
        let eventsCsv = 'FULL RACE EVENT LOG\n';
        const eventHeaders = ['Lap', 'Type', 'Description'];
        eventsCsv += eventHeaders.join(',') + '\n';
        simulation.forEach(lap => {
            lap.events.forEach(event => {
                const row = [lap.lap, event.type, event.description].map(escapeCsvField);
                eventsCsv += row.join(',') + '\n';
            });
        });
        sections.push(eventsCsv);

        // Section 3: Lap-by-Lap Positions
        let lapsCsv = 'LAP-BY-LAP POSITIONS\n';
        const lapHeaders = ['Lap', 'Position', 'Driver', 'Tire Compound', 'Tire Wear (%)', 'Tire Condition'];
        lapsCsv += lapHeaders.join(',') + '\n';
        simulation.forEach(lap => {
            lap.positions.forEach(p => {
                const row = [lap.lap, p.position, p.driver, p.tireCompound, p.tireWear.toFixed(2), p.tireCondition].map(escapeCsvField);
                lapsCsv += row.join(',') + '\n';
            });
        });
        sections.push(lapsCsv);
        
        dataString = sections.join('\n\n');
        mimeType = 'text/csv;charset=utf-8;';
    }

    const blob = new Blob([dataString], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


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
      <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-100 border-b-2 border-green-500 pb-2 mb-4 sm:mb-0">Race Simulation Results</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleExport('json')}
              className="flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              Export JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              Export CSV
            </button>
          </div>
      </div>
      
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
                          <th scope="col" className="px-2 py-2 text-center">Tire Wear</th>
                      </tr>
                  </thead>
                  <tbody>
                      {currentLapData.positions.map((p, index) => (
                          <tr key={p.driver} className={`border-b border-gray-700 transition-colors duration-300 ${hoveredDrivers.includes(p.driver) ? 'bg-blue-900/50' : ''} ${index < 3 ? 'font-bold text-gray-100' : 'text-gray-300'}`}>
                              <td className="px-4 py-2 text-center">{p.position}</td>
                              <td className="px-4 py-2 flex items-center">
                                {getTireConditionIndicator(p.tireCondition)}
                                {p.driver}
                              </td>
                              <td className="px-2 py-2 text-center text-xs font-mono">
                                {p.tireCompound.charAt(0)} - {p.tireWear.toFixed(0)}%
                              </td>
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