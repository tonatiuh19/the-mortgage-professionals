import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface NavbarProps {
  onGetPreApproved?: () => void;
}

export default function Navbar({ onGetPreApproved }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0A2F52] to-[#135E99] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">TMP</span>
            </div>
            <span className="text-xl font-bold text-[#0A2F52]">
              The Mortgage Professionals
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#services"
              className="text-gray-700 hover:text-[#0A2F52] transition-colors font-medium"
            >
              Services
            </a>
            <a
              href="#process"
              className="text-gray-700 hover:text-[#0A2F52] transition-colors font-medium"
            >
              Process
            </a>
            <a
              href="#about"
              className="text-gray-700 hover:text-[#0A2F52] transition-colors font-medium"
            >
              About
            </a>
            <a
              href="#contact"
              className="text-gray-700 hover:text-[#0A2F52] transition-colors font-medium"
            >
              Contact
            </a>
            <button
              onClick={onGetPreApproved}
              className="bg-gradient-to-r from-[#0A2F52] to-[#135E99] text-white px-6 py-2.5 rounded-lg font-semibold hover:shadow-lg transition-all duration-300"
            >
              Get Pre-Approved
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-gray-700 hover:text-[#0A2F52]"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-4">
            <a
              href="#services"
              className="block text-gray-700 hover:text-[#0A2F52] transition-colors font-medium"
            >
              Services
            </a>
            <a
              href="#process"
              className="block text-gray-700 hover:text-[#0A2F52] transition-colors font-medium"
            >
              Process
            </a>
            <a
              href="#about"
              className="block text-gray-700 hover:text-[#0A2F52] transition-colors font-medium"
            >
              About
            </a>
            <a
              href="#contact"
              className="block text-gray-700 hover:text-[#0A2F52] transition-colors font-medium"
            >
              Contact
            </a>
            <button
              onClick={onGetPreApproved}
              className="w-full bg-gradient-to-r from-[#0A2F52] to-[#135E99] text-white px-6 py-2.5 rounded-lg font-semibold hover:shadow-lg transition-all duration-300"
            >
              Get Pre-Approved
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}
