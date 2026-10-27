import React, { useState } from 'react';
import { Key, X, Eye, EyeOff, Sparkles } from 'lucide-react';
import { generateTeacherKey } from '../data/initialData.ts';

interface PasswordModalProps {
  targetKey: string;
  targetDisplayName: string;
  onClose: () => void;
  onSave: (key: string, newPass: string) => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  targetKey,
  targetDisplayName,
  onClose,
  onSave
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [error, setError] = useState('');

  const handleGenerateKey = () => {
    const cleanKey = targetKey.startsWith('dip_') || targetKey.startsWith('deg_')
      ? `STU-${Math.floor(1000 + Math.random() * 9000)}`
      : generateTeacherKey(targetKey);
    setNewPassword(cleanKey);
    setConfirmPassword(cleanKey);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 3) {
      setError('የይለፍ ቃል ቢያንስ 3 ፊደላት/ቁጥሮች መሆን አለበት!');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('የይለፍ ቃላቱ አይመሳሰሉም!');
      return;
    }

    onSave(targetKey, newPassword);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 no-print">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
        <div className="bg-emerald-950 text-white p-4.5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm">{targetDisplayName} የይለፍ ቃል መቀየሪያ</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleGenerateKey}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 cursor-pointer transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>አዲስ ቁልፍ አመንጭ</span>
            </button>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-bold text-slate-700">አዲስ የይለፍ ቃል (New Password)</label>
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
                title={showPassword ? 'ደብቅ' : 'አሳይ'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
              placeholder="አዲስ ቁልፍ..."
              required
              minLength={3}
              className="w-full px-3.5 py-2.5 border rounded-xl bg-slate-50 border-slate-300 focus:ring-2 focus:ring-emerald-700 font-mono tracking-wider font-bold text-emerald-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">አዲስ የይለፍ ቃል ያረጋግጡ (Confirm)</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
              placeholder="ቁልፉን ደግመው ያስገቡ..."
              required
              minLength={3}
              className="w-full px-3.5 py-2.5 border rounded-xl bg-slate-50 border-slate-300 focus:ring-2 focus:ring-emerald-700 font-mono tracking-wider font-bold text-emerald-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-xl hover:bg-slate-100 font-semibold text-slate-700 cursor-pointer"
            >
              ሰርዝ
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-xs cursor-pointer"
            >
              አስቀምጥ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
