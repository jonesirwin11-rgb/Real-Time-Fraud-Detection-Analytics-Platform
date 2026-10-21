import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ShieldAlert, LogOut, Volume2, VolumeX } from 'lucide-react';

const Navbar = () => {
  const { user, logout, soundEnabled, setSoundEnabled } = useContext(AuthContext);

  if (!user) return null;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        {/* Left: Minimal branding + Single Live Pipeline chip */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <span className="text-base font-bold text-slate-900 tracking-tight">
            Fraud Analytics
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Live Pipeline
          </span>
        </div>

        {/* Right: [Alert Sound toggle] | [User avatar / name & role] | [End Session button] */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSoundEnabled(prev => !prev)} 
            className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors shadow-xs ${
              soundEnabled 
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-indigo-600" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
            <span>{soundEnabled ? 'Alert sound: ON' : 'Alert sound: OFF'}</span>
          </button>

          <div className="h-4 w-px bg-slate-200"></div>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700 uppercase">
              {user.username.charAt(0)}
            </div>
            <div className="flex flex-col items-start leading-tight">
              <span className="text-xs font-semibold text-slate-900">{user.username}</span>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{user.role} Authorization</span>
            </div>
          </div>

          <button 
            onClick={logout} 
            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold py-1.5 px-3 rounded-lg shadow-xs transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
            <span>End Session</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
