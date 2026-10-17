type Event = 'booking_intake_failed' | 'booking_calendar_failed' | 'booking_operation_failed' | 'media_operation_failed' | 'notification_delivery_failed' | 'notification_finish_failed' | 'diagnostics_unavailable';
/** Fixed event vocabulary. No error objects, request bodies, contacts or tokens. */
export function operationalLog(event: Event, details?: { stage?: 'configuration' | 'pricing' | 'availability' | 'response'; providerCode?: string }) {
  const providerCode = details?.providerCode;
  console.warn(JSON.stringify({
    event,
    ...(details?.stage ? { stage: details.stage } : {}),
    ...(providerCode && /^[0-9A-Z]{5}$/.test(providerCode) ? { provider_code: providerCode } : {}),
    at: new Date().toISOString(),
  }));
}
