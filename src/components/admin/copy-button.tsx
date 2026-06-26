'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { useToast } from './toaster';

export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({ title: 'Copied to clipboard', variant: 'success' });
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      toast({ title: 'Copy failed', description: 'Clipboard permission was denied.', variant: 'danger' });
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${value}`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-1 font-mono text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${className ?? ''}`}
    >
      {copied ? <Check className="h-3 w-3 text-safe" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}
