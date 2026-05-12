import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Play } from 'lucide-react';

const SUBJECT_COLORS = {
  Physics: 'bg-blue-100 text-blue-700',
  Chemistry: 'bg-purple-100 text-purple-700',
  Biology: 'bg-green-100 text-green-700',
};

export default function SimulationCard({ simulation, onPlay }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow group">
      <div className="relative h-36 overflow-hidden bg-muted">
        <img
          src={simulation.thumbnail}
          alt={simulation.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button size="sm" className="bg-white text-gray-900 hover:bg-white/90 gap-1.5 shadow-lg" onClick={onPlay}>
            <Play className="w-3.5 h-3.5 fill-current" /> Launch Sim
          </Button>
        </div>
        <div className="absolute top-2 left-2">
          <Badge className={`text-xs ${SUBJECT_COLORS[simulation.subject] || 'bg-muted text-muted-foreground'}`}>
            {simulation.subject}
          </Badge>
        </div>
        <div className="absolute top-2 right-2">
          <Badge variant="outline" className="text-xs bg-white/90 text-gray-700 border-0">
            {simulation.grade}
          </Badge>
        </div>
      </div>
      <div className="p-3">
        <p className="font-semibold text-sm leading-tight mb-0.5">{simulation.title}</p>
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{simulation.description}</p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-primary font-medium truncate">{simulation.caps_topic}</span>
          <div className="flex gap-1.5 shrink-0">
            {simulation.worksheetUrl && (
              <a href={simulation.worksheetUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 px-2">
                  <Download className="w-3 h-3" /> Sheet
                </Button>
              </a>
            )}
            <Button size="sm" className="h-7 text-xs gap-1 px-2 bg-primary" onClick={onPlay}>
              <Play className="w-3 h-3" /> Open
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}