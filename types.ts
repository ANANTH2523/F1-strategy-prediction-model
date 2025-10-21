export interface StartingGridEntry {
  position: number;
  driver: string;
}

export type TireCompound = 'Soft' | 'Medium' | 'Hard' | 'Intermediate' | 'Wet';

export interface RaceScenario {
  track: string;
  weather: string;
  availableTires: TireCompound[];
  startingGrid: StartingGridEntry[];
  raceLaps: number;
}

export interface SavedScenario extends RaceScenario {
  id: string;
  name: string;
}

export interface TelemetryData {
  lap: number;
  driver: string;
  lapTime: number;
  tireWear: number;
  fuelLoad: number;
  ersDeployment: number;
  tyreTemperature: number;
  brakeTemperature: number;
  downforceLevel: number;
  tireCompound: TireCompound;
}

export interface StrategyStint {
  startLap: number;
  endLap: number;
  tireCompound: TireCompound;
}

export interface StrategyPlan {
  name: string;
  stints: StrategyStint[];
}

export interface StrategyAnalysis {
  analysisText: string;
  planA: StrategyPlan;
  planB: StrategyPlan;
}

export interface RaceEvent {
  type: 'PIT' | 'OVERTAKE' | 'FASTEST_LAP' | 'INFO' | 'DRS' | 'VSC' | 'MECHANICAL_ISSUE';
  description: string;
  severity?: 'minor' | 'moderate' | 'major';
}

export interface LapSimulation {
  lap: number;
  positions: StartingGridEntry[];
  events: RaceEvent[];
}

export interface DriverStats {
  driver: string;
  finalPosition: number;
  pitStops: number;
  overtakes: number;
  drsUses: number;
  hasFastestLap: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}
