import React, { useEffect, useState, useContext, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';
import { Activity, ShieldAlert, BarChart3, List, AlertTriangle, Zap, Server } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import AlertToast from '../components/AlertToast';

// Web Audio API beep oscillator
const playBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    osc.onended = () => {
      ctx.close();
    };
  } catch (err) {
    console.warn("Web Audio beep error:", err);
  }
};

const Dashboard = () => {
  const { token, soundEnabled } = useContext(AuthContext);
  const [transactions, setTransactions] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Real-time cumulative statistics (not capped by the 50-row display limit)
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [alertsProcessed, setAlertsProcessed] = useState(0);

  // Set of processed transaction IDs to prevent double-counting in React StrictMode
  const processedIdsRef = useRef(new Set());

  // Real-time backend socket connection
  const { latestFraudAlert, latestNewTransaction } = useSocket('http://localhost:3000');

  // Fetch initial transactions and stats on mount with Bearer token
  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [txRes, statsRes] = await Promise.all([
          axios.get('http://localhost:3000/api/transactions', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:3000/api/transactions/stats', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (isMounted) {
          if (Array.isArray(txRes.data)) {
            txRes.data.forEach(t => {
              if (t._id) processedIdsRef.current.add(t._id);
            });
            setTransactions(txRes.data);
          }
          if (statsRes.data) {
            setTotalProcessed(statsRes.data.total || 0);
            setAlertsProcessed(statsRes.data.flagged || 0);
          }
        }
      } catch (err) {
        console.error("Failed to fetch initial dashboard data:", err);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [token]);

  // Prepend real socket newTransaction events (deduped by _id with useRef Set)
  // Counters incremented OUTSIDE updater to prevent double-counting in StrictMode
  useEffect(() => {
    if (!latestNewTransaction || !latestNewTransaction._id) return;
    const txId = latestNewTransaction._id;

    if (processedIdsRef.current.has(txId)) {
      return;
    }
    processedIdsRef.current.add(txId);

    // Update cumulative counters outside state updater
    setTotalProcessed(count => count + 1);
    if (latestNewTransaction.flagged) {
      setAlertsProcessed(count => count + 1);
    }

    setTransactions(prev => [latestNewTransaction, ...prev.filter(t => t._id !== txId)].slice(0, 50));
  }, [latestNewTransaction]);

  // Show AlertToast on real fraudAlert events
  useEffect(() => {
    if (!latestFraudAlert) return;
    const tx = latestFraudAlert.transaction;
    const toastId = tx?._id || `alert-${Date.now()}-${Math.random()}`;
    const alertPayload = {
      id: toastId,
      transaction: tx,
      rulesTriggered: latestFraudAlert.rulesTriggered || tx?.rulesTriggered || []
    };

    setToasts(prev => [alertPayload, ...prev.filter(t => t.id !== toastId)]);
    if (soundEnabled) {
      playBeep();
    }
  }, [latestFraudAlert, soundEnabled]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Chart aggregation: group by 10-second intervals to show actual trend lines
  const chartData = useMemo(() => {
    const buckets = {};
    const sorted = [...transactions].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    sorted.forEach(tx => {
      const d = new Date(tx.timestamp);
      const sec = Math.floor(d.getSeconds() / 10) * 10;
      d.setSeconds(sec, 0);
      const bucketKey = d.getTime();
      const timeLabel = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      if (!buckets[bucketKey]) {
        buckets[bucketKey] = { key: bucketKey, time: timeLabel, total: 0, flagged: 0 };
      }
      buckets[bucketKey].total += 1;
      if (tx.flagged) {
        buckets[bucketKey].flagged += 1;
      }
    });

    const result = Object.values(buckets).sort((a, b) => a.key - b.key);
    if (result.length === 1) {
      const prevTime = new Date(result[0].key - 10000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return [{ key: result[0].key - 10000, time: prevTime, total: 0, flagged: 0 }, ...result];
    }
    return result.slice(-15);
  }, [transactions]);

  const displayTotal = Math.max(totalProcessed, transactions.length);
  const displayAlerts = Math.max(alertsProcessed, transactions.filter(t => t.flagged).length);
  const fraudRate = displayTotal > 0 ? ((displayAlerts / displayTotal) * 100).toFixed(1) : 0;
  const flaggedTxs = useMemo(() => transactions.filter(t => t.flagged), [transactions]);

  // Derive Primary Vector from rulesTriggered across transactions in state
  const mostCommonReason = useMemo(() => {
    const counts = {};
    transactions.forEach(tx => {
      if (tx.flagged && Array.isArray(tx.rulesTriggered)) {
        tx.rulesTriggered.forEach(rule => {
          counts[rule] = (counts[rule] || 0) + 1;
        });
      }
    });
    let topRule = "N/A";
    let maxCount = 0;
    Object.entries(counts).forEach(([rule, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topRule = rule;
      }
    });
    return topRule;
  }, [transactions]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col relative font-sans">
      {/* Alert Toasts Top-Right Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <AlertToast key={toast.id} alert={toast} onClose={removeToast} />
        ))}
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto py-5 px-4 sm:px-6 lg:px-8 z-10">
        
        {/* Tab Navigation Segmented Control - positioned immediately below navbar */}
        <div className="inline-flex p-1 bg-slate-100 border border-slate-200/80 rounded-xl mb-6 shadow-xs">
          <button 
            onClick={() => setActiveTab('overview')} 
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'overview' 
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className={`w-3.5 h-3.5 ${activeTab === 'overview' ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span>Overview</span>
          </button>
          <button 
            onClick={() => setActiveTab('transactions')} 
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'transactions' 
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className={`w-3.5 h-3.5 ${activeTab === 'transactions' ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span>Transactions</span>
          </button>
          <button 
            onClick={() => setActiveTab('alerts')} 
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'alerts' 
                ? 'bg-white text-rose-700 shadow-xs border border-rose-200/60' 
                : 'text-slate-600 hover:text-rose-600'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${activeTab === 'alerts' ? 'text-rose-600' : 'text-slate-400'}`} />
            <span>Alerts</span>
            {displayAlerts > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded-full text-[10px] font-bold">
                {displayAlerts}
              </span>
            )}
          </button>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Metric Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-indigo-600" />
                    Transactions processed
                  </span>
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                    Live Stream
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-slate-900 font-mono tracking-tight">{displayTotal}</p>
                  <span className="text-xs text-slate-500 font-medium">transactions</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    Alerts
                  </span>
                  <span className="text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200/60">
                    Anomalies
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-rose-600 font-mono tracking-tight">{displayAlerts}</p>
                  <span className="text-xs text-slate-500 font-medium">flagged</span>
                </div>
              </div>
            </div>

            {/* Main Trend Chart Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Server className="w-4 h-4 text-indigo-600" />
                    Transaction Volume & Threat Trend
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Aggregated in 10-second rolling intervals</p>
                </div>
                
                <div className="flex items-center gap-4 text-sm bg-slate-50 px-4 py-2 rounded-lg border border-slate-200/80">
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Threat Index</span>
                    <span className="text-rose-600 font-bold font-mono text-sm">{fraudRate}%</span>
                  </div>
                  <div className="w-px h-7 bg-slate-200"></div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Primary Vector</span>
                    <span className="text-indigo-600 font-bold text-sm">{mostCommonReason}</span>
                  </div>
                </div>
              </div>
              
              <div style={{ height: '300px' }} className="w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="time" 
                      stroke="#94A3B8" 
                      tick={{ fill: '#64748B', fontSize: 11 }} 
                      tickLine={false} 
                      axisLine={{ stroke: '#E2E8F0' }} 
                    />
                    <YAxis 
                      stroke="#94A3B8" 
                      tick={{ fill: '#64748B', fontSize: 11 }} 
                      tickLine={false} 
                      axisLine={false} 
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#FFFFFF', 
                        borderColor: '#E2E8F0', 
                        borderRadius: '8px', 
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)', 
                        color: '#0F172A',
                        fontSize: '12px'
                      }}
                      itemStyle={{ padding: '2px 0' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#4F46E5" 
                      strokeWidth={2.5} 
                      dot={{ r: 3, fill: '#4F46E5' }} 
                      name="Total" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="flagged" 
                      stroke="#E11D48" 
                      strokeWidth={2.5} 
                      dot={{ r: 3, fill: '#E11D48' }} 
                      name="Flagged" 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* TRANSACTIONS TAB */}
        {activeTab === 'transactions' && (
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/50 flex justify-between items-center">
               <h2 className="text-slate-900 font-semibold text-sm flex items-center gap-2">
                 <Zap className="w-4 h-4 text-indigo-600" /> Real-Time Transactions Feed
               </h2>
               <span className="text-xs text-slate-500 font-medium">Showing latest {transactions.length} rows</span>
             </div>
             <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-slate-100">
                 <thead>
                   <tr className="bg-slate-50/80 border-b border-slate-200">
                     <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
                     <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Card ID</th>
                     <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                     <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                     <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {transactions.map((tx, idx) => (
                     <tr 
                       key={tx._id || idx} 
                       className={`transition-colors ${
                         tx.flagged 
                           ? "bg-rose-50/40 text-rose-950 border-l-4 border-l-rose-500 hover:bg-rose-50/70" 
                           : "hover:bg-slate-50/80 border-l-4 border-l-transparent"
                       }`}
                     >
                       <td className="px-6 py-3.5 whitespace-nowrap text-xs text-slate-500 font-mono">
                         {new Date(tx.timestamp).toLocaleTimeString()}
                       </td>
                       <td className="px-6 py-3.5 whitespace-nowrap text-sm font-semibold font-mono text-slate-900">
                         {tx.cardId}
                       </td>
                       <td className="px-6 py-3.5 whitespace-nowrap text-sm font-semibold font-mono text-slate-900">
                         ${Number(tx.amount).toFixed(2)}
                       </td>
                       <td className="px-6 py-3.5 whitespace-nowrap text-sm text-slate-600">
                         {tx.location}
                       </td>
                       <td className="px-6 py-3.5 whitespace-nowrap">
                         {tx.flagged ? (
                           <span className="px-2.5 py-0.5 inline-flex text-xs font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200/60">
                             Flagged
                           </span>
                         ) : (
                           <span className="px-2.5 py-0.5 inline-flex text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                             Clean
                           </span>
                         )}
                       </td>
                     </tr>
                   ))}
                   {transactions.length === 0 && (
                     <tr>
                       <td colSpan="5" className="px-6 py-12 text-center text-slate-500 text-sm">
                         No transactions recorded yet.
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {/* ALERTS TAB */}
        {activeTab === 'alerts' && (
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/50 flex justify-between items-center">
               <h2 className="text-rose-700 font-semibold text-sm flex items-center gap-2">
                 <AlertTriangle className="w-4 h-4 text-rose-600"/> Security Incidents & Anomalies
               </h2>
               <span className="text-xs text-slate-500 font-medium">{flaggedTxs.length} incidents logged</span>
             </div>
             <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-slate-100">
                 <thead>
                   <tr className="bg-slate-50/80 border-b border-slate-200">
                     <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
                     <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Card ID</th>
                     <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                     <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Rules Triggered</th>
                     <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Risk Level</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {flaggedTxs.map((tx, idx) => (
                     <tr key={tx._id || idx} className="bg-rose-50/30 border-l-4 border-l-rose-500 hover:bg-rose-50/60 transition-colors">
                       <td className="px-6 py-3.5 whitespace-nowrap text-xs text-slate-500 font-mono">
                         {new Date(tx.timestamp).toLocaleTimeString()}
                       </td>
                       <td className="px-6 py-3.5 whitespace-nowrap text-sm font-semibold font-mono text-slate-900">
                         {tx.cardId}
                       </td>
                       <td className="px-6 py-3.5 whitespace-nowrap text-sm font-semibold text-rose-600 font-mono">
                         ${Number(tx.amount).toFixed(2)}
                       </td>
                       <td className="px-6 py-3.5 whitespace-nowrap">
                         <div className="flex flex-wrap gap-1">
                           {Array.isArray(tx.rulesTriggered) && tx.rulesTriggered.length > 0 ? (
                             tx.rulesTriggered.map((r, i) => (
                               <span key={i} className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md text-xs border border-slate-200/60">
                                 {r}
                               </span>
                             ))
                           ) : (
                             <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md text-xs border border-slate-200/60">
                               {tx.ruleTriggered || 'Anomaly Detected'}
                             </span>
                           )}
                         </div>
                       </td>
                       <td className="px-6 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-semibold font-mono text-slate-700 w-6">{tx.riskScore}</span>
                            <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                style={{ width: `${Math.min(tx.riskScore || 0, 100)}%` }} 
                                className="h-full bg-rose-500 rounded-full"
                              ></div>
                            </div>
                          </div>
                       </td>
                     </tr>
                   ))}
                   {flaggedTxs.length === 0 && (
                     <tr>
                       <td colSpan="5" className="px-6 py-12 text-center text-slate-500 text-sm">
                         No alerts recorded yet. Pipeline clean.
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default Dashboard;
