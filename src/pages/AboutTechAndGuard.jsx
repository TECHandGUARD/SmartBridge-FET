import { appConfig } from '@/lib/config';
import React from 'react';
import { Shield, Zap, Heart, MapPin, Building, ShieldCheck, Cpu, ExternalLink, CheckCircle, Award, Lock, GraduationCap } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
export default function AboutTechAndGuard() {
  const COMPANY_NAME = appConfig.company.name;
  const REGISTRATION_NUMBER = appConfig.company.registrationNumber;
  const REGISTRATION_DATE = appConfig.company.registrationDate;
  const SUPPORT_EMAIL = appConfig.company.supportEmail;
  const CORPORATE_WEBSITE = appConfig.company.website;
  const values = [{
    icon: Shield,
    title: 'POPIA Security Firewalls',
    description: 'We implement strict Row-Level Security (RLS) to ensure high-risk student profile metadata remains fully secure and encrypted.',
    color: 'blue'
  }, {
    icon: Zap,
    title: 'CAPS Curriculum Mapping',
    description: 'Our tracking engine aligns side-by-side with official Department of Basic Education criteria models for flawless reporting.',
    color: 'indigo'
  }, {
    icon: Heart,
    title: 'SACE Educator Audits',
    description: 'Our independent tutor marketplace maintains strict anti-fraud checks, requiring clean professional standing.',
    color: 'emerald'
  }, {
    icon: MapPin,
    title: 'Proudly South African',
    description: 'Built locally by a Stellenbosch University student, providing direct regulatory support for schools across the country.',
    color: 'amber'
  }];
  const complianceBadges = [{
    label: 'POPIA Compliant',
    icon: ShieldCheck,
    color: 'bg-blue-100 text-blue-700 border-blue-200'
  }, {
    label: 'SACE Verified',
    icon: Award,
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200'
  }, {
    label: 'CAPS Aligned',
    icon: GraduationCap,
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200'
  }, {
    label: 'DBE Guidelines',
    icon: CheckCircle,
    color: 'bg-amber-100 text-amber-700 border-amber-200'
  }];
  return <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white font-sans antialiased select-none">

      {}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-5 h-5 text-blue-600 animate-pulse" />
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
              Enterprise Engineering Group
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight sm:text-4xl">
            About Tech & GUARD
          </h1>
          <p className="text-sm font-medium text-slate-400 mt-1">
            The secure architectural foundation behind the SmartBridge FET platform.
          </p>
        </div>
      </div>

      {}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {}
        <Card className="border-slate-200 shadow-md bg-white overflow-hidden">
          <CardContent className="p-6 space-y-3">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Our Core Mandate
            </h2>
            <p className="text-slate-600 text-xs font-medium leading-relaxed">
              At Tech & GUARD, we engineer high-prestige, secure digital environments for the South African education sector.
              We believe that student tracking metrics and institutional data networks require the highest grade of protection.
              SmartBridge FET is designed from the ground up to combine CAPS curriculum tracking tools with absolute data residency
              safeguards, giving local schools a compliant alternative to global tech solutions.
            </p>
          </CardContent>
        </Card>

        {}
        <div className="flex flex-wrap gap-2 justify-center">
          {complianceBadges.map(badge => <Badge key={badge.label} className={`${badge.color} gap-1.5 px-3 py-1.5 text-xs font-semibold border`}>
              <badge.icon className="w-3.5 h-3.5" />
              {badge.label}
            </Badge>)}
        </div>

        {}
        <div className="space-y-3">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
            Engineering Values
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {values.map((value, index) => {
            const colorMap = {
              blue: 'bg-blue-50 text-blue-600 border-blue-100',
              indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
              emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
              amber: 'bg-amber-50 text-amber-700 border-amber-100'
            };
            return <div key={index} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow group">
                  <div className={`p-2 rounded-xl shrink-0 border ${colorMap[value.color]} group-hover:scale-110 transition-transform`}>
                    <value.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                      {value.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">
                      {value.description}
                    </p>
                  </div>
                </div>;
          })}
          </div>
        </div>

        {}
        <Card className="border-slate-200 shadow-md bg-white overflow-hidden">
          <CardHeader className="p-4 border-b border-slate-50 bg-slate-50/50">
            <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-4 h-4 text-slate-400" />
              Statutory Registration Details
            </h3>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Registered Entity Name
                </p>
                <p className="text-slate-800 font-bold">
                  {COMPANY_NAME}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                  CIPC Registration Number
                </p>
                <p className="text-slate-800 font-bold font-mono">
                  {REGISTRATION_NUMBER}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Statutory Incorporation Authority
                </p>
                <p className="text-slate-800 font-bold">
                  Companies and Intellectual Property Commission, South Africa
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Official Registration Date
                </p>
                <p className="text-slate-800 font-bold">
                  {REGISTRATION_DATE}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                As a registered South African technology company, we operate in full compliance with local consumer protection
                frameworks, the Electronic Communications and Transactions Act (ECTA), and POPIA directives.
              </p>
            </div>
          </CardContent>
        </Card>

        {}
        <Card className="border-blue-100 bg-gradient-to-br from-blue-50/50 to-white">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800">
                  Data Protection & Security Accreditation
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  SmartBridge FET is engineered with enterprise-grade security protocols
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/80 rounded-lg p-3 border border-blue-100">
                <p className="font-bold text-slate-700">Encryption</p>
                <p className="text-[10px] text-slate-500">TLS 1.3 for all data in transit</p>
              </div>
              <div className="bg-white/80 rounded-lg p-3 border border-blue-100">
                <p className="font-bold text-slate-700">Access Control</p>
                <p className="text-[10px] text-slate-500">Role-Based Access Control (RBAC)</p>
              </div>
              <div className="bg-white/80 rounded-lg p-3 border border-blue-100">
                <p className="font-bold text-slate-700">Data Residency</p>
                <p className="text-[10px] text-slate-500">All data stored within South Africa</p>
              </div>
              <div className="bg-white/80 rounded-lg p-3 border border-blue-100">
                <p className="font-bold text-slate-700">Compliance</p>
                <p className="text-[10px] text-slate-500">POPIA, ECTA, and DBE guidelines</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {}
        <Card className="border-blue-100 bg-blue-50/30 text-center rounded-2xl shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                Corporate Communication Channels
              </h4>
              <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto mt-1 leading-relaxed">
                Have questions about our data safety audits or want to deploy the SmartBridge platform at your school?
                Connect with our team directly.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href={CORPORATE_WEBSITE} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-5 h-9 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all transform active:scale-95 gap-1">
                Visit Tech & GUARD Corporate Portal
                <ExternalLink className="w-3.5 h-3.5 text-blue-200" />
              </a>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex items-center justify-center px-5 h-9 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-sm transition-all">
                Contact Support Team
              </a>
            </div>
          </CardContent>
        </Card>

        {}
        <div className="pt-4 border-t border-slate-200 text-center">
          <p className="text-[10px] text-slate-400 font-medium">
            © {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.
            SmartBridge FET is a registered digital platform of Tech & GUARD Pty Ltd.
          </p>
          <p className="text-[10px] text-slate-300 mt-1">
            CIPC Registration: {REGISTRATION_NUMBER} · POPIA Compliant · SACE Verified
          </p>
        </div>
      </div>
    </div>;
}
