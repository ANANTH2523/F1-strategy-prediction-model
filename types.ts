export type DrivingStyle = 'Aggressive' | 'Smooth' | 'Balanced';
export type TrackDegradation = 'Low' | 'Medium' | 'High';
export type TireCondition = 'Fresh' | 'Good' | 'Worn' | 'Aged';

export interface StartingGridEntry {
  position: number;
  driver: string;
  drivingStyle: DrivingStyle;
}

export type TireCompound = 'Soft' | 'Medium' | 'Hard' | 'Intermediate' | 'Wet';

export interface RaceScenario {
  track: string;
  weather: string;
  availableTires: TireCompound[];
  startingGrid: StartingGridEntry[];
  raceLaps: number;
  trackDegradation: TrackDegradation;
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
  type: 'PIT' | 'OVERTAKE' | 'FASTEST_LAP' | 'INFO' | 'DRS' | 'VSC' | 'MECHANICAL_ISSUE' | 'TIRE_WEAR';
  description: string;
  severity?: 'minor' | 'moderate' | 'major';
}

export interface LapPositionData {
  position: number;
  driver: string;
  tireCompound: TireCompound;
  tireWear: number;
  tireCondition: TireCondition;
}

export interface LapSimulation {
  lap: number;
  positions: LapPositionData[];
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
