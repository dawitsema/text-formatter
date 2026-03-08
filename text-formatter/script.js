/**
 * Full Markdown → Unicode Text Formatter
 * Converts markdown formatting into Unicode styled characters.
 * Supports: **bold**, *italic*, ***bold italic***, ~~strikethrough~~,
 *           `monospace`, # headings, - bullet lists
 */

// ===========================
// Unicode Character Mappings
// ===========================

/**
 * Bold (Serif) — Mathematical Bold
 *   A-Z → U+1D400–U+1D419
 *   a-z → U+1D41A–U+1D433
 *   0-9 → U+1D7CE–U+1D7D7
 */
function toBoldChar(ch) {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D400 + (code - 65));
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D41A + (code - 97));
    if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7CE + (code - 48));
    return ch;
}

/**
 * Italic (Serif) — Mathematical Italic
 *   A-Z → U+1D434–U+1D44D
 *   a-z → U+1D44E–U+1D467  (h → U+210E, gap at U+1D455)
 */
function toItalicChar(ch) {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D434 + (code - 65));
    if (code >= 97 && code <= 122) {
        if (ch === 'h') return '\u210E'; // Planck constant, fills the gap
        return String.fromCodePoint(0x1D44E + (code - 97));
    }
    return ch;
}

/**
 * Bold Italic (Serif) — Mathematical Bold Italic
 *   A-Z → U+1D468–U+1D481
 *   a-z → U+1D482–U+1D49B
 */
function toBoldItalicChar(ch) {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D468 + (code - 65));
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D482 + (code - 97));
    if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7CE + (code - 48)); // Bold digits
    return ch;
}

/**
 * Monospace — Mathematical Monospace
 *   A-Z → U+1D670–U+1D689
 *   a-z → U+1D68A–U+1D6A3
 *   0-9 → U+1D7F6–U+1D7FF
 */
function toMonospaceChar(ch) {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D670 + (code - 65));
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D68A + (code - 97));
    if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7F6 + (code - 48));
    return ch;
}

/**
 * Strikethrough — Combining Long Stroke Overlay (U+0336) after each char
 */
function toStrikethroughChar(ch) {
    if (ch === ' ') return ch;
    return ch + '\u0336';
}

/**
 * Underline — Combining Low Line (U+0332) after each char
 */
function toUnderlineChar(ch) {
    if (ch === ' ') return ch;
    return ch + '\u0332';
}

// ===========================
// String-level converters
// ===========================

function toBoldUnicode(text) { return Array.from(text).map(toBoldChar).join(''); }
function toItalicUnicode(text) { return Array.from(text).map(toItalicChar).join(''); }
function toBoldItalicUnicode(text) { return Array.from(text).map(toBoldItalicChar).join(''); }
function toMonospaceUnicode(text) { return Array.from(text).map(toMonospaceChar).join(''); }
function toStrikethroughUnicode(text) { return Array.from(text).map(toStrikethroughChar).join(''); }
function toUnderlineUnicode(text) { return Array.from(text).map(toUnderlineChar).join(''); }

// ===========================
// Inline Markdown Processing
// ===========================

/**
 * Process inline markdown formatting within a line of text.
 * Order matters: longest/most-specific patterns first.
 */
function processInline(text) {
    // ***bold italic*** or ___bold italic___
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, (_, m) => toBoldItalicUnicode(m));
    text = text.replace(/___(.+?)___/g, (_, m) => toBoldItalicUnicode(m));

    // **bold** or __bold__
    text = text.replace(/\*\*(.+?)\*\*/g, (_, m) => toBoldUnicode(m));
    text = text.replace(/__(.+?)__/g, (_, m) => toBoldUnicode(m));

    // *italic* or _italic_  (single markers)
    text = text.replace(/\*(.+?)\*/g, (_, m) => toItalicUnicode(m));
    text = text.replace(/(?<!\w)_(.+?)_(?!\w)/g, (_, m) => toItalicUnicode(m));

    // ~~strikethrough~~
    text = text.replace(/~~(.+?)~~/g, (_, m) => toStrikethroughUnicode(m));

    // `monospace`
    text = text.replace(/`(.+?)`/g, (_, m) => toMonospaceUnicode(m));

    return text;
}

// ===========================
// Full Text Formatter
// ===========================

/**
 * Format the entire input text:
 *
 * Block-level rules:
 *   # Heading        → Bold Unicode (title)
 *   ## Heading       → Bold Unicode (subtitle)
 *   - item / * item  → • bullet with inline formatting
 *   > quote          → ⎸ quote with inline formatting
 *   ---              → ─────── horizontal rule
 *   Empty lines      → preserved as spacing
 *
 * Inline rules (applied within each line):
 *   ***text***       → Bold Italic Unicode
 *   **text**         → Bold Unicode
 *   *text*           → Italic Unicode
 *   ~~text~~         → Strikethrough
 *   `text`           → Monospace Unicode
 *
 * Special behavior (original mode):
 *   Standalone **text** paragraph → title (no bullet)
 *   **text** + more text          → - bullet with bold label
 */
function formatText(input) {
    if (!input.trim()) return '';

    const lines = input.split('\n');
    const result = [];
    let prevEmpty = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Empty line → add spacing (collapse multiple)
        if (!trimmed) {
            if (!prevEmpty && result.length > 0) {
                result.push('');
            }
            prevEmpty = true;
            continue;
        }
        prevEmpty = false;

        // --- Horizontal rule ---
        if (/^[-*_]{3,}$/.test(trimmed)) {
            result.push('───────────────────');
            continue;
        }

        // # Heading → Bold
        const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
            const text = processInline(headingMatch[2]);
            result.push(toBoldUnicode(headingMatch[2].replace(/\*+|_+|~~|`/g, '')));
            continue;
        }

        // > Blockquote
        const quoteMatch = trimmed.match(/^>\s*(.*)$/);
        if (quoteMatch) {
            result.push('⎸ ' + processInline(quoteMatch[1]));
            continue;
        }

        // - or * bullet list
        const bulletMatch = trimmed.match(/^[-*+]\s+(.+)$/);
        if (bulletMatch) {
            result.push('• ' + processInline(bulletMatch[1]));
            continue;
        }

        // Numbered list: 1. text
        const numberedMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
        if (numberedMatch) {
            const num = toBoldUnicode(numberedMatch[1]);
            result.push(num + '. ' + processInline(numberedMatch[2]));
            continue;
        }

        // Standalone **entire line** → title (no bullet, full bold)
        const fullBoldMatch = trimmed.match(/^\*\*(.+)\*\*$/);
        if (fullBoldMatch && !trimmed.includes('**', 2 + fullBoldMatch[1].length)) {
            // Check it's truly the whole line wrapped in **
            const inner = fullBoldMatch[1];
            if (!inner.includes('**')) {
                result.push(toBoldUnicode(inner));
                continue;
            }
        }

        // **label** followed by more text → bullet with bold label
        const labelMatch = trimmed.match(/^\*\*(.+?)\*\*(.+)$/);
        if (labelMatch) {
            const boldPart = toBoldUnicode(labelMatch[1]);
            const restPart = processInline(labelMatch[2]);
            result.push('- ' + boldPart + restPart);
            continue;
        }

        // Regular line — just process inline markdown
        result.push(processInline(trimmed));
    }

    // Remove trailing empty lines
    while (result.length > 0 && result[result.length - 1] === '') {
        result.pop();
    }

    return result.join('\n');
}

// ===========================
// DOM Elements
// ===========================

const inputEl = document.getElementById('input-text');
const outputEl = document.getElementById('output-text');
const btnFormat = document.getElementById('btn-format');
const btnCopy = document.getElementById('btn-copy');
const btnClear = document.getElementById('btn-clear');
const charCount = document.getElementById('char-count');
const outputCharCount = document.getElementById('output-char-count');
const copyFeedback = document.getElementById('copy-feedback');

// ===========================
// Event Handlers
// ===========================

// Format button click
btnFormat.addEventListener('click', () => {
    const input = inputEl.value;
    const formatted = formatText(input);
    outputEl.textContent = formatted;
    updateOutputCount();

    // Pulse animation
    btnFormat.classList.add('pulse');
    setTimeout(() => btnFormat.classList.remove('pulse'), 600);
});

// Live formatting as you type (debounced)
let debounceTimer;
inputEl.addEventListener('input', () => {
    updateCharCount();

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const input = inputEl.value;
        if (input.trim()) {
            const formatted = formatText(input);
            outputEl.textContent = formatted;
            updateOutputCount();
        } else {
            outputEl.textContent = '';
            updateOutputCount();
        }
    }, 300);
});

// Copy button
btnCopy.addEventListener('click', async () => {
    const text = outputEl.textContent;
    if (!text) return;

    try {
        await navigator.clipboard.writeText(text);
        showCopyFeedback();
    } catch (err) {
        fallbackCopy(text);
        showCopyFeedback();
    }
});

// Clear button
btnClear.addEventListener('click', () => {
    inputEl.value = '';
    outputEl.textContent = '';
    updateCharCount();
    updateOutputCount();
    inputEl.focus();
});

// Keyboard shortcuts
inputEl.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        btnFormat.click();
    }
});

// ===========================
// Utility Functions
// ===========================

function updateCharCount() {
    const len = inputEl.value.length;
    charCount.textContent = `${len} character${len !== 1 ? 's' : ''}`;
}

function updateOutputCount() {
    const len = outputEl.textContent.length;
    outputCharCount.textContent = `${len} character${len !== 1 ? 's' : ''}`;
}

function showCopyFeedback() {
    btnCopy.classList.add('copied');
    const originalHTML = btnCopy.innerHTML;
    btnCopy.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        Copied!
    `;

    copyFeedback.textContent = '✓ Copied to clipboard';
    copyFeedback.classList.add('show');

    setTimeout(() => {
        btnCopy.classList.remove('copied');
        btnCopy.innerHTML = originalHTML;
        copyFeedback.classList.remove('show');
    }, 2000);
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

// ===========================
// Theme Toggle (Dark / Light)
// ===========================

const btnTheme = document.getElementById('btn-theme');
const htmlEl = document.documentElement;

// Load saved theme or default to dark
(function initTheme() {
    const saved = localStorage.getItem('evim-theme');
    if (saved) {
        htmlEl.setAttribute('data-theme', saved);
    }
})();

// Toggle on click
btnTheme.addEventListener('click', () => {
    const current = htmlEl.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    htmlEl.setAttribute('data-theme', next);
    localStorage.setItem('evim-theme', next);
});

// ===========================
// Init
// ===========================
updateCharCount();
updateOutputCount();
