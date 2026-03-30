import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">
          {label}
        </label>
      )}
      <input
        className={`w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-base font-bold text-slate-800 focus:border-[#202eac] outline-none transition-all ${className}`}
        {...props}
      />
    </div>
  );
}

interface NumberInputProps extends Omit<InputProps, 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
}

export function NumberInput({ value, onChange, prefix, suffix, label, ...props }: NumberInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d.,]/g, '');
    const parsed = parseFloat(raw.replace(',', '.'));
    onChange(isNaN(parsed) ? 0 : parsed);
  };

  const displayValue = value === 0 ? '' : value.toString().replace('.', ',');

  return (
    <div>
      {label && (
        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
            {prefix}
          </span>
        )}
        <input
          type="text"
          value={displayValue}
          onChange={handleChange}
          className={`w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-base font-bold text-slate-800 focus:border-[#202eac] outline-none transition-all ${
            prefix ? 'pl-8' : ''
        } ${suffix ? 'pr-16' : ''}`}
          {...props}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

interface ToggleGroupProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

export function ToggleGroup({ value, onChange, options }: ToggleGroupProps) {
  return (
    <div className="flex bg-slate-100 p-1 rounded-2xl">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold uppercase transition-all ${
            value === opt.value
              ? 'bg-white text-[#202eac] shadow-sm'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
