import React from 'react';
import { Shield, Zap, Heart, MapPin, Building, ShieldCheck, Cpu } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AboutTechAndGuard() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased select-none">
      
      {/* Premium Institutional Header Canvas */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-5 h-5 text-blue-600 animate-pulse" />
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Enterprise Engineering Group</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight sm:text-4xl">About Tech & GUARD</h1>
          <p className="text-sm font-medium text-slate-400 mt-1">The secure architectural foundation behind the SmartBridge FET platform.</p>
        </div>
      </div>

      {/* Main Narrative Layout Grid */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        {/* Mission Statement Card */}
        <Card className="border-slate-200 shadow-md bg-white overflow-hidden">
          <CardContent className="p-6 space-y-3">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" /> Our Core Mandate
            </h2>
            <p className="text-slate-600 text-xs font-medium leading-relaxed">
              At Tech & GUARD, we engineer high-prestige, secure digital environments for the South African education sector. We believe that student tracking metrics and institutional data networks require the highest grade of protection. SmartBridge FET is designed from the ground up to combine CAPS curriculum tracking tools with absolute data residency safeguards, giving local schools a compliant alternative to global tech solutions.
            </p>
          </CardContent>
        </Card>

        {/* Why Choose Infrastructure Features Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Engineering Values</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-start gap-3">
              <div className="bg-blue-50 p-2 rounded-xl shrink-0 text-blue-600 border border-blue-100">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">POPIA Security Firewalls</h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">We implement strict Row-Level Security (RLS) to ensure high-risk student profile metadata remains fully secure and encrypted.</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-start gap-3">
              <div className="bg-indigo-50 p-2 rounded-xl shrink-0 text-indigo-600 border border-indigo-100">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">CAPS Curriculum Mapping</h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">Our tracking engine aligns side-by-side with official Department of Basic Education criteria models for flawless reporting.</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-start gap-3">
              <div className="bg-emerald-50 p-2 rounded-xl shrink-0 text-emerald-600 border border-emerald-100">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">SACE Educator Audits</h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">Our independent tutor marketplace maintains strict anti-fraud checks, requiring clean professional standing.</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-start gap-3">
              <div className="bg-amber-50 p-2 rounded-xl shrink-0 text-amber-700 border border-amber-100">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">Proudly South African</h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">Built locally by a Stellenbosch University student, providing direct regulatory support for schools across the country.</p>
              </div>
            </div>

          </div>
        </div>

        {/* Official CIPC Company Directory Records Panel */}
        <Card className="border-slate-200 shadow-md bg-white overflow-hidden">
          <CardHeader className="p-4 border-b border-slate-50 bg-slate-50/50">
            <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-4 h-4 text-slate-400" /> Statutory Registration Details
            </h3>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Registered Entity Name</p>
                <p className="text-slate-800 font-bold">Tech & GUARD Pty Ltd</p>
              </div>
              <div className="space-y-1">
                {/* FIXED: Patched typo to display the actual verified CIPC registration sequence */}
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">CIPC Registration Number</p>
                <p className="text-slate-800 font-bold">2026/155090/09</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Statutory Incorporation Authority</p>
                <p className="text-slate-800 font-bold">Companies and Intellectual Property Commission, South Africa</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Official Registration Date</p>
                <p className="text-slate-800 font-bold">21 February 2026</p>
              </div>
            </div>
            
            <p className="text-[11px] text-slate-400 mt-6 pt-4 border-t border-slate-100 font-medium leading-relaxed">
              As a registered South African technology company, we operate in full compliance with local consumer protection frameworks, the Electronic Communications and Transactions Act (ECTA), and POPIA directives.
            </p>
          </CardContent>
        </Card>

        {/* Interactive Call-To-Action Portal Redirection Hub */}
        <Card className="border-blue-100 bg-blue-50/30 text-center rounded-2xl shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">Corporate Communication Channels</h4>
              <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto mt-1 leading-relaxed">
                Have questions about our data safety audits or want to deploy the SmartBridge platform at your school? Connect with our team directly.
              </p>
            </div>
            <div>
              <a
                href="https://www.techandguard.co.za"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-5 h-9 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all transform active:scale-95 gap-1"
              >
                Visit Tech & GUARD Corporate Portal <ExternalLink className="w-3.5 h-3.5 text-blue-200" />
              </a>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}