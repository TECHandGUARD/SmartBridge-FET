import AppErrorBoundary from '@/components/operations/AppErrorBoundary';
import {createClientReporter} from '@/lib/monitoring';
import {supabase} from '@/lib/supabaseClient';
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { configurationError } from '@/lib/supabaseClient'

const report=createClientReporter(supabase);
window.addEventListener('unhandledrejection',()=>{report('unhandled_rejection');});

ReactDOM.createRoot(document.getElementById('root')).render(
  configurationError ? <main className="p-8 text-center" role="alert"><h1>SmartBridge is temporarily unavailable</h1><p>{configurationError}</p></main> : <AppErrorBoundary report={report}><App /></AppErrorBoundary>
)
