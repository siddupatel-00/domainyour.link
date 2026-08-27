"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Upload, Trash2, Camera, Check, AlertCircle, ZoomIn, ZoomOut, RotateCcw, Move, ArrowLeft } from "lucide-react";

interface AvatarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar: string | null;
  username: string;
  onAvatarUpdated: (newAvatar: string | null) => void;
}

const VIEWPORT_SIZE = 220; // px of the circular crop viewport
const OUTPUT_SIZE = 240; // px of final compressed avatar

export function AvatarUploadModal({
  isOpen,
  onClose,
  currentAvatar,
  username,
  onAvatarUpdated,
}: AvatarUploadModalProps) {
  // Raw uploaded image (for crop editor)
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Cropper transform state
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number }>({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  // Status & file input
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset state on open
  useEffect(() => {
    setRawImageSrc(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setError(null);
    setSuccess(false);
  }, [isOpen, currentAvatar]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Calculate base scale to fill the viewport
  const getBaseScale = useCallback(() => {
    if (!naturalSize.width || !naturalSize.height) return 1;
    return Math.max(VIEWPORT_SIZE / naturalSize.width, VIEWPORT_SIZE / naturalSize.height);
  }, [naturalSize]);

  // Clamping offsets so the image always covers the viewport
  const clampOffset = useCallback((x: number, y: number, currentZoom: number) => {
    if (!naturalSize.width || !naturalSize.height) return { x: 0, y: 0 };
    const baseScale = Math.max(VIEWPORT_SIZE / naturalSize.width, VIEWPORT_SIZE / naturalSize.height);
    const totalScale = baseScale * currentZoom;

    const renderedWidth = naturalSize.width * totalScale;
    const renderedHeight = naturalSize.height * totalScale;

    const maxOffsetX = Math.max(0, (renderedWidth - VIEWPORT_SIZE) / 2);
    const maxOffsetY = Math.max(0, (renderedHeight - VIEWPORT_SIZE) / 2);

    return {
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, x)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, y)),
    };
  }, [naturalSize]);

  // Zoom change handler with re-clamping
  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.max(1, Math.min(3, newZoom));
    setZoom(clampedZoom);
    setOffset((prev) => clampOffset(prev.x, prev.y, clampedZoom));
  };

  // Mouse / Touch Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const targetX = dragStartRef.current.offsetX + dx;
    const targetY = dragStartRef.current.offsetY + dy;
    setOffset(clampOffset(targetX, targetY, zoom));
  }, [isDragging, zoom, clampOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers for mobile / trackpad
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        offsetX: offset.x,
        offsetY: offset.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    const targetX = dragStartRef.current.offsetX + dx;
    const targetY = dragStartRef.current.offsetY + dy;
    setOffset(clampOffset(targetX, targetY, zoom));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Load new file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WebP)");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError("Image size should be under 15MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
        setRawImageSrc(src);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setError(null);
      };
      img.onerror = () => setError("Failed to load image");
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Crop & Export to WebP Canvas
  const exportCroppedAvatar = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!rawImageSrc || !imageRef.current) {
        reject(new Error("No image loaded"));
        return;
      }

      const img = imageRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }

      const baseScale = Math.max(VIEWPORT_SIZE / naturalSize.width, VIEWPORT_SIZE / naturalSize.height);
      const totalScale = baseScale * zoom;
      const ratio = OUTPUT_SIZE / VIEWPORT_SIZE;

      // Center coords in canvas
      const cx = OUTPUT_SIZE / 2;
      const cy = OUTPUT_SIZE / 2;

      ctx.save();
      // Translate to center + offset scaled by ratio
      ctx.translate(cx + offset.x * ratio, cy + offset.y * ratio);
      ctx.scale(totalScale * ratio, totalScale * ratio);
      ctx.drawImage(img, -naturalSize.width / 2, -naturalSize.height / 2);
      ctx.restore();

      const dataUrl = canvas.toDataURL("image/webp", 0.88);
      resolve(dataUrl);
    });
  };

  const handleSaveCropped = async () => {
    setLoading(true);
    setError(null);

    try {
      const croppedDataUrl = await exportCroppedAvatar();
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: croppedDataUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile picture");

      onAvatarUpdated(croppedDataUrl);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save profile picture");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove avatar");

      onAvatarUpdated(null);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove avatar");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const initial = username ? username.charAt(0).toUpperCase() : "U";
  const baseScale = getBaseScale();
  const totalScale = baseScale * zoom;
  const renderedWidth = naturalSize.width * totalScale;
  const renderedHeight = naturalSize.height * totalScale;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 font-sans cursor-pointer"
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            {rawImageSrc && (
              <button
                type="button"
                onClick={() => setRawImageSrc(null)}
                className="p-1 -ml-1 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white transition cursor-pointer"
                title="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-base font-bold tracking-tight text-neutral-900 dark:text-white">
              {rawImageSrc ? "Crop & Position" : "Profile Picture"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error / Success feedback */}
        {error && (
          <div className="p-3 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>Profile picture saved!</span>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp, image/gif"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* MODE 1: INTERACTIVE CROPPER VIEW */}
        {rawImageSrc ? (
          <div className="space-y-4 py-1">
            <p className="text-[11px] text-center text-neutral-500 dark:text-neutral-400">
              Drag photo to reposition · Use slider to zoom
            </p>

            {/* Circular Viewport Container */}
            <div className="flex justify-center">
              <div
                style={{ width: `${VIEWPORT_SIZE}px`, height: `${VIEWPORT_SIZE}px` }}
                className={`relative rounded-full overflow-hidden border-2 border-dashed border-neutral-300 dark:border-neutral-700 select-none shadow-inner bg-neutral-950 cursor-${isDragging ? "grabbing" : "grab"}`}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Image positioned by transform */}
                <img
                  ref={imageRef}
                  src={rawImageSrc}
                  alt="Crop preview"
                  draggable={false}
                  style={{
                    width: `${renderedWidth}px`,
                    height: `${renderedHeight}px`,
                    transform: `translate(${VIEWPORT_SIZE / 2 - renderedWidth / 2 + offset.x}px, ${VIEWPORT_SIZE / 2 - renderedHeight / 2 + offset.y}px)`,
                  }}
                  className="absolute pointer-events-none max-w-none transition-none"
                />

                {/* Subtle visual centering crosshairs helper on hover */}
                <div className="absolute inset-0 pointer-events-none rounded-full ring-2 ring-white/30" />
              </div>
            </div>

            {/* Zoom Slider & Controls */}
            <div className="space-y-2 px-2 pt-1">
              <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300 inline-flex items-center gap-1">
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>Zoom</span>
                </span>
                <span className="font-mono text-[11px]">{Math.round(zoom * 100)}%</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleZoomChange(zoom - 0.2)}
                  disabled={zoom <= 1}
                  className="p-1 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white disabled:opacity-30 transition cursor-pointer"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.02"
                  value={zoom}
                  onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                  className="w-full accent-black dark:accent-white cursor-pointer h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg"
                />

                <button
                  type="button"
                  onClick={() => handleZoomChange(zoom + 0.2)}
                  disabled={zoom >= 3}
                  className="p-1 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white disabled:opacity-30 transition cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setOffset({ x: 0, y: 0 });
                  }}
                  title="Reset Position"
                  className="p-1 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white transition cursor-pointer ml-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Actions for Crop View */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition cursor-pointer"
              >
                Change Photo
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRawImageSrc(null)}
                  disabled={loading}
                  className="px-3.5 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCropped}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-white dark:text-black bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{loading ? "Saving..." : "Apply & Save"}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* MODE 2: CURRENT AVATAR PREVIEW & UPLOAD TRIGGER */
          <div className="flex flex-col items-center justify-center py-3 space-y-4">
            <div className="relative group">
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt={username}
                  className="w-24 h-24 rounded-full object-cover shadow-md ring-4 ring-neutral-100 dark:ring-neutral-800"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-3xl shadow-md ring-4 ring-neutral-100 dark:ring-neutral-800">
                  {initial}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer backdrop-blur-[2px]"
              >
                <Camera className="w-5 h-5" />
                <span className="text-[10px] font-medium mt-0.5">Upload</span>
              </button>
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                @{username}
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Select a photo from your device to frame and crop.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white dark:text-black bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 transition shadow-sm cursor-pointer inline-flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Choose Photo</span>
              </button>

              {currentAvatar && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/40 transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
