'use client';

import { Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ConfirmAction, type ServerAction } from './confirm-action';
import { CopyButton } from './copy-button';
import { DataTable, type Column } from './data-table';
import { LicenseEditDialog } from './license-edit-dialog';

export type LicenseRowDTO = {
  id: string;
  key: string;
  product: string;
  plan: string;
  status: string;
  rawStatus: string;
  customer: string;
  provider: string;
  order: string;
  usage: string;
  maxDevices: number;
  expires: string;
  expiresAtInput: string;
  expiresSort: string;
  created: string;
  createdSort: string;
};

function statusVariant(status: string) {
  if (status === 'ACTIVE') return 'success';
  if (status === 'EXPIRED') return 'warning';
  if (status === 'REVOKED') return 'destructive';
  return 'muted';
}

export function LicensesTable({
  rows,
  updateAction,
  revokeAction,
}: {
  rows: LicenseRowDTO[];
  updateAction: ServerAction;
  revokeAction: ServerAction;
}) {
  const columns: Column<LicenseRowDTO>[] = [
    {
      key: 'key',
      header: 'License key',
      cell: (r) => (
        <div className="flex items-center gap-2">
          <code className="block max-w-[220px] truncate font-mono text-xs" title={r.key}>
            {r.key}
          </code>
          <CopyButton value={r.key} />
        </div>
      ),
      sortValue: (r) => r.key,
    },
    { key: 'product', header: 'Product', cell: (r) => r.product, sortValue: (r) => r.product },
    { key: 'plan', header: 'Plan', cell: (r) => r.plan, sortValue: (r) => r.plan },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
      sortValue: (r) => r.status,
    },
    { key: 'customer', header: 'Customer', cell: (r) => r.customer, sortValue: (r) => r.customer },
    { key: 'provider', header: 'Provider', cell: (r) => r.provider, sortValue: (r) => r.provider },
    {
      key: 'order',
      header: 'Order',
      cell: (r) => (
        <code className="block max-w-[160px] truncate font-mono text-xs" title={r.order}>
          {r.order}
        </code>
      ),
      sortValue: (r) => r.order,
    },
    { key: 'usage', header: 'Devices', cell: (r) => r.usage, sortValue: (r) => r.usage },
    { key: 'expires', header: 'Expires', cell: (r) => r.expires, sortValue: (r) => r.expiresSort },
    { key: 'created', header: 'Created', cell: (r) => r.created, sortValue: (r) => r.createdSort },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      cell: (r) => (
        <div className="flex justify-end gap-2">
          <LicenseEditDialog license={r} updateLicense={updateAction} />
          {r.rawStatus === 'REVOKED' ? null : (
            <ConfirmAction
              action={revokeAction}
              fields={{ id: r.id }}
              triggerLabel="Revoke"
              triggerIcon={<Ban className="h-4 w-4" />}
              title="Revoke this license?"
              description={`Key ${r.key} will be permanently revoked and can no longer activate devices.`}
              confirmLabel="Revoke"
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowId={(r) => r.id}
      emptyMessage="No licenses found. Create a license or sync billing orders to populate this table."
      search={{
        placeholder: 'Search key, customer, product…',
        text: (r) => `${r.key} ${r.customer} ${r.product} ${r.status} ${r.order}`,
      }}
      exportSpec={{
        filename: 'rustzen-licenses.csv',
        columns: [
          { header: 'License key', value: (r) => r.key },
          { header: 'Product', value: (r) => r.product },
          { header: 'Plan', value: (r) => r.plan },
          { header: 'Status', value: (r) => r.status },
          { header: 'Customer', value: (r) => r.customer },
          { header: 'Provider', value: (r) => r.provider },
          { header: 'Order', value: (r) => r.order },
          { header: 'Devices', value: (r) => r.usage },
          { header: 'Expires', value: (r) => r.expires },
          { header: 'Created', value: (r) => r.created },
        ],
      }}
      pageSize={10}
    />
  );
}
