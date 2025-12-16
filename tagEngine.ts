export type TagIssueType = 'error' | 'warning' | 'hint';

export type TagIssue = {
    type: TagIssueType;
    message: string;
    from: number; // inclusive
    to: number; // exclusive
};

export type LintContext = {
    bibliographyKeys?: string[];
    figureIds?: string[];
    tableIds?: string[];
};

export type ApplyResult = {
    text: string;
    selectionStart: number;
    selectionEnd: number;
};

type InlineTagName = 'nota' | 'cita' | 'dorado' | 'guinda' | 'math' | 'figura' | 'tabla' | 'ecuacion';
type BlockTagName = 'caja' | 'alerta' | 'info' | 'destacado';

const INLINE_TAGS: Set<string> = new Set<InlineTagName>([
    'nota',
    'cita',
    'dorado',
    'guinda',
    'math',
    'figura',
    'tabla',
    'ecuacion',
]);

const BLOCK_TAGS: Set<string> = new Set<BlockTagName>([
    'caja',
    'alerta',
    'info',
    'destacado',
]);

const normalizeTagName = (name: string) =>
    name
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const ensureNewlinesAroundBlock = (prefix: string, suffix: string) => {
    // Ensure we have at least one blank line (\n\n) around blocks.
    const before = prefix.endsWith('\n\n') ? '' : prefix.endsWith('\n') ? '\n' : '\n\n';
    const after = suffix.startsWith('\n\n') ? '' : suffix.startsWith('\n') ? '\n' : '\n\n';
    return { before, after };
};

export function applyInlineTag(
    text: string,
    selectionStart: number,
    selectionEnd: number,
    tagName: string,
    options?: {
        value?: string; // for cita/figura/tabla; also used as explicit payload for other inline tags (e.g. math modal)
        placeholder?: string;
    }
): ApplyResult {
    const safeText = text ?? '';
    const start = clamp(selectionStart ?? 0, 0, safeText.length);
    const end = clamp(selectionEnd ?? start, 0, safeText.length);
    const from = Math.min(start, end);
    const to = Math.max(start, end);
    const name = normalizeTagName(tagName);

    const selected = safeText.slice(from, to);
    const hasSelection = selected.length > 0;

    const placeholder = options?.placeholder ?? '...';
    const explicitValue = (options?.value ?? '').toString();

    // Tags that take a single argument and should NOT wrap arbitrary selected text.
    const isArgOnly = name === 'cita' || name === 'figura' || name === 'tabla';

    if (isArgOnly) {
        const arg = (explicitValue || (hasSelection ? selected : '') || placeholder).toString();
        const insert = `[[${name}:${arg}]]`;
        const newText = safeText.slice(0, from) + insert + safeText.slice(to);

        // If we inserted placeholder or selection, place cursor to edit inside the arg.
        const argStart = from + (`[[${name}:`).length;
        const argEnd = from + (`[[${name}:`).length + arg.length;
        return {
            text: newText,
            selectionStart: argStart,
            selectionEnd: argEnd,
        };
    }

    // Wrap tags
    // If an explicit value is provided (e.g. math modal), use it as the payload.
    // Otherwise, wrap the selection (if any) or insert a placeholder.
    const payload = (explicitValue || (hasSelection ? selected : '') || placeholder).toString();
    const insert = `[[${name}:${payload}]]`;
    const newText = safeText.slice(0, from) + insert + safeText.slice(to);
    const innerStart = from + (`[[${name}:`).length;
    const innerEnd = innerStart + payload.length;
    return { text: newText, selectionStart: innerStart, selectionEnd: innerEnd };
}

export function insertBlockTag(
    text: string,
    cursorPos: number,
    tagName: string,
    titleOptional?: string
): ApplyResult {
    const safeText = text ?? '';
    const pos = clamp(cursorPos ?? 0, 0, safeText.length);
    const name = normalizeTagName(tagName);

    const title = (titleOptional ?? '').toString().trim();
    const hasTitle = title.length > 0;

    const open = hasTitle ? `[[${name}:${title}]]` : `[[${name}]]`;
    const close = `[[/${name}]]`;

    const beforeText = safeText.slice(0, pos);
    const afterText = safeText.slice(pos);

    const { before, after } = ensureNewlinesAroundBlock(beforeText, afterText);

    const bodyPlaceholder = '...';

    const insert = `${before}${open}\n${bodyPlaceholder}\n${close}${after}`;
    const newText = beforeText + insert + afterText;

    const bodyStart = (beforeText + before + open + '\n').length;
    const bodyEnd = bodyStart + bodyPlaceholder.length;

    return { text: newText, selectionStart: bodyStart, selectionEnd: bodyEnd };
}

type ParsedTag = {
    raw: string;
    from: number;
    to: number;
    isClosing: boolean;
    name: string;
    payload: string;
    hasColon: boolean;
};

const parseTagToken = (rawInner: string): { isClosing: boolean; name: string; payload: string; hasColon: boolean } => {
    const inner = rawInner.trim();
    if (inner.startsWith('/')) {
        const name = normalizeTagName(inner.slice(1));
        return { isClosing: true, name, payload: '', hasColon: false };
    }

    const colonIdx = inner.indexOf(':');
    if (colonIdx === -1) {
        return { isClosing: false, name: normalizeTagName(inner), payload: '', hasColon: false };
    }

    const name = normalizeTagName(inner.slice(0, colonIdx));
    const payload = inner.slice(colonIdx + 1);
    return { isClosing: false, name, payload, hasColon: true };
};

const scanTags = (text: string): { tags: ParsedTag[]; issues: TagIssue[] } => {
    const issues: TagIssue[] = [];
    const tags: ParsedTag[] = [];

    let i = 0;
    while (i < text.length) {
        const openIdx = text.indexOf('[[', i);
        if (openIdx === -1) break;

        const closeIdx = text.indexOf(']]', openIdx + 2);
        if (closeIdx === -1) {
            issues.push({
                type: 'error',
                message: 'Etiqueta sin cerrar: falta "]]".',
                from: openIdx,
                to: text.length,
            });
            break;
        }

        const raw = text.slice(openIdx, closeIdx + 2);
        const inner = text.slice(openIdx + 2, closeIdx);
        const parsed = parseTagToken(inner);

        tags.push({
            raw,
            from: openIdx,
            to: closeIdx + 2,
            isClosing: parsed.isClosing,
            name: parsed.name,
            payload: parsed.payload,
            hasColon: parsed.hasColon,
        });

        i = closeIdx + 2;
    }

    return { tags, issues };
};

export function lintTags(text: string, context?: LintContext): TagIssue[] {
    const str = text ?? '';
    const ctx = context ?? {};
    const bibliography = new Set((ctx.bibliographyKeys ?? []).map(k => k.trim()).filter(Boolean));
    const figureIds = new Set((ctx.figureIds ?? []).map(k => k.trim()).filter(Boolean));
    const tableIds = new Set((ctx.tableIds ?? []).map(k => k.trim()).filter(Boolean));

    const { tags, issues } = scanTags(str);

    // Stack parser for block tags
    const stack: { name: string; from: number }[] = [];

    for (const t of tags) {
        if (t.isClosing) {
            if (!BLOCK_TAGS.has(t.name)) {
                issues.push({
                    type: 'error',
                    message: `Cierre inválido: "[[/${t.name}]]" no corresponde a un bloque soportado.`,
                    from: t.from,
                    to: t.to,
                });
                continue;
            }

            const top = stack[stack.length - 1];
            if (!top) {
                issues.push({
                    type: 'error',
                    message: `Cierre sin apertura: "[[/${t.name}]]".`,
                    from: t.from,
                    to: t.to,
                });
                continue;
            }

            if (top.name !== t.name) {
                issues.push({
                    type: 'error',
                    message: `Cierre incorrecto: se esperaba "[[/${top.name}]]" pero se encontró "[[/${t.name}]]".`,
                    from: t.from,
                    to: t.to,
                });
                // keep stack to avoid cascading too hard
                continue;
            }

            stack.pop();
            continue;
        }

        // Opening tag
        const isBlock = BLOCK_TAGS.has(t.name);
        const isInline = INLINE_TAGS.has(t.name);

        if (!isBlock && !isInline) {
            issues.push({
                type: 'hint',
                message: `Etiqueta desconocida: "${t.raw}".`,
                from: t.from,
                to: t.to,
            });
            continue;
        }

        if (isBlock) {
            stack.push({ name: t.name, from: t.from });

            // Block title requirements
            if ((t.name === 'alerta' || t.name === 'info') && (!t.hasColon || t.payload.trim().length === 0)) {
                issues.push({
                    type: 'warning',
                    message: `"[[${t.name}:...]]" debería incluir un título.`,
                    from: t.from,
                    to: t.to,
                });
            }

            continue;
        }

        // Inline rules
        if (!t.hasColon) {
            issues.push({
                type: 'error',
                message: `Etiqueta inline inválida: falta ":" en "[[${t.name}:...]]".`,
                from: t.from,
                to: t.to,
            });
            continue;
        }

        // Prohibit inline nesting inside inline payload
        if (t.payload.includes('[[')) {
            issues.push({
                type: 'error',
                message: `No se permite anidar etiquetas dentro de "[[${t.name}:...]]".`,
                from: t.from,
                to: t.to,
            });
        }

        if (t.name === 'cita') {
            const rawKey = t.payload;
            const key = rawKey.trim();
            if (!key) {
                issues.push({ type: 'error', message: '[[cita:CLAVE]] requiere una clave no vacía.', from: t.from, to: t.to });
            }
            if (rawKey !== key) {
                issues.push({ type: 'error', message: '[[cita:CLAVE]] no debe tener espacios al inicio/fin.', from: t.from, to: t.to });
            }
            if (key && bibliography.size > 0 && !bibliography.has(key)) {
                issues.push({ type: 'warning', message: `La cita "${key}" no existe en Bibliografía del documento.`, from: t.from, to: t.to });
            }
        }

        if (t.name === 'figura') {
            const rawId = t.payload;
            const id = rawId.trim();
            if (!id) {
                issues.push({ type: 'error', message: '[[figura:ID]] requiere un ID no vacío.', from: t.from, to: t.to });
            }
            if (rawId !== id) {
                issues.push({ type: 'warning', message: '[[figura:ID]] no debería incluir espacios al inicio/fin.', from: t.from, to: t.to });
            }
            if (id && figureIds.size > 0 && !figureIds.has(id)) {
                issues.push({ type: 'warning', message: `La figura "${id}" no existe en Figuras del documento.`, from: t.from, to: t.to });
            }
        }

        if (t.name === 'tabla') {
            const rawId = t.payload;
            const id = rawId.trim();
            if (!id) {
                issues.push({ type: 'error', message: '[[tabla:ID]] requiere un ID no vacío.', from: t.from, to: t.to });
            }
            if (rawId !== id) {
                issues.push({ type: 'warning', message: '[[tabla:ID]] no debería incluir espacios al inicio/fin.', from: t.from, to: t.to });
            }
            if (id && tableIds.size > 0 && !tableIds.has(id)) {
                issues.push({ type: 'warning', message: `La tabla "${id}" no existe en Tablas del documento.`, from: t.from, to: t.to });
            }
        }

        if (t.name === 'math') {
            const content = t.payload;
            if (!content.trim()) {
                issues.push({ type: 'hint', message: '[[math:...]] está vacío.', from: t.from, to: t.to });
            }
            if (content.includes('\n')) {
                issues.push({ type: 'warning', message: '[[math:...]] es inline; evita saltos de línea (usa [[ecuacion:...]]).', from: t.from, to: t.to });
            }
        }

        if (t.name === 'ecuacion') {
            const content = t.payload;
            if (!content.trim()) {
                issues.push({ type: 'hint', message: '[[ecuacion:...]] está vacío.', from: t.from, to: t.to });
            }
        }
    }

    // Unclosed blocks
    for (const unclosed of stack.reverse()) {
        issues.push({
            type: 'error',
            message: `Bloque sin cerrar: falta "[[/${unclosed.name}]]".`,
            from: unclosed.from,
            to: Math.min(unclosed.from + 2 + unclosed.name.length + 2, str.length),
        });
    }

    return issues;
}

export function normalizeOnSave(text: string): string {
    let str = (text ?? '').toString();

    // Normalize newlines
    str = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    const lines = str.split('\n');
    const out: string[] = [];

    const isListItem = (line: string) => /^\s*([-*•])\s+/.test(line);
    const isTagStartLine = (line: string) => /^\s*\[\[(caja|alerta|info|destacado|figura|tabla|ecuacion)(:|\]\])/.test(line.trim().toLowerCase());

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trimEnd();

        // Collapse blank lines between list items
        if (trimmed.trim() === '' && out.length > 0) {
            const prev = out[out.length - 1];
            const next = lines[i + 1] ?? '';
            if (isListItem(prev) && isListItem(next)) {
                continue;
            }
        }

        out.push(trimmed);
    }

    // Ensure separation between a list and a following tag/block/ref
    const out2: string[] = [];
    for (let i = 0; i < out.length; i++) {
        const line = out[i];
        const prev = out2[out2.length - 1] ?? '';

        if (isTagStartLine(line) && isListItem(prev)) {
            // Insert a blank line if not already present
            if (prev.trim() !== '') {
                out2.push('');
            }
        }

        out2.push(line);
    }

    // Collapse 3+ blank lines into max 2
    let normalized = out2.join('\n');
    normalized = normalized.replace(/\n{3,}/g, '\n\n');

    return normalized.trim();
}
