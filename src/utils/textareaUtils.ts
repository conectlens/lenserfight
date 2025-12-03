
/**
 * Calculates the {top, left} coordinates of the caret in a textarea.
 * Used for positioning floating menus like mention autocomplete.
 */
export const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
  const {
    value,
    selectionStart,
    selectionEnd,
    style,
    scrollTop,
    scrollLeft,
    clientHeight,
    clientWidth,
  } = element;

  // Mirror div creation
  const div = document.createElement('div');
  const copyStyle = getComputedStyle(element);

  for (const prop of [
    'direction',
    'boxSizing',
    'width',
    'height',
    'overflowX',
    'overflowY',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderStyle',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
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
    'textDecoration',
    'letterSpacing',
    'wordSpacing',
    'tabSize',
    'MozTabSize',
  ]) {
    // @ts-ignore
    div.style[prop] = copyStyle[prop];
  }

  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.top = '0';
  div.style.left = '0';
  
  // Create a span for the text up to the caret
  const textContent = value.substring(0, position);
  div.textContent = textContent;
  
  const span = document.createElement('span');
  span.textContent = value.substring(position) || '.'; // Ensure height
  div.appendChild(span);

  document.body.appendChild(div);

  const spanOffset = {
    top: span.offsetTop + parseInt(copyStyle.borderTopWidth),
    left: span.offsetLeft + parseInt(copyStyle.borderLeftWidth),
    height: parseInt(copyStyle.lineHeight)
  };

  document.body.removeChild(div);

  return {
    top: spanOffset.top - scrollTop,
    left: spanOffset.left - scrollLeft,
    height: spanOffset.height
  };
};
