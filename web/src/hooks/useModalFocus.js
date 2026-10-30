import { useEffect, useRef } from 'react';

const openModals = [];
let originalOverflow;
const focusable = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]';

export default function useModalFocus(isOpen, onClose, busy = false, returnFocusRef = null) {
  const ref = useRef(null);
  const callbacks = useRef({ onClose, busy });
  callbacks.current = { onClose, busy };

  useEffect(() => {
    if (!isOpen || !ref.current) return;
    const modal = ref.current;
    const previousFocus = document.activeElement;
    if (!openModals.length) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    openModals.push(modal);
    const elements = () => [...modal.querySelectorAll(focusable)].filter(el => el.getClientRects().length);
    modal.tabIndex = -1;
    (elements()[0] || modal).focus();
    const handleKey = event => {
      if (openModals.at(-1) !== modal) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!callbacks.current.busy) callbacks.current.onClose?.();
      }
      if (event.key !== 'Tab') return;
      const targets = elements();
      const first = targets[0] || modal;
      const last = targets.at(-1) || modal;
      if (!targets.length || !modal.contains(document.activeElement) ||
        (event.shiftKey ? document.activeElement === first : document.activeElement === last) || document.activeElement === modal) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => {
      document.removeEventListener('keydown', handleKey, true);
      const wasTop = openModals.at(-1) === modal;
      openModals.splice(openModals.indexOf(modal), 1);
      if (!openModals.length) document.body.style.overflow = originalOverflow;
      const returnTarget = returnFocusRef?.current || previousFocus;
      if (wasTop && returnTarget?.isConnected) returnTarget.focus();
    };
  }, [isOpen]);
  return ref;
}
