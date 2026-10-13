// src/pages/TermsOfService.jsx
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2, AlertCircle, ShieldCheck, Download,
  Printer, Save, Lock, Users, GraduationCap, Briefcase, Clock, Scale
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
  EFFECTIVE_DATE: import.meta.env.VITE_TERMS_EFFECTIVE_DATE || '23 May 2026',

  // Document keys in Supabase
  DOC_KEYS: {
    STUDENT: import.meta.env.VITE_TERMS_STUDENT_DOC_KEY || 'terms_student',
    TUTOR: import.meta.env.VITE_TERMS_TUTOR_DOC_KEY || 'terms_tutor',
    PARENT: import.meta.env.VITE_TERMS_PARENT_DOC_KEY || 'terms_parent',
    ADMIN: import.meta.env.VITE_TERMS_ADMIN_DOC_KEY || 'terms_admin',
  },

  // Feature flags
  ENABLE_PRINT: import.meta.env.VITE_TERMS_ENABLE_PRINT !== 'false',
  ENABLE_DOWNLOAD: import.meta.env.VITE_TERMS_ENABLE_DOWNLOAD !== 'false',
  ENABLE_SAVE: import.meta.env.VITE_TERMS_ENABLE_SAVE !== 'false',

  // Messages
  MESSAGES: {
    LOADING: import.meta.env.VITE_TERMS_LOADING_MSG || 'Loading legal terms...',
    UNAVAILABLE: import.meta.env.VITE_TERMS_UNAVAILABLE_MSG || 'Terms temporarily unavailable.',
    ERROR: import.meta.env.VITE_TERMS_ERROR_MSG || 'Unable to load Terms of Service. Please try again later.',
    STUDENT_VERSION: import.meta.env.VITE_TERMS_STUDENT_LABEL || 'Student Version',
    TUTOR_VERSION: import.meta.env.VITE_TERMS_TUTOR_LABEL || 'Tutor Version (Includes Contract)',
    PARENT_VERSION: import.meta.env.VITE_TERMS_PARENT_LABEL || 'Parent Version',
    ADMIN_VERSION: import.meta.env.VITE_TERMS_ADMIN_LABEL || 'Admin Version (Full Access)',
    EFFECTIVE_LABEL: import.meta.env.VITE_TERMS_EFFECTIVE_LABEL || 'Effective',
    LAST_UPDATED: import.meta.env.VITE_TERMS_LAST_UPDATED_LABEL || 'Last updated',
    DOWNLOAD_SUCCESS: import.meta.env.VITE_TERMS_DOWNLOAD_SUCCESS_MSG || 'Terms downloaded successfully!',
    DOWNLOAD_FAILED: import.meta.env.VITE_TERMS_DOWNLOAD_FAILED_MSG || 'Failed to download terms.',
    SAVE_SUCCESS: import.meta.env.VITE_TERMS_SAVE_SUCCESS_MSG || 'Terms saved successfully!',
  },
};

// ============================================================
// Sub-Components
// ============================================================

function RoleBadge({ role, isTutor, isParent, isStudent, isAdmin }) {
  const getBadgeConfig = () => {
    if (isAdmin) {
      return {
        label: CONFIG.MESSAGES.ADMIN_VERSION,
        icon: ShieldCheck,
        className: 'bg-red-500/10 text-red-600 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800',
      };
    }
    if (isTutor) {
      return {
        label: CONFIG.MESSAGES.TUTOR_VERSION,
        icon: Briefcase,
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

function ActionButtons({ onPrint, onDownload, onSave, isAdmin, isTutor }) {
  const showAdminActions = isAdmin || isTutor;

  return (
    <div className="flex items-center gap-2 flex-wrap">
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
          Download
        </Button>
      )}
      {CONFIG.ENABLE_SAVE && showAdminActions && (
        <Button
          size="sm"
          variant="outline"
          onClick={onSave}
          className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
        >
          <Save className="w-3.5 h-3.5" />
          Save Copy
        </Button>
      )}
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function TermsOfService() {
  const { user } = useAuth();
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [docVersion, setDocVersion] = useState(null);
  const [showFullVersion, setShowFullVersion] = useState(false);
  const contentRef = useRef(null);

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

  const isAdmin = useMemo(() =>
    user?.role === 'admin' || user?.is_super_admin === true,
    [user]
  );

  const isStudent = useMemo(() =>
    user?.role === 'student' || !user || (!isTutor && !isParent && !isAdmin),
    [user, isTutor, isParent, isAdmin]
  );

  // ============================================================
  // Determine which documents to fetch
  // ============================================================

  const getDocumentKeys = useCallback(() => {
    const keys = [];

    // Everyone gets the base terms
    keys.push(CONFIG.DOC_KEYS.STUDENT);

    // Role-specific addendums
    if (isTutor) {
      keys.push(CONFIG.DOC_KEYS.TUTOR);
    }
    if (isParent) {
      keys.push(CONFIG.DOC_KEYS.PARENT);
    }
    if (isAdmin) {
      keys.push(CONFIG.DOC_KEYS.ADMIN);
    }

    return keys;
  }, [isTutor, isParent, isAdmin]);

  // ============================================================
  // Fetch Terms
  // ============================================================

  useEffect(() => {
    async function fetchTerms() {
      try {
        setLoading(true);
        setError(false);

        const docKeys = getDocumentKeys();
        let content = '';
        let latestUpdated = null;
        let version = null;

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
            if (content) {
              content += '\n\n---\n\n';
            }
            content += data.content;

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

    fetchTerms();
  }, [getDocumentKeys]);

  // ============================================================
  // Handlers
  // ============================================================

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    try {
      const roleName = isAdmin ? 'Admin' : isTutor ? 'Tutor' : isParent ? 'Parent' : 'Student';
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Terms of Service - ${CONFIG.APP_NAME}</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
              h1 { font-size: 24px; }
              h2 { font-size: 20px; margin-top: 24px; }
              h3 { font-size: 16px; margin-top: 16px; }
              p { margin: 8px 0; }
              ul { padding-left: 20px; }
              .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
              .footer { border-top: 1px solid #ccc; padding-top: 10px; margin-top: 20px; font-size: 12px; color: #666; }
              .role-badge { display: inline-block; background: #e8f5e9; color: #2e7d32; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Terms of Service</h1>
              <p><strong>${CONFIG.APP_NAME}</strong></p>
              <p><strong>Effective:</strong> ${CONFIG.EFFECTIVE_DATE}</p>
              ${lastUpdated ? `<p><strong>Last updated:</strong> ${new Date(lastUpdated).toLocaleDateString('en-ZA')}</p>` : ''}
              <p><span class="role-badge">${roleName} Version</span></p>
            </div>
            <div>${markdown}</div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${CONFIG.COMPANY_NAME}. All rights reserved.</p>
              <p>This document is confidential and proprietary to ${CONFIG.COMPANY_NAME}.</p>
            </div>
          </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `terms-of-service-${new Date().toISOString().split('T')[0]}.html`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(CONFIG.MESSAGES.DOWNLOAD_SUCCESS);
    } catch (err) {
      console.error('Download error:', err);
      toast.error(CONFIG.MESSAGES.DOWNLOAD_FAILED);
    }
  };

  const handleSave = () => {
    try {
      // Save as a plain text file for archiving
      const roleName = isAdmin ? 'Admin' : isTutor ? 'Tutor' : isParent ? 'Parent' : 'Student';
      const textContent = `
        ============================================================
        ${CONFIG.APP_NAME} - TERMS OF SERVICE
        ============================================================
        Version: ${roleName}
        Effective: ${CONFIG.EFFECTIVE_DATE}
        Last Updated: ${lastUpdated ? new Date(lastUpdated).toLocaleDateString('en-ZA') : 'N/A'}
        ============================================================

        ${markdown.replace(/---/g, '\n' + '='.repeat(60) + '\n')}

        ============================================================
        © ${new Date().getFullYear()} ${CONFIG.COMPANY_NAME}
        All rights reserved. Confidential and proprietary.
        ============================================================
      `;

      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `terms-of-service-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(CONFIG.MESSAGES.SAVE_SUCCESS);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save terms.');
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

  const roleName = isAdmin ? 'Admin' : isTutor ? 'Tutor' : isParent ? 'Parent' : 'Student';
  const isAuthorizedForFullAccess = isAdmin || isTutor;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-gradient-to-r from-card to-muted/30 border-b border-border/50 py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Scale className="w-5 h-5 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
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
                isAdmin={isAdmin}
              />
              <ActionButtons
                onPrint={handlePrint}
                onDownload={handleDownload}
                onSave={handleSave}
                isAdmin={isAdmin}
                isTutor={isTutor}
              />
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
            <article
              ref={contentRef}
              className="prose prose-slate dark:prose-invert max-w-none prose-sm sm:prose-base"
            >
              <ReactMarkdown
                components={{
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  This is the <strong>{roleName}</strong> version of the Terms of Service.
                  {isTutor && ' Includes the Tutor Contract Addendum.'}
                  {isParent && ' Includes the Parent Addendum.'}
                  {isAdmin && ' Includes full administrative terms.'}
                </p>
                {isAuthorizedForFullAccess && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <ShieldCheck className="w-2.5 h-2.5" /> Full Access
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
