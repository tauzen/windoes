import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function isFocusable(el) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;
  return el.getClientRects().length > 0;
}

function getFocusable(container) {
  if (!(container instanceof HTMLElement)) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isFocusable);
}

export function useDialogFocus({ isOpen, dialogRef, initialFocusRef, onInitialFocus }) {
  const openerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const dialog = dialogRef.current;
    if (!(dialog instanceof HTMLElement)) return undefined;

    const active = document.activeElement;
    openerRef.current = active instanceof HTMLElement ? active : null;

    const focusFirst = () => {
      const preferred = initialFocusRef?.current;
      if (preferred instanceof HTMLElement && isFocusable(preferred)) {
        preferred.focus();
        onInitialFocus?.(preferred);
        return;
      }

      const focusable = getFocusable(dialog);
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    };

    const rafId = requestAnimationFrame(focusFirst);

    function onKeyDown(e) {
      if (e.key !== 'Tab') return;

      const focusable = getFocusable(dialog);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      const withinDialog = current instanceof HTMLElement && dialog.contains(current);

      if (e.shiftKey) {
        if (!withinDialog || current === first) {
          e.preventDefault();
          last.focus();
        }
        return;
      }

      if (!withinDialog || current === last) {
        e.preventDefault();
        first.focus();
      }
    }

    dialog.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(rafId);
      dialog.removeEventListener('keydown', onKeyDown);

      const opener = openerRef.current;
      if (opener instanceof HTMLElement && opener.isConnected) {
        requestAnimationFrame(() => {
          opener.focus();
        });
      }
    };
  }, [dialogRef, initialFocusRef, isOpen, onInitialFocus]);
}
