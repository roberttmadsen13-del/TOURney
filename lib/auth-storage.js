// Shared Supabase auth storage adapter.
// Writes to BOTH a parent-domain cookie AND localStorage; reads prefer cookie.
//
// Why cookies as primary store:
//   - iOS Safari Private Browsing wipes localStorage on tab close, keeps cookies for tab lifetime.
//   - iOS in-app webviews (iMessage/Slack/etc.) get their own localStorage that dies when the webview closes;
//     a Domain=.greenskeeper.studio cookie survives the hop to Safari proper as long as the device kept it.
//   - Cookies scoped to .greenskeeper.studio share across apex + every tenant subdomain (single session).
//   - Apple's ITP gives first-party auth cookies a longer retention than client-written localStorage.
//
// localStorage stays as a fallback so existing signed-in users don't get bounced on first load after deploy.
//
// Usage:
//   <script src="/lib/auth-storage.js"></script>  // BEFORE supabase-js
//   const sb = supabase.createClient(URL, KEY, { auth: { storage: window.gksAuthStorage, persistSession: true, autoRefreshToken: true }});
(function(){
  var DOMAIN = '.greenskeeper.studio';
  var MAX_AGE = 60 * 60 * 24 * 30; // 30 days
  // On localhost (dev) skip the Domain attribute — browsers reject Domain= for IP/localhost.
  var isLocal = /^(localhost|127\.|\[::1\])/.test(location.hostname);
  var COOKIE_TAIL = '; Path=/; Max-Age=' + MAX_AGE + '; Secure; SameSite=Lax' + (isLocal ? '' : '; Domain=' + DOMAIN);
  var DEL_TAIL    = '; Path=/; Max-Age=0; Secure; SameSite=Lax' + (isLocal ? '' : '; Domain=' + DOMAIN);

  function readCookie(name){
    var prefix = name + '=';
    var parts = document.cookie ? document.cookie.split('; ') : [];
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].indexOf(prefix) === 0) {
        try { return decodeURIComponent(parts[i].slice(prefix.length)); } catch { return parts[i].slice(prefix.length); }
      }
    }
    return null;
  }
  function writeCookie(name, value){
    // RFC 6265: cookie value ≤ 4093 bytes safe. Supabase session ~1.5KB. OK.
    try {
      document.cookie = name + '=' + encodeURIComponent(value) + COOKIE_TAIL;
    } catch (e) { /* swallow — third-party cookie blockers may reject */ }
  }
  function deleteCookie(name){
    try { document.cookie = name + '=' + DEL_TAIL; } catch {}
  }
  function lsGet(k){ try { return localStorage.getItem(k); } catch { return null; } }
  function lsSet(k,v){ try { localStorage.setItem(k,v); } catch {} }
  function lsDel(k){ try { localStorage.removeItem(k); } catch {} }

  window.gksAuthStorage = {
    getItem: function(key){
      var c = readCookie(key);
      if (c !== null) return c;
      var ls = lsGet(key);
      if (ls !== null) {
        // Migrate legacy localStorage-only sessions into the cookie so subsequent reads survive storage purges.
        writeCookie(key, ls);
      }
      return ls;
    },
    setItem: function(key, value){
      writeCookie(key, value);
      lsSet(key, value);
    },
    removeItem: function(key){
      deleteCookie(key);
      lsDel(key);
    }
  };
})();
