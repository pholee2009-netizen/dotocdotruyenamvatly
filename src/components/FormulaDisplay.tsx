import React from 'react';

const FormulaDisplay: React.FC = () => {
  return (
    <div className="bg-white/60 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/50 text-center">
      <h3 className="text-lg font-bold text-slate-900 mb-4">Công thức tính</h3>
      <div className="my-4">
        <p className="text-3xl font-extrabold font-mono text-slate-800 tracking-wider">
          <span className="text-orange-600">v</span> = <span className="font-serif italic text-blue-600">λ</span> / <span className="font-serif italic text-emerald-600">T</span>
        </p>
      </div>
      <div className="text-left text-sm text-slate-700 space-y-2 mt-4 border-t border-slate-200/50 pt-4">
        <p className="font-medium flex items-center"><strong className="font-mono text-orange-600 text-lg w-6 text-center mr-2">v</strong>: Tốc độ truyền âm (m/s)</p>
        <p className="font-medium flex items-center"><strong className="font-serif italic text-blue-600 text-lg w-6 text-center mr-2">λ</strong>: Bước sóng (m)</p>
        <p className="font-medium flex items-center"><strong className="font-serif italic text-emerald-600 text-lg w-6 text-center mr-2">T</strong>: Chu kỳ (s)</p>
      </div>
    </div>
  );
};

export default FormulaDisplay;
