import React, { useState } from 'react';
import { RaceScenario, StartingGridEntry, TireCompound } from '../types';

interface CustomScenarioFormProps {
  onSubmit: (scenario: RaceScenario) => void;
  isLoading: boolean;
}

const CustomScenarioForm: React.FC<CustomScenarioFormProps> = ({ onSubmit, isLoading }) => {
  const [track, setTrack] = useState('Silverstone');
  const [weather, setWeather] = useState('Sunny');
  const [raceLaps, setRaceLaps] = useState('52');
  const [startingGrid, setStartingGrid] = useState<StartingGridEntry[]>([
    { position: 1, driver: 'L. Norris' }, { position: 2, driver: 'M. Verstappen' },
    { position: 3, driver: 'C. Leclerc' }, { position: 4, driver: 'O. Piastri' },
    { position: 5, driver: 'G. Russell' }, { position: 6, driver: 'L. Hamilton' },
    { position: 7, driver: 'C. Sainz' }, { position: 8, driver: 'S. Perez' },
    { position: 9, driver: 'F. Alonso' }, { position: 10, driver: 'Y. Tsunoda' },
    { position: 11, driver: 'L. Stroll' }, { position: 12, driver: 'D. Ricciardo' },
    { position: 13, driver: 'A. Albon' }, { position: 14, driver: 'P. Gasly' },
    { position: 15, driver: 'E. Ocon' }, { position: 16, driver: 'K. Magnussen' },
    { position: 17, driver: 'N. Hulkenberg' }, { position: 18, driver: 'V. Bottas' },
    { position: 19, driver: 'G. Zhou' }, { position: 20, driver: 'L. Sargeant' },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleGridChange = (index: number, driver: string) => {
    const newGrid = [...startingGrid];
    newGrid[index].driver = driver;
    setStartingGrid(newGrid);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!track.trim()) newErrors.track = 'Track name is required.';
    
    const laps = parseInt(raceLaps, 10);
    if (isNaN(laps) || laps < 20 || laps > 100) {
      newErrors.raceLaps = 'Race laps must be a number between 20 and 100.';
    }
        
    if (startingGrid.some(d => !d.driver.trim())) {
      newErrors.startingGrid = 'All driver names are required.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const slickTires: TireCompound[] = ['Soft', 'Medium', 'Hard'];
      const isWet = weather.toLowerCase().includes('rain');
      const finalTires: TireCompound[] = isWet ? [...slickTires, 'Intermediate', 'Wet'] : slickTires;

      const scenario: RaceScenario = {
        track,
        weather,
        raceLaps: parseInt(raceLaps, 10),
        availableTires: finalTires,
        startingGrid,
      };
      onSubmit(scenario);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="track" className="block text-sm font-medium text-gray-300">Track Name</label>
          <input type="text" id="track" value={track} onChange={e => setTrack(e.target.value)} disabled={isLoading} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50" />
          {errors.track && <p className="mt-1 text-xs text-red-400">{errors.track}</p>}
        </div>
        <div>
          <label htmlFor="weather" className="block text-sm font-medium text-gray-300">Weather</label>
          <select id="weather" value={weather} onChange={e => setWeather(e.target.value)} disabled={isLoading} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50">
            <option>Sunny</option>
            <option>Cloudy</option>
            <option>Light Rain</option>
            <option>Heavy Rain</option>
          </select>
        </div>
      </div>
       <div>
          <label htmlFor="raceLaps" className="block text-sm font-medium text-gray-300">Race Laps</label>
          <input type="number" id="raceLaps" value={raceLaps} onChange={e => setRaceLaps(e.target.value)} disabled={isLoading} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50" />
          {errors.raceLaps && <p className="mt-1 text-xs text-red-400">{errors.raceLaps}</p>}
        </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-300">Starting Grid (20 Drivers)</label>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 max-h-64 overflow-y-auto pr-2">
          {startingGrid.map((driver, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="font-bold text-gray-400 w-8 text-right">P{driver.position}</span>
              <input type="text" value={driver.driver} onChange={e => handleGridChange(index, e.target.value)} disabled={isLoading} className="flex-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50" />
            </div>
          ))}
        </div>
        {errors.startingGrid && <p className="mt-1 text-xs text-red-400">{errors.startingGrid}</p>}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
      >
        {isLoading ? 'Generating Telemetry...' : 'Create Scenario & Generate Telemetry'}
      </button>
    </form>
  );
};

export default CustomScenarioForm;
