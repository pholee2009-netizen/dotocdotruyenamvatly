
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';
import { DataPoint } from '../types';

interface WaveChartProps {
  data: DataPoint[];
  title: string;
  xAxisLabel: string;
  lineColor: string;
}

const WaveChart: React.FC<WaveChartProps> = ({ data, title, xAxisLabel, lineColor }) => {
  return (
    <div className="w-full h-64 md:h-80 bg-white/60 backdrop-blur-md p-4 rounded-xl shadow-lg border border-white/50">
      <h3 className="text-center font-semibold text-slate-700 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 20,
            left: 10,
            bottom: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="axisValue" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(tick) => tick.toFixed(3)}>
             <Label value={xAxisLabel} offset={-15} position="insideBottom" fill="#666" />
          </XAxis>
          <YAxis domain={[-1.1, 1.1]}>
             <Label value="u (li độ)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} fill="#666" />
          </YAxis>
          <Tooltip
            formatter={(value: number) => value.toFixed(4)}
            labelFormatter={(label: number) => `${xAxisLabel}: ${label.toFixed(4)}`}
            contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(5px)',
                border: '1px solid rgba(200, 200, 200, 0.5)',
                borderRadius: '0.5rem',
            }}
          />
          <Legend verticalAlign="top" height={36} />
          <Line type="monotone" dataKey="amplitude" name="Li độ dao động" stroke={lineColor} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WaveChart;
