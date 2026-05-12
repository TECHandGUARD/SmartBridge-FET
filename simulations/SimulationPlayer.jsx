import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Maximize2, Monitor, Download, ExternalLink } from 'lucide-react';

export default function SimulationPlayer({ simulation, isTutor, onClose }) {
  const [lessonMode, setLessonMode] = useState(false);
  const [customEmbed, setCustomEmbed] = useState('');
  const [showEmbedInput, setShowEmbedInput] = useState(false);
  const [embedSrc, setEmbedSrc] = useState(simulation.embedUrl);

  const launchLessonMode = () => {
    const win = window.open(embedSrc, '_blank', 'fullscreen=yes,toolbar=no,menubar=no,scrollbars=no,resizable=yes');
    if (win) win.focus();
    setLessonMode(true);
  };

  const applyCustomEmbed = () => {
    // Extract src from iframe code if pasted, otherwise treat as raw URL
    const match = customEmbed.match(/src=["']([^"']+)["']/i);
    setEmbedSrc(match ? match[1] : customEmbed);
    setShowEmbedInput(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Badge className="bg-primary/20 text-primary border-primary/30 shrink-0">{simulation.subject}</Badge>
          <span className="text-white font-semibold truncate">{simulation.title}</span>
          <Badge variant="outline" className="text-gray-300 border-gray-600 shrink-0 text-xs">{simulation.caps_topic}</Badge>
        </div>
        <div className="flex items-center gap-2 ml-4 shrink-0">
          {isTutor && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700 gap-1.5 text-xs"
                onClick={() => setShowEmbedInput(!showEmbedInput)}
              >
                <ExternalLink className="w-3.5 h-3.5" /> Custom Embed
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 gap-1.5 text-xs"
                onClick={launchLessonMode}
              >
                <Monitor className="w-3.5 h-3.5" /> Lesson Mode
              </Button>
            </>
          )}
          {simulation.worksheetUrl && (
            <a href={simulation.worksheetUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700 gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5" /> Worksheet
              </Button>
            </a>
          )}
          <Button size="icon" variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-700 h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Custom embed input */}
      {showEmbedInput && (
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex gap-2">
          <input
            className="flex-1 rounded-md bg-gray-900 border border-gray-600 text-white px-3 py-1.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Paste PhET embed URL or <iframe> code here..."
            value={customEmbed}
            onChange={e => setCustomEmbed(e.target.value)}
          />
          <Button size="sm" className="bg-primary" onClick={applyCustomEmbed}>Apply</Button>
          <Button size="sm" variant="ghost" className="text-gray-300" onClick={() => { setEmbedSrc(simulation.embedUrl); setShowEmbedInput(false); }}>Reset</Button>
        </div>
      )}

      {/* Simulation iframe */}
      <div className="flex-1 relative">
        <iframe
          src={embedSrc}
          title={simulation.title}
          className="w-full h-full border-0"
          allow="fullscreen"
          allowFullScreen
        />
      </div>

      {/* Lesson mode toast */}
      {lessonMode && (
        <div className="shrink-0 bg-blue-900/80 border-t border-blue-700 px-4 py-2 flex items-center justify-between">
          <span className="text-blue-200 text-sm flex items-center gap-2">
            <Monitor className="w-4 h-4" /> Simulation opened in a new window for projection. Students see this screen.
          </span>
          <Button size="sm" variant="ghost" className="text-blue-300 text-xs" onClick={() => setLessonMode(false)}>Dismiss</Button>
        </div>
      )}
    </div>
  );
}