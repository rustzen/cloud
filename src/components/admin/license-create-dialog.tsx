'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

type LicenseCreateDialogProps = {
  products: Array<{
    code: string;
    name: string;
  }>;
  createLicense: (formData: FormData) => void | Promise<void>;
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={disabled || pending}>
      <Plus className="h-4 w-4" />
      {pending ? 'Creating' : 'Create'}
    </Button>
  );
}

export function LicenseCreateDialog({ products, createLicense }: LicenseCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const hasProducts = products.length > 0;

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} disabled={!hasProducts}>
        <Plus className="h-4 w-4" />
        Create license
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
          <div className="w-full max-w-2xl rounded-lg border border-border bg-card text-card-foreground shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-border p-5">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-normal">Create license</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Issue a manual key for an existing product.
                </p>
              </div>
              <Button
                aria-label="Close create license dialog"
                size="icon"
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form action={createLicense} className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="create-license-product">Product</Label>
                <Select id="create-license-product" name="product" required disabled={!hasProducts}>
                  {products.map((product) => (
                    <option key={product.code} value={product.code}>
                      {product.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-license-plan">Plan</Label>
                <Input id="create-license-plan" name="plan" defaultValue="pro" placeholder="pro" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-license-max-devices">Max devices</Label>
                <Input
                  id="create-license-max-devices"
                  name="maxDevices"
                  defaultValue="3"
                  min="1"
                  placeholder="3"
                  type="number"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="create-license-expires-at">Expires</Label>
                <Input id="create-license-expires-at" name="expiresAt" type="datetime-local" />
              </div>

              {!hasProducts ? (
                <p className="text-sm text-destructive sm:col-span-2">
                  No products available. Seed products before creating licenses.
                </p>
              ) : null}

              <div className="flex justify-end gap-2 border-t border-border pt-4 sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <SubmitButton disabled={!hasProducts} />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
