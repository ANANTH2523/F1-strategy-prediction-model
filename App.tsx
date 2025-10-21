import React, { useState, useCallback, useEffect } from 'react';
import { RaceScenario, TelemetryData, StrategyAnalysis, LapSimulation, StrategyPlan, SavedScenario, ChatMessage, TireCompound } from './types';
import { generateRaceScenarioAndTelemetry, analyzeRaceStrategy, generateTelemetryForScenario, simulateRace, askFollowUpQuestion } from './services/geminiService';
import Header from './components/Header';
import TelemetryChart from './components/TelemetryChart';
import LoadingSpinner from './components/LoadingSpinner';
import StrategyTimeline from './components/StrategyTimeline';
import CustomScenarioForm from './components/CustomScenarioForm';
import RaceSimulation from './components/RaceSimulation';
import ScenarioManager from './components/ScenarioManager';
import ErrorDisplay from './components/ErrorDisplay';
import ChatInterface from './components/ChatInterface';
import { WarningIcon } from './components/icons/WarningIcon';
import { SaveIcon } from './components/icons/SaveIcon';

const STORAGE_KEY = 'f1_saved_scenarios';

const analyzeStrategyForWarnings = (
    strategy: StrategyAnalysis, 
    scenario: RaceScenario,
    telemetry: TelemetryData[]
): string[] => {
    const warnings: string[] = [];
    const { raceLaps, weather } = scenario;

    const checkPlan = (plan: StrategyPlan) => {
        const isRainy = weather.toLowerCase().includes('rain');
        
        plan.stints.forEach(stint => {
            const stintDuration = stint.endLap - stint.startLap + 1;
            const tireLower = stint.tireCompound.toLowerCase() as Lowercase<TireCompound>;

            // Weather suitability check
            if (isRainy && !['intermediate', 'wet'].includes(tireLower)) {
                warnings.push(`${plan.name}: Uses a slick tire (${stint.tireCompound}) in rainy conditions, which is extremely dangerous and ineffective.`);
            }
            if (!isRainy && ['intermediate', 'wet'].includes(tireLower)) {
                warnings.push(`${plan.name}: Uses a wet-weather tire (${stint.tireCompound}) in dry conditions, which will result in rapid overheating and poor performance.`);
            }

            // Stint length check for softs
            const softTireThreshold = Math.max(15, Math.floor(raceLaps * 0.35)); // 35% of race distance, or at least 15 laps
            if (tireLower === 'soft' && stintDuration > softTireThreshold) {
                warnings.push(`${plan.name}: The planned Soft tire stint of ${stintDuration} laps is very long and risks a severe performance drop-off ("cliff").`);
            }
            
            // Stint length check for mediums
            const mediumTireThreshold = Math.max(25, Math.floor(raceLaps * 0.60)); // 60% of race distance
             if (tireLower === 'medium' && stintDuration > mediumTireThreshold) {
                warnings.push(`${plan.name}: The planned Medium tire stint of ${stintDuration} laps is ambitious and may lead to high degradation towards the end.`);
            }
        });
    };

    if (strategy.planA) checkPlan(strategy.planA);
    if (strategy.planB) checkPlan(strategy.planB);

    // Telemetry-based wear check for the first stint
    if (telemetry.length > 0) {
        const leadDriver = scenario.startingGrid[0].driver;
        const leadDriverTelemetry = telemetry.filter(t => t.driver === leadDriver && t.lap > 0).sort((a,b) => a.lap - b.lap);

        if (leadDriverTelemetry.length > 1) {
            const endLapData = leadDriverTelemetry[leadDriverTelemetry.length - 1];
            const startLapData = leadDriverTelemetry[0];
            
            const lapsDriven = endLapData.lap - startLapData.lap + 1;
            // Use startLapData.tireWear as a baseline in case it's not 0 on lap 1
            const wearInPeriod = endLapData.tireWear - (startLapData.tireWear || 0);

            if (lapsDriven > 0 && wearInPeriod > 0) {
                const wearPerLap = wearInPeriod / lapsDriven;
                const startingCompound = startLapData.tireCompound;

                const checkPlanStint = (plan: StrategyPlan) => {
                    const firstStint = plan.stints[0];
                    if (firstStint.tireCompound === startingCompound) {
                        const plannedDuration = firstStint.endLap - firstStint.startLap + 1;
                        const projectedWear = endLapData.tireWear + (wearPerLap * (plannedDuration - endLapData.lap));

                        if (projectedWear > 90) {
                             warnings.push(`${plan.name}: Telemetry data projects tire wear for the first stint to reach over 90% (${projectedWear.toFixed(0)}%). This is a high-risk strategy.`);
                        }
                    }
                };

                if (strategy.planA) checkPlanStint(strategy.planA);
                if (strategy.planB) checkPlanStint(strategy.planB);
            }
        }
    }

    // Return unique warnings
    return [...new Set(warnings)];
};


const App: React.FC = () => {
  const [raceScenario, setRaceScenario] = useState<RaceScenario | null>(null);
  const [telemetryData, setTelemetryData] = useState<TelemetryData[]>([]);
  const [strategyAnalysis, setStrategyAnalysis] = useState<string>('');
  const [strategyData, setStrategyData] = useState<StrategyAnalysis | null>(null);
  const [strategyWarnings, setStrategyWarnings] = useState<string[]>([]);
  const [simulationData, setSimulationData] = useState<LapSimulation[] | null>(null);
  const [isLoadingScenario, setIsLoadingScenario] = useState<boolean>(false);
  const [isLoadingStrategy, setIsLoadingStrategy] = useState<boolean>(false);
  const [isLoadingSimulation, setIsLoadingSimulation] = useState<boolean>(false);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'AI' | 'Custom'>('AI');
  const [trackType, setTrackType] = useState<string>('Any');
  const [weatherPattern, setWeatherPattern] = useState<string>('Any');
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    try {
      const storedScenarios = localStorage.getItem(STORAGE_KEY);
      if (storedScenarios) {
        setSavedScenarios(JSON.parse(storedScenarios));
      }
    } catch (e) {
      console.error("Failed to load scenarios from localStorage", e);
    }
  }, []);
  
  const resetState = (clearError: boolean = true) => {
    if (clearError) setError(null);
    setRaceScenario(null);
    setTelemetryData([]);
    setStrategyAnalysis('');
    setStrategyData(null);
    setSimulationData(null);
    setStrategyWarnings([]);
    setChatMessages([]);
  };

  const handleGenerateScenario = useCallback(async () => {
    setIsLoadingScenario(true);
    resetState();
    try {
      const { scenario, telemetry } = await generateRaceScenarioAndTelemetry({ trackType, weatherPattern });
      setRaceScenario(scenario);
      setTelemetryData(telemetry);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while generating the scenario.');
    } finally {
      setIsLoadingScenario(false);
    }
  }, [trackType, weatherPattern]);
  
  const handleCustomScenarioSubmit = useCallback(async (customScenario: RaceScenario) => {
    setIsLoadingScenario(true);
    resetState();
    try {
      setRaceScenario(customScenario);
      const telemetry = await generateTelemetryForScenario(customScenario);
      setTelemetryData(telemetry);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while generating telemetry.');
      setRaceScenario(null); // Clear scenario if telemetry fails
    } finally {
      setIsLoadingScenario(false);
    }
  }, []);

  const handleAnalyzeStrategy = useCallback(async () => {
    if (!raceScenario || telemetryData.length === 0) {
      setError('Please generate a race scenario and telemetry first.');
      return;
    }
    setIsLoadingStrategy(true);
    setError(null);
    setStrategyAnalysis('');
    setStrategyData(null);
    setSimulationData(null);
    setStrategyWarnings([]);
    setChatMessages([]);
    try {
      const analysis = await analyzeRaceStrategy(raceScenario, telemetryData);
      setStrategyAnalysis(analysis.analysisText);
      setStrategyData(analysis);
      if (raceScenario) {
        const warnings = analyzeStrategyForWarnings(analysis, raceScenario, telemetryData);
        setStrategyWarnings(warnings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while analyzing the strategy.');
    } finally {
      setIsLoadingStrategy(false);
    }
  }, [raceScenario, telemetryData]);

  const handleSimulateRace = useCallback(async () => {
    if (!raceScenario || !strategyData) {
      setError('Please analyze the strategy before running the simulation.');
      return;
    }
    setIsLoadingSimulation(true);
    setError(null);
    setSimulationData(null);
    try {
      const simulation = await simulateRace(raceScenario, strategyData);
      setSimulationData(simulation);
    } catch (err) {
       setError(err instanceof Error ? err.message : 'An unknown error occurred while running the simulation.');
    } finally {
        setIsLoadingSimulation(false);
    }
  }, [raceScenario, strategyData]);

  const handleSaveCurrentScenario = useCallback(() => {
    if (!raceScenario) {
      setError("No active scenario to save.");
      return;
    }
    try {
      const newSavedScenario: SavedScenario = {
        ...raceScenario,
        id: `scenario-${Date.now()}`,
        name: `${raceScenario.track} (${raceScenario.weather}, ${raceScenario.raceLaps} Laps)`
      };
      const updatedScenarios = [...savedScenarios, newSavedScenario];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedScenarios));
      setSavedScenarios(updatedScenarios);
    } catch (e) {
      setError("Failed to save scenario. Your browser's storage might be full.");
      console.error(e);
    }
  }, [raceScenario, savedScenarios]);

  const handleLoadScenario = useCallback(async (id: string) => {
    const scenarioToLoad = savedScenarios.find(s => s.id === id);
    if (scenarioToLoad) {
      setError(null);
      setMode('Custom');
      await handleCustomScenarioSubmit(scenarioToLoad);
    } else {
      setError("Could not find the scenario to load.");
    }
  }, [savedScenarios, handleCustomScenarioSubmit]);

  const handleDeleteScenario = useCallback((id: string) => {
    try {
      const updatedScenarios = savedScenarios.filter(s => s.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedScenarios));
      setSavedScenarios(updatedScenarios);
    } catch (e) {
      setError("Failed to delete scenario.");
      console.error(e);
    }
  }, [savedScenarios]);
  
  const handleChatSubmit = useCallback(async (userInput: string) => {
    if (!raceScenario || !strategyData) {
        setError("Cannot start chat without a scenario and strategy analysis.");
        return;
    }
    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: userInput }];
    setChatMessages(newMessages);
    setIsChatLoading(true);

    try {
        const modelResponse = await askFollowUpQuestion(raceScenario, strategyData, newMessages);
        setChatMessages([...newMessages, { role: 'model', content: modelResponse }]);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred in the chat.';
        setError(errorMessage);
        // Optionally add an error message to the chat
        setChatMessages([...newMessages, { role: 'model', content: `Sorry, I ran into an error: ${errorMessage}` }]);
    } finally {
        setIsChatLoading(false);
    }
  }, [chatMessages, raceScenario, strategyData]);

  const isButtonDisabled = isLoadingScenario || isLoadingStrategy || isLoadingSimulation || isChatLoading;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-1">
             <ScenarioManager 
                scenarios={savedScenarios} 
                onLoad={handleLoadScenario} 
                onDelete={handleDeleteScenario}
                isLoading={isButtonDisabled}
              />
          </div>
          <div className="xl:col-span-2">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-6 border border-gray-700">
              <h2 className="text-2xl font-bold mb-4 text-red-500">Race Control</h2>
              
              <div className="mb-6">
                <div className="flex rounded-lg bg-gray-900 p-1 border border-gray-700 w-full sm:w-auto sm:max-w-md">
                  <button
                    onClick={() => setMode('AI')}
                    disabled={isButtonDisabled}
                    className={`w-1/2 rounded-md py-2 text-sm font-medium transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                      mode === 'AI' ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    AI Generated
                  </button>
                  <button
                    onClick={() => setMode('Custom')}
                    disabled={isButtonDisabled}
                    className={`w-1/2 rounded-md py-2 text-sm font-medium transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                      mode === 'Custom' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Custom Input
                  </button>
                </div>
              </div>
              
              {mode === 'AI' ? (
                <div>
                  <p className="text-gray-400 mb-4">
                    Guide the AI to generate a hypothetical 2025 F1 race scenario.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label htmlFor="trackType" className="block text-sm font-medium text-gray-300 mb-1">Track Type</label>
                        <select id="trackType" value={trackType} onChange={e => setTrackType(e.target.value)} disabled={isButtonDisabled} className="w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white focus:ring-red-500 focus:border-red-500 sm:text-sm disabled:opacity-50">
                            <option>Any</option>
                            <option>High-Speed</option>
                            <option>Technical</option>
                            <option>Balanced</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="weatherPattern" className="block text-sm font-medium text-gray-300 mb-1">Weather Pattern</label>
                        <select id="weatherPattern" value={weatherPattern} onChange={e => setWeatherPattern(e.target.value)} disabled={isButtonDisabled} className="w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white focus:ring-red-500 focus:border-red-500 sm:text-sm disabled:opacity-50">
                            <option>Any</option>
                            <option>Predictable</option>
                            <option>Variable</option>
                            <option>Wet Race</option>
                        </select>
                    </div>
                  </div>
                  <button
                      onClick={handleGenerateScenario}
                      disabled={isButtonDisabled}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                    >
                      {isLoadingScenario ? 'Generating Scenario...' : 'Generate New Race Scenario'}
                    </button>
                </div>
              ) : (
                <div>
                    <p className="text-gray-400 mb-6">
                      Manually define the race parameters or load a saved scenario.
                    </p>
                    <CustomScenarioForm onSubmit={handleCustomScenarioSubmit} isLoading={isLoadingScenario} />
                </div>
              )}

              {raceScenario && !isLoadingScenario && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                        onClick={handleAnalyzeStrategy}
                        disabled={!raceScenario || telemetryData.length === 0 || isButtonDisabled}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                    >
                        {isLoadingStrategy ? 'Analyzing...' : 'Analyze Strategy'}
                    </button>
                    {mode === 'Custom' && (
                        <button
                            onClick={handleSaveCurrentScenario}
                            disabled={isButtonDisabled || savedScenarios.some(s => s.id === raceScenario.track + raceScenario.weather + raceScenario.raceLaps)}
                            className="w-full flex items-center justify-center bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                        >
                            <SaveIcon className="h-5 w-5 mr-2" />
                            Save Current Scenario
                        </button>
                    )}
                </div>
              )}
              {error && <ErrorDisplay message={error} onDismiss={() => setError(null)} />}
            </div>
          </div>
        </div>

        {isLoadingScenario && (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner />
          </div>
        )}

        {raceScenario && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-4 text-gray-100 border-b-2 border-red-500 pb-2">Race Scenario</h3>
              <div className="space-y-3 text-gray-300">
                <p><strong>Track:</strong> {raceScenario.track}</p>
                <p><strong>Weather:</strong> {raceScenario.weather}</p>
                <p><strong>Race Laps:</strong> {raceScenario.raceLaps}</p>
                <p><strong>Available Tires:</strong> {raceScenario.availableTires.join(', ')}</p>
                <div>
                  <h4 className="font-semibold mt-2">Starting Grid:</h4>
                  <div className="max-h-56 overflow-y-auto pr-2 mt-2">
                      <ol className="list-decimal list-inside space-y-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                          {raceScenario.startingGrid.map(d => 
                              <li key={d.position}>{d.driver}</li>
                          )}
                      </ol>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-4 text-gray-100 border-b-2 border-red-500 pb-2">Simulated Telemetry (Top 5 Drivers)</h3>
              {telemetryData.length > 0 ? (
                <>
                  <p className="text-sm text-gray-400 mb-4">Simulated telemetry for the top 5 drivers on their first 15 laps.</p>
                  <TelemetryChart data={telemetryData} drivers={raceScenario.startingGrid.map(d => d.driver)} />
                </>
              ) : (
                <div className="flex flex-col justify-center items-center h-full min-h-[300px]">
                    {isLoadingScenario ? (
                        <>
                            <LoadingSpinner />
                            <p className="mt-4 text-gray-300">Generating telemetry data...</p>
                        </>
                    ) : (
                         <p className="text-gray-500">Awaiting telemetry generation...</p>
                    )}
                </div>
              )}
            </div>
          </div>
        )}

        {isLoadingStrategy && (
          <div className="mt-8 bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-6 border border-gray-700">
             <div className="flex flex-col justify-center items-center h-64">
                <LoadingSpinner />
                <p className="mt-4 text-lg text-gray-300">AI Strategist is calculating pit windows and tire degradation...</p>
            </div>
          </div>
        )}

        {strategyAnalysis && strategyData && raceScenario && (
          <div className="mt-8 bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-6 border border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-gray-100 border-b-2 border-blue-500 pb-2">AI Strategy Analysis</h3>
            
            {strategyWarnings.length > 0 && (
              <div className="mb-4 p-4 bg-yellow-900/50 border border-yellow-600 rounded-lg">
                <h4 className="font-bold text-yellow-300 flex items-center">
                  <WarningIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                  Potential Strategy Flaws Detected
                </h4>
                <ul className="list-disc list-inside mt-2 text-yellow-300/90 space-y-1 text-sm">
                  {strategyWarnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            <pre className="whitespace-pre-wrap font-sans text-gray-300 text-base leading-relaxed">{strategyAnalysis}</pre>
            <StrategyTimeline strategy={strategyData} totalLaps={raceScenario.raceLaps} />
             <div className="mt-6">
                <button
                    onClick={handleSimulateRace}
                    disabled={isButtonDisabled}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                    {isLoadingSimulation ? 'Simulating...' : 'Simulate Full Race'}
                </button>
            </div>
          </div>
        )}
        
        {isLoadingSimulation && (
            <div className="mt-8 bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-6 border border-gray-700">
                <div className="flex flex-col justify-center items-center h-64">
                    <LoadingSpinner />
                    <p className="mt-4 text-lg text-gray-300">Simulating race... Lights out and away we go!</p>
                </div>
            </div>
        )}

        {simulationData && (
          <RaceSimulation simulation={simulationData} />
        )}

        {strategyAnalysis && (
            <div className="mt-8">
                <ChatInterface 
                    messages={chatMessages}
                    onSubmit={handleChatSubmit}
                    isLoading={isChatLoading}
                />
            </div>
        )}

      </main>
    </div>
  );
};

export default App;
