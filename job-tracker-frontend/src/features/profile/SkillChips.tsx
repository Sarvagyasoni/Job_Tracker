// Enter-to-add chips input. Used for skills.

import { useState } from 'react';
import styles from './SkillChips.module.css';

export interface SkillChipsProps {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  maxItems?: number;
  maxItemLength?: number;
  placeholder?: string;
  error?: string;
}

export function SkillChips({
  label,
  values,
  onChange,
  maxItems = 30,
  maxItemLength = 50,
  placeholder = 'Type a skill and press Enter...',
  error,
}: SkillChipsProps) {
  const [input, setInput] = useState('');

  const addSkill = (raw: string) => {
    const v = raw.trim();
    if (!v || values.includes(v) || values.length >= maxItems) return;
    if (v.length > maxItemLength) return;
    onChange([...values, v]);
    setInput('');
  };

  const removeSkill = (v: string) => onChange(values.filter((x) => x !== v));

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(input);
    } else if (e.key === 'Backspace' && input === '' && values.length > 0) {
      removeSkill(values[values.length - 1]);
    }
  };

  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>{label}</label>
      <div className={`${styles.field} ${error ? styles.fieldError : ''}`}>
        {values.map((v) => (
          <span key={v} className={styles.chip}>
            {v}
            <button
              type="button"
              className={styles.chipRemove}
              onClick={() => removeSkill(v)}
              aria-label={`Remove ${v}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (input.trim()) addSkill(input);
          }}
          placeholder={values.length === 0 ? placeholder : values.length < maxItems ? 'Add another...' : `Maximum ${maxItems} reached`}
          disabled={values.length >= maxItems}
          aria-label={label}
          aria-invalid={!!error}
        />
      </div>
      <div className={styles.meta}>
        <span className={styles.count}>{values.length}/{maxItems}</span>
        {error && <span className={styles.error}>{error}</span>}
      </div>
    </div>
  );
}
