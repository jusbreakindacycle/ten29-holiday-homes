type Event = 'booking_intake_failed' | 'booking_operation_failed' | 'media_operation_failed' | 'notification_delivery_failed' | 'notification_finish_failed' | 'diagnostics_unavailable';
/** Fixed event vocabulary. No error objects, request bodies, contacts or tokens. */
export function operationalLog(event: Event) {
  console.warn(JSON.stringify({ event, at: new Date().toISOString() }));
}
