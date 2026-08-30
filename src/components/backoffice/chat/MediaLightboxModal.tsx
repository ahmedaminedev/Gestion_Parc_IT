import React from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface MediaLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'file';
  mediaName?: string;
}

export const MediaLightboxModal: React.FC<MediaLightboxModalProps> = ({
  isOpen,
  onClose,
  mediaUrl,
  mediaType,
  mediaName = 'Média',
}) => {
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);

  if (!isOpen || !mediaUrl) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = mediaUrl;
    a.download = mediaName || 'media-download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Container */}
      <div
        className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-slate-950/80 to-transparent">
          <span className="text-white font-semibold text-sm truncate max-w-md">
            {mediaName}
          </span>

          <div className="flex items-center gap-2">
            {mediaType === 'image' && (
              <>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  className="p-2 rounded-xl bg-slate-800/80 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Zoom avant"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  className="p-2 rounded-xl bg-slate-800/80 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Zoom arrière"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-2 rounded-xl bg-slate-800/80 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Faire pivoter"
                >
                  <RotateCw className="w-5 h-5" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleDownload}
              className="p-2 rounded-xl bg-slate-800/80 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              title="Télécharger"
            >
              <Download className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 text-slate-200 hover:text-white hover:bg-red-600 transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex items-center justify-center p-4 max-h-[85vh] max-w-full overflow-hidden">
          {mediaType === 'image' ? (
            <img
              src={mediaUrl}
              alt={mediaName}
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease',
              }}
              className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl"
            />
          ) : mediaType === 'video' ? (
            <video
              src={mediaUrl}
              controls
              autoPlay
              className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl"
            />
          ) : (
            <div className="p-8 bg-white border border-slate-200 rounded-3xl text-center text-slate-800 shadow-xl">
              <p className="text-base mb-4 font-bold">{mediaName}</p>
              <button
                type="button"
                onClick={handleDownload}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-red-600/20"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger le fichier</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
