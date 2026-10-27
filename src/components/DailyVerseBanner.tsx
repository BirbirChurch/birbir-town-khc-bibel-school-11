import React, { useState } from 'react';
import {
  Bookmark,
  Copy,
  Check,
  Quote,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { getVerseOfTheDay, DailyVerse } from '../data/dailyVerses.ts';

interface DailyVerseBannerProps {
  showNotify?: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  className?: string;
}

export const DailyVerseBanner: React.FC<DailyVerseBannerProps> = ({
  showNotify,
  className = ''
}) => {
  // Purely the single verse designated for today (በየዕለቱ አንድ አንድ ጥቅስ)
  const todayVerse: DailyVerse = getVerseOfTheDay();

  // Collapsed / Expanded state (persisted in localStorage)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bk_daily_verse_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [copied, setCopied] = useState<boolean>(false);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('bk_daily_verse_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const handleCopy = () => {
    const textToCopy = `"${todayVerse.text}"\n— ${todayVerse.reference}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    if (showNotify) {
      showNotify(`የዕለቱ ጥቅስ ተቀድቷል፦ ${todayVerse.reference}`, 'success');
    }
  };

  return (
    <div className={`no-print transition-all duration-300 ${className}`}>
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white rounded-3xl shadow-md border border-emerald-700/60 overflow-hidden relative">
        {/* Subtle Background Radial Glow */}
        <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 -top-10 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-emerald-950/70 border-b border-emerald-800/60 text-xs">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/30">
              <Bookmark className="w-3.5 h-3.5" />
            </span>
            <span className="font-bold text-amber-300 tracking-wide">
              የዕለቱ መጽሐፍ ቅዱሳዊ ቃል
            </span>
            <span className="text-[10px] text-emerald-300 font-medium px-2.5 py-0.5 rounded-full bg-emerald-800/60 border border-emerald-700">
              {todayVerse.theme}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy button */}
            <button
              type="button"
              onClick={handleCopy}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-emerald-100 hover:text-white border border-white/15'
              }`}
              title="የዕለቱን ጥቅስ ኮፒ አድርግ"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>ተቀድቷል ✓</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-amber-300" />
                  <span>ጥቅሱን ቅዳ</span>
                </>
              )}
            </button>

            {/* Collapse/Expand Toggle */}
            <button
              type="button"
              onClick={handleToggleCollapse}
              className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title={isCollapsed ? 'ጥቅሱን አሳድግ' : 'ጥቅሱን አሳንስ'}
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Banner Content (Expanded) */}
        {!isCollapsed && (
          <div className="px-4 sm:px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 animate-in fade-in duration-200">
            <div className="space-y-1.5 flex-1 pr-2">
              <div className="flex items-start gap-2.5">
                <Quote className="w-5 h-5 text-amber-400/80 flex-shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm md:text-base text-emerald-50 leading-relaxed font-serif tracking-wide italic">
                  "{todayVerse.text}"
                </p>
              </div>

              <div className="pl-7">
                <span className="text-xs sm:text-sm font-bold text-amber-300">
                  — {todayVerse.reference}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Compact Bar (When Collapsed) */}
        {isCollapsed && (
          <div
            onClick={handleToggleCollapse}
            className="px-4 sm:px-6 py-2 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/5 transition-colors"
            title="ሙሉውን የዕለቱ ጥቅስ ለማየት ይጫኑ"
          >
            <div className="flex items-center gap-2 truncate">
              <Quote className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="text-xs text-emerald-100 truncate italic">
                "{todayVerse.text}"
              </span>
              <span className="text-xs font-bold text-amber-300 flex-shrink-0">
                — {todayVerse.reference}
              </span>
            </div>
            <span className="text-[10px] text-amber-300/80 hover:text-amber-200 underline flex-shrink-0">
              አሳድግ ▾
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
