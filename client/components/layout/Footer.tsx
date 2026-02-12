import { Mail, Phone, MapPin, User } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0A2F52] text-white py-16 px-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div>
            <img
              src="https://disruptinglabs.com/data/themortgageprofessionals/assets/images/logo.png"
              alt="The Mortgage Professionals"
              className="h-10 w-auto filter brightness-0 invert mb-4"
            />
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
            © {currentYear} The Mortgage Professionals. All rights reserved.
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
  );
}
