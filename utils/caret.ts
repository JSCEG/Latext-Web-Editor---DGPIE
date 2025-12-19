// Port of textarea-caret to TypeScript/modern utils
// We need to mirror the textarea properties to a hidden div to calculate the pixel coordinates of the cursor.

const properties = [
  'direction',  // RTL support
  'boxSizing',
  'width',  // on Chrome and IE, exclude the scrollbar, so the mirror div wraps exactly as the textarea does
  'height',
  'overflowX',
  'overflowY',  // copy the scrollbar for IE

  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',

  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',

  // https://developer.mozilla.org/en-US/docs/Web/CSS/font
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',

  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',  // might not make a difference, but better be safe

  'letterSpacing',
  'wordSpacing',

  'tabSize',
  'MozTabSize'

] as const;

const isBrowser = typeof window !== 'undefined';
const isFirefox = isBrowser && (window as any).mozInnerScreenX != null;

export function getCaretCoordinates(element: HTMLTextAreaElement | HTMLInputElement, position: number, options?: { debug?: boolean }) {
  if (!isBrowser) {
    throw new Error('getCaretCoordinates should only be called in a browser');
  }

  const debug = options && options.debug || false;
  if (debug) {
    const el = document.querySelector('#input-textarea-caret-position-mirror-div');
    if (el) el.parentNode?.removeChild(el);
  }

  // The mirror div will replicate the textarea's style
  const div = document.createElement('div');
  div.id = 'input-textarea-caret-position-mirror-div';
  document.body.appendChild(div);

  const style = div.style;
  const computed = window.getComputedStyle(element);

  // Default textarea styles
  style.whiteSpace = 'pre-wrap';
  if (element.nodeName !== 'INPUT')
    style.wordWrap = 'break-word';  // only for textarea-s

  // Position off-screen
  style.position = 'absolute';  // required to return coordinates properly
  if (!debug)
    style.visibility = 'hidden';  // not 'display: none' because we want rendering

  // Transfer the element's properties to the div
  properties.forEach(function (prop) {
    if (isFirefox && prop === 'boxSizing') {
       // Firefox fails to copy boxSizing properly in some cases
       // but we can assume border-box if not set? 
       // actually let's just copy it.
    }
    style[prop as any] = computed[prop as any];
  });

  if (isFirefox) {
    // Firefox lies about the overflow property for textareas: it's always 'scroll' even if hidden
    if (element.scrollHeight > parseInt(computed.height))
      style.overflowY = 'scroll';
  } else {
    style.overflow = 'hidden';  // for Chrome to not render a scrollbar; IE keeps overflowY = 'scroll'
  }

  div.textContent = element.value.substring(0, position);
  // The second special handling for input type="text" vs textarea:
  // spaces need to be replaced with non-breaking spaces - http://stackoverflow.com/a/13402035/1269037
  if (element.nodeName === 'INPUT')
    div.textContent = div.textContent.replace(/\s/g, '\u00a0');

  const span = document.createElement('span');
  // Wrapping must be replicated *exactly*, including when a long word gets
  // onto the next line, with whitespace at the end of the line...
  // So  we need to insert a span to measure the cursor position
  span.textContent = element.value.substring(position) || '.';  // || '.' so the span has at least 1 char width/height
  div.appendChild(span);

  const coordinates = {
    top: span.offsetTop + parseInt(computed['borderTopWidth']),
    left: span.offsetLeft + parseInt(computed['borderLeftWidth']),
    height: parseInt(computed['lineHeight'])
  };

  if (debug) {
    span.style.backgroundColor = '#aaa';
  } else {
    document.body.removeChild(div);
  }

  return coordinates;
}
