/**
 * AdPulse Passcode Protection Modal (v3.5.2)
 * Verifies directly with server-side ADMIN_PASSCODE environment variable.
 */
import React, { useState } from 'react';
import { Lock, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

interface PasscodeLockModalProps {
  onUnlock: (verifiedPasscode: string) => void;
  onCancel?: () => void;
}

export const PasscodeLockModal: React.FC<PasscodeLockModalProps> = ({
  onUnlock
}) => {
  const [inputPasscode, setInputPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPasscode.trim()) {
      setErrorMsg('Please enter your admin passcode.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);

    try {
      // Secure server-side verification against process.env.ADMIN_PASSCODE
      const res = await fetch('/api/security/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: inputPasscode.trim() })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setErrorMsg(null);
        onUnlock(inputPasscode.trim());
      } else {
        setErrorMsg(data.error || 'Incorrect admin passcode. Please check ADMIN_PASSCODE in Render.');
      }
    } catch (err: any) {
      setErrorMsg('Server verification failed. Please check network connection.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-5 text-center">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-white">
            Admin Dashboard Locked
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Protected by your <code className="text-indigo-300 font-mono">ADMIN_PASSCODE</code> environment variable.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              autoFocus
              disabled={isVerifying}
              value={inputPasscode}
              onChange={(e) => {
                setInputPasscode(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="Enter ADMIN_PASSCODE"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-center text-white tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
            />
            <button
              type="button"
              disabled={isVerifying}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {errorMsg && (
            <div className="text-xs text-rose-400 flex items-center justify-center gap-1.5 p-2 rounded bg-rose-950/40 border border-rose-500/30">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying with Server...
              </>
            ) : (
              'Unlock Dashboard'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
