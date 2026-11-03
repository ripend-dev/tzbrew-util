(function () {
  'use strict';
  if (window.__sledujtetoRemoteInstalled) return;
  window.__sledujtetoRemoteInstalled = true;

  var selector = 'a[href],button,input:not([type="hidden"]),select,textarea,' +
    '[role="button"],[role="link"],[role="checkbox"],[role="radio"],' +
    '[role="tab"],[role="menuitem"],[tabindex]:not([tabindex="-1"])';
  var current = null;
  var marker = 'sledujteto-tv-focus';
  var style = document.createElement('style');
  style.textContent = '.' + marker + '{outline:4px solid #00bfff !important;' +
    'outline-offset:3px !important;box-shadow:0 0 10px #00bfff !important;}';
  (document.head || document.documentElement).appendChild(style);

  function visible(el) {
    if (!el || !document.documentElement.contains(el) || el.disabled ||
        el.getAttribute('aria-disabled') === 'true' || el.closest('[inert],[aria-hidden="true"]')) return false;
    var r = el.getBoundingClientRect();
    var s = window.getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== 'none' &&
      s.visibility !== 'hidden' && s.visibility !== 'collapse' && Number(s.opacity) !== 0;
  }

  function editable(el) {
    if (!el || !el.tagName) return false;
    var tag = el.tagName.toLowerCase();
    return tag === 'textarea' || tag === 'select' || el.isContentEditable ||
      (tag === 'input' && !/^(button|submit|reset|checkbox|radio|file|image)$/i.test(el.type));
  }

  function fullscreen() {
    return document.fullscreenElement || document.webkitFullscreenElement ||
      document.webkitCurrentFullScreenElement;
  }

  function playerTarget(el) {
    if (!el || !el.tagName) return false;
    return /^(VIDEO|AUDIO|IFRAME)$/.test(el.tagName) ||
      !!el.closest('[role="slider"], video, audio');
  }

  function setFocus(el) {
    if (current && current.classList) current.classList.remove(marker);
    current = el;
    if (!el) return;
    el.classList.add(marker);
    try { el.focus({ preventScroll: true }); } catch (ignore) { try { el.focus(); } catch (ignore2) {} }
    try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    catch (ignore3) { try { el.scrollIntoView(false); } catch (ignore4) {} }
  }

  document.addEventListener('focusin', function (event) {
    if (visible(event.target) && event.target.matches(selector)) {
      if (current !== event.target) setFocus(event.target);
    }
  }, false);

  function rectangle(el) { return el.getBoundingClientRect(); }
  function navigate(dx, dy) {
    var all = document.querySelectorAll(selector);
    var active = document.activeElement;
    var from = visible(active) && active.matches(selector) ? active : (visible(current) ? current : null);
    var origin = from ? rectangle(from) : null;
    var ox = origin ? (origin.left + origin.right) / 2 : window.innerWidth / 2;
    var oy = origin ? (origin.top + origin.bottom) / 2 : window.innerHeight / 2;
    var best = null, bestScore = Infinity;
    for (var i = 0; i < all.length; i++) {
      var el = all[i];

      if (el === from || !visible(el)) continue;
      var r = rectangle(el);
      var x = (r.left + r.right) / 2 - ox;
      var y = (r.top + r.bottom) / 2 - oy;

      if (!from && (r.bottom <= 0 || r.right <= 0 || r.top >= window.innerHeight || r.left >= window.innerWidth)) continue;

      var primary = dx ? x * dx : y * dy;
      var cross = Math.abs(dx ? y : x);
      if (from && primary <= 1) continue;
      var score = from ? primary + cross * 2 + cross * cross / Math.max(primary, 1) : x * x + y * y;
      if (score < bestScore) { best = el; bestScore = score; }
    }

    if (best) { setFocus(best); return true; }
    var beforeX = window.pageXOffset, beforeY = window.pageYOffset;
    window.scrollBy(dx * Math.round(window.innerWidth * 0.6), dy * Math.round(window.innerHeight * 0.6));
    return beforeX !== window.pageXOffset || beforeY !== window.pageYOffset;
  }

  function video() {
    var list = document.querySelectorAll('video');
    var fallback = null;

    for (var i = 0; i < list.length; i++) {
      if (!list[i].paused && !list[i].ended) return list[i];
      if (!fallback && visible(list[i])) fallback = list[i];
    }

    return fallback;
  }

  function media(key) {
    var v = video();
    if (!v) return false;

    try {
      if (key === 415 || key === 10252) {
        if (key === 10252 && !v.paused) v.pause();

        else { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      } else if (key === 19 || key === 413) v.pause();
      else if (key === 417 || key === 412) {
        if (!isFinite(v.duration) || !v.seekable || !v.seekable.length) return false;
        var low = v.seekable.start(0), high = v.seekable.end(v.seekable.length - 1);
        v.currentTime = Math.max(low, Math.min(high, v.currentTime + (key === 417 ? 10 : -10)));
      } else return false;

      return true;
    } catch (ignore) { return false; }
  }

  document.addEventListener('keydown', function (event) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    var key = event.keyCode || event.which;
    var active = document.activeElement;
    if (editable(active) || playerTarget(active) || fullscreen()) return;
    if (key >= 37 && key <= 40) {
      if (navigate(key === 37 ? -1 : key === 39 ? 1 : 0, key === 38 ? -1 : key === 40 ? 1 : 0)) event.preventDefault();
      return;
    }

    if (key === 13) {
      var el = visible(active) && active.matches(selector) ? active : (visible(current) ? current : null);
      if (el && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) {
        el.click(); event.preventDefault();
      }

      return;
    }

    if (media(key)) event.preventDefault();
  }, false);
}());
