"use client";

import { useState } from "react";
import { Redirect } from "@/lib/db/schema";
import {
  Link2,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Share2,
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
    <div className="space-y-8 font-sans animate-in fade-in duration-200">
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

      {/* 2-Column Layout: Left Controls Checklist, Right Live Phone Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Link Visibility Checklist */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h4 className="text-sm font-bold text-neutral-900">Select Links to Show on /{currentUser}</h4>
                <p className="text-xs text-neutral-500">Toggle which links appear on your public bio page</p>
              </div>
              <span className="text-xs font-mono text-neutral-400">
                {visibleLinks.length} of {activeLinks.length} visible
              </span>
            </div>

            {activeLinks.length === 0 ? (
              <div className="text-center py-12 text-neutral-400 text-xs">
                <Link2 className="w-8 h-8 mx-auto mb-2 stroke-[1.8]" />
                <p>No active links available to display.</p>
                <p className="mt-0.5 text-neutral-500">Create a link first to add it to your bio page.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeLinks.map((r) => {
                  const isVisible = r.showOnProfile !== false;
                  return (
                    <div
                      key={r.id}
                      onClick={() => onToggleVisibility(r, !isVisible)}
                      className={`p-3.5 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer select-none ${
                        isVisible
                          ? "border-neutral-300 bg-white hover:border-black shadow-sm"
                          : "border-neutral-200 bg-neutral-50/60 opacity-60 hover:opacity-80"
                      }`}
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition ${
                            isVisible ? "bg-black text-white" : "bg-neutral-200 text-neutral-500"
                          }`}
                        >
                          {isVisible ? <Check className="w-4 h-4" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-neutral-900 truncate">
                              /{r.webname}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                isVisible
                                  ? "bg-neutral-100 text-neutral-800"
                                  : "bg-neutral-200 text-neutral-500"
                              }`}
                            >
                              {isVisible ? "Visible" : "Hidden"}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400 truncate mt-0.5 font-mono">
                            {r.destinationUrl}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleVisibility(r, !isVisible);
                          }}
                          className={`px-3 py-1 text-xs font-semibold rounded-xl border transition ${
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

        {/* Right Column: Live Mobile Preview Card */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-sm rounded-[2.5rem] border-4 border-neutral-200 bg-neutral-50 p-3 shadow-xl">
            <div className="w-full bg-white rounded-[2rem] p-6 shadow-inner space-y-6 min-h-[420px] flex flex-col justify-between">
              {/* Mockup Header */}
              <div className="text-center space-y-3 pt-2">
                <div className="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center font-bold text-xl mx-auto shadow-md ring-4 ring-neutral-100">
                  {currentUser.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h5 className="font-bold text-sm text-neutral-900">@{currentUser}</h5>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Permanent Links</p>
                </div>
              </div>

              {/* Mockup Links */}
              <div className="space-y-2 flex-1">
                {visibleLinks.length === 0 ? (
                  <div className="text-center py-10 text-neutral-400 text-xs">
                    <p>No links selected yet.</p>
                    <p className="text-[10px] text-neutral-500 mt-1">
                      Check links on the left to show them here.
                    </p>
                  </div>
                ) : (
                  visibleLinks.map((link) => (
                    <div
                      key={link.id}
                      className="p-3 rounded-xl border border-neutral-200 bg-white hover:border-black transition flex items-center justify-between gap-2 text-xs shadow-2xs"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <Link2 className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                        <span className="font-bold text-neutral-900 truncate">/{link.webname}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                    </div>
                  ))
                )}
              </div>

              {/* Mockup Footer */}
              <div className="text-center text-[10px] text-neutral-400 pt-2 border-t border-neutral-100">
                Powered by PermanentLink
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
