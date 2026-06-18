import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { X, Monitor, Download, ExternalLink, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// PropTypes for component props
const propTypes = {
  simulation: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    subject: PropTypes.string,
    grade_level: PropTypes.oneOf([10, 11, 12]),
    caps_topic: PropTypes.string,
    thumbnail_url: PropTypes.string,
    worksheet_url: PropTypes.string,
    simulation_url: PropTypes.string.isRequired,
    duration: PropTypes.number,
    is_new: PropTypes.bool
  }).isRequired,
  isTutor: PropTypes.bool,
  onClose: PropTypes.func.isRequired
};

// ============================================
// SCHOOL SAFETY POLICY: Domain Whitelist
// Only approved educational domains can be embedded
// ============================================
const APPROVED_DOMAINS = [
  'phet.colorado.edu',      // PhET Interactive Simulations
  'lab.concord.org',         // Concord Consortium
  'smartbridge.co.za',       // Custom hosted content
  'amplifyapp.com',          // AWS Amplify hosted
  'supabase.co',             // Supabase storage
  'youtube.com',             // Educational videos
  'youtu.be',                // YouTube short links
  'drive.google.com',        // Google Drive hosted worksheets
];

function validateEducationalDomain(url) {
  if (!url || url.trim() === '') {
    return { valid: false, message: 'No URL provided' };
  }

  try {
    const parsedUrl = new URL(url);
    const isApproved = APPROVED_DOMAINS.some(domain => 
      parsedUrl.hostname === domain || 
      parsedUrl.hostname.endsWith('.' + domain)
    );
    
    if (!isApproved) {
      return { 
        valid: false, 
        message: `Access Denied: "${parsedUrl.hostname}" is not in the school's approved domain list. Only verified educational sources are permitted.` 
      };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, message: 'Invalid URL format. Please check the address.' };
  }
}

function extractUrlFromIframe(input) {
  const iframeMatch = input.match(/src=["']([^"']+)["']/i);
  if (iframeMatch) {
    return iframeMatch[1];
  }
  return input.trim();
}

export default function SimulationPlayer({ simulation, isTutor = false, onClose }) {
  const [lessonMode, setLessonMode] = useState(false);
  const [customEmbed, setCustomEmbed] = useState('');
  const [showEmbedInput, setShowEmbedInput] = useState(false);
  const [embedSrc, setEmbedSrc] = useState(simulation.simulation_url);
  const [securityWarning, setSecurityWarning] = useState(null);

  const launchLessonMode = () => {
    const win = window.open(embedSrc, '_blank', 'fullscreen=yes,toolbar=no,menubar=no,scrollbars=no,resizable=yes');
    if (win) {
      win.focus();
      setLessonMode(true);
      toast.info('Lesson mode activated - simulation opened in new window');
    }
  };

  const applyCustomEmbed = () => {
    setSecurityWarning(null);
    
    if (!customEmbed.trim()) {
      setSecurityWarning('Please enter a URL or iframe code');
      return;
    }

    let targetUrl = extractUrlFromIframe(customEmbed);
    
    // Validate domain against whitelist
    const validation = validateEducationalDomain(targetUrl);
    
    if (!validation.valid) {
      setSecurityWarning(validation.message || 'Invalid URL');
      toast.error(validation.message || 'Invalid URL');
      return;
    }

    setEmbedSrc(targetUrl);
    setShowEmbedInput(false);
    setCustomEmbed('');
    toast.success('Custom simulation loaded successfully');
  };

  const resetToDefault = () => {
    setEmbedSrc(simulation.simulation_url);
    setShowEmbedInput(false);
    setSecurityWarning(null);
    setCustomEmbed('');
    toast.info('Reset to default simulation');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0 shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 shrink-0 text-[10px] font-bold uppercase tracking-wider">
            {simulation.subject}
          </Badge>
          <span className="text-white font-bold text-sm truncate">{simulation.title}</span>
          <Badge variant="outline" className="text-slate-400 border-slate-700 shrink-0 text-[10px] font-semibold">
            {simulation.caps_topic}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 ml-4 shrink-0">
          {isTutor && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5 text-xs font-semibold h-8 bg-transparent"
                onClick={() => {
                  setShowEmbedInput(!showEmbedInput);
                  setSecurityWarning(null);
                }}
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" /> Custom URL
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 text-xs h-8 shadow-sm"
                onClick={launchLessonMode}
              >
                <Monitor className="w-3.5 h-3.5" /> Projector Mode
              </Button>
            </>
          )}
          
          {simulation.worksheet_url && (
            <a href={simulation.worksheet_url} target="_blank" rel="noopener noreferrer" className="inline-block">
              <Button 
                type="button"
                size="sm" 
                variant="outline" 
                className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5 text-xs font-semibold h-8 bg-transparent"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" /> Worksheet
              </Button>
            </a>
          )}
          
          <Button 
            type="button"
            size="icon" 
            variant="ghost" 
            className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8 rounded-lg transition-colors" 
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Custom URL Input Panel (Tutor Only) */}
      {showEmbedInput && (
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-col gap-2 transition-all">
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg bg-slate-950 border border-slate-800 text-white px-3 py-1.5 text-xs font-medium placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Paste approved educational URL or iframe code (PhET, Concord, etc.)"
              value={customEmbed}
              onChange={e => setCustomEmbed(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyCustomEmbed()}
            />
            <Button size="sm" type="button" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs" onClick={applyCustomEmbed}>
              Apply
            </Button>
            <Button 
              size="sm" 
              type="button"
              variant="ghost" 
              className="text-slate-400 text-xs font-medium hover:text-white" 
              onClick={resetToDefault}
            >
              Reset
            </Button>
          </div>
          
          {/* Security Warning */}
          {securityWarning && (
            <div className="p-2.5 bg-red-950/40 border border-red-900/60 rounded-lg text-red-400 text-[11px] font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
              <div>{securityWarning}</div>
            </div>
          )}
          
          {/* Approved Domains List */}
          <div className="text-[10px] text-slate-500 mt-1">
            <span className="font-semibold">Approved domains:</span> {APPROVED_DOMAINS.join(', ')}
          </div>
        </div>
      )}

      {/* Main Simulation Iframe with Security Sandbox */}
      <div className="flex-1 relative bg-slate-950">
        <iframe
          src={embedSrc}
          title={simulation.title}
          className="w-full h-full border-0 bg-slate-950"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          allow="fullscreen; autoplay"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>

      {/* Projector Mode Status */}
      {lessonMode && (
        <div className="shrink-0 bg-slate-900 border-t border-slate-800 px-4 py-2.5 flex items-center justify-between shadow-lg">
          <span className="text-slate-300 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 
            Projector mode active. Simulation is displayed in a separate window for classroom projection.
          </span>
          <Button 
            type="button"
            size="sm" 
            variant="ghost" 
            className="text-blue-400 hover:text-blue-300 font-bold text-xs p-0 h-auto bg-transparent" 
            onClick={() => setLessonMode(false)}
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}

// Add PropTypes to the component
SimulationPlayer.propTypes = propTypes;
