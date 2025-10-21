import { GoogleGenAI, Type } from "@google/genai";
import { RaceScenario, TelemetryData, StrategyAnalysis, LapSimulation, ChatMessage, TireCompound, TrackDegradation, DrivingStyle, TireCondition } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface ScenarioGenerationOptions {
  trackType?: string;
  weatherPattern?: string;
  trackDegradation?: TrackDegradation;
}

const TIRE_COMPOUND_ENUM: TireCompound[] = ['Soft', 'Medium', 'Hard', 'Intermediate', 'Wet'];
const DRIVING_STYLE_ENUM: DrivingStyle[] = ['Aggressive', 'Smooth', 'Balanced'];
const TRACK_DEGRADATION_ENUM: TrackDegradation[] = ['Low', 'Medium', 'High'];
const TIRE_CONDITION_ENUM: TireCondition[] = ['Fresh', 'Good', 'Worn', 'Aged'];


const scenarioSchema = {
  type: Type.OBJECT,
  properties: {
    track: { type: Type.STRING, description: "Name of the F1 race track." },
    weather: { type: Type.STRING, description: "Weather conditions, e.g., Sunny, Light Rain." },
    trackDegradation: { type: Type.STRING, enum: TRACK_DEGRADATION_ENUM, description: "The tire degradation characteristic of the track surface." },
    availableTires: {
      type: Type.ARRAY,
      items: { type: Type.STRING, enum: TIRE_COMPOUND_ENUM },
      description: "List of available tire compounds using standard names."
    },
    startingGrid: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          position: { type: Type.INTEGER },
          driver: { type: Type.STRING },
          drivingStyle: { type: Type.STRING, enum: DRIVING_STYLE_ENUM, description: "The driver's typical style." },
        },
        required: ['position', 'driver', 'drivingStyle']
      },
      description: "All 20 drivers and their starting positions, including their driving style."
    },
    raceLaps: { type: Type.INTEGER, description: "Total number of laps for the race." }
  },
  required: ['track', 'weather', 'availableTires', 'startingGrid', 'raceLaps', 'trackDegradation'],
};

const telemetrySchema = {
    type: Type.OBJECT,
    properties: {
      telemetry: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            lap: { type: Type.INTEGER },
            driver: { type: Type.STRING, description: "Driver's name, as provided in the scenario." },
            lapTime: { type: Type.NUMBER, description: "Lap time in seconds, e.g., 91.234" },
            tireWear: { type: Type.NUMBER, description: "Tire wear percentage, e.g., 15.5" },
            fuelLoad: { type: Type.NUMBER, description: "Remaining fuel load in kg." },
            ersDeployment: { type: Type.NUMBER, description: "Energy Recovery System deployment in kJ for the lap." },
            tyreTemperature: { type: Type.NUMBER, description: "Average tyre surface temperature in Celsius for the lap." },
            brakeTemperature: { type: Type.NUMBER, description: "Peak brake disc temperature in Celsius reached during the lap." },
            downforceLevel: { type: Type.NUMBER, description: "A relative index of aerodynamic downforce level (e.g., 75 for a high-downforce track)." },
            tireCompound: { type: Type.STRING, enum: TIRE_COMPOUND_ENUM }
          },
          required: ['lap', 'driver', 'lapTime', 'tireWear', 'fuelLoad', 'ersDeployment', 'tyreTemperature', 'brakeTemperature', 'downforceLevel', 'tireCompound']
        }
      }
    },
    required: ['telemetry']
};

const strategyAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        analysisText: {
            type: Type.STRING,
            description: "The full, human-readable text report of the strategy analysis."
        },
        planA: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: "Name for the primary strategy, e.g., 'Plan A: Optimal One-Stop'" },
                stints: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            startLap: { type: Type.INTEGER },
                            endLap: { type: Type.INTEGER },
                            tireCompound: { type: Type.STRING, enum: TIRE_COMPOUND_ENUM }
                        },
                        required: ["startLap", "endLap", "tireCompound"]
                    }
                }
            },
            required: ["name", "stints"]
        },
        planB: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: "Name for the alternative strategy, e.g., 'Plan B: Aggressive Two-Stop'" },
                stints: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            startLap: { type: Type.INTEGER },
                            endLap: { type: Type.INTEGER },
                            tireCompound: { type: Type.STRING, enum: TIRE_COMPOUND_ENUM }
                        },
                        required: ["startLap", "endLap", "tireCompound"]
                    }
                }
            },
            required: ["name", "stints"]
        }
    },
    required: ["analysisText", "planA", "planB"]
};

const simulationSchema = {
    type: Type.OBJECT,
    properties: {
        simulation: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    lap: { type: Type.INTEGER },
                    positions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                position: { type: Type.INTEGER },
                                driver: { type: Type.STRING },
                                tireCompound: { type: Type.STRING, enum: TIRE_COMPOUND_ENUM },
                                tireWear: { type: Type.NUMBER, description: "Tire wear percentage for this lap." },
                                tireCondition: { type: Type.STRING, enum: TIRE_CONDITION_ENUM, description: "Qualitative state of the tires." },
                            },
                            required: ['position', 'driver', 'tireCompound', 'tireWear', 'tireCondition']
                        }
                    },
                    events: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                type: { type: Type.STRING, enum: ['PIT', 'OVERTAKE', 'FASTEST_LAP', 'INFO', 'DRS', 'VSC', 'MECHANICAL_ISSUE', 'TIRE_WEAR'] },
                                description: { type: Type.STRING },
                                severity: { type: Type.STRING, enum: ['minor', 'moderate', 'major'], description: "Optional severity rating for incidents." },
                            },
                            required: ['type', 'description']
                        }
                    }
                },
                required: ['lap', 'positions', 'events']
            }
        }
    },
    required: ['simulation']
};

async function safeGenerateContent(modelName: string, prompt: string, schema?: object): Promise<any> {
    try {
        const config: any = schema ? {
            responseMimeType: 'application/json',
            responseSchema: schema,
        } : {};

        const result = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config,
        });
        
        const textResponse = result.text;
        if (!textResponse) {
            throw new Error("AI model returned an empty response.");
        }
        
        // If schema is provided, we expect JSON. Otherwise, return raw text.
        return schema ? JSON.parse(textResponse) : textResponse;
    } catch (e) {
        if (e instanceof SyntaxError) {
            console.error("Failed to parse JSON from model response:", e);
            throw new Error("The AI model returned data in an invalid format. Please try again.");
        }
        console.error(`Error generating content with model ${modelName}:`, e);
        throw new Error(`An error occurred while communicating with the AI model. Details: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
}


export async function generateTelemetryForScenario(scenario: RaceScenario): Promise<TelemetryData[]> {
    const top5Drivers = scenario.startingGrid.slice(0, 5).map(d => d.driver);
    const startingTire: TireCompound = scenario.availableTires.find(t => t === 'Medium') || scenario.availableTires[0];
    
    const allTelemetryData: TelemetryData[] = [];

    let leadDriverBaselineLapTimes: number[] = [];

    // Process drivers one by one to avoid overly complex API calls
    for (let i = 0; i < top5Drivers.length; i++) {
        const driver = top5Drivers[i];
        const driverPosition = i + 1;
        const driverData = scenario.startingGrid.find(d => d.driver === driver);
        const driverStyle = driverData?.drivingStyle || 'Balanced';
        
        let prompt;

        if (i === 0) {
            // Create a detailed prompt for the lead driver to establish a baseline
            prompt = `
                Based on the F1 race scenario at ${scenario.track} (${scenario.weather}, ${scenario.raceLaps} Laps, ${scenario.trackDegradation} degradation), simulate detailed telemetry data for the first 15 laps for the lead driver: ${driver}.
                This driver has a '${driverStyle}' driving style.
                
                RULES FOR REALISM:
                1.  Starting Tire: The driver starts on the ${startingTire} tire compound. The 'tireCompound' field in the response must be exactly "${startingTire}".
                2.  Lap 1 (Out Lap): Lap 1 is slower than subsequent laps.
                3.  Fuel Effect: Lap times should gradually improve for the first ~10-12 laps as fuel load decreases.
                4.  Tire Degradation: After the fuel burn-off phase, lap times should start to degrade. Crucially, tire wear must be influenced by the track's '${scenario.trackDegradation}' degradation level and the driver's '${driverStyle}' style. For example, an 'Aggressive' style on a 'High' degradation track will cause tireWear to increase much faster than a 'Smooth' driver on a 'Low' degradation track.
                5.  Metric Consistency: fuelLoad should decrease, tireWear should increase, temperatures must fluctuate realistically.
                
                Return the data as a single JSON object containing a 'telemetry' array for only this driver.
            `;
        } else {
            // Create a simpler prompt for following drivers, referencing the leader's pace
            const performanceOffset = driverPosition * 0.05; // Make each subsequent driver slightly slower
            prompt = `
                Based on the F1 race scenario at ${scenario.track} (track degradation: ${scenario.trackDegradation}), simulate telemetry for the first 15 laps for the driver in P${driverPosition}: ${driver}.
                This driver has a '${driverStyle}' driving style.
                The lead driver's baseline lap times were: ${leadDriverBaselineLapTimes.join(', ')} seconds.
                
                RULES FOR REALISM:
                1.  Performance Gap: This driver must be consistently slower than the baseline lap times provided, by about ${performanceOffset.toFixed(2)} to ${(performanceOffset + 0.1).toFixed(2)} seconds per lap. Their lap time curve should be similar.
                2.  Starting Tire: The driver starts on the ${startingTire} tire compound. The 'tireCompound' field in the response must be exactly "${startingTire}".
                3.  Tire Wear Model: Tire wear must reflect the driver's '${driverStyle}' style and the track's '${scenario.trackDegradation}' degradation.
                4.  Metric Consistency: All other metrics (fuelLoad, tireWear, etc.) must be consistent and realistic.
                
                Return the data as a single JSON object containing a 'telemetry' array for only this driver.
            `;
        }

        try {
            const singleDriverTelemetryResponse = await safeGenerateContent('gemini-2.5-pro', prompt, telemetrySchema);
            if (singleDriverTelemetryResponse && singleDriverTelemetryResponse.telemetry) {
                // If this is the lead driver, store their lap times as a baseline for others
                if (i === 0) {
                    leadDriverBaselineLapTimes = singleDriverTelemetryResponse.telemetry.map((t: TelemetryData) => t.lapTime);
                }
                allTelemetryData.push(...singleDriverTelemetryResponse.telemetry);
            } else {
                 throw new Error(`Received invalid telemetry data for driver ${driver}`);
            }
        } catch (error) {
            console.error(`Failed to generate telemetry for driver ${driver}.`, error);
            // Decide how to handle partial failure: either throw and stop, or continue with a warning.
            // For now, we'll throw to indicate a critical failure in generation.
            throw new Error(`Failed to generate complete telemetry data. The process stopped at driver ${driver}.`);
        }
    }

    return allTelemetryData;
}


export async function generateRaceScenarioAndTelemetry(options: ScenarioGenerationOptions = {}): Promise<{ scenario: RaceScenario, telemetry: TelemetryData[] }> {
  // Step 1: Generate Race Scenario
  let scenarioPrompt = `Generate a realistic and detailed F1 race scenario for a recent F1 season.
  
  CRITICAL INSTRUCTIONS:
  1.  Track & Laps: Choose a real F1 track and a corresponding realistic race lap count (e.g., Spa ~44 laps, Monaco ~78 laps). The total laps must be between 40 and 80.
  2.  Tire Compounds: For the 'availableTires' field in the JSON, you MUST use the standard F1 functional names. 
      - For a dry race, this array must be exactly ["Soft", "Medium", "Hard"].
      - For a wet or variable race, it must be ["Soft", "Medium", "Hard", "Intermediate", "Wet"].
      - Do NOT include C-ratings like C1, C2, etc., in this array field.
  3.  Starting Grid: Create a full, plausible 20-driver starting grid for a recent F1 season. For each driver, you MUST assign a 'drivingStyle' from ["Aggressive", "Smooth", "Balanced"] based on their real-world reputation.
  4.  Track Degradation: Assign a 'trackDegradation' level from ["Low", "Medium", "High"] that is appropriate for the chosen track (e.g., Bahrain is High, Silverstone is Medium, Monaco is Low).
  `;
  
  // Add user preferences to the prompt
  if (options.trackType && options.trackType !== 'Any') {
      scenarioPrompt += `\n- Track Type Constraint: The track must be a prime example of a ${options.trackType.toLowerCase()} circuit. For example, a high-speed track should be Monza, Silverstone, or Spa. A technical track could be Monaco, Hungaroring, or Singapore.`;
  }
  if (options.trackDegradation && options.trackDegradation !== 'Medium') {
      scenarioPrompt += `\n- Track Degradation Constraint: The track degradation must be '${options.trackDegradation}'.`;
  }
   if (options.weatherPattern && options.weatherPattern !== 'Any') {
    scenarioPrompt += `\n- Weather Constraint: The weather must follow a '${options.weatherPattern}' pattern.`;
    switch(options.weatherPattern) {
        case 'Predictable':
            scenarioPrompt += ` (e.g., 'Sunny', 'Clear', 'Overcast').`;
            break;
        case 'Variable':
            scenarioPrompt += ` (e.g., 'Cloudy with a 60% chance of rain after lap 30'). The 'availableTires' array MUST include Intermediate and Wet tires.`;
            break;
        case 'Wet Race':
            scenarioPrompt += ` (e.g., 'Light Rain', 'Full Wet Conditions'). The 'availableTires' array MUST include Intermediate and Wet tires.`;
            break;
    }
  }

  scenarioPrompt += `\n\nReturn the response as a single, valid JSON object adhering to the provided schema.`;

  const scenario: RaceScenario = await safeGenerateContent('gemini-2.5-pro', scenarioPrompt, scenarioSchema);
  
  // Step 2: Generate Telemetry based on the scenario
  const telemetry = await generateTelemetryForScenario(scenario);

  return { scenario, telemetry };
}


export async function analyzeRaceStrategy(scenario: RaceScenario, telemetry: TelemetryData[]): Promise<StrategyAnalysis> {
  let telemetrySummary = "No telemetry data available for summary.";
  if (telemetry.length > 0) {
      const lapsByDriver = new Map<string, TelemetryData[]>();
      telemetry.forEach(t => {
          if (!lapsByDriver.has(t.driver)) lapsByDriver.set(t.driver, []);
          lapsByDriver.get(t.driver)!.push(t);
      });
      const leadDriverData = lapsByDriver.get(scenario.startingGrid[0].driver);
      
      if(leadDriverData && leadDriverData.length > 1){
        const lap1 = leadDriverData[0];
        const lastLap = leadDriverData[leadDriverData.length-1];
        const timeDelta = (lastLap.lapTime - lap1.lapTime).toFixed(3);

        telemetrySummary = `
        Lead driver (${lap1.driver}) telemetry summary over ${lastLap.lap} laps on ${lap1.tireCompound} tires:
        - Lap 1 Time: ${lap1.lapTime}s.
        - Lap ${lastLap.lap} Time: ${lastLap.lapTime}s (Delta: ${timeDelta}s).
        - Tire Wear at Lap ${lastLap.lap}: ${lastLap.tireWear.toFixed(1)}%.
        - This data suggests a performance drop-off due to tire degradation.
        `;
      }
  }

  const prompt = `
    You are an elite F1 race strategist for a top-tier team. Your analysis must be sharp, insightful, and data-driven.

    **RACE SCENARIO:**
    - Track: ${scenario.track}
    - Track Characteristics: Tire degradation is rated as '${scenario.trackDegradation}'.
    - Total Laps: ${scenario.raceLaps}
    - Weather Forecast: ${scenario.weather}
    - Available Tire Compounds: ${scenario.availableTires.join(', ')}
    - Lead Driver (${scenario.startingGrid[0].driver}) Style: ${scenario.startingGrid[0].drivingStyle}.

    **PERFORMANCE DATA (FIRST STINT):**
    ${telemetrySummary}

    **STRATEGIC TASK:**
    Formulate the optimal race strategy for the lead driver, ${scenario.startingGrid[0].driver}. Your analysis must be presented as a professional, human-readable report followed by a structured data breakdown.
    
    **REPORT REQUIREMENTS:**
    1.  **Primary Strategy (Plan A):** Define the optimal strategy. Specify the exact pit lap and the tire sequence (e.g., Medium -> Hard). Justify your decision using the telemetry summary, considering factors like the crossover point where pitting for fresh tires overcomes the time lost in the pit lane.
    2.  **Alternative Strategy (Plan B):** Create a strong alternative plan. This should be a direct counter to a likely event, such as an early Safety Car or a change in weather. Explain the trigger for switching to Plan B.
    3.  **Key Strategic Factors:** Analyze the undercut/overcut potential at this specific track. Discuss how the '${scenario.trackDegradation}' degradation and weather forecast impacts both plans. A high degradation track makes the undercut very powerful but shortens stint lengths. A driver with an aggressive style might be forced into an extra pitstop.
    
    **OUTPUT FORMAT:**
    Return a single, valid JSON object that strictly adheres to the provided schema.
    - 'analysisText' must contain the complete, professional report. Use clear headers and bullet points. Do not use Markdown.
    - 'planA' and 'planB' must be structured objects containing the stint details.
    - Stint details are critical: the first stint starts on Lap 1, the last stint must end on Lap ${scenario.raceLaps}, and there must be no gaps or overlaps between stints.
    - For all 'tireCompound' fields, you MUST use one of the following exact strings: ${TIRE_COMPOUND_ENUM.map(t => `'${t}'`).join(', ')}.
    `;

  return await safeGenerateContent('gemini-2.5-pro', prompt, strategyAnalysisSchema);
}

export async function simulateRace(scenario: RaceScenario, strategy: StrategyAnalysis): Promise<LapSimulation[]> {
    const planA = strategy.planA;
    const driverStyles = scenario.startingGrid.map(d => `${d.driver}: ${d.drivingStyle}`).join(', ');

    const prompt = `
    You are a sophisticated F1 race simulation engine. Your task is to generate a realistic and exciting lap-by-lap summary of a race, with a detailed tire wear model.

    **RACE DETAILS:**
    - Track: ${scenario.track}
    - Total Laps: ${scenario.raceLaps}
    - Track Degradation: ${scenario.trackDegradation}
    - Starting Grid & Driver Styles: ${driverStyles}.
    - Lead Driver Strategy (${scenario.startingGrid[0].driver}): This driver will follow Plan A: ${planA.name}, pitting around lap ${planA.stints[0].endLap}.

    **TIRE WEAR SIMULATION MODEL (CRITICAL):**
    You MUST simulate tire wear for every driver on every lap. Lap times and race events must be a direct result of this model.
    1.  **Wear Calculation:** Wear is influenced by:
        - **Tire Compound:** Softs wear fastest, then Mediums, then Hards.
        - **Track Degradation ('${scenario.trackDegradation}'):** A 'High' degradation track significantly increases wear per lap. 'Low' decreases it.
        - **Driving Style:** An 'Aggressive' style multiplies wear. A 'Smooth' style conserves tires and reduces wear.
    2.  **Performance Impact:** As tire wear increases, lap times MUST get progressively slower. This "degradation" effect is most severe for Soft tires and least for Hards.
    3.  **Tire Condition States:** For each driver on each lap, you MUST assign a 'tireCondition' based on their 'tireWear' percentage:
        - **Fresh:** 0-15% wear. Optimal performance.
        - **Good:** 16-50% wear. Gradual performance decrease.
        - **Worn:** 51-80% wear. Significant performance drop-off. The driver becomes vulnerable to attack.
        - **Aged:** 81-100% wear. Severe performance loss (the "cliff"). The driver is extremely slow and at risk of a puncture.
    
    **SIMULATION RULES & PRIORITIES:**
    1.  **Output Requirements:** For EACH lap, in the 'positions' array, you MUST provide each driver's 'tireCompound', calculated 'tireWear' percentage, and resulting 'tireCondition'.
    2.  **Tire Wear Events:** When a driver's tire condition changes to 'Worn' or 'Aged', you MUST generate a 'TIRE_WEAR' event describing the situation (e.g., "Leclerc reports his Mediums are worn and he's losing grip.").
    3.  **Strategic Consequences:** Drivers on worn/aged tires will be easily overtaken by those on fresher tires. This should be a primary driver of overtakes in your simulation.
    4.  **Narrative Focus:** Focus the detailed events (overtakes, battles) on the top 10 positions to create a clear narrative. You can mention midfield action if it's significant.
    5.  **Strategic Adherence:** The lead driver, ${scenario.startingGrid[0].driver}, MUST pit according to their strategy. Other drivers will have their own logical strategies you must invent based on your tire wear simulation. An aggressive driver might be forced into an extra stop.
    6.  **Logical Events:**
        - **Overtakes:** Must be plausible. A driver on fresh soft tires should have a significant advantage over a driver on old hard tires. DRS is a primary tool for overtaking on straights.
        - **DRS:** After lap 2, generate 'DRS' events whenever a car is within 1 second of another car on a DRS straight.
        - **Fastest Laps:** Award the fastest lap realistically. It is often set mid-to-late race by a driver on fresh tires with low fuel, possibly after a final pit stop.
        - **Driver Fatigue:** In the final 25% of the race, subtly introduce fatigue. This should manifest as 'INFO' events describing small mistakes (e.g., 'Verstappen reports his tires are losing temperature', 'Hamilton has a small lock-up into Turn 1'), slightly increased lap time variance, and less successful overtake attempts.
        - **Incident Severity:** For any 'INFO' event that describes an on-track incident (e.g., contact, spin, crash, off-track excursion), you MUST assign a 'severity' rating: 'minor', 'moderate', or 'major'. The severity rating MUST be influenced by the number of cars involved in the incident description. An incident involving a single car is likely 'minor' or 'moderate'. An incident involving multiple cars is almost always 'moderate' or 'major'.
    7.  **Introduce Unpredictability:**
        - **Virtual Safety Car (VSC):** The probability of a VSC must be directly and sensitively tied to the severity of on-track incidents. Use the following probabilities as a strict guide:
          - A 'minor' incident (e.g., small lock-up, wide corner exit) should have a very low chance of triggering a VSC (5-10%).
          - A 'moderate' incident (e.g., a spin without contact, a light touch between cars) should have a significant chance of a VSC (40-60%).
          - A 'major' incident (e.g., a car stopping on track, heavy contact) should have a very high, almost certain chance of a VSC (85-95%).
          During a VSC, all drivers must slow down for 1-2 laps, and overtaking is forbidden.
        - **Minor Mechanical Issues:** Introduce 1-3 minor, random 'MECHANICAL_ISSUE' events throughout the race for different drivers. These should be plausible issues (e.g., 'engine sensor issue', 'stuck flap', 'minor hydraulic leak') that cause a slight loss of pace for a few laps but are not race-ending.
    8.  **Consistency:** Maintain driver characteristics. A famously aggressive driver might attempt more overtakes, while a smooth driver might excel at tire management.

    **OUTPUT FORMAT:**
    For EACH lap from 1 to ${scenario.raceLaps}, provide the running order and all key events. Return a single, valid JSON object with a key "simulation" containing an array of lap objects, strictly following the provided schema.
    `;

    const parsedResult = await safeGenerateContent('gemini-2.5-pro', prompt, simulationSchema);
    return parsedResult.simulation;
}

export async function askFollowUpQuestion(
  scenario: RaceScenario,
  strategy: StrategyAnalysis,
  history: ChatMessage[]
): Promise<string> {
    const contextPrompt = `
        You are an expert F1 race strategist acting as a helpful AI assistant. You are in a conversational chat with a user. Answer their questions concisely based ONLY on the provided context below. Do not use external knowledge.

        --- START OF CONTEXT ---
        
        **RACE SCENARIO:**
        - Track: ${scenario.track}
        - Track Degradation: ${scenario.trackDegradation}
        - Total Laps: ${scenario.raceLaps}
        - Weather Forecast: ${scenario.weather}
        - Available Tire Compounds: ${scenario.availableTires.join(', ')}
        - Lead Driver: ${scenario.startingGrid[0].driver}

        **STRATEGY ANALYSIS SUMMARY:**
        ${strategy.analysisText}

        --- END OF CONTEXT ---

        **CHAT HISTORY:**
        ${history.map(msg => `${msg.role}: ${msg.content}`).join('\n')}
    `;

    try {
        const response = await safeGenerateContent('gemini-2.5-pro', contextPrompt);
        return response;
    } catch (error) {
        console.error("Error in askFollowUpQuestion:", error);
        return "I'm sorry, but I encountered an error trying to process your question. Please try again.";
    }
}