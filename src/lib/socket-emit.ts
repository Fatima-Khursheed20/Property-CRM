export function emitLeadEvent(event: string, payload: unknown) {
  try {
    if (global.io) {
      global.io.emit(event, payload);
    }
  } catch {
    // ignore when custom server not running
  }
}
