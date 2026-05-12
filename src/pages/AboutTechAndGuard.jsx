import { Shield, Zap, Heart, MapPin, CheckCircle, Building, Phone, Mail, Globe } from 'lucide-react';

export default function AboutTechAndGuard() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">About Tech & GUARD</h1>
          <p className="text-muted-foreground">Your trusted partner for premium tech accessories & protection</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Mission Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">Our Mission</h2>
          <p className="text-foreground leading-relaxed text-lg">
            We believe your technology deserves the best protection. From phone cases to charging solutions, 
            power banks to audio gear, every product we offer is carefully selected to meet our standards 
            for quality, durability, and style.
          </p>
        </div>

        {/* Why Choose Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Why Choose Tech & GUARD?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <Shield className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Premium Quality</h3>
              <p className="text-muted-foreground text-sm">
                We source only the best protective accessories that combine functionality with sleek design
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <Zap className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Tech-Forward Approach</h3>
              <p className="text-muted-foreground text-sm">
                Our team stays ahead of the latest device releases to ensure you always have the right protection
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <Heart className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Customer-Focused</h3>
              <p className="text-muted-foreground text-sm">
                Your satisfaction and device safety are our top priorities
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <MapPin className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-2">South African Based</h3>
              <p className="text-muted-foreground text-sm">
                Proudly serving customers across South Africa with local support and fast delivery
              </p>
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="bg-card border border-border rounded-lg p-8 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Building className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Company Information</h2>
          </div>
          <div className="space-y-3 text-foreground">
            <p>
              <span className="font-semibold">Registered Company Name:</span> Tech & GUARD (PTY) LTD
            </p>
            <p>
              <span className="font-semibold">Registration Number:</span> 2026/155090/09
            </p>
            <p>
              <span className="font-semibold">Registered with:</span> Companies and Intellectual Property Commission (CIPC), South Africa
            </p>
            <p>
              <span className="font-semibold">Registration Date:</span> 21 February 2026
            </p>
            <p>
              <span className="font-semibold">Ownership:</span> Student-owned and operated (Stellenbosch University)
            </p>
          </div>
          <p className="text-muted-foreground text-sm mt-6 pt-6 border-t border-border">
            As a registered South African company, we operate in full compliance with local consumer protection laws and regulations. 
            Your trust and security matter to us.
          </p>
        </div>

        {/* Key Features */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          {[
            { icon: Shield, text: "Student-Owned Business" },
            { icon: Zap, text: "48-Hour Delivery" },
            { icon: Heart, text: "Yoco Card Payments" },
          ].map((item, i) => (
            <div key={i} className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
              <item.icon className="w-5 h-5 text-primary mx-auto mb-2" />
              <span className="text-sm font-medium text-foreground">{item.text}</span>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">Get in Touch</h2>
          <p className="text-foreground mb-6">
            Have questions about our products or need help choosing the right protection for your device? We're here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://www.techandguard.co.za"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              <Globe className="w-4 h-4" /> Visit Tech & GUARD Store
            </a>
            <a
              href="mailto:aneleq@techandguard.co.za"
              className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-secondary/90 transition-colors"
            >
              <Mail className="w-4 h-4" /> Email Us
            </a>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Follow us on social media for the latest deals and product launches
          </p>
        </div>
      </div>
    </div>
  );
}