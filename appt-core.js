/* =========================================================
   APPT Core v3.1 — 防呆版 (No Password)
   ========================================================= */
window.APPT = (function () {
  'use strict';
  // 防呆：如果 config.js 沒載入，使用預設值
  const CFG = window.APPT_CONFIG || { 
    firebase: {}, root: 'appt', 
    school: { zh: '', en: 'SCHOOL' }, logo: '', 
    paper: { width: '80mm', margin: '2mm', minHeight: '140mm' }, 
    strings: { slipTitle: 'APPOINTMENT SLIP', fName: 'Name', fForm: 'Form', fClassNo: 'Class No.', fShouldSee: 'Should See', fDate: 'Date', fTime: 'Time', fPlace: 'Place', fRemark: 'Remark', issuedAt: 'Issuing Time', footerNote: 'Please arrive on time.' } 
  };

  (function injectCSS(){
    if(document.getElementById('appt_css')) return;
    const s = document.createElement('style');
    s.id = 'appt_css';
    s.textContent = `#printArea{display:none}`;
    document.head.appendChild(s);
  })();

  const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad = (n,l) => String(n).padStart(l,'0');
  const todayStr = () => { const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1,2)}-${pad(d.getDate(),2)}`; };
  const nowLabel = () => { const d=new Date(); return `${todayStr()} ${pad(d.getHours(),2)}:${pad(d.getMinutes(),2)}:${pad(d.getSeconds(),2)}`; };

  let root = null;
  const DB = {
    _init(){ 
      if (typeof firebase === 'undefined') throw new Error('Firebase SDK not loaded');
      root = firebase.database().ref(CFG.root); 
    },
    push(p,o){ return root.child(p).push(o); },
    set(p,v){ return root.child(p).set(v); },
    remove(p){ return root.child(p).remove(); },
    transaction(p,fn){ return root.child(p).transaction(fn); },
    on(p,cb){ root.child(p).on('value', s => cb(s.val())); },
    once(p){ return root.child(p).once('value').then(s => s.val()); }
  };

  async function createRecord(f){
    let no;
    await DB.transaction('seq', c => { no = (c||0)+1; return no; });
    const rec = Object.assign({}, f, { no: (CFG.prefix||'AP')+'-'+pad(no,3), createdAt: Date.now(), issued: nowLabel() });
    await DB.push('records', rec);
    await queuePrint({ type:'appt', rec: rec, copies: f.copies||1 });
    return rec;
  }
  function onRecords(cb){ DB.on('records', v => cb(v||{})); }
  function reprint(rec){ return queuePrint({ type:'appt', rec: rec, copies:1 }); }
  function queuePrint(job){ job.createdAt = job.createdAt||Date.now(); job.done = false; return DB.push('printQueue', job); }

  function slipHTML(r){
    const T = CFG.strings;
    const row = (label,val) => `<tr><th>${label}</th><td>${esc(val)||'—'}</td></tr>`;
    return `<div class="s-page">
      <div class="t-head"><img src="${CFG.logo}" alt="logo"><div>
        <div class="t-school-zh">${esc(CFG.school.en)}</div></div></div>
      <div class="s-title">${T.slipTitle}</div>
      <table class="s-table">
        ${row(T.fName, r.name)}${row(T.fForm, r.form)}${row(T.fClassNo, r.classNo)}
        ${row(T.fShouldSee, r.shouldSee)}${row(T.fDate, r.date)}${row(T.fTime, r.time)}${row(T.fPlace, r.place)}
      </table>
      <div class="s-div"></div>
      <div class="s-remark-label">${T.fRemark}</div>
      <div class="s-remark-text">${esc(r.remark)||'—'}</div>
      <div class="s-foot">${T.footerNote}<br>${T.issuedAt}: ${esc(r.issued)}</div>
    </div>`;
  }

  function init(){
    if (typeof firebase === 'undefined') {
      console.error('❌ Firebase SDK 未載入 (請檢查 HTML 中的 CDN 連結)');
      return;
    }
    try { 
      if (!firebase.apps.length) firebase.initializeApp(CFG.firebase); 
    } catch(e){ console.warn('Firebase init:', e); }
    try { 
      DB._init(); 
    } catch(e) { 
      console.error('❌ DB init error:', e); 
    }
  }

  return { init, createRecord, onRecords, reprint, queuePrint, slipHTML, esc, todayStr, nowLabel, DB, CFG };
})();
