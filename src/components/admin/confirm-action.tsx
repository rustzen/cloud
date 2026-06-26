'use client';

import { useTransition, useState } from 'react';
import { Button } from '@/components/ui/button';

export type ServerAction = (formData: FormData) => Promise<void>;

/**
 * Wraps a destructive server action behind a confirmation dialog. The server
 * action is passed from a server component (it crosses the boundary as an
 * action reference); on confirm we invoke it with the supplied fields.
 */
export function ConfirmAction({
  action,
  fields,
  triggerLabel,
  triggerIcon,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
}: {
  action: ServerAction;
  fields: Record<string, string>;
  triggerLabel: string;
  triggerIcon?: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const fd = new FormData();
      for (const [key, value] of Object.entries(fields)) fd.set(key, value);
      await action(fd);
      setOpen(false);
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" type="button" onClick={() => setOpen(true)}>
        {triggerIcon}
        {triggerLabel}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label={cancelLabel}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !pending && setOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setOpen(false)} disabled={pending}>
                {cancelLabel}
              </Button>
              <Button variant={destructive ? 'destructive' : 'default'} size="sm" type="button" onClick={confirm} disabled={pending}>
                {pending ? 'Working…' : confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
