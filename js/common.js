/* 共用工具：时间、转义、slip 渲染、打印 */
window.SK = (function () {
  const pad = n => String(n).padStart(2, '0');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const todayStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const nowStamp = (d = new Date()) => `${todayStr(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

  const FIELDS = [
    ['form', 'Form'], ['classNo', 'Class No'], ['shouldSee', 'Should see'],
    ['date', 'Date'], ['time', 'Time'], ['room', 'Room'], ['remark', 'Remark']
  ];

  function schoolName() {
    return (DB.state.settings && DB.state.settings.schoolName)
      || (window.APP_CONFIG && APP_CONFIG.DEFAULT_SCHOOL_NAME)
      || 'SCHOOL NAME';
  }

  function slipHTML(a, printedAt) {
    const rows = FIELDS.map(([k, label]) => {
      const v = esc(a[k]);
      const inner = k === 'remark' ? `<div class="rmk">${v || '&nbsp;'}</div>` : (v || '&nbsp;');
      return `<tr><th>${label}:</th><td>${inner}</td></tr>`;
    }).join('');
    return `<div class="slip">
      <div class="slip-school">${esc(schoolName())}</div>
      <div class="slip-title">Appointment Slip</div>
      <table class="slip-fields">${rows}</table>
      <div class="slip-printed">Printed at ${printedAt}</div>
    </div>`;
  }

  function print(items) {
    if (!items.length) { toast('没有可列印的项目'); return; }
    const root = document.getElementById('print-root');
    const at = nowStamp();                    // ← 打印时间：按下列印的一刻
    root.innerHTML = items.map(a => slipHTML(a, at)).join('');
    setTimeout(() => window.print(), 150);
    let done = false;
    const clean = () => { if (!done) { done = true; root.innerHTML = ''; } };
    window.addEventListener('afterprint', clean, { once: true });
    setTimeout(clean, 30000);
  }

  let toastTimer;
  function toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.hidden = false;
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* Excel 值规范化 */
  function normalizeDate(v) {
    if (v == null || v === '') return '';
    if (v instanceof Date && !isNaN(v)) return todayStr(v);
    const s = String(v).trim();
    if (/^\d{5}(\.\d+)?$/.test(s)) {                        // Excel 日期序号
      const d = new Date(Date.UTC(1899, 11, 30) + parseFloat(s) * 864e5);
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    }
    let m = s.match(/^(\d{4})[\/\-.年](\d{1,2})[\/\-.月](\d{1,2})/);
    if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
    m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if (m) {
      const a = +m[1], b = +m[2];
      const y = m[3].length === 2 ? '20' + m[3] : m[3];
      const swap = a > 12 && b <= 12;
      return `${y}-${pad(swap ? b : a)}-${pad(swap ? a : b)}`;
    }
    const d = new Date(s);
    return isNaN(d) ? s : todayStr(d);
  }
  function normalizeTime(v) {
    if (v == null || v === '') return '';
    if (v instanceof Date && !isNaN(v)) return `${pad(v.getHours())}:${pad(v.getMinutes())}`;
    const s = String(v).trim();
    let m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([apAP][mM])?/);
    if (m) {
      let h = +m[1]; const ap = (m[3] || '').toLowerCase();
      if (ap === 'pm' && h < 12) h += 12;
      if (ap === 'am' && h === 12) h = 0;
      return `${pad(h)}:${m[2]}`;
    }
    m = s.match(/^(\d{3,4})$/);
    if (m) { const t = m[1].padStart(4, '0'); return `${t.slice(0, 2)}:${t.slice(2)}`; }
    return s;
  }

  return { pad, esc, todayStr, nowStamp, FIELDS, schoolName, slipHTML, print, toast, normalizeDate, normalizeTime };
})();
