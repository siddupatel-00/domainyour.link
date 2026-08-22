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
    <div className="space-y-3 font-sans">
      {/* Search and stats bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search links, namespaces, destinations..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-white transition"
          />
        </div>
        <div className="text-xs text-neutral-400 font-mono flex items-center gap-2">
          <span>{filteredRedirects.length} links listed</span>
        </div>
      </div>

      {/* Table / Empty State */}
      {filteredRedirects.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-xl border border-neutral-800 bg-neutral-950">
          <div className="w-10 h-10 mx-auto mb-3 rounded-lg border border-neutral-800 bg-black flex items-center justify-center text-white">
            <Globe className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-white">
            {searchTerm ? "No matching links found" : "No permanent links yet"}
          </h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1 mb-4">
            {searchTerm
              ? "Try adjusting your search terms or clear the filter."
              : "Create your first permanent link to route visitors to dynamic destinations."}
          </p>
          {!searchTerm && (
            <button
              onClick={onCreateOpen}
              className="px-3.5 py-1.5 text-xs font-semibold text-black bg-white hover:bg-neutral-200 rounded-lg transition"
            >
              + Create First Link
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 bg-black text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                <th className="py-2.5 px-4">Permanent Link</th>
                <th className="py-2.5 px-4">Current Destination</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-center">Clicks</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 text-xs">
              {filteredRedirects.map((r) => {
                const path = `/${r.username}/${r.webname}`;
                const isCopied = copiedId === r.id;

                return (
                  <tr
                    key={r.id}
                    className="hover:bg-neutral-900/50 transition duration-150"
                  >
                    {/* Link */}
                    <td className="py-3 px-4 font-mono font-medium">
                      <div className="flex items-center gap-2">
                        <span className="text-white">{path}</span>
                        <button
                          onClick={() => handleCopy(r.id, path)}
                          title="Copy full permanent URL"
                          className="p-1 rounded text-neutral-500 hover:text-white hover:bg-neutral-800 transition"
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={path}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Test redirect in new tab"
                          className="p-1 rounded text-neutral-500 hover:text-white hover:bg-neutral-800 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>

                    {/* Destination */}
                    <td className="py-3 px-4 max-w-xs md:max-w-md">
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <ArrowRight className="w-3 h-3 text-neutral-600 flex-shrink-0" />
                        <a
                          href={r.destinationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-neutral-300 hover:text-white transition font-mono text-[11px]"
                          title={r.destinationUrl}
                        >
                          {r.destinationUrl}
                        </a>
                      </div>
                    </td>

                    {/* HTTP status code */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-neutral-300 font-mono text-[10px]">
                        {r.redirectCode || 307}
                      </span>
                    </td>

                    {/* Click count */}
                    <td className="py-3 px-4 text-center font-mono text-white">
                      {r.clickCount || 0}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEdit(r)}
                          title="Edit destination"
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(r)}
                          title="Delete link"
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
