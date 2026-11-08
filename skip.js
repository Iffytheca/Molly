// Owner-only level skips. Turn on once by opening the game with ?dev=emily-owner-4
// (remembered in this browser only). Turn off with ?dev=off.
// Keys (owner only): Shift+1..4 = jump to level 1..4, Shift+5 = ending. Buttons also shown top-left.
(function () {
  var KEY = 'molly_owner', PASS = 'emily-owner-4', on = false;
  try {
    var m = /[?&]dev=([^&]*)/.exec(location.search);
    if (m) {
      if (decodeURIComponent(m[1]) === PASS) localStorage.setItem(KEY, '1');
      else if (m[1] === 'off') localStorage.removeItem(KEY);
    }
    on = localStorage.getItem(KEY) === '1';
  } catch (e) {}
  if (!on) return;
  function jump(n) {
    if (!window.G) return;
    try { G.hideAll && G.hideAll(); } catch (e) {}
    if (n === 5) G.startScene('ending'); else G.goLevel(n);
  }
  var box = document.createElement('div');
  box.style.cssText = 'position:fixed;top:6px;left:6px;z-index:99999;display:flex;gap:4px;opacity:.55;font:12px sans-serif';
  [1, 2, 3, 4, 5].forEach(function (n) {
    var b = document.createElement('button');
    b.textContent = n === 5 ? 'End' : 'L' + n;
    b.style.cssText = 'padding:3px 7px;cursor:pointer';
    b.onclick = function (e) { e.stopPropagation(); jump(n); };
    box.appendChild(b);
  });
  document.body.appendChild(box);
  addEventListener('keydown', function (e) {
    if (e.shiftKey && e.code >= 'Digit1' && e.code <= 'Digit5') jump(+e.code.slice(5));
  });
})();
