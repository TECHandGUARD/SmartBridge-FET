import React from 'react';
import PropTypes from 'prop-types';
import { Download, Play, BookOpen, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// PropTypes for component props
const propTypes = {
  simulation: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    subject: PropTypes.oneOf(['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Physical Sciences']).isRequired,
    grade_level: PropTypes.oneOf([10, 11, 12]).isRequired,
    caps_topic: PropTypes.string.isRequired,
    thumbnail_url: PropTypes.string,
    worksheet_url: PropTypes.string,
    simulation_url: PropTypes.string.isRequired,
    duration: PropTypes.number,
    is_new: PropTypes.bool
  }).isRequired,
  onPlay: PropTypes.func.isRequired,
  isLoading: PropTypes.bool
};

const SUBJECT_COLORS = {
  Physics: 'bg-blue-50 text-blue-700 border-blue-200',
  Chemistry: 'bg-purple-50 text-purple-700 border-purple-200',
  Biology: 'bg-green-50 text-green-700 border-green-200',
  Mathematics: 'bg-orange-50 text-orange-700 border-orange-200',
  'Physical Sciences': 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const FALLBACK_THUMBNAIL = 'https://placehold.co/400x200/e2e8f0/64748b?text=No+Thumbnail';

export default function SimulationCard({ simulation, onPlay, isLoading = false }) {
  const handleLaunch = () => {
    if (!isLoading && onPlay) {
      onPlay(simulation);
    }
  };

  return (
    <Card className="bg-card border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 group shadow-sm flex flex-col h-full">
      
      {/* Thumbnail Section */}
      <div className="relative h-36 w-full overflow-hidden bg-muted shrink-0">
        <img
          src={simulation.thumbnail_url || FALLBACK_THUMBNAIL}
          alt={simulation.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_THUMBNAIL;
          }}
        />
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
          <Button 
            type="button"
            size="sm" 
            onClick={handleLaunch}
            disabled={isLoading}
            className="bg-white text-slate-900 hover:bg-slate-100 font-bold gap-1.5 shadow-xl transition-transform transform scale-95 group-hover:scale-100 duration-300"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> 
            {isLoading ? 'Loading...' : 'Launch Lab'}
          </Button>
        </div>
        
        {/* Subject Badge */}
        <div className="absolute top-2.5 left-2.5">
          <Badge 
            variant="outline" 
            className={`text-[10px] font-bold py-0.5 px-2.5 shadow-sm ${SUBJECT_COLORS[simulation.subject] || 'bg-muted text-muted-foreground'}`}
          >
            {simulation.subject}
          </Badge>
        </div>
        
        {/* Grade Badge */}
        <div className="absolute top-2.5 right-2.5">
          <Badge variant="secondary" className="text-[10px] font-extrabold bg-white/95 text-slate-700 border border-slate-100 shadow-sm px-2">
            Grade {simulation.grade_level}
          </Badge>
        </div>

        {/* New Badge */}
        {simulation.is_new && (
          <div className="absolute bottom-2.5 left-2.5">
            <Badge className="text-[10px] font-bold bg-green-500 text-white border-0 px-2">
              New
            </Badge>
          </div>
        )}
      </div>
      
      {/* Content Section */}
      <CardContent className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-bold text-sm text-foreground leading-snug mb-1 line-clamp-1 group-hover:text-primary transition-colors">
              {simulation.title}
            </h4>
            {simulation.duration && (
              <div className="flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{simulation.duration}m</span>
              </div>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3 min-h-[32px]">
            {simulation.description}
          </p>
          
          {/* CAPS Topic */}
          <div className="flex items-center gap-1.5 mb-2">
            <BookOpen className="w-3 h-3 text-primary/70" />
            <span className="text-[10px] font-medium text-primary truncate" title={simulation.caps_topic}>
              {simulation.caps_topic}
            </span>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-border mt-auto">
          <div className="flex-1 min-w-0">
            {/* Empty space for layout balance */}
          </div>
          
          <div className="flex gap-1.5 shrink-0">
            {simulation.worksheet_url && (
              <a href={simulation.worksheet_url} target="_blank" rel="noopener noreferrer" className="inline-block">
                <Button 
                  type="button"
                  size="sm" 
                  variant="outline" 
                  className="h-7 text-[11px] font-bold gap-1 px-2.5"
                >
                  <Download className="w-3 h-3" /> Sheet
                </Button>
              </a>
            )}
            <Button 
              type="button"
              size="sm" 
              onClick={handleLaunch}
              disabled={isLoading}
              className="h-7 text-[11px] font-bold gap-1 px-2.5 bg-primary hover:bg-primary/90"
            >
              <Play className="w-3 h-3 fill-current" /> 
              {isLoading ? 'Loading...' : 'Open'}
            </Button>
          </div>
        </div>
      </CardContent>
      
    </Card>
  );
}

// Add PropTypes to the component
SimulationCard.propTypes = propTypes;
