import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Move,
  RefreshCcw,
  Sparkles,
  Camera,
} from 'lucide-react';

interface ProfilePhotoCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onSave: (croppedDataUrl: string) => Promise<void>;
  isSaving?: boolean;
}

export const ProfilePhotoCropperModal: React.FC<ProfilePhotoCropperModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onSave,
  isSaving = false,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset adjustments whenever a new image source is passed
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
    }
  }, [isOpen, imageSrc]);

  // Mouse Drag handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch Drag handlers for mobile/tablets
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Wheel Zoom handler
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(Math.max(1, prev + delta), 3));
  };

  // Global mouse move & mouse up listeners when dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Perform canvas crop and export
  const handleCropAndSave = async () => {
    if (!imageRef.current) return;

    const img = imageRef.current;
    const canvas = document.createElement('canvas');
    const targetSize = 400; // High resolution square for profile & navbar
    canvas.width = targetSize;
    canvas.height = targetSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Viewport is 280x280 in UI
    const viewportSize = 280;
    const scaleFactor = targetSize / viewportSize;

    // Center canvas
    ctx.translate(targetSize / 2, targetSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // Calculate base rendering dimensions of the image inside the 280px viewport
    let renderW = viewportSize;
    let renderH = viewportSize;
    const imgAspect = img.naturalWidth / img.naturalHeight;

    if (imgAspect >= 1) {
      renderH = viewportSize;
      renderW = viewportSize * imgAspect;
    } else {
      renderW = viewportSize;
      renderH = viewportSize / imgAspect;
    }

    // Apply zoom and position scaled to canvas target resolution
    const scaledX = position.x * scaleFactor;
    const scaledY = position.y * scaleFactor;
    const finalW = renderW * zoom * scaleFactor;
    const finalH = renderH * zoom * scaleFactor;

    ctx.drawImage(img, -finalW / 2 + scaledX, -finalH / 2 + scaledY, finalW, finalH);

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    await onSave(croppedDataUrl);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      id="profile-photo-cropper-modal"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-gray-200 relative my-auto flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">
                Ajuster & Glisser la photo
              </h3>
              <p className="text-xs text-gray-500">
                Glissez l'image avec la souris et zoomez pour la centrer parfaitement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Cropper Area */}
        <div className="py-4 space-y-4">
          <div className="flex flex-col items-center justify-center">
            {/* Viewport Frame */}
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
              className={`relative w-[280px] h-[280px] rounded-2xl overflow-hidden bg-gray-900 border-2 border-red-500 shadow-inner select-none ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              style={{ touchAction: 'none' }}
              title="Cliquez et glissez pour déplacer la photo"
            >
              {/* Image with transform */}
              <div
                className="w-full h-full flex items-center justify-center pointer-events-none"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                }}
              >
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Ajustement photo"
                  className="max-w-none w-full h-full object-cover select-none"
                  draggable={false}
                />
              </div>

              {/* Circular Mask Overlay */}
              <div className="absolute inset-0 pointer-events-none border-[3px] border-white/80 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />

              {/* Center Guidance Crosshair */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40">
                <div className="w-6 h-[1px] bg-white" />
                <div className="h-6 w-[1px] bg-white absolute" />
              </div>

              {/* Drag Hint Badge */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 pointer-events-none shadow-sm">
                <Move className="w-3 h-3 text-red-400 animate-pulse" />
                <span>Glissez pour ajuster</span>
              </div>
            </div>

            {/* Live Previews (Navbar & Card) */}
            <div className="mt-3.5 flex items-center justify-center gap-6 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200/80 w-full">
              <div className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Aperçus en direct :</span>
              </div>

              {/* Navbar Circular Preview */}
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-red-500/50 bg-gray-900 relative shadow-xs">
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      transform: `translate(${position.x * 0.114}px, ${position.y * 0.114}px) rotate(${rotation}deg) scale(${zoom})`,
                      transformOrigin: 'center center',
                    }}
                  >
                    <img
                      src={imageSrc}
                      alt="Mini navbar"
                      className="max-w-none w-full h-full object-cover"
                      draggable={false}
                    />
                  </div>
                </div>
                <span className="text-[10px] font-bold text-gray-700">Navbar</span>
              </div>

              {/* Profile Card Rounded Preview */}
              <div className="flex items-center gap-1.5">
                <div className="w-9 h-9 rounded-xl overflow-hidden border border-red-500/50 bg-gray-900 relative shadow-xs">
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      transform: `translate(${position.x * 0.128}px, ${position.y * 0.128}px) rotate(${rotation}deg) scale(${zoom})`,
                      transformOrigin: 'center center',
                    }}
                  >
                    <img
                      src={imageSrc}
                      alt="Mini profile"
                      className="max-w-none w-full h-full object-cover"
                      draggable={false}
                    />
                  </div>
                </div>
                <span className="text-[10px] font-bold text-gray-700">Profil</span>
              </div>
            </div>
          </div>

          {/* Controls: Zoom slider, Zoom buttons, Rotate, Reset */}
          <div className="space-y-3 bg-gray-50/80 p-3.5 rounded-xl border border-gray-200">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(1, prev - 0.2))}
                className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-md cursor-pointer transition-colors"
                title="Zoom arrière"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-red-600 cursor-pointer h-1.5 bg-gray-200 rounded-lg"
              />

              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(3, prev + 0.2))}
                className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-md cursor-pointer transition-colors"
                title="Zoom avant"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <span className="text-xs font-mono font-bold text-gray-700 min-w-[40px] text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Rotate & Reset Buttons */}
            <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
              <button
                type="button"
                onClick={handleRotate}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5 text-gray-600" />
                <span>Pivoter (90°)</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-red-600 bg-white hover:bg-red-50 border border-gray-200 rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                <span>Réinitialiser</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleCropAndSave}
            disabled={isSaving}
            className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-98 rounded-xl shadow-md shadow-red-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Enregistrement...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Valider & Enregistrer</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
