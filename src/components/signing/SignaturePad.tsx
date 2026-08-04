'use client';

/**
 * Type your name or draw it, Signaturely-style.
 *
 * Hand-rolled rather than pulling in signature_pad or react-signature-canvas:
 * it is a few pointer events and a path, and this app currently ships zero
 * canvas dependencies. Adding one for eighty lines would be the more expensive
 * choice.
 *
 * Both methods produce the same evidence. The typed legal name is ALWAYS
 * captured — a drawn squiggle is not, by itself, a statement of who signed, and
 * the backend refuses a signature without a name either way. The drawing is an
 * additional artefact, stamped onto the document in place of the name.
 *
 * The canvas is backed at devicePixelRatio so strokes are not soft on retina
 * screens, and exported trimmed to its ink so a signature drawn in the corner
 * of the box does not get scaled down to a dot when it lands on the PDF.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, Pen, Type } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SignatureMethod } from '@/types/leaseForm';

const CANVAS_HEIGHT = 160;
const STROKE_WIDTH = 2.4;
const INK = '#1c1c1a';

export interface SignatureValue {
  typedName: string;
  method: SignatureMethod;
  /** PNG data URL, present only when drawn. */
  signaturePng?: string;
}

interface Props {
  /** Prefilled from the lease so most people never have to type it. */
  defaultName?: string;
  disabled?: boolean;
  onChange: (value: SignatureValue) => void;
}

export default function SignaturePad({
  defaultName = '',
  disabled = false,
  onChange,
}: Props) {
  const [method, setMethod] = useState<SignatureMethod>('TYPED');
  const [typedName, setTypedName] = useState(defaultName);
  const [hasInk, setHasInk] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  // Tracked so the export can trim to the ink instead of the whole box.
  const bounds = useRef({ minX: 0, minY: 0, maxX: 0, maxY: 0, empty: true });

  const emit = useCallback(
    (next: Partial<SignatureValue> = {}) => {
      const value: SignatureValue = {
        typedName,
        method,
        signaturePng: method === 'DRAWN' ? exportInk() : undefined,
        ...next,
      };
      onChange(value);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [typedName, method, hasInk]
  );

  // --- canvas setup -------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 480;
    canvas.width = width * ratio;
    canvas.height = CANVAS_HEIGHT * ratio;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = STROKE_WIDTH;
    ctx.strokeStyle = INK;
  }, [method]);

  function pointFrom(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function track(x: number, y: number) {
    const box = bounds.current;
    if (box.empty) {
      bounds.current = { minX: x, minY: y, maxX: x, maxY: y, empty: false };
      return;
    }
    box.minX = Math.min(box.minX, x);
    box.minY = Math.min(box.minY, y);
    box.maxX = Math.max(box.maxX, x);
    box.maxY = Math.max(box.maxY, y);
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    // Capture the pointer so a stroke that leaves the box still finishes here
    // rather than being abandoned mid-signature.
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const { x, y } = pointFrom(event);
    track(x, y);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pointFrom(event);
    track(x, y);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasInk) setHasInk(true);
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    emit();
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bounds.current = { minX: 0, minY: 0, maxX: 0, maxY: 0, empty: true };
    setHasInk(false);
    onChange({ typedName, method, signaturePng: undefined });
  }

  /** The drawn ink, cropped to itself, as a transparent PNG data URL. */
  function exportInk(): string | undefined {
    const canvas = canvasRef.current;
    const box = bounds.current;
    if (!canvas || box.empty) return undefined;

    const ratio = window.devicePixelRatio || 1;
    const pad = STROKE_WIDTH * 2;
    const sx = Math.max(0, (box.minX - pad) * ratio);
    const sy = Math.max(0, (box.minY - pad) * ratio);
    const sw = Math.min(
      canvas.width - sx,
      (box.maxX - box.minX + pad * 2) * ratio
    );
    const sh = Math.min(
      canvas.height - sy,
      (box.maxY - box.minY + pad * 2) * ratio
    );
    if (sw <= 0 || sh <= 0) return undefined;

    const out = document.createElement('canvas');
    out.width = Math.round(sw);
    out.height = Math.round(sh);
    out.getContext('2d')?.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
    return out.toDataURL('image/png');
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="signature-name">Your full legal name</Label>
        <Input
          id="signature-name"
          value={typedName}
          disabled={disabled}
          placeholder="e.g. Sarah Chen"
          onChange={(event) => {
            setTypedName(event.target.value);
            onChange({
              typedName: event.target.value,
              method,
              signaturePng: method === 'DRAWN' ? exportInk() : undefined,
            });
          }}
        />
        <p className="text-xs text-ink-4">
          This is what goes on the document as the person signing, whichever
          option you pick below.
        </p>
      </div>

      <Tabs
        value={method}
        onValueChange={(value) => {
          const next = value as SignatureMethod;
          setMethod(next);
          onChange({
            typedName,
            method: next,
            signaturePng: next === 'DRAWN' ? exportInk() : undefined,
          });
        }}
      >
        <TabsList>
          <TabsTrigger value="TYPED" disabled={disabled}>
            <Type className="mr-1.5 h-3.5 w-3.5" />
            Type it
          </TabsTrigger>
          <TabsTrigger value="DRAWN" disabled={disabled}>
            <Pen className="mr-1.5 h-3.5 w-3.5" />
            Draw it
          </TabsTrigger>
        </TabsList>

        <TabsContent value="TYPED" className="mt-3">
          <div className="flex h-[100px] items-center justify-center rounded-lg border bg-[hsl(var(--surface-sunken))]">
            <span
              className="px-4 text-3xl italic text-ink"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              {typedName || 'Your name'}
            </span>
          </div>
          <p className="mt-2 text-xs text-ink-4">
            Rentium writes this onto the document in a signature typeface.
          </p>
        </TabsContent>

        <TabsContent value="DRAWN" className="mt-3">
          <div className="relative rounded-lg border bg-white">
            <canvas
              ref={canvasRef}
              // touch-none stops the browser scrolling the page while someone
              // signs with a finger — without it a phone signature is one dot.
              className="w-full touch-none rounded-lg"
              style={{ height: CANVAS_HEIGHT }}
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
              onPointerLeave={end}
            />
            {!hasInk && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-ink-4">
                Sign here with your finger, stylus, or mouse
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-ink-4">
              Your drawn signature is stamped onto the document.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clear}
              disabled={disabled || !hasInk}
            >
              <Eraser className="mr-1.5 h-3.5 w-3.5" />
              Clear
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Whether a value is complete enough to submit. */
export function signatureIsReady(value: SignatureValue | null): boolean {
  if (!value || !value.typedName.trim()) return false;
  if (value.method === 'DRAWN') return Boolean(value.signaturePng);
  return true;
}
