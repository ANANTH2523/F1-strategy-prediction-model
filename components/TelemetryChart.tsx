import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TelemetryData } from '../types';

interface TelemetryChartProps {
  data: TelemetryData[];
  drivers: string[];
}

const DRIVER_COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
  '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
  '#c49c94', '#f7b6d2', '#c7c7c7', '#dbdb8d', '#9edae5'
];

const METRIC_CONFIG = {
  lapTime: { name: 'Lap Time', yAxisId: 'left', unit: 's', lineStyle: '0', color: '#38B2AC' },
  tireWear: { name: 'Tire Wear', yAxisId: 'right', unit: '%', lineStyle: '5 5', color: '#D53F8C' },
  fuelLoad: { name: 'Fuel Load', yAxisId: 'right', unit: 'kg', lineStyle: '10 2', color: '#63B3ED' },
  ersDeployment: { name: 'ERS Deployed', yAxisId: 'right', unit: 'kJ', lineStyle: '1 5', color: '#F6E05E' },
  tyreTemperature: { name: 'Tyre Temp', yAxisId: 'right', unit: '°C', lineStyle: '2 8', color: '#B794F4' },
  brakeTemperature: { name: 'Brake Temp', yAxisId: 'right', unit: '°C', lineStyle: '8 2', color: '#F56565' },
  downforceLevel: { name: 'Downforce', yAxisId: 'right', unit: 'idx', lineStyle: '2 2 8 2', color: '#ED8936' },
};

type MetricKey = keyof typeof METRIC_CONFIG;

const processDataForOverviewChart = (telemetryData: TelemetryData[]) => {
  const pivotedData = new Map<number, { lap: number; [key: string]: any }>();

  telemetryData.forEach(entry => {
    if (!pivotedData.has(entry.lap)) {
      pivotedData.set(entry.lap, { lap: entry.lap });
    }
    const lapData = pivotedData.get(entry.lap)!;
    const driverKey = entry.driver.split(' ').pop() || entry.driver;

    Object.keys(METRIC_CONFIG).forEach(metricKey => {
       lapData[`${driverKey}_${metricKey}`] = entry[metricKey as keyof TelemetryData];
    });
  });

  return Array.from(pivotedData.values()).sort((a, b) => a.lap - b.lap);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-600 p-3 rounded-lg shadow-lg">
        <p className="font-bold text-gray-200">{`Lap ${label}`}</p>
        <ul className="mt-2 space-y-1">
          {payload.map((entry: any, index: number) => (
            <li key={`item-${index}`} style={{ color: entry.color }}>
              <span className="text-sm">{`${entry.name}: ${entry.value.toFixed(2)}`}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return null;
};


const TelemetryChart: React.FC<TelemetryChartProps> = ({ data, drivers }) => {
  const [visibleMetrics, setVisibleMetrics] = useState<Set<MetricKey>>(
    new Set(['lapTime', 'tireWear'])
  );
  const [inactiveLines, setInactiveLines] = useState<Set<string>>(new Set());
  const [chartMode, setChartMode] = useState<'Overview' | 'Comparison'>('Overview');
  const [comparisonDrivers, setComparisonDrivers] = useState<[string, string]>([drivers[0], drivers[1]]);
  
  useEffect(() => {
    // Reset comparison drivers if the list of drivers changes
    if (drivers.length >= 2) {
      setComparisonDrivers([drivers[0], drivers[1]]);
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

  const overviewChartData = useMemo(() => processDataForOverviewChart(data), [data]);
  const driverKeys = useMemo(() => drivers.map(d => d.split(' ').pop() || d), [drivers]);

  const renderSingleDriverChart = (driverName: string, driverData: TelemetryData[]) => (
    <div className="w-full">
        <h4 className="text-center font-bold text-lg mb-2 text-gray-200">{driverName}</h4>
         <ResponsiveContainer width="100%" height={300}>
            <LineChart data={driverData} syncId="driverComparison" margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                <XAxis dataKey="lap" stroke="#A0AEC0" />
                <YAxis yAxisId="left" stroke="#38B2AC" />
                <YAxis yAxisId="right" orientation="right" stroke="#D53F8C" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{fontSize: '10px'}}/>
                {Object.entries(METRIC_CONFIG).map(([metricKey, config]) => {
                    if (visibleMetrics.has(metricKey as MetricKey)) {
                        return (
                            <Line
                                key={metricKey}
                                yAxisId={config.yAxisId}
                                type="monotone"
                                dataKey={metricKey}
                                name={config.name}
                                stroke={config.color}
                                strokeDasharray={config.lineStyle}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 6 }}
                            />
                        );
                    }
                    return null;
                })}
            </LineChart>
        </ResponsiveContainer>
    </div>
  );

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
        <div style={{ width: '100%', height: 350 }}>
          <ResponsiveContainer>
            <LineChart data={overviewChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
              <XAxis dataKey="lap" stroke="#A0AEC0" label={{ value: 'Lap', position: 'insideBottom', offset: -5, fill: '#A0AEC0' }} />
              <YAxis yAxisId="left" stroke="#38B2AC" label={{ value: 'Lap Time (s)', angle: -90, position: 'insideLeft', fill: '#38B2AC' }} />
              <YAxis yAxisId="right" orientation="right" stroke="#D53F8C" label={{ value: 'Value', angle: 90, position: 'insideRight', fill: '#D53F8C' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend onClick={handleLegendClick} wrapperStyle={{fontSize: '10px', margin: '0 10px'}} />
              
              {Object.entries(METRIC_CONFIG).map(([metricKey, config]) => {
                if (visibleMetrics.has(metricKey as MetricKey)) {
                  return driverKeys.map((driverKey, index) => {
                    const dataKey = `${driverKey}_${metricKey}`;
                    return (
                      <Line
                        key={dataKey}
                        hide={inactiveLines.has(dataKey)}
                        yAxisId={config.yAxisId}
                        type="monotone"
                        dataKey={dataKey}
                        name={`${driverKey} ${config.name}`}
                        stroke={DRIVER_COLORS[index % DRIVER_COLORS.length]}
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
            <div className="flex flex-col md:flex-row gap-4">
                {renderSingleDriverChart(comparisonDrivers[0], data.filter(d => d.driver === comparisonDrivers[0]))}
                {renderSingleDriverChart(comparisonDrivers[1], data.filter(d => d.driver === comparisonDrivers[1]))}
            </div>
         </div>
      )}

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
    </div>
  );
};

export default TelemetryChart;