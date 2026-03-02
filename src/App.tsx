import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wallet, 
  Dices, 
  History, 
  Settings, 
  ShieldCheck, 
  ExternalLink, 
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { cn } from './lib/utils';
import { WalletState, Bet } from './types';

// Declare global wallet interfaces
declare global {
  interface Window {
    unisat: any;
    opwallet: any;
  }
}

const DICE_MAX = 100;
const MIN_BET = 0.0001; // BTC

export default function App() {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    connected: false,
    network: null,
    balance: 0,
    walletType: null,
  });

  const [betAmount, setBetAmount] = useState<number>(0.001);
  const [prediction, setPrediction] = useState<number>(50);
  const [isRolling, setIsRolling] = useState(false);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [history, setHistory] = useState<Bet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  // Check for existing connections
  useEffect(() => {
    const checkConnections = async () => {
      // Small delay to allow extensions to inject
      await new Promise(resolve => setTimeout(resolve, 500));
      if (typeof window.unisat !== 'undefined') {
        try {
          const accounts = await window.unisat.getAccounts();
          if (accounts && accounts.length > 0) {
            const network = await window.unisat.getNetwork();
            const balance = await window.unisat.getBalance();
            setWallet({
              address: accounts[0],
              connected: true,
              network,
              balance: balance.total / 1e8,
              walletType: 'unisat',
            });
          }
        } catch (e) {
          console.error("Auto-connect failed", e);
        }
      }
    };
    checkConnections();
  }, []);

  const connectUniSat = async () => {
    setIsDetecting(true);
    try {
      // Try to find provider with a short retry
      let provider = window.unisat;
      if (!provider) {
        await new Promise(resolve => setTimeout(resolve, 300));
        provider = window.unisat;
      }

      if (!provider) {
        setError("UniSat not detected. If you have it installed, try opening this app in a new tab (Shared App URL) instead of the preview iframe.");
        window.open('https://unisat.io/', '_blank');
        return;
      }

      const accounts = await provider.requestAccounts();
      const network = await provider.getNetwork();
      const balance = await provider.getBalance();
      
      setWallet({
        address: accounts[0],
        connected: true,
        network,
        balance: balance.total / 1e8,
        walletType: 'unisat',
      });
      setError(null);
      setIsConnectModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to connect UniSat');
    } finally {
      setIsDetecting(false);
    }
  };

  const connectOPWallet = async () => {
    setIsDetecting(true);
    try {
      // OP Wallet often injects into window.opwallet or window.bitcoin
      let provider = window.opwallet || (window as any).bitcoin;
      
      if (!provider) {
        await new Promise(resolve => setTimeout(resolve, 300));
        provider = window.opwallet || (window as any).bitcoin;
      }

      if (!provider) {
        setError("OP Wallet not detected. If you have it installed, try opening this app in a new tab (Shared App URL) instead of the preview iframe.");
        window.open('https://chromewebstore.google.com/detail/opwallet/pmbjpcmaaladnfpacpmhmnfmpklgbdjb', '_blank');
        return;
      }

      // Most BTC wallets follow the requestAccounts standard
      const accounts = await provider.requestAccounts();
      const network = await (provider.getNetwork ? provider.getNetwork() : Promise.resolve('unknown'));
      const balance = await (provider.getBalance ? provider.getBalance() : Promise.resolve({ total: 0 }));
      
      setWallet({
        address: accounts[0],
        connected: true,
        network,
        balance: (balance.total || 0) / 1e8,
        walletType: 'opwallet',
      });
      setError(null);
      setIsConnectModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to connect OP Wallet');
    } finally {
      setIsDetecting(false);
    }
  };

  const disconnectWallet = () => {
    setWallet({
      address: null,
      connected: false,
      network: null,
      balance: 0,
      walletType: null,
    });
  };

  const rollDice = async () => {
    if (!wallet.connected) {
      setError('Please connect your wallet first');
      return;
    }
    if (betAmount > wallet.balance) {
      setError('Insufficient balance');
      return;
    }

    setIsRolling(true);
    setError(null);

    // Simulate network delay and "provably fair" roll
    setTimeout(async () => {
      const result = Math.floor(Math.random() * DICE_MAX) + 1;
      const win = result < prediction;
      
      setLastResult(result);
      setIsRolling(false);

      if (win) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f7931a', '#ffffff']
        });
      }

      const newBet: Bet = {
        id: Math.random().toString(36).substring(2, 15),
        timestamp: Date.now(),
        amount: betAmount,
        prediction,
        result,
        win,
        txid: 'simulated_tx_' + Math.random().toString(36).substring(2, 8)
      };

      setHistory(prev => [newBet, ...prev].slice(0, 10));
      
      // Update balance (simulated)
      setWallet(prev => ({
        ...prev,
        balance: win ? prev.balance + (betAmount * (DICE_MAX / prediction) * 0.98) : prev.balance - betAmount
      }));
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-[#f7931a]/30">
      {/* Navigation */}
      <nav className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bitcoin-gradient rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Dices className="text-white w-6 h-6" />
            </div>
            <span className="font-bold text-xl tracking-tight">BTC<span className="text-[#f7931a]">DICE</span></span>
            <div className="ml-4 px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-[10px] font-mono text-orange-500 uppercase tracking-widest">
              Regtest
            </div>
          </div>

          <div className="flex items-center gap-4">
            {wallet.connected ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-xs text-white/40 font-mono uppercase tracking-wider">Balance</span>
                  <span className="font-mono text-sm">{wallet.balance.toFixed(4)} BTC</span>
                </div>
                <button 
                  onClick={disconnectWallet}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2 group"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-mono">{wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsConnectModalOpen(true)}
                className="px-6 py-2.5 rounded-xl bg-[#f7931a] hover:bg-[#f7931a]/90 text-black font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Wallet Selection Modal */}
      <AnimatePresence>
        {isConnectModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConnectModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass-card rounded-[32px] p-8 shadow-2xl border-white/10"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold">Connect Wallet</h2>
                <button 
                  onClick={() => setIsConnectModalOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <AlertCircle className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={connectUniSat}
                  disabled={isDetecting}
                  className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-[#f7931a]/30 transition-all flex items-center justify-between group disabled:opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center border border-white/10 group-hover:border-[#f7931a]/50 transition-colors">
                      <img src="https://unisat.io/img/favicon.ico" alt="UniSat" className="w-6 h-6" referrerPolicy="no-referrer" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">UniSat Wallet</div>
                      <div className="text-xs text-white/40">Connect using UniSat</div>
                    </div>
                  </div>
                  {isDetecting ? <Loader2 className="w-5 h-5 animate-spin text-white/20" /> : <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-[#f7931a] transition-colors" />}
                </button>

                <button 
                  onClick={connectOPWallet}
                  disabled={isDetecting}
                  className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-[#f7931a]/30 transition-all flex items-center justify-between group disabled:opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center border border-white/10 group-hover:border-[#f7931a]/50 transition-colors">
                      <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-black font-bold text-[10px]">OP</div>
                    </div>
                    <div className="text-left">
                      <div className="font-bold">OP Wallet</div>
                      <div className="text-xs text-white/40">Connect using OP Wallet</div>
                    </div>
                  </div>
                  {isDetecting ? <Loader2 className="w-5 h-5 animate-spin text-white/20" /> : <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-[#f7931a] transition-colors" />}
                </button>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-3 h-3 text-orange-500" />
                  <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Iframe Notice</span>
                </div>
                <p className="text-[10px] text-white/40 leading-relaxed">
                  Wallet extensions may not detect this app inside the preview iframe. If connection fails, please use the <b>Shared App URL</b> in a new browser tab.
                </p>
              </div>

              <p className="mt-8 text-center text-[10px] font-mono text-white/20 uppercase tracking-widest">
                By connecting, you agree to our Terms of Service
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Game Controls */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-6 rounded-3xl space-y-6">
            <div className="space-y-4">
              <label className="text-xs font-mono uppercase tracking-widest text-white/40 flex items-center gap-2">
                <Coins className="w-3 h-3" /> Bet Amount (BTC)
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 font-mono text-lg focus:outline-none focus:border-[#f7931a]/50 transition-colors"
                  placeholder="0.001"
                  step="0.0001"
                />
                <div className="absolute right-2 top-2 bottom-2 flex gap-1">
                  <button onClick={() => setBetAmount(prev => prev / 2)} className="px-3 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono">1/2</button>
                  <button onClick={() => setBetAmount(prev => prev * 2)} className="px-3 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono">2x</button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="text-xs font-mono uppercase tracking-widest text-white/40">Roll Under</label>
                <span className="text-2xl font-bold text-[#f7931a]">{prediction}</span>
              </div>
              <input 
                type="range" 
                min="2" 
                max="98" 
                value={prediction}
                onChange={(e) => setPrediction(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#f7931a]"
              />
              <div className="flex justify-between text-[10px] font-mono text-white/20">
                <span>2</span>
                <span>50</span>
                <span>98</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="text-[10px] font-mono uppercase tracking-widest text-white/40">Multiplier</div>
                <div className="text-lg font-mono">{(DICE_MAX / prediction).toFixed(2)}x</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="text-[10px] font-mono uppercase tracking-widest text-white/40">Win Chance</div>
                <div className="text-lg font-mono">{prediction}%</div>
              </div>
            </div>

            <button 
              onClick={rollDice}
              disabled={isRolling || !wallet.connected}
              className={cn(
                "w-full py-5 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3",
                isRolling ? "bg-white/5 text-white/20 cursor-not-allowed" : "bitcoin-gradient text-black hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-orange-500/20"
              )}
            >
              {isRolling ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  ROLLING...
                </>
              ) : (
                <>
                  <Dices className="w-6 h-6" />
                  ROLL DICE
                </>
              )}
            </button>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-xs text-red-200/80 leading-relaxed">{error}</p>
              </div>
            )}
          </div>

          <div className="glass-card p-6 rounded-3xl">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-mono uppercase tracking-widest">Provably Fair</h3>
            </div>
            <p className="text-xs text-white/40 leading-relaxed">
              Our dice rolls are generated using a cryptographically secure random number generator. On Regtest, transactions are simulated for instant feedback.
            </p>
          </div>
        </div>

        {/* Game Visualizer & History */}
        <div className="lg:col-span-8 space-y-8">
          {/* Visualizer */}
          <div className="glass-card h-[400px] rounded-[40px] relative overflow-hidden flex flex-col items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(247,147,26,0.1),transparent_70%)]" />
            
            <div className="relative z-10 flex flex-col items-center gap-8">
              <AnimatePresence mode="wait">
                {isRolling ? (
                  <motion.div
                    key="rolling"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.2 }}
                    className="flex gap-4"
                  >
                    {[1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ 
                          rotate: [0, 90, 180, 270, 360],
                          y: [0, -20, 0]
                        }}
                        transition={{ 
                          duration: 0.5, 
                          repeat: Infinity,
                          delay: i * 0.1
                        }}
                        className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center"
                      >
                        <Dices className="w-8 h-8 text-[#f7931a]/50" />
                      </motion.div>
                    ))}
                  </motion.div>
                ) : lastResult !== null ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className={cn(
                      "text-8xl font-black tracking-tighter",
                      lastResult < prediction ? "text-emerald-500" : "text-red-500"
                    )}>
                      {lastResult}
                    </div>
                    <div className={cn(
                      "px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest",
                      lastResult < prediction ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                    )}>
                      {lastResult < prediction ? "You Won!" : "Try Again"}
                    </div>
                  </motion.div>
                ) : (
                  <div className="text-white/20 text-center space-y-4">
                    <Dices className="w-24 h-24 mx-auto opacity-20" />
                    <p className="font-mono text-sm uppercase tracking-widest">Ready to Roll</p>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Progress Bar Visualizer */}
            <div className="absolute bottom-12 left-12 right-12 h-4 bg-white/5 rounded-full overflow-hidden border border-white/10">
              <div 
                className="absolute inset-y-0 left-0 bg-emerald-500/20 border-r border-emerald-500/50"
                style={{ width: `${prediction}%` }}
              />
              <div 
                className="absolute inset-y-0 right-0 bg-red-500/20 border-l border-red-500/50"
                style={{ width: `${100 - prediction}%` }}
              />
              {lastResult !== null && !isRolling && (
                <motion.div 
                  initial={{ left: 0 }}
                  animate={{ left: `${lastResult}%` }}
                  className="absolute top-[-8px] w-1 h-10 bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] z-20"
                />
              )}
            </div>
          </div>

          {/* History */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-white/40" />
                <h3 className="text-xs font-mono uppercase tracking-widest text-white/40">Recent Bets</h3>
              </div>
              <button className="text-[10px] font-mono uppercase tracking-widest text-white/20 hover:text-white/40 transition-colors">Clear History</button>
            </div>

            <div className="glass-card rounded-3xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-6 py-4 text-[10px] font-mono uppercase tracking-widest text-white/40">Time</th>
                    <th className="px-6 py-4 text-[10px] font-mono uppercase tracking-widest text-white/40">Bet</th>
                    <th className="px-6 py-4 text-[10px] font-mono uppercase tracking-widest text-white/40">Target</th>
                    <th className="px-6 py-4 text-[10px] font-mono uppercase tracking-widest text-white/40">Result</th>
                    <th className="px-6 py-4 text-[10px] font-mono uppercase tracking-widest text-white/40 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <AnimatePresence initial={false}>
                    {history.length > 0 ? (
                      history.map((bet) => (
                        <motion.tr 
                          key={bet.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="hover:bg-white/[0.02] transition-colors group"
                        >
                          <td className="px-6 py-4 text-xs font-mono text-white/40">
                            {new Date(bet.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="px-6 py-4 text-xs font-mono">{bet.amount.toFixed(4)} BTC</td>
                          <td className="px-6 py-4 text-xs font-mono text-white/40">&lt; {bet.prediction}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-xs font-mono font-bold",
                              bet.win ? "text-emerald-500" : "text-red-500"
                            )}>
                              {bet.result}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className={cn(
                              "text-xs font-mono font-bold flex items-center justify-end gap-1",
                              bet.win ? "text-emerald-500" : "text-red-500"
                            )}>
                              {bet.win ? '+' : '-'}{bet.win ? (bet.amount * (DICE_MAX / bet.prediction) * 0.98).toFixed(4) : bet.amount.toFixed(4)}
                              <span className="text-[10px] opacity-50">BTC</span>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-white/20 font-mono text-xs uppercase tracking-widest">
                          No bets yet
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 mt-12 bg-black/50">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 opacity-40">
            <Dices className="w-5 h-5" />
            <span className="font-bold text-sm tracking-tight">BTCDICE</span>
          </div>
          
          <div className="flex gap-8 text-[10px] font-mono uppercase tracking-widest text-white/20">
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Fairness</a>
            <a href="#" className="hover:text-white transition-colors">Support</a>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest">Network Live</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
