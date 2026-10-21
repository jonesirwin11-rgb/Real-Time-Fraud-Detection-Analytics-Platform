import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, AlertTriangle, UserPlus, LogIn } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isRegister, setIsRegister] = useState(false);
  const { login, register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (isRegister) {
        await register(username, password);
        await login(username, password);
        navigate('/dashboard');
      } else {
        await login(username, password);
        navigate('/dashboard');
      }
    } catch (err) {
      const serverMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      setError(serverMsg || (isRegister ? "Registration failed" : "Authentication failed"));
    }
  };

  const toggleMode = () => {
    setIsRegister(prev => !prev);
    setError(null);
  };

  return (
    <div className="flex bg-slate-50 min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-sm p-8">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-900 tracking-tight">
          Fraud Analytics Platform
        </h2>
        <p className="text-center text-slate-500 text-xs font-semibold uppercase tracking-wider mt-1 mb-6">
          {isRegister ? 'Operator Registration' : 'Operator Authentication'}
        </p>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-700 text-xs font-semibold uppercase tracking-wider mb-1.5">
              Operator ID
            </label>
            <input 
              type="text" 
              className="w-full bg-white border border-slate-300 rounded-lg py-2.5 px-3.5 text-slate-900 text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors placeholder:text-slate-400" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
              placeholder="e.g. analyst_01"
            />
          </div>
          <div>
            <label className="block text-slate-700 text-xs font-semibold uppercase tracking-wider mb-1.5">
              Passkey
            </label>
            <input 
              type="password" 
              className="w-full bg-white border border-slate-300 rounded-lg py-2.5 px-3.5 text-slate-900 text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors placeholder:text-slate-400" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              placeholder="••••••••"
            />
          </div>
          <div className="pt-2">
            <button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {isRegister ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  Register & Sign In
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In to Console
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <button 
            type="button" 
            onClick={toggleMode}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 tracking-wider uppercase transition-colors"
          >
            {isRegister 
              ? 'Already registered? Switch to Sign In' 
              : "Need an account? Switch to Register"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
