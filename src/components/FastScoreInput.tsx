import React, { useEffect, useRef, useState } from 'react';

interface FastScoreInputProps {
  value: number | undefined;
  emptyAsZero?: boolean;
  max?: number;
  min?: number;
  step?: string;
  placeholder?: string;
  className?: string;
  title?: string;
  inputMode?: 'decimal' | 'numeric' | 'text';
  dataCellR?: number;
  dataCellC?: number;
  onCommitChange: (rawValue: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlurExtra?: () => void;
}

/**
 * High-speed memoized score input cell.
 * Preserves intermediate typing states (like "8." or empty backspaces) smoothly while focused,
 * preventing cursor jumps and eliminating sluggishness during rapid data entry.
 */
export const FastScoreInput: React.FC<FastScoreInputProps> = React.memo(
  ({
    value,
    emptyAsZero = true,
    max = 100,
    min = 0,
    step = '0.5',
    placeholder = '—',
    className = '',
    title,
    inputMode = 'decimal',
    dataCellR,
    dataCellC,
    onCommitChange,
    onKeyDown,
    onBlurExtra
  }) => {
    const formatPropVal = (v: number | undefined): string => {
      if (v === undefined || v === null || Number.isNaN(v)) return '';
      if (emptyAsZero && v === 0) return '';
      return String(v);
    };

    const [draft, setDraft] = useState<string>(() => formatPropVal(value));
    const isFocusedRef = useRef(false);

    useEffect(() => {
      if (!isFocusedRef.current) {
        setDraft(formatPropVal(value));
      }
    }, [value, emptyAsZero]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setDraft(next);
      onCommitChange(next);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = true;
      e.target.select();
    };

    const handleBlur = () => {
      isFocusedRef.current = false;
      const clean = draft.trim();
      if (clean === '') {
        setDraft('');
      } else {
        const parsed = parseFloat(clean);
        if (Number.isNaN(parsed)) {
          setDraft(formatPropVal(value));
        } else {
          const clamped = Math.min(max, Math.max(min, parsed));
          setDraft(emptyAsZero && clamped === 0 ? '' : String(clamped));
        }
      }
      if (onBlurExtra) {
        onBlurExtra();
      }
    };

    return (
      <input
        type="number"
        inputMode={inputMode}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        title={title}
        data-cell-r={dataCellR}
        data-cell-c={dataCellC}
        value={draft}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={onKeyDown}
        className={className}
      />
    );
  }
);
FastScoreInput.displayName = 'FastScoreInput';
