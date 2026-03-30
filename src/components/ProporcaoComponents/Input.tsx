import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  suffix?: string;
}

export function Input({ label, suffix, className = '', ...props }: InputProps) {
  return (
    <div className="relative">
      {label && (
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 ml-1">
          {label}
        </label>
      )}
      <input
        className={`w-full bg-slate-50 border-2 border-slate-100 rounded-[28px] px-8 py-6 text-4xl font-black text-slate-800 focus:border-[#202eac] outline-none transition-all pr-24 shadow-inner ${
          suffix ? 'pr-24' : ''
        } ${className}`}
        {...props}
      />
      {suffix && (
        <span className="absolute right-8 top-[55%] font-black text-slate-400 text-sm">
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
    <div className="flex p-1.5 bg-slate-100 rounded-3xl">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all ${
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
