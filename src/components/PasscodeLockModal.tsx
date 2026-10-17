/**
 * AdPulse Passcode Protection Modal (v3.5.1)
 */
import React, { useState } from 'react';
import { Lock, KeyRound, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface PasscodeLockModalProps {
  correctPasscode: string;
  onUnlock: () => void;
  onCancel?: () => void;
}

export const PasscodeLockModal: React.FC<PasscodeLockModalProps> = ({
  correctPasscode,
  onUnlock,
  onCancel
}) => {
  const [inputPasscode, setInputPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPasscode === correctPasscode) {
      setErrorMsg(null);
      onUnlock();
    } else {
      setErrorMsg('Incorrect master passcode. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-5 text-center">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-white">
            Admin Dashboard Locked
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Enter your Master Passcode to manage campaigns and view affiliate revenues.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              autoFocus
              value={inputPasscode}
              onChange={(e) => {
                setInputPasscode(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="Enter Master Passcode"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-center text-white tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {errorMsg && (
            <div className="text-xs text-rose-400 flex items-center justify-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow-sm transition-all"
          >
            Unlock Dashboard
          </button>
        </form>

        <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
          Default Master Passcode: <code className="text-slate-400 font-mono">2026</code>
        </div>
      </div>
    </div>
  );
};
