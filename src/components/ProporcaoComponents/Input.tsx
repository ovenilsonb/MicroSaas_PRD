import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  suffix?: string;
}

export function Input({ label, suffix, className = '', ...props }: InputProps) {
  return (
    <div className="relative">
      {label && (
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
          {label}
        </label>
      )}
      <input
        className={`w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-base font-medium text-slate-800 focus:border-[#202eac] focus:ring-2 focus:ring-[#202eac]/20 outline-none transition-all ${
          suffix ? 'pr-16' : ''
        } ${className}`}
        {...props}
      />
      {suffix && (
        <span className="absolute right-4 top-[68%] font-medium text-slate-400 text-xs">
          {suffix}
        </span>
      )}
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
    <div className="flex p-1 bg-slate-100 rounded-lg">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-2 px-3 rounded-md text-xs font-medium uppercase transition-all ${
            value === opt.value
              ? 'bg-white text-[#202eac] shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
