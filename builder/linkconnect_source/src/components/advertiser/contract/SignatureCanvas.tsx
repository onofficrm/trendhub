import React, { useEffect, useRef, useState } from 'react';
import { Eraser, ImagePlus } from 'lucide-react';

type Point = { x: number; y: number };

const MAX_PNG_BYTES = 480 * 1024;
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;

function dataUrlBytes(dataUrl: string) {
  const comma = dataUrl.indexOf(',');
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.ceil((b64.length * 3) / 4);
}

function canvasToPngUnderLimit(source: HTMLCanvasElement) {
  let current: HTMLCanvasElement = source;
  for (let i = 0; i < 8; i += 1) {
    const url = current.toDataURL('image/png');
    if (dataUrlBytes(url) <= MAX_PNG_BYTES || current.width <= 360) {
      return url;
    }
    const next = document.createElement('canvas');
    next.width = Math.max(360, Math.floor(current.width * 0.75));
    next.height = Math.max(160, Math.floor((current.height * next.width) / current.width));
    const ctx = next.getContext('2d');
    if (!ctx) return url;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, next.width, next.height);
    ctx.drawImage(current, 0, 0, next.width, next.height);
    current = next;
  }
  return current.toDataURL('image/png');
}

export function SignatureCanvas({
  onChange,
  disabled = false,
  className = '',
}: {
  onChange: (hasStroke: boolean, dataUrl: string | null) => void;
  disabled?: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const drawingRef = useRef(false);
  const hasStrokeRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const [attachedName, setAttachedName] = useState('');
  const [fileError, setFileError] = useState('');

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const emitChange = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      onChange(false, null);
      return;
    }
    if (!hasStrokeRef.current) {
      onChange(false, null);
      return;
    }
    onChange(true, canvasToPngUnderLimit(canvas));
  };

  const restoreDrawTransform = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const rect = canvas.getBoundingClientRect();
    const ratio = rect.width > 0 ? canvas.width / rect.width : window.devicePixelRatio || 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const drawLine = (from: Point, to: Point) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const point = getPoint(event);
    if (!point) return;
    drawingRef.current = true;
    hasStrokeRef.current = true;
    lastPointRef.current = point;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled) return;
    const point = getPoint(event);
    const last = lastPointRef.current;
    if (!point || !last) return;
    drawLine(last, point);
    lastPointRef.current = point;
    emitChange();
  };

  const stopDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    emitChange();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    restoreDrawTransform(canvas, ctx);
    hasStrokeRef.current = false;
    setAttachedName('');
    setFileError('');
    if (fileRef.current) fileRef.current.value = '';
    onChange(false, null);
  };

  const paintUploadedImage = (image: HTMLImageElement) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || image.width < 1 || image.height < 1) {
      setFileError('이미지를 불러오지 못했습니다. PNG 또는 JPG로 다시 첨부해 주세요.');
      return;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
    const dw = image.width * scale;
    const dh = image.height * scale;
    const dx = (canvas.width - dw) / 2;
    const dy = (canvas.height - dh) / 2;
    ctx.drawImage(image, dx, dy, dw, dh);
    restoreDrawTransform(canvas, ctx);
    hasStrokeRef.current = true;
    setFileError('');
    emitChange();
  };

  const handleFile = (file: File | undefined) => {
    if (!file || disabled) return;
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      setFileError('PNG, JPG, WEBP, GIF 이미지만 첨부할 수 있습니다.');
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setFileError('이미지 크기가 너무 큽니다. 8MB 이하 파일로 첨부해 주세요.');
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      setAttachedName(file.name);
      paintUploadedImage(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setFileError('이미지를 불러오지 못했습니다. PNG 또는 JPG로 다시 첨부해 주세요.');
    };
    image.src = url;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      const hadStroke = hasStrokeRef.current;
      const prev = hadStroke ? canvas.toDataURL('image/png') : '';

      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(ratio, ratio);

      if (prev) {
        const img = new Image();
        img.onload = () => {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
          emitChange();
        };
        img.src = prev;
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className={className}>
      <div className="rounded-xl border border-slate-300 bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-44 md:h-52 touch-none cursor-crosshair bg-white"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          onPointerCancel={stopDrawing}
          aria-label="서명 입력"
        />
      </div>
      <div className="flex flex-col gap-2 mt-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          직접 서명하거나, 인감도장·사인 이미지를 첨부할 수 있습니다.
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled}
            className="inline-flex items-center gap-1 text-sm text-cyan-700 hover:text-cyan-900 disabled:opacity-50"
          >
            <ImagePlus size={16} />
            인감/사인 첨부
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-50"
          >
            <Eraser size={16} />
            서명 초기화
          </button>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif"
        className="hidden"
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      {attachedName ? (
        <p className="text-xs text-slate-600 mt-2">첨부됨: {attachedName}</p>
      ) : null}
      {fileError ? <p className="text-sm text-amber-700 mt-1">{fileError}</p> : null}
    </div>
  );
}
