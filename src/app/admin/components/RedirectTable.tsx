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
  Link2,
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

  // Empty state: Simple & Clean
  if (redirects.length === 0) {
    return (
      <div className="text-center py-24 rounded-3xl border border-neutral-100 bg-neutral-50/50">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center text-black shadow-sm">
          <Link2 className="w-6 h-6 stroke-[2]" />
        </div>
        <h3 className="text-base font-bold text-neutral-900">No links yet</h3>
        <p className="text-xs text-neutral-500 max-w-xs mx-auto mt-1 mb-5">
          Create your first permanent link and share it anywhere.
        </p>
        <button
          onClick={onCreateOpen}
          className="px-5 py-2.5 text-xs font-semibold text-white bg-black hover:bg-neutral-800 rounded-xl transition shadow-sm"
        >
          Create First Link
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar (Only when there are links) */}
      {redirects.length > 2 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search links..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black transition"
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50/70 text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">
              <th className="py-3.5 px-5">Your Link</th>
              <th className="py-3.5 px-5">Goes To</th>
              <th className="py-3.5 px-5 text-center">Clicks</th>
              <th className="py-3.5 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 text-xs">
            {filteredRedirects.map((r) => {
              const path = `/${r.username}/${r.webname}`;
              const isCopied = copiedId === r.id;

              return (
                <tr
                  key={r.id}
                  className="hover:bg-neutral-50/60 transition duration-150"
                >
                  {/* Link */}
                  <td className="py-4 px-5 font-mono font-medium">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-900 font-bold">{path}</span>
                      <button
                        onClick={() => handleCopy(r.id, path)}
                        title="Copy link"
                        className="p-1 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-black" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <a
                        href={path}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open link"
                        className="p-1 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>

                  {/* Destination */}
                  <td className="py-4 px-5 max-w-xs md:max-w-md">
                    <div className="flex items-center gap-1.5 text-neutral-600">
                      <ArrowRight className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                      <a
                        href={r.destinationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-neutral-600 hover:text-black transition text-xs font-mono"
                        title={r.destinationUrl}
                      >
                        {r.destinationUrl}
                      </a>
                    </div>
                  </td>

                  {/* Clicks */}
                  <td className="py-4 px-5 text-center font-mono font-semibold text-neutral-900">
                    {r.clickCount || 0}
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEdit(r)}
                        title="Edit destination"
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(r)}
                        title="Delete link"
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition"
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
    </div>
  );
}
