import React from 'react';
import { motion } from 'framer-motion';
import { Delete, Equal } from 'lucide-react';
import { evaluateExpression } from '../../lib/calculator';

export function CalculatorKeypad({ value, onChange, onEqual }) {
  const handleKeyPress = (key) => {
    const current = String(value || '');

    if (key === 'C') {
      onChange('');
      return;
    }

    if (key === 'BACKSPACE') {
      onChange(current.slice(0, -1));
      return;
    }

    if (key === '=') {
      const result = evaluateExpression(current);
      if (result !== null) {
        onChange(String(result));
        if (onEqual) onEqual(result);
      }
      return;
    }

    // If current value is '0', replace it with new digit (unless it's an operator or decimal)
    if (current === '0' && /[0-9]/.test(key)) {
      onChange(key);
      return;
    }

    // Prevent consecutive operators like ++ or **
    const lastChar = current.slice(-1);
    const isOperator = ['+', '-', '*', '/', '×', '÷'].includes(key);
    const lastIsOperator = ['+', '-', '*', '/', '×', '÷'].includes(lastChar);

    if (isOperator && lastIsOperator) {
      // Replace last operator with new operator
      onChange(current.slice(0, -1) + (key === '×' ? '*' : key === '÷' ? '/' : key));
      return;
    }

    const charToAdd = key === '×' ? '*' : key === '÷' ? '/' : key;
    onChange(current + charToAdd);
  };

  const keyConfig = [
    // Row 1
    { label: 'C', value: 'C', variant: 'danger' },
    { label: <Delete className="w-5 h-5 mx-auto" />, value: 'BACKSPACE', variant: 'neutral' },
    { label: '÷', value: '÷', variant: 'operator' },
    { label: '×', value: '×', variant: 'operator' },

    // Row 2
    { label: '7', value: '7', variant: 'number' },
    { label: '8', value: '8', variant: 'number' },
    { label: '9', value: '9', variant: 'number' },
    { label: '-', value: '-', variant: 'operator' },

    // Row 3
    { label: '4', value: '4', variant: 'number' },
    { label: '5', value: '5', variant: 'number' },
    { label: '6', value: '6', variant: 'number' },
    { label: '+', value: '+', variant: 'operator' },

    // Row 4
    { label: '1', value: '1', variant: 'number' },
    { label: '2', value: '2', variant: 'number' },
    { label: '3', value: '3', variant: 'number' },
    { label: '=', value: '=', variant: 'equal', rowSpan: true },

    // Row 5
    { label: '0', value: '0', variant: 'number', colSpan: 2 },
    { label: '.', value: '.', variant: 'number' },
  ];

  const getVariantClasses = (variant) => {
    switch (variant) {
      case 'operator':
        return 'bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 font-bold text-lg';
      case 'danger':
        return 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20 font-bold text-base';
      case 'equal':
        return 'bg-emerald-500 text-white hover:bg-emerald-600 border-emerald-600 font-bold text-lg shadow-sm';
      case 'neutral':
        return 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted border-border font-medium';
      case 'number':
      default:
        return 'bg-card text-foreground hover:bg-muted/50 border-border font-semibold text-lg shadow-2xs';
    }
  };

  return (
    <div className="w-full pt-2">
      <div className="grid grid-cols-4 gap-2">
        {/* Row 1 */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => handleKeyPress('C')}
          className={`h-11 rounded-xl border flex items-center justify-center transition-colors ${getVariantClasses('danger')}`}
        >
          C
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => handleKeyPress('BACKSPACE')}
          className={`h-11 rounded-xl border flex items-center justify-center transition-colors ${getVariantClasses('neutral')}`}
        >
          <Delete className="w-5 h-5" />
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => handleKeyPress('÷')}
          className={`h-11 rounded-xl border flex items-center justify-center transition-colors ${getVariantClasses('operator')}`}
        >
          ÷
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => handleKeyPress('×')}
          className={`h-11 rounded-xl border flex items-center justify-center transition-colors ${getVariantClasses('operator')}`}
        >
          ×
        </motion.button>

        {/* Row 2 */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => handleKeyPress('7')}
          className={`h-11 rounded-xl border flex items-center justify-center transition-colors ${getVariantClasses('number')}`}
        >
          7
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => handleKeyPress('8')}
          className={`h-11 rounded-xl border flex items-center justify-center transition-colors ${getVariantClasses('number')}`}
        >
          8
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => handleKeyPress('9')}
          className={`h-11 rounded-xl border flex items-center justify-center transition-colors ${getVariantClasses('number')}`}
        >
          9
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => handleKeyPress('-')}
          className={`h-11 rounded-xl border flex items-center justify-center transition-colors ${getVariantClasses('operator')}`}
        >
          -
        </motion.button>

        {/* Row 3 */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => handleKeyPress('4')}
          className={`h-11 rounded-xl border flex items-center justify-center transition-colors ${getVariantClasses('number')}`}
        >
          4
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => handleKeyPress('5')}
          className={`h-11 rounded-xl border flex items-center justify-center transition-colors ${getVariantClasses('number')}`}
        >
          5
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => handleKeyPress('6')}
          className={`h-11 rounded-xl border flex items-center justify-center transition-colors ${getVariantClasses('number')}`}
        >
          6
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => handleKeyPress('+')}
          className={`h-11 rounded-xl border flex items-center justify-center transition-colors ${getVariantClasses('operator')}`}
        >
          +
        </motion.button>

        {/* Row 4 & 5 */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => handleKeyPress('1')}
          className={`h-11 rounded-xl border flex items-center justify-center transition-colors ${getVariantClasses('number')}`}
        >
          1
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => handleKeyPress('2')}
          className={`h-11 rounded-xl border flex items-center justify-center transition-colors ${getVariantClasses('number')}`}
        >
          2
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => handleKeyPress('3')}
          className={`h-11 rounded-xl border flex items-center justify-center transition-colors ${getVariantClasses('number')}`}
        >
          3
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => handleKeyPress('=')}
          title="Calcular resultado"
          className={`h-24 row-span-2 rounded-xl border flex items-center justify-center transition-colors ${getVariantClasses('equal')}`}
        >
          =
        </motion.button>

        {/* Row 5 */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => handleKeyPress('0')}
          className={`h-11 col-span-2 rounded-xl border flex items-center justify-center transition-colors ${getVariantClasses('number')}`}
        >
          0
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => handleKeyPress('.')}
          className={`h-11 rounded-xl border flex items-center justify-center transition-colors ${getVariantClasses('number')}`}
        >
          .
        </motion.button>
      </div>
    </div>
  );
}
