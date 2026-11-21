import React from 'react';

/** Compact, accessible vector interpretation of the approved SmartBridge FET identity. */
export default function SmartBridgeBrand({ compact = false, className = '' }) {
  return <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
    <svg viewBox="0 0 88 64" width={compact ? 40 : 54} height={compact ? 30 : 40} aria-hidden="true" className="shrink-0">
      <defs><linearGradient id="sb-bridge" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#0757b7"/><stop offset="1" stopColor="#00ad9b"/></linearGradient></defs>
      <path d="M8 17 39 2 72 17 40 32Z" fill="#092451"/>
      <path d="M16 22v15" fill="none" stroke="#e5ad24" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="16" cy="39" r="3" fill="#e5ad24"/><path d="m16 40-4 9h8Z" fill="#e5ad24"/>
      <path d="M6 57Q44 10 84 56Q44 24 6 57Z" fill="url(#sb-bridge)"/>
      <path d="M31 47v10M44 40v16M57 42v15M70 49v8" stroke="#087e9e" strokeWidth="4"/>
    </svg>
    <span className="min-w-0 leading-tight">
      <span className={`block whitespace-nowrap font-sans font-extrabold tracking-tight ${compact ? 'text-sm' : 'text-lg'}`}>
        <span style={{color:'#092451'}}>Smart</span><span style={{color:'#009e96'}}>Bridge</span>
        <span className="ml-1 rounded-md px-1.5 py-0.5 text-[0.68em] text-white" style={{background:'#092451',boxShadow:'inset 0 -2px #e5ad24'}}>FET</span>
      </span>
      {!compact && <span className="block whitespace-nowrap text-[9px] font-semibold tracking-wide" style={{color:'#092451'}}>Learn · Get Support · Connect · Succeed</span>}
    </span>
  </span>;
}
