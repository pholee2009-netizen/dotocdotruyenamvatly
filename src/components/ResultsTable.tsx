
import React from 'react';
import { TrialResult } from '../types';

interface ResultsTableProps {
  trials: TrialResult[];
}

const ResultsTable: React.FC<ResultsTableProps> = ({ trials }) => {
  return (
    <div className="w-full bg-white/60 backdrop-blur-md rounded-xl shadow-lg border border-white/50 p-4">
        <h3 className="text-lg font-semibold text-slate-800 mb-2 px-2">Bảng số liệu</h3>
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-700 uppercase bg-slate-500/10">
                    <tr>
                        <th scope="col" className="px-6 py-3 rounded-l-lg">Lần thí nghiệm</th>
                        <th scope="col" className="px-6 py-3">Bước sóng (λ) (m)</th>
                        <th scope="col" className="px-6 py-3">Chu kỳ (T) (s)</th>
                        <th scope="col" className="px-6 py-3 rounded-r-lg">Tốc độ (v) (m/s)</th>
                    </tr>
                </thead>
                <tbody>
                    {trials.map((trial) => (
                        <tr key={trial.id} className="border-b border-slate-200/50 hover:bg-slate-500/10">
                            <td className="px-6 py-4 font-medium text-slate-900">{trial.id}</td>
                            <td className="px-6 py-4">{trial.wavelength.toFixed(4)}</td>
                            <td className="px-6 py-4">{trial.period.toFixed(5)}</td>
                            <td className="px-6 py-4">{(trial.wavelength / trial.period).toFixed(2)}</td>
                        </tr>
                    ))}
                    {trials.length < 3 && Array.from({ length: 3 - trials.length }).map((_, index) => (
                         <tr key={`placeholder-${index}`} className="border-b border-slate-200/50">
                            <td className="px-6 py-4 text-slate-400">{trials.length + index + 1}</td>
                            <td className="px-6 py-4 text-slate-400">...</td>
                            <td className="px-6 py-4 text-slate-400">...</td>
                            <td className="px-6 py-4 text-slate-400">...</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default ResultsTable;
