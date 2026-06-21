import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Users, BookOpen, School, CheckCircle, Loader2, Shield, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import TutorConsentModal from '@/components/onboarding/TutorConsentModal';

const ADMIN_EMAILS = ['aneleqamata95@gmail.com', 'aneleq@techandguard.co.za'];

const SA_UNIVERSITIES = [
  // ... (keep your existing list)
];

const ROLES = [
  // ... (keep your existing list)
];

export default function Onboarding({ user, onComplete }) {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('');
  const [saceNumber, setSaceNumber] = useState('');
  const [university, setUniversity] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [linkedEmail, setLinkedEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('standard');
  const [saving, setSaving] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [policyConsent, setPolicyConsent] = useState(false);

  // ✅ FORCE ADMIN REDIRECT – Runs IMMEDIATELY on mount
  useEffect(() => {
    // Check if user is admin by email or role
    const isAdmin = ADMIN_EMAILS.includes(user?.email) || 
                    user?.role === 'admin' || 
                    user?.is_super_admin === true;

    if (isAdmin) {
      console.log('🚀 Admin detected in Onboarding – redirecting to home');
      // Force redirect to home (replace so user can't go back)
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // If admin is detected, show a loading spinner while redirecting
  const isAdmin = ADMIN_EMAILS.includes(user?.email) || 
                  user?.role === 'admin' || 
                  user?.is_super_admin === true;

  if (isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
      </div>
    );
  }

  // --- Normal onboarding for non-admin users (unchanged) ---
  const isTutorRole = selectedRole === 'sace_tutor' || selectedRole === 'student_tutor';

  // ... (the rest of your existing onboarding logic and JSX)
  // Keep everything else exactly as before.

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-10 px-4">
      {/* Your existing JSX */}
    </div>
  );
}
