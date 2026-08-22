"use client";

import { useState } from "react";
import { Redirect } from "@/lib/db/schema";
import {
  Link2,
  ExternalLink,
  Copy,
  Check,
  EyeOff,
  ArrowRight,
} from "lucide-react";

interface BioPageViewProps {
  redirects: Redirect[];
  baseUrl: string;
  currentUser: string;
  onToggleVisibility: (redirect: Redirect, nextVal: boolean) => void;
}

export function BioPageView({
  redirects,
  baseUrl,
  currentUser,
  onToggleVisibility,
}: BioPageViewProps) {
  const [copied, setCopied] = useState(false);

  const profileUrl = `${baseUrl}/${currentUser}`;
  const activeLinks = redirects.filter(
    (r) => !r.expiresAt || new Date(r.expiresAt).getTime() > Date.now()
  );
  const visibleLinks = activeLinks.filter((r) => r.showOnProfile !== false);

  const handleCopyProfile = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-200">
      {/* Top Banner with Share & Open */}
      <div className="p-6 rounded-3xl border border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center font-bold text-lg shadow-md flex-shrink-0">
            {currentUser.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-neutral-900">Your Bio Profile Link</h3>
              <span className="text-[11px] font-mono font-semibold bg-white border border-neutral-200 px-2 py-0.5 rounded-md text-neutral-700">
                /{currentUser}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Share this single link in your Instagram, X, LinkedIn, or email bio
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyProfile}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-neutral-800 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-xl transition shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-black" />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-neutral-500" />
                <span>Copy Bio Link</span>
              </>
            )}
          </button>

          <a
            href={`/${currentUser}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-black hover:bg-neutral-800 rounded-xl transition shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Page</span>
          </a>
        </div>
      </div>

      {/* Clean Full-Width Link Visibility Checklist (No phone mockup!) */}
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div>
            <h4 className="text-base font-bold text-neutral-900">Select Links to Show on /{currentUser}</h4>
            <p className="text-xs text-neutral-500">Toggle which links appear when someone visits your public bio page</p>
          </div>
          <span className="text-xs font-mono text-neutral-500 font-semibold bg-neutral-100 px-2.5 py-1 rounded-lg">
            {visibleLinks.length} of {activeLinks.length} visible
          </span>
        </div>

        {activeLinks.length === 0 ? (
          <div className="text-center py-16 text-neutral-400 text-xs">
            <Link2 className="w-8 h-8 mx-auto mb-2 stroke-[1.8]" />
            <p>No active links available to display.</p>
            <p className="mt-0.5 text-neutral-500">Create a link first to add it to your bio page.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeLinks.map((r) => {
              const isVisible = r.showOnProfile !== false;
              return (
                <div
                  key={r.id}
                  onClick={() => onToggleVisibility(r, !isVisible)}
                  className={`p-4 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer select-none ${
                    isVisible
                      ? "border-neutral-300 bg-white hover:border-black shadow-sm"
                      : "border-neutral-200 bg-neutral-50/60 opacity-60 hover:opacity-80"
                  }`}
                >
                  <div className="min-w-0 flex items-center gap-3.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition flex-shrink-0 ${
                        isVisible ? "bg-black text-white" : "bg-neutral-200 text-neutral-500"
                      }`}
                    >
                      {isVisible ? <Check className="w-4 h-4" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-neutral-900 truncate">
                          /{r.webname}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            isVisible
                              ? "bg-neutral-100 text-neutral-800 font-semibold"
                              : "bg-neutral-200 text-neutral-500"
                          }`}
                        >
                          {isVisible ? "Visible on bio" : "Hidden"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-neutral-400 truncate mt-0.5 font-mono">
                        <ArrowRight className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                        <span className="truncate">{r.destinationUrl}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisibility(r, !isVisible);
                      }}
                      className={`px-4 py-1.5 text-xs font-semibold rounded-xl border transition ${
                        isVisible
                          ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-200"
                          : "bg-black text-white border-black"
                      }`}
                    >
                      {isVisible ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
