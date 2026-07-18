
import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Check } from 'lucide-react';

interface Props {
  onSave: (dataUrl: string) => void;
  label?: string;
}

export const SignaturePad: React.FC<Props> = ({ onSave, label = "Firma aquí" }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.parentElement?.clientWidth || 300;
      canvas.height = 150;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000000';
      }
    }
  }, []);

  const getPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: any) => {
    e.preventDefault(); // Prevent scrolling on touch
    setIsDrawing(true);
    const { x, y } = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  };

  const draw = (e: any) => {
    e.preventDefault();
    if (!isDrawing) return;
    const { x, y } = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.lineTo(x, y);
    ctx?.stroke();
    setHasSignature(true);
  };

  const endDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current && hasSignature) {
      onSave(canvasRef.current.toDataURL());
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    ctx?.clearRect(0, 0, canvas!.width, canvas!.height);
    setHasSignature(false);
    onSave('');
  };

  return (
    <div className="w-full">
      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">{label}</label>
      <div className="relative border-2 border-dashed border-gray-300 rounded-lg bg-white touch-none">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
          className="w-full cursor-crosshair rounded-lg"
        />
        <button 
          onClick={clear} 
          className="absolute top-2 right-2 p-1 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-600"
          title="Borrar firma"
        >
          <Eraser size={16} />
        </button>
      </div>
      <div className="text-xs text-gray-400 mt-1 text-center">
        {hasSignature ? <span className="text-green-600 flex items-center justify-center gap-1"><Check size={12}/> Firma capturada</span> : "Dibuja tu firma en el recuadro"}
      </div>
    </div>
  );
};
