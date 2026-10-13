// src/pages/PrivacyPolicy.jsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2, AlertCircle, ShieldCheck,
  FileText, Lock, Users,
  GraduationCap,
  Clock, Printer, Download
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // App name
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBridge FET',

  // Company name
  COMPANY_NAME: import.meta.env.VITE_COMPANY_NAME || 'Tech & GUARD Pty Ltd',

  // Effective date
  EFFECTIVE_DATE: import.meta.env.VITE_PRIVACY_EFFECTIVE_DATE || '23 May 2026',

  // Document keys in Supabase
  DOC_KEYS: {
    STUDENT: import.meta.env.VITE_PRIVACY_STUDENT_DOC_KEY || 'privacy_student',
    TUTOR: import.meta.env.VITE_PRIVACY_TUTOR_DOC_KEY || 'privacy_tutor',
    PARENT: import.meta.env.VITE_PRIVACY_PARENT_DOC_KEY || 'privacy_parent',
  },

  // Feature flags
  ENABLE_PRINT: import.meta.env.VITE_PRIVACY_ENABLE_PRINT !== 'false',
  ENABLE_DOWNLOAD: import.meta.env.VITE_PRIVACY_ENABLE_DOWNLOAD !== 'false',

  // Messages
  MESSAGES: {
    LOADING: import.meta.env.VITE_PRIVACY_LOADING_MSG || 'Loading privacy policy...',
    UNAVAILABLE: import.meta.env.VITE_PRIVACY_UNAVAILABLE_MSG || 'Privacy policy temporarily unavailable.',
    ERROR: import.meta.env.VITE_PRIVACY_ERROR_MSG || 'Unable to load Privacy Policy. Please try again later.',
    STUDENT_VERSION: import.meta.env.VITE_PRIVACY_STUDENT_LABEL || 'Student Version',
    TUTOR_VERSION: import.meta.env.VITE_PRIVACY_TUTOR_LABEL || 'Tutor Version (Includes Addendum)',
    PARENT_VERSION: import.meta.env.VITE_PRIVACY_PARENT_LABEL || 'Parent Version',
    EFFECTIVE_LABEL: import.meta.env.VITE_PRIVACY_EFFECTIVE_LABEL || 'Effective',
    LAST_UPDATED: import.meta.env.VITE_PRIVACY_LAST_UPDATED_LABEL || 'Last updated',
  },
};

// ============================================================
// Sub-Components
// ============================================================

function RoleBadge({ role, isTutor, isParent, isStudent }) {
  const getBadgeConfig = () => {
    if (isTutor) {
      return {
        label: CONFIG.MESSAGES.TUTOR_VERSION,
        icon: ShieldCheck,
        className: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
      };
    }
    if (isParent) {
      return {
        label: CONFIG.MESSAGES.PARENT_VERSION,
        icon: Users,
        className: 'bg-blue-500/10 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      };
    }
    return {
      label: CONFIG.MESSAGES.STUDENT_VERSION,
      icon: GraduationCap,
      className: 'bg-purple-500/10 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    };
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  return (
    <Badge className={`${config.className} gap-1.5 px-3 py-1.5 text-xs font-bold border`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </Badge>
  );
}

function ActionButtons({ onPrint, onDownload }) {
  return (
    <div className="flex items-center gap-2">
      {CONFIG.ENABLE_PRINT && (
        <Button
          size="sm"
          variant="outline"
          onClick={onPrint}
          className="gap-1.5 text-xs"
        >
          <Printer className="w-3.5 h-3.5" />
          Print
        </Button>
      )}
      {CONFIG.ENABLE_DOWNLOAD && (
        <Button
          size="sm"
          variant="outline"
          onClick={onDownload}
          className="gap-1.5 text-xs"
        >
          <Download className="w-3.5 h-3.5" />
          Download PDF
        </Button>
      )}
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function PrivacyPolicy() {
  const { user } = useAuth();
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [docVersion, setDocVersion] = useState(null);

  // ============================================================
  // Role Detection
  // ============================================================

  const isTutor = useMemo(() =>
    ['sace_tutor', 'student_tutor', 'tutor', 'tutor_pending'].includes(user?.role),
    [user?.role]
  );

  const isParent = useMemo(() =>
    user?.role === 'parent',
    [user?.role]
  );

  const isStudent = useMemo(() =>
    user?.role === 'student' || !user || (!isTutor && !isParent),
    [user?.role, isTutor, isParent]
  );

  // ============================================================
  // Determine which documents to fetch
  // ============================================================

  const getDocumentKeys = useCallback(() => {
    const keys = [];

    // Always include student/privacy policy
    keys.push(CONFIG.DOC_KEYS.STUDENT);

    // Tutor addendum
    if (isTutor) {
      keys.push(CONFIG.DOC_KEYS.TUTOR);
    }

    // Parent addendum
    if (isParent) {
      keys.push(CONFIG.DOC_KEYS.PARENT);
    }

    return keys;
  }, [isTutor, isParent]);

  // ============================================================
  // Fetch Privacy Policy
  // ============================================================

  useEffect(() => {
    async function fetchPrivacy() {
      try {
        setLoading(true);
        setError(false);

        const docKeys = getDocumentKeys();
        let content = '';
        let latestUpdated = null;
        let version = null;

        // Fetch each document
        for (const key of docKeys) {
          const { data, error: fetchError } = await supabase
            .from('legal_documents')
            .select('content, updated_at, version')
            .eq('doc_key', key)
            .single();

          if (fetchError) {
            console.warn(`Failed to fetch ${key}:`, fetchError);
            continue;
          }

          if (data?.content) {
            // Add separator between documents
            if (content) {
              content += '\n\n---\n\n';
            }
            content += data.content;

            // Track latest update
            if (data.updated_at) {
              const updateDate = new Date(data.updated_at);
              if (!latestUpdated || updateDate > new Date(latestUpdated)) {
                latestUpdated = data.updated_at;
              }
            }
            if (data.version && !version) {
              version = data.version;
            }
          }
        }

        if (!content) {
          // If no content found, use fallback
          content = CONFIG.MESSAGES.UNAVAILABLE;
          setError(true);
        }

        setMarkdown(content);
        setLastUpdated(latestUpdated);
        setDocVersion(version);

      } catch (err) {
        console.error('Fetch error:', err);
        setError(true);
        setMarkdown(CONFIG.MESSAGES.ERROR);
        toast.error(CONFIG.MESSAGES.ERROR);
      } finally {
        setLoading(false);
      }
    }

    fetchPrivacy();
  }, [getDocumentKeys]);

  // ============================================================
  // Handlers
  // ============================================================

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    try {
      // Create a clean HTML version for download
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Privacy Policy - ${CONFIG.APP_NAME}</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
              h1 { font-size: 24px; }
              h2 { font-size: 20px; margin-top: 24px; }
              h3 { font-size: 16px; margin-top: 16px; }
              p { margin: 8px 0; }
              ul { padding-left: 20px; }
            </style>
          </head>
          <body>
            <h1>Privacy Policy</h1>
            <p><strong>${CONFIG.APP_NAME}</strong></p>
            <p><strong>Effective:</strong> ${CONFIG.EFFECTIVE_DATE}</p>
            ${lastUpdated ? `<p><strong>Last updated:</strong> ${new Date(lastUpdated).toLocaleDateString('en-ZA')}</p>` : ''}
            <hr/>
            <div>${markdown}</div>
            <hr/>
            <p><em>© ${new Date().getFullYear()} ${CONFIG.COMPANY_NAME}. All rights reserved.</em></p>
          </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `privacy-policy-${new Date().toISOString().split('T')[0]}.html`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Privacy policy downloaded successfully!');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download privacy policy.');
    }
  };

  // ============================================================
  // Loading State
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center gap-3 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-semibold animate-pulse">
          {CONFIG.MESSAGES.LOADING}
        </p>
      </div>
    );
  }

  // ============================================================
  // Render
  // ============================================================

  const roleName = isTutor ? 'Tutor' : isParent ? 'Parent' : 'Student';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-gradient-to-r from-card to-muted/30 border-b border-border/50 py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-5 h-5 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {CONFIG.MESSAGES.EFFECTIVE_LABEL}: {CONFIG.EFFECTIVE_DATE}
                </p>
                {lastUpdated && (
                  <span className="text-xs text-muted-foreground/60">
                    · {CONFIG.MESSAGES.LAST_UPDATED}: {new Date(lastUpdated).toLocaleDateString('en-ZA')}
                  </span>
                )}
                {docVersion && (
                  <Badge variant="outline" className="text-[10px]">
                    v{docVersion}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <RoleBadge
                role={user?.role}
                isTutor={isTutor}
                isParent={isParent}
                isStudent={isStudent}
              />
              <ActionButtons onPrint={handlePrint} onDownload={handleDownload} />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {error ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-8 text-center">
            <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{CONFIG.MESSAGES.ERROR}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-sm">
            <article className="prose prose-slate dark:prose-invert max-w-none prose-sm sm:prose-base">
              <ReactMarkdown
                components={{
                  // Custom components for better styling
                  h1: ({ node, ...props }) => (
                    <h1 className="text-2xl font-bold mt-8 mb-4 text-foreground" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-xl font-bold mt-6 mb-3 text-foreground border-b border-border/50 pb-2" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground" {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <p className="text-sm leading-relaxed text-foreground/90 mb-3" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc pl-6 mb-3 space-y-1 text-sm" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal pl-6 mb-3 space-y-1 text-sm" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="text-foreground/90" {...props} />
                  ),
                  strong: ({ node, ...props }) => (
                    <strong className="font-semibold text-foreground" {...props} />
                  ),
                  a: ({ node, href, children, ...props }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium"
                      {...props}
                    >
                      {children}
                    </a>
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-primary/30 pl-4 py-1 my-3 text-muted-foreground text-sm italic" {...props} />
                  ),
                  hr: ({ node, ...props }) => (
                    <hr className="my-6 border-border/50" {...props} />
                  ),
                }}
              >
                {markdown}
              </ReactMarkdown>
            </article>

            {/* Footer note for role-specific version */}
            <div className="mt-8 pt-4 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                This is the <strong>{roleName}</strong> version of the Privacy Policy.
                {isTutor && ' Includes the Tutor Addendum.'}
                {isParent && ' Includes the Parent Addendum.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
