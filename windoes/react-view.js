import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';

export const h = React.createElement;
export const Fragment = React.Fragment;

function toCamelCase(str) {
    return str.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
}

function parseStyle(styleText) {
    if (!styleText) return undefined;
    const style = {};

    styleText
        .split(';')
        .map(chunk => chunk.trim())
        .filter(Boolean)
        .forEach(rule => {
            const idx = rule.indexOf(':');
            if (idx === -1) return;
            const key = rule.slice(0, idx).trim();
            const value = rule.slice(idx + 1).trim();
            if (!key) return;

            if (key.startsWith('--')) {
                style[key] = value;
            } else {
                style[toCamelCase(key)] = value;
            }
        });

    return style;
}

function mapAttrName(name) {
    if (name === 'class') return 'className';
    if (name === 'for') return 'htmlFor';
    if (name === 'tabindex') return 'tabIndex';
    if (name === 'readonly') return 'readOnly';
    if (name === 'spellcheck') return 'spellCheck';
    if (name === 'maxlength') return 'maxLength';
    if (name === 'minlength') return 'minLength';
    if (name === 'contenteditable') return 'contentEditable';
    if (name === 'srcset') return 'srcSet';
    if (name === 'colspan') return 'colSpan';
    if (name === 'rowspan') return 'rowSpan';
    return name;
}

function attrValue(name, value) {
    const lower = name.toLowerCase();
    if (lower === 'style') return parseStyle(value);
    if (value === '') return true;
    return value;
}

function domNodeToReact(node, key) {
    if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
        return null;
    }

    const tagName = node.tagName.toLowerCase();
    const props = { key };

    Array.from(node.attributes).forEach(attr => {
        const mapped = mapAttrName(attr.name);
        props[mapped] = attrValue(attr.name, attr.value);
    });

    const children = Array.from(node.childNodes)
        .map((child, idx) => domNodeToReact(child, `${key}-${idx}`))
        .filter(child => child !== null);

    if (children.length === 0) {
        return h(tagName, props);
    }

    return h(tagName, props, ...children);
}

export function htmlToReactNodes(html, keyPrefix = 'html') {
    if (!html) return [];

    const template = document.createElement('template');
    template.innerHTML = html.trim();

    return Array.from(template.content.childNodes)
        .map((node, idx) => domNodeToReact(node, `${keyPrefix}-${idx}`))
        .filter(node => node !== null);
}

export function renderInto(container, node) {
    if (!container.__windoesReactRoot) {
        container.__windoesReactRoot = createRoot(container);
    }

    flushSync(() => {
        container.__windoesReactRoot.render(node);
    });
}
