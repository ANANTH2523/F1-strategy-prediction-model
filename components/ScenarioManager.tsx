import React from 'react';
import { SavedScenario } from '../types';
import { DeleteIcon } from './icons/DeleteIcon';

interface ScenarioManagerProps {
  scenarios: SavedScenario[];
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

const ScenarioManager: React.FC<ScenarioManagerProps> = ({ scenarios, onLoad, onDelete, isLoading }) => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-6 border border-gray-700 h-full">
      <h2 className="text-2xl font-bold mb-4 text-blue-400">Saved Scenarios</h2>
      {scenarios.length === 0 ? (
        <div className="flex items-center justify-center h-full min-h-[150px]">
            <p className="text-gray-500 text-center">No saved scenarios yet. <br/> Create and save a custom scenario to see it here.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {scenarios.map(scenario => (
            <div key={scenario.id} className="bg-gray-700/50 p-3 rounded-lg flex items-center justify-between transition-shadow hover:shadow-lg">
              <p className="text-sm text-gray-200 font-medium flex-1 mr-2">{scenario.name}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onLoad(scenario.id)}
                  disabled={isLoading}
                  className="px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:bg-blue-800 disabled:cursor-not-allowed transition-colors"
                >
                  Load
                </button>
                <button
                  onClick={() => onDelete(scenario.id)}
                  disabled={isLoading}
                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Delete Scenario"
                >
                  <DeleteIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScenarioManager;