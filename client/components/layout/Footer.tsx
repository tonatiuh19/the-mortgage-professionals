import React from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Instagram, Facebook, LogIn } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link to="/" className="flex items-center">
              <img
                src="https://disruptinglabs.com/data/themortgageprofessionals/assets/images/logo.png"
                alt="The Mortgage Professionals"
                className="h-10 w-auto"
              />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We are The Mortgage Professionals, Inc. We help families with
              purchase and refinance solutions through clear communication and
              trusted guidance.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://www.facebook.com/osegueragroup"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com/theosegueragroup/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider">
              Platform
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/conventional-loan"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Mortgage Programs
                </Link>
              </li>
              <li>
                <Link
                  to="/mortgage-calculator"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Mortgage Calculator
                </Link>
              </li>
              <li>
                <a
                  href="https://2302276.my1003app.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Apply Online
                </a>
              </li>
              <li>
                <a
                  href="https://intranet.themortgageprofessionals.net/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Staff Portal
                </a>
              </li>
              <li>
                <Link
                  to="/privacy-policy"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider">
              Resources
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/about-us"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/our-team"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Our Team
                </Link>
              </li>
              <li>
                <Link
                  to="/contact-us"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy-policy"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider">
              Contact
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center space-x-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>raul@theosegueragroup.com</span>
              </li>
              <li className="flex items-center space-x-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>(562) 665-4132</span>
              </li>
              <li className="flex items-center space-x-2 text-muted-foreground text-pretty">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>16901 Bellflower Blvd, Bellflower, CA 90706</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} The Mortgage Professionals. All rights
            reserved. NMLS #2302276
          </p>
          <a
            href="https://intranet.themortgageprofessionals.net/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
          >
            <LogIn className="h-3 w-3" />
            Staff Portal
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
