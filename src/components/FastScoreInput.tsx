import React, { startTransition, useCallback, useEffect, useRef, useState } from 'react';

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
  studentUid?: string;
  itemId?: string;
  itemIndex?: number;
  onCommitChange?: (rawValue: string) => void;
  onCommitScore?: (
    studentUid: string,
    itemId: string,
    rawValue: string,
    maxVal: number,
    itemIndex: number
  ) => void;
  onCommitStudentValue?: (studentUid: string, rawValue: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onNavigateCell?: (e: React.KeyboardEvent<HTMLElement>, rowIndex: number, colIndex: number) => void;
  onBlurExtra?: () => void;
}

/**
 * High-speed memoized score input cell.
 * Maintains responsive local draft while typing and flushes parent updates inside
 * startTransition after focus transitions so moving row-to-row is instantaneous.
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
    studentUid,
    itemId,
    itemIndex = 0,
    onCommitChange,
    onCommitScore,
    onCommitStudentValue,
    onKeyDown,
    onNavigateCell,
    onBlurExtra
  }) => {
    const formatPropVal = (v: number | undefined): string => {
      if (v === undefined || v === null || Number.isNaN(v)) return '';
      if (emptyAsZero && v === 0) return '';
      return String(v);
    };

    const [draft, setDraft] = useState<string>(() => formatPropVal(value));
    const isFocusedRef = useRef(false);
    const pendingRawRef = useRef<string | null>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const callbacksRef = useRef({
      studentUid,
      itemId,
      itemIndex,
      max,
      onCommitChange,
      onCommitScore,
      onCommitStudentValue
    });
    callbacksRef.current = {
      studentUid,
      itemId,
      itemIndex,
      max,
      onCommitChange,
      onCommitScore,
      onCommitStudentValue
    };

    const flushCommit = useCallback((rawValue: string) => {
      const cb = callbacksRef.current;
      if (cb.onCommitScore && cb.studentUid !== undefined && cb.itemId !== undefined) {
        cb.onCommitScore(cb.studentUid, cb.itemId, rawValue, cb.max, cb.itemIndex);
      } else if (cb.onCommitStudentValue && cb.studentUid !== undefined) {
        cb.onCommitStudentValue(cb.studentUid, rawValue);
      } else if (cb.onCommitChange) {
        cb.onCommitChange(rawValue);
      }
    }, []);

    useEffect(() => {
      if (!isFocusedRef.current && pendingRawRef.current === null) {
        setDraft(formatPropVal(value));
      }
    }, [value, emptyAsZero]);

    useEffect(() => {
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        if (pendingRawRef.current !== null) {
          const valToFlush = pendingRawRef.current;
          pendingRawRef.current = null;
          flushCommit(valToFlush);
        }
      };
    }, [flushCommit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setDraft(next);
      pendingRawRef.current = next;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        if (pendingRawRef.current !== null) {
          const rawToCommit = pendingRawRef.current;
          pendingRawRef.current = null;
          startTransition(() => {
            flushCommit(rawToCommit);
          });
        }
      }, 180);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = true;
      e.target.select();
    };

    const handleBlur = () => {
      isFocusedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

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

      if (pendingRawRef.current !== null) {
        const rawToFlush = pendingRawRef.current;
        // Defer commit slightly after focus lands in next cell so cursor movement never lags
        setTimeout(() => {
          if (pendingRawRef.current === rawToFlush) {
            pendingRawRef.current = null;
          }
          startTransition(() => {
            flushCommit(rawToFlush);
          });
        }, 0);
      }

      if (onBlurExtra) {
        onBlurExtra();
      }
    };

    const handleKeyDownLocal = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (onNavigateCell && dataCellR !== undefined && dataCellC !== undefined) {
        onNavigateCell(e, dataCellR, dataCellC);
      } else if (onKeyDown) {
        onKeyDown(e);
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
        onKeyDown={handleKeyDownLocal}
        className={className}
      />
    );
  }
);
FastScoreInput.displayName = 'FastScoreInput';

interface FastTextInputProps {
  value: string | undefined;
  placeholder?: string;
  className?: string;
  title?: string;
  dataCellR?: number;
  dataCellC?: number;
  studentUid: string;
  onCommitStudentValue: (studentUid: string, rawValue: string) => void;
  onNavigateCell?: (e: React.KeyboardEvent<HTMLElement>, rowIndex: number, colIndex: number) => void;
}

export const FastTextInput: React.FC<FastTextInputProps> = React.memo(
  ({
    value,
    placeholder = '',
    className = '',
    title,
    dataCellR,
    dataCellC,
    studentUid,
    onCommitStudentValue,
    onNavigateCell
  }) => {
    const [draft, setDraft] = useState<string>(value ?? '');
    const isFocusedRef = useRef(false);
    const pendingRawRef = useRef<string | null>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const callbacksRef = useRef({ studentUid, onCommitStudentValue });
    callbacksRef.current = { studentUid, onCommitStudentValue };

    useEffect(() => {
      if (!isFocusedRef.current && pendingRawRef.current === null) {
        setDraft(value ?? '');
      }
    }, [value]);

    useEffect(() => {
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        if (pendingRawRef.current !== null) {
          const valToFlush = pendingRawRef.current;
          pendingRawRef.current = null;
          callbacksRef.current.onCommitStudentValue(callbacksRef.current.studentUid, valToFlush);
        }
      };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setDraft(next);
      pendingRawRef.current = next;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        if (pendingRawRef.current !== null) {
          const rawToCommit = pendingRawRef.current;
          pendingRawRef.current = null;
          startTransition(() => {
            callbacksRef.current.onCommitStudentValue(callbacksRef.current.studentUid, rawToCommit);
          });
        }
      }, 220);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = true;
      e.target.select();
    };

    const handleBlur = () => {
      isFocusedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (pendingRawRef.current !== null) {
        const rawToFlush = pendingRawRef.current;
        setTimeout(() => {
          if (pendingRawRef.current === rawToFlush) {
            pendingRawRef.current = null;
          }
          startTransition(() => {
            callbacksRef.current.onCommitStudentValue(callbacksRef.current.studentUid, rawToFlush);
          });
        }, 0);
      }
    };

    const handleKeyDownLocal = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (onNavigateCell && dataCellR !== undefined && dataCellC !== undefined) {
        onNavigateCell(e, dataCellR, dataCellC);
      }
    };

    return (
      <input
        type="text"
        placeholder={placeholder}
        title={title}
        data-cell-r={dataCellR}
        data-cell-c={dataCellC}
        value={draft}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDownLocal}
        className={className}
      />
    );
  }
);
FastTextInput.displayName = 'FastTextInput';
