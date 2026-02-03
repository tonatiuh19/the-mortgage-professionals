import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { selectClient } from "@/store/slices/clientAuthSlice";

interface HeaderProps {
  onGetPreApproved?: () => void;
}

export default function Header({ onGetPreApproved }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const client = useAppSelector(selectClient);

  const handleMyApplicationsClick = () => {
    if (client) {
      // User is logged in, go to client dashboard
      navigate("/portal");
    } else {
      // User is not logged in, go to client login
      navigate("/client-login");
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex-shrink-0">
          <h1 className="font-display text-2xl font-bold text-[#0A2F52]">
            The Mortgage Professionals
          </h1>
        </div>

        {/* Navigation - Desktop */}
        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#how-it-works"
            className="text-[#1F2933] hover:text-[#0A2F52] transition font-medium"
          >
            How It Works
          </a>
          <a
            href="#why-us"
            className="text-[#1F2933] hover:text-[#0A2F52] transition font-medium"
          >
            Why Us
          </a>
          <a
            href="#testimonials"
            className="text-[#1F2933] hover:text-[#0A2F52] transition font-medium"
          >
            Testimonials
          </a>
        </nav>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleMyApplicationsClick}
            className="hidden md:inline-flex px-6 py-2 text-[#0A2F52] font-semibold hover:text-[#135E99] transition"
          >
            My Applications
          </button>
          <button
            onClick={onGetPreApproved}
            className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-semibold uppercase tracking-wider text-sm transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
          >
            Get Pre-Approved
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden flex flex-col gap-1.5 p-2"
          >
            <div
              className={`w-6 h-0.5 bg-[#0A2F52] transition-all ${
                isOpen ? "rotate-45 translate-y-2" : ""
              }`}
            />
            <div
              className={`w-6 h-0.5 bg-[#0A2F52] transition-all ${
                isOpen ? "opacity-0" : ""
              }`}
            />
            <div
              className={`w-6 h-0.5 bg-[#0A2F52] transition-all ${
                isOpen ? "-rotate-45 -translate-y-2" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <nav className="md:hidden bg-white border-t border-gray-100">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
            <a
              href="#how-it-works"
              className="text-[#1F2933] hover:text-[#0A2F52] transition font-medium py-2"
              onClick={() => setIsOpen(false)}
            >
              How It Works
            </a>
            <a
              href="#why-us"
              className="text-[#1F2933] hover:text-[#0A2F52] transition font-medium py-2"
              onClick={() => setIsOpen(false)}
            >
              Why Us
            </a>
            <a
              href="#testimonials"
              className="text-[#1F2933] hover:text-[#0A2F52] transition font-medium py-2"
              onClick={() => setIsOpen(false)}
            >
              Testimonials
            </a>
            <div className="border-t border-gray-200 pt-3 mt-3">
              <button
                onClick={() => {
                  handleMyApplicationsClick();
                  setIsOpen(false);
                }}
                className="w-full text-left px-0 py-2 text-[#0A2F52] font-semibold hover:text-[#135E99] transition"
              >
                My Applications
              </button>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
