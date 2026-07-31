import { useEffect, useId, useRef, useState } from "react";

export type AutocompleteSuggestion = {
  key: string;
  primary: string;
  secondary?: string;
};

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelectSuggestion?: (key: string) => void;
  suggestions: AutocompleteSuggestion[];
  required?: boolean;
  hint?: string;
  minChars?: number;
  disabled?: boolean;
  /** Bootstrap column classes for the field wrapper (default: half width on md+). */
  colClassName?: string;
  /** Used to highlight this field when server-side validation fails. */
  fieldKey?: string;
};

export default function AutocompleteField({
  label,
  value,
  onChange,
  onSelectSuggestion,
  suggestions,
  required,
  hint,
  minChars = 1,
  disabled = false,
  colClassName = "form-field-box",
  fieldKey,
}: Props) {
  const id = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const q = value.trim();
  const showList =
    !disabled && open && onSelectSuggestion && q.length >= minChars && suggestions.length > 0;

  useEffect(() => {
    setHighlight(0);
  }, [suggestions.length, value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (key: string) => {
    onSelectSuggestion?.(key);
    setOpen(false);
  };

  return (
    <div
      ref={wrapRef}
      className={`autocomplete-field ${colClassName}`.trim()}
      {...(fieldKey ? { "data-field-key": fieldKey } : {})}
    >
      <label htmlFor={id} className="form-label mb-0">
        {label}
      </label>
      <input
        className="form-control mt-1"
        id={id}
        value={value}
        disabled={disabled}
        required={required}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 180);
        }}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && suggestions[highlight]) {
            e.preventDefault();
            pick(suggestions[highlight].key);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={`${id}-listbox`}
      />
      {hint ? <span className="autocomplete-hint muted small d-block mt-1">{hint}</span> : null}
      {showList ? (
        <ul id={`${id}-listbox`} className="autocomplete-dropdown" role="listbox">
          {suggestions.map((s, i) => (
            <li key={s.key} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                className={`autocomplete-option${i === highlight ? " is-active" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s.key)}
              >
                <span className="autocomplete-primary">{s.primary}</span>
                {s.secondary ? <span className="autocomplete-secondary">{s.secondary}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
