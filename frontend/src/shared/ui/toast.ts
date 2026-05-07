type ToastEvent = { message: string };

const target = typeof window !== "undefined" ? new EventTarget() : null;
const EVENT = "copay-toast";

export function showToast(message: string) {
  if (!target) return;
  target.dispatchEvent(new CustomEvent<ToastEvent>(EVENT, { detail: { message } }));
}

export function onToast(cb: (message: string) => void) {
  if (!target) return () => {};
  const handler = (e: Event) => cb((e as CustomEvent<ToastEvent>).detail.message);
  target.addEventListener(EVENT, handler);
  return () => target.removeEventListener(EVENT, handler);
}

