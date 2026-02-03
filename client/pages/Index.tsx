import { useState } from "react";
import {
  ChevronRight,
  CheckCircle,
  Users,
  Target,
  ClipboardList,
  Heart,
  Home,
  Flag,
  Medal,
  Star,
  Building2,
  MessageSquare,
  User,
} from "lucide-react";
import Header from "../components/Header";

export default function Index() {
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    loanType: "conventional",
  });

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    alert(
      `Thank you, ${formData.name}! We'll contact you shortly at ${formData.phone}.`,
    );
    setFormData({ name: "", email: "", phone: "", loanType: "conventional" });
    setShowLeadForm(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header onGetPreApproved={() => setShowLeadForm(true)} />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#0A2F52] via-[#1a4d7a] to-[#135E99] pt-20">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-10 w-96 h-96 bg-white rounded-full mix-blend-screen filter blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-10 w-96 h-96 bg-white rounded-full mix-blend-screen filter blur-3xl animate-pulse" />
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-20 text-center max-w-4xl">
          <h1 className="font-display text-5xl md:text-7xl font-bold text-white mb-6 leading-tight animate-fade-in">
            A Smarter Way to Get Your Mortgage
          </h1>

          <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-2xl mx-auto animate-fade-in font-light leading-relaxed">
            Real professionals. Clear guidance. Faster closings.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10 animate-slide-up">
            <button
              onClick={() => setShowLeadForm(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 rounded-lg font-semibold uppercase tracking-wider text-sm transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg animate-glow-pulse"
            >
              Get Pre-Approved
            </button>
            <button className="bg-white/20 hover:bg-white/30 text-white px-8 py-4 rounded-lg font-semibold uppercase tracking-wider text-sm border border-white/40 transition-all duration-300 transform hover:scale-105">
              Calculate My Payment
            </button>
          </div>

          {/* Trust Micro-copy */}
          <div className="flex flex-col md:flex-row gap-6 justify-center text-sm text-blue-100 animate-slide-up">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-amber-400" />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-amber-400" />
              <span>Personalized</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-amber-400" />
              <span>Trusted Professionals</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Strip Section */}
      <section className="bg-gradient-to-r from-[#0A2F52] to-[#1a4d7a] py-12 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { icon: Users, title: "Experienced Loan Experts" },
              { icon: Target, title: "Multiple Loan Options" },
              { icon: ClipboardList, title: "Transparent Process" },
              { icon: Heart, title: "Client-First Approach" },
            ].map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <div
                  key={idx}
                  className="text-center text-white animate-fade-in"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <IconComponent size={48} className="mx-auto mb-3" />
                  <p className="font-semibold text-lg">{item.title}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Loan Programs Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-white to-[#F5F8FA]">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-[#0A2F52] mb-4">
              Loan Programs Built for You
            </h2>
            <p className="text-xl text-[#6B7280] max-w-2xl mx-auto">
              Choose the perfect loan program for your unique situation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Home,
                title: "Conventional",
                description: "The most popular choice with competitive rates",
              },
              {
                icon: Flag,
                title: "FHA",
                description: "Flexible terms perfect for first-time buyers",
              },
              {
                icon: Medal,
                title: "VA",
                description:
                  "Exclusive benefits for veterans and service members",
              },
              {
                icon: Star,
                title: "Non-QM",
                description:
                  "Creative financing for unique financial situations",
              },
            ].map((program, idx) => {
              const IconComponent = program.icon;
              return (
                <div
                  key={idx}
                  className="group bg-white rounded-xl p-8 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:border-amber-500 border-2 border-transparent cursor-pointer animate-slide-up"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <IconComponent size={56} className="mb-4 text-[#0A2F52]" />
                  <h3 className="font-display text-2xl font-bold text-[#0A2F52] mb-3">
                    {program.title}
                  </h3>
                  <p className="text-[#6B7280] leading-relaxed">
                    {program.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-white" id="how-it-works">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-[#0A2F52] mb-4">
              How It Works
            </h2>
            <p className="text-xl text-[#6B7280] max-w-2xl mx-auto">
              Simple, straightforward steps to your mortgage
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {[
              {
                number: "1",
                title: "Get Pre-Approved",
                description: "Fast assessment in minutes",
              },
              {
                number: "2",
                title: "Apply Online",
                description: "Complete your application anytime",
              },
              {
                number: "3",
                title: "We Handle the Details",
                description: "Our experts manage everything",
              },
              {
                number: "4",
                title: "Close With Confidence",
                description: "Sign and celebrate your home",
              },
            ].map((step, idx) => (
              <div
                key={idx}
                className="relative animate-slide-up"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Connecting line */}
                {idx < 3 && (
                  <div className="hidden md:block absolute top-16 -right-4 w-8 h-1 bg-gradient-to-r from-[#0A2F52] to-[#F9A826]" />
                )}

                <div className="relative">
                  <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-[#0A2F52] to-[#1a4d7a] rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-white font-display">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-[#0A2F52] text-center mb-2">
                    {step.title}
                  </h3>
                  <p className="text-center text-[#6B7280]">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Us Section */}
      <section
        className="py-20 px-4 bg-gradient-to-b from-[#F5F8FA] to-white"
        id="why-us"
      >
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="animate-slide-in-left">
              <h2 className="font-display text-4xl md:text-5xl font-bold text-[#0A2F52] mb-6">
                Why Choose Us
              </h2>
              <div className="space-y-5">
                {[
                  "Clear communication, no confusion",
                  "Personalized loan strategies",
                  "Real humans guiding you",
                  "Support from start to close",
                ].map((benefit, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="mt-1">
                      <CheckCircle
                        size={24}
                        className="text-amber-500 flex-shrink-0"
                      />
                    </div>
                    <div>
                      <p className="text-lg text-[#1F2933] font-semibold">
                        {benefit}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-8 bg-amber-500 hover:bg-amber-600 text-white px-8 py-3 rounded-lg font-semibold uppercase tracking-wider text-sm transition-all duration-300 transform hover:scale-105">
                Learn More
              </button>
            </div>

            <div className="animate-fade-in">
              <div className="bg-gradient-to-br from-[#0A2F52] to-[#135E99] rounded-2xl h-96 flex items-center justify-center shadow-2xl">
                <div className="text-center text-white">
                  <Building2 size={72} className="mx-auto mb-4" />
                  <p className="text-xl font-semibold">
                    Making Mortgages Simple
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Preview Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-[#0A2F52] mb-4">
              Meet Your Mortgage Professionals
            </h2>
            <p className="text-xl text-[#6B7280] max-w-2xl mx-auto">
              You're not dealing with a system — you're working with people
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                initials: "SJ",
                name: "Sarah Johnson",
                role: "Senior Loan Officer",
                quote: "Your dream home deserves expert guidance",
              },
              {
                initials: "MC",
                name: "Michael Chen",
                role: "Mortgage Specialist",
                quote: "We make complex mortgages simple",
              },
              {
                initials: "ER",
                name: "Emily Rodriguez",
                role: "Customer Success Lead",
                quote: "Your satisfaction is our success",
              },
            ].map((member, idx) => (
              <div
                key={idx}
                className="text-center group cursor-pointer animate-slide-up"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="relative mb-6 overflow-hidden rounded-full w-32 h-32 mx-auto bg-gradient-to-br from-[#0A2F52] to-[#135E99] flex items-center justify-center text-white shadow-lg group-hover:shadow-2xl transition-all duration-300">
                  <Users size={56} />
                </div>
                <h3 className="font-display text-xl font-bold text-[#0A2F52]">
                  {member.name}
                </h3>
                <p className="text-amber-600 font-semibold mb-3">
                  {member.role}
                </p>
                <p className="text-[#6B7280] italic min-h-10">
                  "{member.quote}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section
        className="py-20 px-4 bg-gradient-to-b from-[#F5F8FA] to-white"
        id="testimonials"
      >
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-[#0A2F52] mb-4">
              What Our Clients Say
            </h2>
            <p className="text-xl text-[#6B7280]">
              Real stories from real homeowners
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                quote:
                  "The fastest mortgage process I've experienced. Professional and clear.",
                author: "David K.",
                detail: "First-time homebuyer",
              },
              {
                quote:
                  "They answered every question patiently. I felt confident every step.",
                author: "Jessica M.",
                detail: "Refinance client",
              },
              {
                quote:
                  "No hidden fees, no surprises. Exactly what they promised.",
                author: "Robert T.",
                detail: "VA loan borrower",
              },
            ].map((testimonial, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-all duration-300 border-l-4 border-amber-500 animate-slide-up"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className="fill-amber-500 text-amber-500"
                    />
                  ))}
                </div>
                <p className="text-[#1F2933] text-lg mb-4 italic">
                  "{testimonial.quote}"
                </p>
                <p className="font-semibold text-[#0A2F52]">
                  {testimonial.author}
                </p>
                <p className="text-sm text-[#6B7280]">{testimonial.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Power CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-[#0A2F52] via-[#1a4d7a] to-[#135E99] text-white">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="font-display text-5xl md:text-6xl font-bold mb-6">
            Ready to Take the Next Step?
          </h2>
          <p className="text-xl md:text-2xl mb-10 text-blue-100">
            Your mortgage journey starts here.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowLeadForm(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 rounded-lg font-semibold uppercase tracking-wider text-sm transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl animate-glow-pulse"
            >
              Apply Online Now
            </button>
            <button className="bg-white/20 hover:bg-white/30 text-white px-8 py-4 rounded-lg font-semibold uppercase tracking-wider text-sm border border-white/40 transition-all duration-300 transform hover:scale-105">
              Talk to an Expert
            </button>
          </div>
        </div>
      </section>

      {/* Lead Form Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-12">
            <h2 className="font-display text-4xl font-bold text-[#0A2F52] mb-4">
              Get Your Free Consultation
            </h2>
            <p className="text-[#6B7280]">No pressure. No obligation.</p>
          </div>

          <form
            onSubmit={handleFormSubmit}
            className="bg-[#F5F8FA] rounded-2xl p-8 shadow-lg"
          >
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#0A2F52] mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="John Doe"
                  required
                  className="w-full px-4 py-3 rounded-lg border-2 border-[#E5E7EB] focus:border-amber-500 focus:outline-none bg-white text-[#1F2933] placeholder-[#9CA3AF]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0A2F52] mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-3 rounded-lg border-2 border-[#E5E7EB] focus:border-amber-500 focus:outline-none bg-white text-[#1F2933] placeholder-[#9CA3AF]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0A2F52] mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleFormChange}
                  placeholder="(555) 000-0000"
                  required
                  className="w-full px-4 py-3 rounded-lg border-2 border-[#E5E7EB] focus:border-amber-500 focus:outline-none bg-white text-[#1F2933] placeholder-[#9CA3AF]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0A2F52] mb-2">
                  Loan Type
                </label>
                <select
                  name="loanType"
                  value={formData.loanType}
                  onChange={handleFormChange}
                  className="w-full px-4 py-3 rounded-lg border-2 border-[#E5E7EB] focus:border-amber-500 focus:outline-none bg-white text-[#1F2933]"
                >
                  <option value="conventional">Conventional</option>
                  <option value="fha">FHA</option>
                  <option value="va">VA</option>
                  <option value="nonqm">Non-QM</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-[#0A2F52] to-[#135E99] hover:shadow-lg text-white px-8 py-4 rounded-lg font-semibold uppercase tracking-wider text-sm transition-all duration-300 transform hover:scale-105 mt-6"
              >
                Get My Free Consultation
              </button>

              <p className="text-center text-sm text-[#6B7280]">
                We respect your privacy. Your information is secure.
              </p>
            </div>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0A2F52] text-white py-16 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <h3 className="font-display text-2xl font-bold mb-4">
                The Mortgage Professionals
              </h3>
              <p className="text-blue-200">
                Making mortgages simple, transparent, and human.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-amber-400">Company</h4>
              <ul className="space-y-2 text-blue-200">
                <li>
                  <a href="#" className="hover:text-white transition">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Our Team
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Careers
                  </a>
                </li>
                <li>
                  <a
                    href="/broker-login"
                    className="text-amber-300 hover:text-amber-200 transition flex items-center gap-1 font-medium"
                  >
                    <User className="w-4 h-4" />
                    Broker Login
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-amber-400">Resources</h4>
              <ul className="space-y-2 text-blue-200">
                <li>
                  <a href="#" className="hover:text-white transition">
                    Learning Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Mortgage Calculator
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-amber-400">Contact</h4>
              <ul className="space-y-2 text-blue-200">
                <li>1-800-MORTGAGE</li>
                <li>hello@mortgagepros.com</li>
                <li className="text-sm">Available Mon-Fri, 8am-8pm PT</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-blue-400/30 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-blue-200 text-sm">
              © 2024 The Mortgage Professionals. All rights reserved.
            </p>
            <div className="flex flex-col md:flex-row gap-4 md:gap-6 mt-4 md:mt-0 items-center">
              <div className="flex gap-6 text-sm text-blue-200">
                <a href="#" className="hover:text-white transition">
                  Privacy Policy
                </a>
                <a href="#" className="hover:text-white transition">
                  Terms of Service
                </a>
                <a href="#" className="hover:text-white transition">
                  Disclosures
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-200 text-sm">
                  Professional Access:
                </span>
                <a
                  href="/broker-login"
                  className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-300/30 text-amber-200 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Broker Portal
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Sticky Mobile CTA Button */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 p-4 shadow-2xl z-40">
        <button
          onClick={() => setShowLeadForm(true)}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold uppercase tracking-wider text-sm transition-all duration-300 flex items-center justify-center gap-2"
        >
          Get Pre-Approved <ChevronRight size={18} />
        </button>
      </div>

      {/* Mobile padding compensation */}
      <div className="h-20 md:hidden" />
    </div>
  );
}
