import React, { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import { previewExpression } from '../../lib/calculator';

export function CalculatorInput({ value, onChange, onEnter, placeholder = "0" }) {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    const res = previewExpression(String(value || ''));
    setPreview(res);
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (preview && preview.isValid && preview.result !== null) {
        onEnter(preview.result);
      }
    }
  };

  return (
    <div className="relative w-full">
      <Input
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="text-lg h-14 pl-4 pr-24 font-semibold font-mono"
      />
      <div className="absolute right-3 top-0 bottom-0 flex items-center gap-1.5 pointer-events-none">
        {preview && preview.hasOperator && preview.isValid ? (
          <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold px-2 py-0.5 rounded-md animate-pulse">
            = {preview.result}
          </span>
        ) : null}
        <span className="text-muted-foreground text-sm font-medium">pzas</span>
      </div>
    </div>
  );
}
