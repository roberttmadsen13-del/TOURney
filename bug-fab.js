// Owner-only floating bug-log button. Included on every page across all
// tourney.greenskeeper.studio properties. Self-contained: loads supabase
// only if absent. Auth-gated to ALLOWED list. Captures location.href.
// v6 — modal content opacity +10% (rgba 0.55→0.65); modal overlay 0.28→0.38.
(function () {
  console.log('[bug-fab] v6 loaded');
  const ALLOWED = ['robert.t.madsen13@gmail.com', 'jmalber2021@gmail.com'];
  const SUPABASE_URL = 'https://jllugkiojeoopitdvzsa.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_DnBMNLaSu61ykJ6P_fI2fw_D9DdAScn';

  function ensureSupabase(cb) {
    if (window.supabase && window.supabase.createClient) return cb();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.105.3/dist/umd/supabase.min.js';
    s.onload = cb;
    s.onerror = () => {};
    document.head.appendChild(s);
  }

  function inject(db, email) {
    if (document.getElementById('globalBugFab')) return;

    const css = document.createElement('style');
    css.textContent = `
      .gb-fab{position:fixed;bottom:2rem;right:2rem;width:56px;height:56px;border-radius:50%;background:rgba(200,80,60,0.85);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.6rem;box-shadow:0 4px 16px rgba(200,80,60,0.4);cursor:pointer;z-index:10001;transition:all .2s;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.15);}
      .gb-fab:hover{transform:scale(1.05);background:rgba(220,90,70,0.95);}
      .gb-modal{position:fixed;inset:0;background:rgba(0,0,0,0.38);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);z-index:10002;display:none;align-items:flex-start;justify-content:center;padding:.5rem;overflow-y:auto;-webkit-overflow-scrolling:touch;}
      .gb-content{background:rgba(20,15,10,0.65);border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:.85rem;width:100%;max-width:440px;box-shadow:0 12px 40px rgba(0,0,0,0.5);display:flex;flex-direction:column;gap:.55rem;margin:auto;}
      .gb-hdr{display:flex;justify-content:space-between;align-items:center;color:rgba(255,255,255,0.8);font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;font-weight:700;letter-spacing:.12em;font-size:.85rem;}
      .gb-close{background:rgba(255,255,255,0.06);border:none;border-radius:50%;width:24px;height:24px;color:rgba(255,255,255,0.7);font-size:.8rem;cursor:pointer;display:flex;align-items:center;justify-content:center;}
      .gb-input{background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.12);color:#fff;padding:.6rem .8rem;font-family:'Barlow',sans-serif;font-size:.95rem;border-radius:10px;outline:none;}
      .gb-input:focus{border-color:rgba(200,80,60,0.7);background:rgba(0,0,0,0.75);}
      .gb-input::placeholder{color:rgba(255,255,255,0.35);}
      .gb-ta{min-height:64px;resize:vertical;}
      .gb-btn{background:rgba(200,80,60,0.55);color:#fff;border:1px solid rgba(200,80,60,0.4);padding:.55rem;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:.8rem;letter-spacing:.12em;text-transform:uppercase;border-radius:10px;cursor:pointer;backdrop-filter:blur(4px);}
      .gb-url{font-family:'DM Mono',monospace;font-size:.5rem;color:rgba(255,255,255,0.35);letter-spacing:.05em;word-break:break-all;}
    `;
    document.head.appendChild(css);

    const fab = document.createElement('div');
    fab.id = 'globalBugFab';
    fab.className = 'gb-fab';
    fab.innerHTML = '🐛';
    document.body.appendChild(fab);

    const modal = document.createElement('div');
    modal.className = 'gb-modal';
    modal.innerHTML = `
      <div class="gb-content" onclick="event.stopPropagation()">
        <div class="gb-hdr"><span>Log Bug / Note</span><button class="gb-close" type="button">✕</button></div>
        <div class="gb-url" id="gbUrl"></div>
        <input type="text" id="gbTitle" class="gb-input" placeholder="Title">
        <textarea id="gbDesc" class="gb-input gb-ta" placeholder="Description, repro steps..."></textarea>
        <div id="gbImgArea"></div>
        <button type="button" id="gbAddImg" style="background:rgba(255,255,255,0.04);padding:.35rem .7rem;border-radius:6px;font-family:'DM Mono',monospace;font-size:.55rem;color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.08);text-transform:uppercase;letter-spacing:.1em;cursor:pointer;">+ Screenshot</button>
        <button class="gb-btn" id="gbSubmitBtn" type="button">Save to Bug Log</button>
      </div>`;
    document.body.appendChild(modal);

    fab.onclick = () => {
      document.getElementById('gbUrl').textContent = location.href;
      modal.style.display = 'flex';
      const title = document.getElementById('gbTitle');
      title.focus();
      setTimeout(() => title.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250);
    };
    modal.onclick = () => { modal.style.display = 'none'; };
    modal.querySelector('.gb-close').onclick = (e) => { e.stopPropagation(); modal.style.display = 'none'; };

    const imgSlots = [];
    const imgArea = document.getElementById('gbImgArea');
    const addImgBtn = document.getElementById('gbAddImg');
    function addImgSlot() {
      if (imgSlots.length >= 3) { addImgBtn.style.display = 'none'; return; }
      const slot = document.createElement('div');
      slot.style.cssText = 'display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem;';
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.style.cssText = 'font-family:\'DM Mono\',monospace;font-size:.52rem;color:rgba(255,255,255,0.6);flex:1;background:none;border:none;';
      const thumb = document.createElement('img');
      thumb.style.cssText = 'max-height:40px;border-radius:4px;display:none;border:1px solid rgba(255,255,255,0.1);';
      const rm = document.createElement('button');
      rm.type = 'button'; rm.textContent = '✕';
      rm.style.cssText = 'background:none;border:none;color:rgba(255,255,255,0.4);cursor:pointer;font-size:.8rem;flex-shrink:0;';
      const slotData = { data: null };
      imgSlots.push(slotData);
      inp.onchange = () => {
        const f = inp.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = (ev) => { slotData.data = ev.target.result; thumb.src = slotData.data; thumb.style.display = 'block'; };
        r.readAsDataURL(f);
      };
      rm.onclick = () => {
        imgSlots.splice(imgSlots.indexOf(slotData), 1);
        slot.remove();
        if (imgSlots.length < 3) addImgBtn.style.display = '';
      };
      slot.appendChild(inp); slot.appendChild(thumb); slot.appendChild(rm);
      imgArea.appendChild(slot);
      if (imgSlots.length >= 3) addImgBtn.style.display = 'none';
    }
    addImgBtn.onclick = addImgSlot;

    const submitBtn = document.getElementById('gbSubmitBtn');
    submitBtn.onclick = async () => {
      const t = document.getElementById('gbTitle').value.trim();
      const d = document.getElementById('gbDesc').value.trim();
      if (!t && !d) return;
      const origLabel = submitBtn.textContent;
      submitBtn.textContent = 'Saving…';
      submitBtn.disabled = true;
      const { error } = await db.from('platform_bugs').insert({
        email: email,
        title: t || null,
        description: d || null,
        url: location.href,
        image_data: imgSlots[0]?.data || null,
        image_data_2: imgSlots[1]?.data || null,
        image_data_3: imgSlots[2]?.data || null,
        status: 'open'
      });
      submitBtn.disabled = false;
      if (error) {
        submitBtn.textContent = 'Error — try again';
        console.error('platform_bugs insert error:', error);
        setTimeout(() => { submitBtn.textContent = origLabel; }, 2500);
        return;
      }
      submitBtn.textContent = '✓ Saved';
      setTimeout(() => {
        submitBtn.textContent = origLabel;
        document.getElementById('gbTitle').value = '';
        document.getElementById('gbDesc').value = '';
        imgSlots.length = 0;
        imgArea.innerHTML = '';
        addImgBtn.style.display = '';
        modal.style.display = 'none';
      }, 600);
    };
  }

  function start() {
    ensureSupabase(() => {
      if (!window.supabase || !window.supabase.createClient) return;
      const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true } });
      db.auth.getSession().then(({ data }) => {
        const email = data?.session?.user?.email?.toLowerCase();
        if (!email || !ALLOWED.includes(email)) return;
        const run = () => inject(db, email);
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', run);
        } else {
          run();
        }
      });
    });
  }

  start();
})();
