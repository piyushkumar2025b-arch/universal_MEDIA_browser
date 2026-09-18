import React, { useEffect, useRef } from 'react';
import { Search, Globe, X, ExternalLink } from 'lucide-react';

interface GoogleSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  cx: string;
  initialQuery?: string;
}

export const GoogleSearchModal: React.FC<GoogleSearchModalProps> = ({
  isOpen,
  onClose,
  cx,
  initialQuery = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Load Google Programmable Search script
    const scriptId = 'google-cse-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://cse.google.com/cse.js?cx=${cx}`;
      script.async = true;
      document.body.appendChild(script);
    }

    // Set timeout to populate query if provided
    const timer = setTimeout(() => {
      if (initialQuery && window.google?.search?.cse?.element) {
        const element = window.google.search.cse.element.getElement('google-search-element');
        if (element) {
          element.execute(initialQuery);
        }
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [isOpen, cx, initialQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 p-4 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative flex h-[85vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 bg-neutral-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-neutral-900">Google Programmable Web Search</h2>
                <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                  Engine ID: {cx}
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Official interactive Google Search engine embedded with live results and image filters
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Results Area */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-y-auto p-6 cse-container"
        >
          {/* Google Programmable Search element */}
          <div 
            className="gcse-search" 
            data-gname="google-search-element"
            data-enableautocomplete="true"
          ></div>

          <div className="mt-8 rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-xs text-neutral-500">
            <div className="flex items-center gap-2 font-medium text-neutral-700 mb-1">
              <Search className="h-3.5 w-3.5 text-blue-600" />
              Direct Google Search Integration
            </div>
            Searches your configured domains, Wikipedia, open archives, and images with Google's indexing and layout engine.
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-100 bg-white px-6 py-3 flex items-center justify-between text-xs text-neutral-400">
          <span>Powered by Google Programmable Search</span>
          <button
            onClick={onClose}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

declare global {
  interface Window {
    google?: any;
  }
}
