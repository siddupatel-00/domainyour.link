"use client";

import { useState } from "react";
import { Redirect } from "@/lib/db/schema";
import {
  ExternalLink,
  Copy,
  Check,
  Edit2,
  Trash2,
  Search,
  ArrowRight,
  TrendingUp,
  Globe,
} from "lucide-react";

interface RedirectTableProps {
  redirects: Redirect[];
  baseUrl: string;
  onEdit: (redirect: Redirect) => void;
  onDelete: (redirect: Redirect) => void;
  onCreateOpen: () => void;
}

export function RedirectTable({
  redirects,
  baseUrl,
  onEdit,
  onDelete,
  onCreateOpen,
}: RedirectTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filteredRedirects = redirects.filter((r) => {
    const q = searchTerm.toLowerCase();
    return (
      r.username.toLowerCase().includes(q) ||
      r.webname.toLowerCase().includes(q) ||
      r.destinationUrl.toLowerCase().includes(q)
    );
  });

  const handleCopy = (id: number, path: string) => {
    const fullUrl = `${baseUrl}${path}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Search and stats bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search links, namespaces, or destinations..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900/90 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 font-medium">
            Total Links: <strong className="text-white">{redirects.length}</strong>
          </span>
          <span className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" /> Total Clicks:{" "}
            <strong className="text-white">
              {redirects.reduce((acc, curr) => acc + (curr.clickCount || 0), 0)}
            </strong>
          </span>
        </div>
      </div>

      {/* Redirects list / table */}
      {filteredRedirects.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/40 border border-slate-800/80">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400">
            <Globe className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-200">
            {searchTerm ? "No matching links found" : "No permanent links yet"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {searchTerm
              ? "Try adjusting your search terms or clear the filter."
              : "Create your first permanent link to route visitors to your dynamic destinations."}
          </p>
          {!searchTerm && (
            <button
              onClick={onCreateOpen}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition shadow-lg shadow-indigo-500/20"
            >
              + Create First Link
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Permanent Link</th>
                <th className="py-3 px-4">Current Destination</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Clicks</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredRedirects.map((r) => {
                const path = `/${r.username}/${r.webname}`;
                const fullPublicUrl = `${baseUrl}${path}`;
                const isCopied = copiedId === r.id;

                return (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-800/30 transition duration-150 group"
                  >
                    {/* Permanent link with copy and open button */}
                    <td className="py-3.5 px-4 font-mono font-medium">
                      <div className="flex items-center gap-2">
                        <span className="text-indigo-400 group-hover:text-indigo-300 transition">
                          {path}
                        </span>
                        <button
                          onClick={() => handleCopy(r.id, path)}
                          title="Copy full permanent URL"
                          className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition"
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={path}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Test redirect in new tab"
                          className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>

                    {/* Destination URL */}
                    <td className="py-3.5 px-4 max-w-xs md:max-w-md">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <ArrowRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
                        <a
                          href={r.destinationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-slate-300 hover:text-indigo-300 hover:underline transition"
                          title={r.destinationUrl}
                        >
                          {r.destinationUrl}
                        </a>
                      </div>
                    </td>

                    {/* HTTP Code */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          r.redirectCode === 308
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {r.redirectCode || 307}
                      </span>
                    </td>

                    {/* Clicks */}
                    <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-300">
                      {r.clickCount || 0}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEdit(r)}
                          title="Edit destination"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(r)}
                          title="Delete link"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
