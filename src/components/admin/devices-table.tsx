'use client';

import { Unlink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ConfirmAction, type ServerAction } from './confirm-action';
import { CopyButton } from './copy-button';
import { DataTable, type Column } from './data-table';

export type DeviceRowDTO = {
  id: string;
  deviceId: string;
  deviceName: string;
  licenseKey: string;
  productName: string;
  status: string;
  usage: string;
  appVersion: string;
  activated: string;
  activatedSort: string;
  lastSeen: string;
  lastSeenSort: string;
};

function statusVariant(status: string) {
  if (status === 'ACTIVE') return 'success';
  if (status === 'EXPIRED') return 'warning';
  if (status === 'REVOKED') return 'destructive';
  return 'muted';
}

export function DevicesTable({
  rows,
  unbindAction,
}: {
  rows: DeviceRowDTO[];
  unbindAction: ServerAction;
}) {
  const columns: Column<DeviceRowDTO>[] = [
    { key: 'deviceName', header: 'Device', cell: (r) => r.deviceName, sortValue: (r) => r.deviceName },
    {
      key: 'deviceId',
      header: 'Device ID',
      cell: (r) => (
        <div className="flex items-center gap-2">
          <code className="block max-w-[200px] truncate font-mono text-xs" title={r.deviceId}>
            {r.deviceId}
          </code>
          <CopyButton value={r.deviceId} />
        </div>
      ),
      sortValue: (r) => r.deviceId,
    },
    {
      key: 'licenseKey',
      header: 'License key',
      cell: (r) => (
        <code className="block max-w-[220px] truncate font-mono text-xs" title={r.licenseKey}>
          {r.licenseKey}
        </code>
      ),
      sortValue: (r) => r.licenseKey,
    },
    { key: 'productName', header: 'Product', cell: (r) => r.productName, sortValue: (r) => r.productName },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
      sortValue: (r) => r.status,
    },
    { key: 'usage', header: 'Usage', cell: (r) => r.usage, sortValue: (r) => r.usage },
    { key: 'appVersion', header: 'App', cell: (r) => r.appVersion, sortValue: (r) => r.appVersion },
    { key: 'activated', header: 'Activated', cell: (r) => r.activated, sortValue: (r) => r.activatedSort },
    { key: 'lastSeen', header: 'Last seen', cell: (r) => r.lastSeen, sortValue: (r) => r.lastSeenSort },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      cell: (r) => (
        <ConfirmAction
          action={unbindAction}
          fields={{ deviceId: r.id }}
          triggerLabel="Unbind"
          triggerIcon={<Unlink className="h-4 w-4" />}
          title="Unbind this device?"
          description={`${r.deviceName || r.deviceId} will be released from license ${r.licenseKey}. The client will need to re-activate.`}
          confirmLabel="Unbind"
        />
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowId={(r) => r.id}
      emptyMessage="No activated devices found. Device rows appear after desktop clients activate a license."
      search={{
        placeholder: 'Search device, key, product…',
        text: (r) => `${r.deviceName} ${r.deviceId} ${r.licenseKey} ${r.productName}`,
      }}
      exportSpec={{
        filename: 'rustzen-devices.csv',
        columns: [
          { header: 'Device', value: (r) => r.deviceName },
          { header: 'Device ID', value: (r) => r.deviceId },
          { header: 'License key', value: (r) => r.licenseKey },
          { header: 'Product', value: (r) => r.productName },
          { header: 'Status', value: (r) => r.status },
          { header: 'Usage', value: (r) => r.usage },
          { header: 'App', value: (r) => r.appVersion },
          { header: 'Activated', value: (r) => r.activated },
          { header: 'Last seen', value: (r) => r.lastSeen },
        ],
      }}
      pageSize={10}
    />
  );
}
