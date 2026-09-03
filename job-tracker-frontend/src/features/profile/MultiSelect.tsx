// Reusable searchable multi-select with chips. Used for roles + locations.
// Keyboard: arrow keys to navigate, Enter to select/add, Escape to close,
// Backspace on empty input to remove the last chip.

import { useEffect, useRef, useState } from 'react';
import styles from './MultiSelect.module.css';

export interface MultiSelectProps {
  label: string;
  values: string[];
  suggestions: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  maxItems?: number;
  maxItemLength?: number;
  required?: boolean;
  error?: string;
  hint?: string;
}

export function MultiSelect({
  label,
  values,
  suggestions,
  onChange,
  placeholder = 'Type to search or add a custom value...',
  maxItems = 10,
  maxItemLength = 25,
  required = false,
  error,
  hint,
}: MultiSelectProps) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = suggestions
    .filter((s) => !values.includes(s) && s.toLowerCase().includes(input.trim().toLowerCase()))
    .slice(0, 8);

  const canAddCustom =
    input.trim().length > 0 &&
    !values.includes(input.trim()) &&
    input.trim().length <= maxItemLength &&
    values.length < maxItems;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const addValue = (v: string) => {
    const t = v.trim();
    if (!t || values.includes(t) || values.length >= maxItems) return;
    if (t.length > maxItemLength) return;
    onChange([...values, t]);
    setInput('');
    setActiveIndex(0);
  };

  const removeValue = (v: string) => {
    onChange(values.filter((x) => x !== v));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const totalOptions = filtered.length + (canAddCustom ? 1 : 0);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (totalOptions === 0 ? 0 : (i + 1) % totalOptions));
      setOpen(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (totalOptions === 0 ? 0 : (i - 1 + totalOptions) % totalOptions));
      setOpen(true);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (canAddCustom && activeIndex === filtered.length) {
        addValue(input);
      } else if (filtered[activeIndex]) {
        addValue(filtered[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Backspace' && input === '' && values.length > 0) {
      removeValue(values[values.length - 1]);
    }
  };

  return (
    <div className={styles.wrapper} ref={containerRef}>
      <label className={styles.label}>
        {label}
        {required && <span className={styles.required} aria-hidden="true">*</span>}
      </label>
      {hint && <p className={styles.hint}>{hint}</p>}

      <div
        className={`${styles.field} ${error ? styles.fieldError : ''}`}
        onClick={() => inputRef.current?.focus()}
      >
        {values.map((v) => (
          <span key={v} className={styles.chip}>
            {v}
            <button
              type="button"
              className={styles.chipRemove}
              onClick={() => removeValue(v)}
              aria-label={`Remove ${v}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={values.length === 0 ? placeholder : values.length < maxItems ? 'Add another...' : `Maximum ${maxItems} reached`}
          disabled={values.length >= maxItems}
          aria-label={label}
          aria-invalid={!!error}
        />
      </div>

      {open && (filtered.length > 0 || canAddCustom) && values.length < maxItems && (
        <ul className={styles.dropdown} role="listbox">
          {filtered.map((s, i) => (
            <li
              key={s}
              role="option"
              aria-selected={i === activeIndex}
              className={`${styles.option} ${i === activeIndex ? styles.optionActive : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                addValue(s);
              }}
            >
              {s}
            </li>
          ))}
          {canAddCustom && (
            <li
              role="option"
              aria-selected={activeIndex === filtered.length}
              className={`${styles.option} ${styles.optionCustom} ${activeIndex === filtered.length ? styles.optionActive : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                addValue(input);
              }}
            >
              Add "{input.trim()}"
            </li>
          )}
        </ul>
      )}

      <div className={styles.meta}>
        <span className={styles.count}>
          {values.length}/{maxItems}
        </span>
        {error && <span className={styles.error}>{error}</span>}
      </div>
    </div>
  );
}
