import { useEffect } from 'react';

export function isTargetWithin(target, elements) {
  return elements.some((element) => element && element.contains(target));
}

export function useOutsideClick({ enabled = true, getElements, onOutsideClick }) {
  useEffect(() => {
    if (!enabled) return undefined;

    function onDocumentClick(event) {
      const elements = typeof getElements === 'function' ? getElements() : [];
      if (!isTargetWithin(event.target, elements)) {
        onOutsideClick(event);
      }
    }

    document.addEventListener('click', onDocumentClick);
    return () => {
      document.removeEventListener('click', onDocumentClick);
    };
  }, [enabled, getElements, onOutsideClick]);
}
