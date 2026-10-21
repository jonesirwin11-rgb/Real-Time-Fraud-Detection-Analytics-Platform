import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const AlertToast = ({ alert, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(alert.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [alert.id, onClose]);

  const tx = alert.transaction;
  const reason = alert.rulesTriggered ? alert.rulesTriggered.join(', ') : 'Rule Triggered';

  return (
    <div className="bg-white border-l-4 border-l-rose-500 border border-slate-200/90 shadow-lg rounded-xl p-4 flex items-start gap-3 w-80 toast-slide-in pointer-events-auto">
      <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <AlertTriangle className="w-4 h-4 text-rose-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-xs tracking-wider text-rose-700 uppercase">Fraud Detected</span>
        </div>
        <p className="text-xs mt-1 text-slate-600">
          <span className="font-bold text-slate-900 font-mono">${tx.amount.toFixed(2)}</span> on card 
          <span className="font-mono text-indigo-600 font-medium ml-1">{tx.cardId}</span>
        </p>
        <span className="inline-block mt-1.5 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-medium truncate max-w-full">
          {reason}
        </span>
      </div>
      <button 
        onClick={() => onClose(alert.id)} 
        className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-50"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default AlertToast;
