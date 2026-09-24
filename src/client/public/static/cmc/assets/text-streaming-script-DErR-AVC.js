import{i as r}from"./inject-script-C1W2ijd5.js";const a=`
<style id="text-streaming-hide">
  body { visibility: hidden; }
</style>
<script>
  requestAnimationFrame(function() {
    document.body.style.visibility = 'visible';
  });
<\/script>
`,o="['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG']",d="['STRONG', 'EM', 'B', 'I', 'U', 'S', 'SPAN', 'A', 'CODE', 'MARK', 'SUB', 'SUP', 'SMALL']";function l(){return`
  var SKIP_ELEMENTS = ${o};
  var INLINE_ELEMENTS = ${d};
  var slotCounter = 0;
  var textSlots = [];
  var isStreaming = false;
  var containerIds = [];

  function generateSlotId() {
    slotCounter++;
    return 'slot-' + slotCounter + '-' + Date.now().toString(36);
  }

  function findTextContainer(el) {
    var current = el;
    while (current && current !== document.body) {
      if (current.id && current.id.indexOf('slot-') !== 0) return current;
      if (INLINE_ELEMENTS.indexOf(current.tagName) === -1) return current;
      current = current.parentElement;
    }
    return el;
  }
`}function s(){return`
  function discoverTextNodes() {
    var walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          var text = (node.textContent || '').trim();
          if (text.length === 0) return NodeFilter.FILTER_REJECT;
          var parent = node.parentElement;
          while (parent) {
            if (SKIP_ELEMENTS.indexOf(parent.tagName) !== -1) return NodeFilter.FILTER_REJECT;
            parent = parent.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    var textNodes = [];
    var node;
    while ((node = walker.nextNode())) textNodes.push(node);
    
    var processedContainers = new Set();
    var order = 0;
    
    for (var i = 0; i < textNodes.length; i++) {
      var textNode = textNodes[i];
      var trimmedText = (textNode.textContent || '').trim();
      if (trimmedText.length === 0) continue;
      
      var originalText = textNode.textContent || '';
      var parent = textNode.parentElement;
      if (!parent) continue;
      
      var container = findTextContainer(parent);
      if (!container.id) {
        container.id = generateSlotId();
        containerIds.push(container.id);
      }
      
      if (parent.id && parent.id.indexOf('slot-') === 0) continue;
      if (parent.classList && parent.classList.contains('text-slot')) continue;
      
      var id = generateSlotId();
      var hasOnlyText = parent.childNodes.length === 1 && parent.firstChild === textNode;
      
      if (hasOnlyText) {
        // Preserve original ID if it exists and isn't a slot-* ID
        if (parent.id && parent.id.indexOf('slot-') !== 0) {
          parent.setAttribute('data-original-id', parent.id);
        }
        parent.id = id;
        parent.setAttribute('data-original-text', originalText);
        textNode.textContent = '';
        textSlots.push({ id: id, text: originalText, order: order++ });
      } else {
        var wrapper = document.createElement('span');
        wrapper.id = id;
        wrapper.className = 'text-slot';
        wrapper.setAttribute('data-original-text', originalText);
        textNode.parentNode.replaceChild(wrapper, textNode);
        textSlots.push({ id: id, text: originalText, order: order++ });
      }
    }
    return textSlots;
  }
`}function c(){return`
  function clearAllText() {
    for (var i = 0; i < textSlots.length; i++) {
      var el = document.getElementById(textSlots[i].id);
      if (el) el.textContent = '';
    }
  }

  function unwrapTextSlots() {
    for (var i = 0; i < textSlots.length; i++) {
      var el = document.getElementById(textSlots[i].id);
      if (!el) continue;
      
      var isWrapperSpan = el.tagName === 'SPAN' && el.classList.contains('text-slot');
      // Use data-original-text if available (for when enableEditing is called before streaming),
      // otherwise use current textContent (for when streaming has filled in the text)
      var originalText = el.getAttribute('data-original-text');
      var textToRestore = originalText || el.textContent || '';
      
      if (isWrapperSpan) {
        var textNode = document.createTextNode(textToRestore);
        el.parentNode.replaceChild(textNode, el);
      } else {
        // Restore text content if it was cleared
        if (originalText && !el.textContent) {
          el.textContent = originalText;
        }
        var isContainer = containerIds.indexOf(el.id) !== -1;
        if (isContainer) {
          el.removeAttribute('data-original-text');
        } else {
          // Restore original ID if one was preserved, otherwise remove the generated slot-* ID
          var originalId = el.getAttribute('data-original-id');
          if (originalId) {
            el.id = originalId;
            el.removeAttribute('data-original-id');
          } else if (el.id.indexOf('slot-') === 0) {
            el.removeAttribute('id');
          }
          el.removeAttribute('data-original-text');
        }
      }
    }
  }

  function enableEditing() {
    unwrapTextSlots();
    // Notify element selection script to reinitialize handlers on restored elements
    window.postMessage({ type: 'reinitialize_elements' }, '*');
  }
`}function u(){return`
  window.addEventListener('message', function(e) {
    if (!e.data) return;
    var msgType = e.data.type;
    
    if (msgType === 'replace_text' && e.data.id) {
      var element = document.getElementById(e.data.id);
      if (element) element.textContent = e.data.newText || '';
      return;
    }
    
    if (msgType === 'start_streaming') {
      isStreaming = true;
      clearAllText();
      return;
    }
    
    if (msgType === 'end_streaming') {
      isStreaming = false;
      enableEditing();
      return;
    }
    
    if (msgType === 'enable_editing') {
      enableEditing();
      return;
    }
  });
`}function x(){return`
  function init() {
    var slots = discoverTextNodes();
    window.parent.postMessage({ type: 'text_slots_discovered', slots: slots }, '*');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
`}const p=`
(function() {
${l()}
${s()}
${c()}
${u()}
${x()}
})();
`,i="/* text-streaming-script-v1 */";function g(t){if(t.includes(i))return t;let e=t;const n=e.match(/<head[^>]*>/i);return n&&(e=e.replace(n[0],`${n[0]}${a}`)),r(e,i+p)}export{g as i};
