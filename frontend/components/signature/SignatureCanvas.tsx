'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import SignaturePad from 'signature_pad';

interface SignatureCanvasProps {
  width?: number;
  height?: number;
  className?: string;
  penColor?: string;
  minWidth?: number;
  maxWidth?: number;
}

export interface SignatureCanvasRef {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: (type?: string) => string;
  fromDataURL: (dataURL: string) => void;
}

const SignatureCanvas = forwardRef<SignatureCanvasRef, SignatureCanvasProps>(
  ({ width = 500, height = 200, className = '', penColor = '#111827', minWidth = 1, maxWidth = 3 }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const signaturePadRef = useRef<SignaturePad | null>(null);

    useEffect(() => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const signaturePad = new SignaturePad(canvas, {
        // Keep the PNG alpha channel. The surrounding dialog can be white for
        // usability, but a handwritten signature must not paint a white box
        // over the document when it is embedded into the PDF.
        backgroundColor: 'rgba(0, 0, 0, 0)',
        penColor: '#111827',
        minWidth: 1,
        maxWidth: 3,
      });

      signaturePadRef.current = signaturePad;

      // Resize canvas to match display size
      const resizeCanvas = () => {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext('2d')?.scale(ratio, ratio);
        signaturePad.clear();
      };

      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);

      return () => {
        window.removeEventListener('resize', resizeCanvas);
        signaturePad.off();
      };
    }, []);

    useEffect(() => {
      if (!signaturePadRef.current) return;
      signaturePadRef.current.penColor = penColor;
      signaturePadRef.current.minWidth = minWidth;
      signaturePadRef.current.maxWidth = maxWidth;
    }, [maxWidth, minWidth, penColor]);

    useImperativeHandle(ref, () => ({
      clear: () => {
        signaturePadRef.current?.clear();
      },
      isEmpty: () => {
        return signaturePadRef.current?.isEmpty() ?? true;
      },
      toDataURL: (type = 'image/png') => {
        return signaturePadRef.current?.toDataURL(type) ?? '';
      },
      fromDataURL: (dataURL: string) => {
        signaturePadRef.current?.fromDataURL(dataURL);
      },
    }));

    return (
      <canvas
        ref={canvasRef}
        className={`border border-gray-300 rounded-lg bg-transparent ${className}`}
        style={{ width: '100%', maxWidth: `${width}px`, height: `${height}px` }}
      />
    );
  }
);

SignatureCanvas.displayName = 'SignatureCanvas';

export default SignatureCanvas;
