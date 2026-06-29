'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { ServerAction } from './confirm-action';

type LicenseEditDialogProps = {
  license: {
    id: string;
    key: string;
    plan: string;
    rawStatus: string;
    maxDevices: number;
    expiresAtInput: string;
  };
  updateLicense: ServerAction;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      <Pencil className="h-4 w-4" />
      {pending ? 'Saving' : 'Save'}
    </Button>
  );
}

export function LicenseEditDialog({ license, updateLicense }: LicenseEditDialogProps) {
  const [open, setOpen] = useState(false);
  const isRevoked = license.rawStatus === 'REVOKED';

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" />
        Edit
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
          <div className="w-full max-w-2xl rounded-lg border border-border bg-card text-card-foreground shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-border p-5">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-normal">Edit license</h2>
                <p className="mt-1 break-all font-mono text-xs leading-6 text-muted-foreground">
                  {license.key}
                </p>
              </div>
              <Button
                aria-label="Close edit license dialog"
                size="icon"
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form action={updateLicense} className="grid gap-4 p-5 sm:grid-cols-2">
              <input type="hidden" name="id" value={license.id} />

              <div className="space-y-2">
                <Label htmlFor={`edit-license-plan-${license.id}`}>Plan</Label>
                <Input
                  id={`edit-license-plan-${license.id}`}
                  name="plan"
                  defaultValue={license.plan}
                  placeholder="pro"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`edit-license-status-${license.id}`}>Status</Label>
                {isRevoked ? (
                  <>
                    <input type="hidden" name="status" value="REVOKED" />
                    <Input id={`edit-license-status-${license.id}`} value="REVOKED" disabled />
                  </>
                ) : (
                  <Select id={`edit-license-status-${license.id}`} name="status" defaultValue={license.rawStatus}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="EXPIRED">EXPIRED</option>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`edit-license-max-devices-${license.id}`}>Max devices</Label>
                <Input
                  id={`edit-license-max-devices-${license.id}`}
                  name="maxDevices"
                  defaultValue={String(license.maxDevices)}
                  min="1"
                  placeholder="3"
                  type="number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`edit-license-expires-at-${license.id}`}>Expires</Label>
                <Input
                  id={`edit-license-expires-at-${license.id}`}
                  name="expiresAt"
                  defaultValue={license.expiresAtInput}
                  type="datetime-local"
                />
              </div>

              <p className="text-sm leading-6 text-muted-foreground sm:col-span-2">
                Empty expiration means permanent. Revoked licenses cannot be restored here; create a new
                license when access needs to be reissued.
              </p>

              <div className="flex justify-end gap-2 border-t border-border pt-4 sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <SubmitButton />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
