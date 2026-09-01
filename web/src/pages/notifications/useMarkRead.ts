import { useCallback } from 'react';

import { request } from '../../shared/api/client';
import { useRequest } from '../../shared/hooks';
import type { Notification } from './useNotifications';

export function useMarkRead() {
  const { status, error, run } = useRequest<Notification>();

  const mark = useCallback(
    (id: string) => run(() => request<Notification>(`/me/notifications/${id}/read`, { method: 'POST' })),
    [run],
  );

  return { status, error, mark };
}
