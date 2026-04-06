import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';

export function renderInto(container, node) {
    if (!container.__windoesReactRoot) {
        container.__windoesReactRoot = createRoot(container);
    }

    flushSync(() => {
        container.__windoesReactRoot.render(node);
    });
}
