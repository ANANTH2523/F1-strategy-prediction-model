import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ReferenceLine } from 'recharts';
import { TelemetryData } from '../types';
import { getDriverTeamColor } from '../teamData';

interface TelemetryChartProps {
  data: TelemetryData[];
  drivers: string[];
}

// Removed hardcoded DRIVER_COLORS


const METRIC_CONFIG = {
  lapTime: { name: 'Lap Time', yAxisId: 'left', unit: 's', lineStyle: '0' },
  tireWear: { name: 'Tire Wear', yAxisId: 'right', unit: '%', lineStyle: '5 5' },
  fuelLoad: { name: 'Fuel Load', yAxisId: 'right', unit: 'kg', lineStyle: '10 2' },
  ersDeployment: { name: 'ERS Deployed', yAxisId: 'right', unit: 'kJ', lineStyle: '1 5' },
  tyreTemperature: { name: 'Tyre Temp', yAxisId: 'right', unit: '°C', lineStyle: '2 8' },
  brakeTemperature: { name: 'Brake Temp', yAxisId: 'right', unit: '°C', lineStyle: '8 2' },
  downforceLevel: { name: 'Downforce', yAxisId: 'right', unit: 'idx', lineStyle: '2 2 8 2' },
};

type MetricKey = keyof typeof METRIC_CONFIG;

const processDataForOverviewChart = (telemetryData: TelemetryData[], drivers: string[]) => {
  const pivotedData = new Map<number, { lap: number; [key: string]: any }>();

  telemetryData.forEach(entry => {
    if (!pivotedData.has(entry.lap)) {
      pivotedData.set(entry.lap, { lap: entry.lap });
    }
    const lapData = pivotedData.get(entry.lap)!;
    const driverKey = entry.driver; 

    Object.keys(METRIC_CONFIG).forEach(metricKey => {
       lapData[`${driverKey}_${metricKey}`] = entry[metricKey as keyof TelemetryData];
    });
  });

  return Array.from(pivotedData.values()).sort((a, b) => a.lap - b.lap);
};

const processDataForComparison = (
    telemetryData: TelemetryData[],
    driver1: string,
    driver2: string,
    metric: MetricKey
) => {
    const driver1Data = telemetryData.filter(d => d.driver === driver1);
    const driver2Data = telemetryData.filter(d => d.driver === driver2);
    const mergedData = [];
    const maxLaps = Math.max(
        driver1Data.map(d => d.lap).reduce((a, b) => Math.max(a, b), 0),
        driver2Data.map(d => d.lap).reduce((a, b) => Math.max(a, b), 0)
    );

    for (let i = 1; i <= maxLaps; i++) {
        const d1Lap = driver1Data.find(d => d.lap === i);
        const d2Lap = driver2Data.find(d => d.lap === i);
        
        const d1Metric = d1Lap ? d1Lap[metric] as number : null;
        const d2Metric = d2Lap ? d2Lap[metric] as number : null;
        
        const entry: { lap: number; [key: string]: any } = { lap: i };
        
        if (d1Metric !== null) entry[driver1] = d1Metric;
        if (d2Metric !== null) entry[driver2] = d2Metric;
        if (d1Metric !== null && d2Metric !== null) {
            entry.delta = d1Metric - d2Metric;
        }
        
        mergedData.push(entry);
    }
    return mergedData;
};

const CustomTooltip = ({ active, payload, label, context }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-600 p-3 rounded-lg shadow-lg">
        <p className="font-bold text-gray-200">{`Lap ${label}`}</p>
        <ul className="mt-2 space-y-1">
          {payload.map((entry: any, index: number) => (
            <li key={`item-${index}`} style={{ color: entry.color }}>
              <span className="text-sm">{`${entry.name}: ${entry.value.toFixed(context === 'delta' ? 3 : 2)}`}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return null;
};


const TelemetryChart: React.FC<TelemetryChartProps> = ({ data, drivers }) => {
  const [visibleMetrics, setVisibleMetrics] = useState<Set<MetricKey>>(new Set(['lapTime', 'tireWear']));
  const [inactiveLines, setInactiveLines] = useState<Set<string>>(new Set());
  const [chartMode, setChartMode] = useState<'Overview' | 'Comparison'>('Overview');
  const [comparisonDrivers, setComparisonDrivers] = useState<[string, string]>([drivers[0], drivers[1]]);
  const [comparisonMetric, setComparisonMetric] = useState<MetricKey>('lapTime');
  
  useEffect(() => {
    if (drivers.length >= 2) {
      // Avoid setting the same driver if the list changes
      const newDriver1 = drivers.includes(comparisonDrivers[0]) ? comparisonDrivers[0] : drivers[0];
      let newDriver2 = drivers.includes(comparisonDrivers[1]) ? comparisonDrivers[1] : drivers[1];
      if (newDriver1 === newDriver2) {
        newDriver2 = drivers.find(d => d !== newDriver1) || drivers[1];
      }
      setComparisonDrivers([newDriver1, newDriver2]);
    }
  }, [drivers]);


  const handleLegendClick = (e: any) => {
    const { dataKey } = e;
    setInactiveLines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dataKey)) {
        newSet.delete(dataKey);
      } else {
        newSet.add(dataKey);
      }
      return newSet;
    });
  };

  const toggleMetric = (metric: MetricKey) => {
    setVisibleMetrics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(metric)) {
        newSet.delete(metric);
      } else {
        newSet.add(metric);
      }
      return newSet;
    });
  };

  const overviewChartData = useMemo(() => processDataForOverviewChart(data, drivers), [data, drivers]);
  const comparisonChartData = useMemo(() => processDataForComparison(data, comparisonDrivers[0], comparisonDrivers[1], comparisonMetric), [data, comparisonDrivers, comparisonMetric]);
  
  if (data.length === 0) {
    return <div className="text-center text-gray-500">Awaiting telemetry data...</div>;
  }

  return (
    <div>
      <div className="mb-4 flex justify-center rounded-lg bg-gray-900 p-1 border border-gray-700 max-w-sm mx-auto">
        <button onClick={() => setChartMode('Overview')} className={`w-1/2 rounded-md py-2 text-sm font-medium transition-colors duration-300 ${chartMode === 'Overview' ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Overview</button>
        <button onClick={() => setChartMode('Comparison')} className={`w-1/2 rounded-md py-2 text-sm font-medium transition-colors duration-300 ${chartMode === 'Comparison' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Driver Comparison</button>
      </div>

      {chartMode === 'Overview' ? (
        <>
            <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
                <LineChart data={overviewChartData} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                <XAxis dataKey="lap" stroke="#A0AEC0" label={{ value: 'Lap', position: 'insideBottom', offset: -15, fill: '#A0AEC0' }} />
                <YAxis yAxisId="left" stroke="#38B2AC" label={{ value: 'Lap Time (s)', angle: -90, position: 'insideLeft', fill: '#38B2AC', dy: 40 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#D53F8C" label={{ value: 'Value', angle: 90, position: 'insideRight', fill: '#D53F8C', dy: -20 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend onClick={handleLegendClick} wrapperStyle={{fontSize: '10px', margin: '0 10px'}} />
                
                {Object.entries(METRIC_CONFIG).map(([metricKey, config]) => {
                    if (visibleMetrics.has(metricKey as MetricKey)) {
                    return drivers.map((driver, index) => {
                        const dataKey = `${driver}_${metricKey}`;
                        const driverLastName = driver.split(' ').pop() || driver;
                        return (
                        <Line
                            key={dataKey}
                            hide={inactiveLines.has(dataKey)}
                            yAxisId={config.yAxisId}
                            type="monotone"
                            dataKey={dataKey}
                            name={`${driverLastName} ${config.name}`}
                            stroke={getDriverTeamColor(driver)}
                            strokeDasharray={config.lineStyle}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 6 }}
                        />
                        );
                    });
                    }
                    return null;
                })}
                </LineChart>
            </ResponsiveContainer>
            </div>
             <div className="mt-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <h4 className="text-sm font-bold text-center mb-4 text-gray-300 uppercase tracking-wider">Chart Controls</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-x-4 gap-y-3">
                {Object.entries(METRIC_CONFIG).map(([key, config]) => (
                    <label key={key} className="flex items-center space-x-2 cursor-pointer group">
                    <input
                        type="checkbox"
                        checked={visibleMetrics.has(key as MetricKey)}
                        onChange={() => toggleMetric(key as MetricKey)}
                        className="form-checkbox h-4 w-4 rounded bg-gray-700 border-gray-600 text-red-500 focus:ring-2 focus:ring-offset-0 focus:ring-offset-gray-800 focus:ring-red-500"
                        style={{ accentColor: '#E53E3E' }}
                    />
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{config.name}</span>
                    </label>
                ))}
                </div>
            </div>
        </>
      ) : (
         <div className="mt-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
                <select 
                    value={comparisonDrivers[0]} 
                    onChange={e => setComparisonDrivers([e.target.value, comparisonDrivers[1]])}
                    className="w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                    {drivers.map(d => <option key={`d1-${d}`} value={d} disabled={d === comparisonDrivers[1]}>{d}</option>)}
                </select>
                 <select 
                    value={comparisonDrivers[1]} 
                    onChange={e => setComparisonDrivers([comparisonDrivers[0], e.target.value])}
                    className="w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                    {drivers.map(d => <option key={`d2-${d}`} value={d} disabled={d === comparisonDrivers[0]}>{d}</option>)}
                </select>
            </div>
            <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700 mb-6">
                <div className="flex flex-wrap justify-center gap-2">
                    {Object.entries(METRIC_CONFIG).map(([key, config]) => (
                        <button
                            key={key}
                            onClick={() => setComparisonMetric(key as MetricKey)}
                            className={`px-3 py-1 text-xs font-bold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${comparisonMetric === key ? 'bg-blue-600 text-white focus:ring-blue-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 focus:ring-gray-500'}`}
                        >
                            {config.name}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="space-y-8">
                <div>
                    <h4 className="font-bold text-lg mb-2 text-gray-200 text-center">Direct Comparison: {METRIC_CONFIG[comparisonMetric].name}</h4>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={comparisonChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                            <XAxis dataKey="lap" stroke="#A0AEC0" />
                            <YAxis stroke="#A0AEC0" domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Line type="monotone" dataKey={comparisonDrivers[0]} name={comparisonDrivers[0]} stroke={getDriverTeamColor(comparisonDrivers[0])} strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey={comparisonDrivers[1]} name={comparisonDrivers[1]} stroke={getDriverTeamColor(comparisonDrivers[1])} strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div>
                    <h4 className="font-bold text-lg mb-2 text-gray-200 text-center">Performance Delta: {METRIC_CONFIG[comparisonMetric].name}</h4>
                    <p className="text-xs text-center text-gray-400 mb-2">Positive = {comparisonDrivers[0]} is higher/slower. Negative = {comparisonDrivers[1]} is higher/slower.</p>
                     <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={comparisonChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                            <XAxis dataKey="lap" stroke="#A0AEC0" />
                            <YAxis stroke="#A0AEC0" />
                            <Tooltip content={<CustomTooltip context="delta" />} />
                            <ReferenceLine y={0} stroke="#E53E3E" strokeDasharray="3 3" />
                            <defs>
                                <linearGradient id="deltaColor" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="delta" stroke="#8884d8" fillOpacity={1} fill="url(#deltaColor)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default TelemetryChart;
