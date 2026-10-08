/* 控制台：单笔录入 / Excel 汇入 / 清单管理 */
(function () {
  const $ = s => document.querySelector(s);
  const F = SK.FIELDS;

  const addForm = $('#addForm');
  const editForm = $('#editForm');
  const schoolInput = $('#schoolInput');
  addForm.elements.date.value = SK.todayStr();

  /* ---- 状态 / 学校名 ---- */
  function setPill() {
    const p = $('#syncPill');
    if (DB.mode === 'cloud') { p.className = 'pill pill-on'; p.innerHTML = '<i class="led"></i>云端同步'; }
    else if (DB.mode === 'connecting') { p.className = 'pill pill-off'; p.innerHTML = '<i class="led"></i>连线中…'; }
    else { p.className = 'pill pill-off'; p.innerHTML = '<i class="led"></i>本机模式'; }
  }
  schoolInput.addEventListener('change', () => {
    DB.setSettings({ schoolName: schoolInput.value.trim() || APP_CONFIG.DEFAULT_SCHOOL_NAME });
  });

  /* ---- 单笔加入 ---- */
  addForm.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(addForm);
    const rec = {};
    F.forEach(([k]) => rec[k] = String(fd.get(k) || '').trim());
    if (!Object.values(rec).some(Boolean)) return SK.toast('请先填写至少一个栏位');
    await DB.add(rec);
    SK.toast('已加入清单 ✓');
    if ($('#keepChk').checked) {
      addForm.elements.form.value = '';
      addForm.elements.classNo.value = '';
      addForm.elements.remark.value = '';
      addForm.elements.form.focus();
    } else {
      addForm.reset();
      addForm.elements.date.value = SK.todayStr();
    }
  });

  /* ---- 清单 ---- */
  const tbody = $('#listBody');
  const dateFilter = $('#dateFilter');
  const searchInput = $('#searchInput');
  const view = { q: '', date: 'all' };
  let lastCount = -1;

  const allItems = () => Object.entries(DB.state.appointments || {}).map(([id, a]) => ({ id, ...a }));
  const byDateTime = (a, b) =>
    String(a.date || '').localeCompare(String(b.date || '')) ||
    String(a.time || '').localeCompare(String(b.time || '')) ||
    (a.createdAt || 0) - (b.createdAt || 0);

  function render() {
    setPill();
    if (document.activeElement !== schoolInput) {
      const s = SK.schoolName();
      if (schoolInput.value !== s) schoolInput.value = s;
    }
    const items = allItems();

    const dates = [...new Set(items.map(i => i.date).filter(Boolean))].sort();
    dateFilter.innerHTML =
      [`<option value="all">全部日期</option>`, `<option value="today">今天</option>`]
        .concat(dates.map(d => `<option value="${SK.esc(d)}">${SK.esc(d)}</option>`)).join('');
    dateFilter.value = [...dateFilter.options].some(o => o.value === view.date) ? view.date : 'all';
    view.date = dateFilter.value;

    let list = items;
    if (view.date === 'today') list = list.filter(i => i.date === SK.todayStr());
    else if (view.date !== 'all') list = list.filter(i => i.date === view.date);
    if (view.q) {
      const q = view.q.toLowerCase();
      list = list.filter(i => F.some(([k]) => String(i[k] || '').toLowerCase().includes(q)));
    }
    list.sort(byDateTime);

    tbody.innerHTML = list.map(i => `<tr data-id="${i.id}">
        ${F.map(([k]) => `<td>${SK.esc(i[k])}</td>`).join('')}
        <td class="rowact">
          <button class="ibtn" data-act="print" title="列印这一张">印</button>
          <button class="ibtn" data-act="edit">编辑</button>
          <button class="ibtn del" data-act="del">删</button>
        </td></tr>`).join('');

    $('#emptyState').style.display = list.length ? 'none' : 'block';
    const badge = $('#countBadge');
    badge.textContent = list.length;
    if (list.length !== lastCount) {
      badge.classList.remove('pop'); void badge.offsetWidth; badge.classList.add('pop');
      lastCount = list.length;
    }
    const todayN = items.filter(i => i.date === SK.todayStr()).length;
    $('#statLine').textContent = `共 ${items.length} 笔 · 今天 ${todayN} 笔`;
  }

  searchInput.addEventListener('input', () => { view.q = searchInput.value.trim(); render(); });
  dateFilter.addEventListener('change', () => { view.date = dateFilter.value; render(); });

  tbody.addEventListener('click', async e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.closest('tr').dataset.id;
    const rec = DB.state.appointments[id];
    if (!rec) return;
    if (btn.dataset.act === 'del') {
      if (confirm(`删除这笔预约？\n${[rec.form, rec.classNo, rec.shouldSee].filter(Boolean).join(' / ')}`)) {
        await DB.remove(id); SK.toast('已删除');
      }
    } else if (btn.dataset.act === 'print') {
      SK.print([rec]);
    } else {
      F.forEach(([k]) => { editForm.elements[k].value = rec[k] || ''; });
      editForm.dataset.id = id;
      $('#editOverlay').hidden = false;
      editForm.elements.form.focus();
    }
  });

  $('#editCancel').addEventListener('click', () => $('#editOverlay').hidden = true);
  $('#editOverlay').addEventListener('click', e => { if (e.target === $('#editOverlay')) $('#editOverlay').hidden = true; });
  editForm.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(editForm);
    const patch = {};
    F.forEach(([k]) => patch[k] = String(fd.get(k) || '').trim());
    await DB.update(editForm.dataset.id, patch);
    $('#editOverlay').hidden = true;
    SK.toast('已保存 ✓');
  });

  $('#clearAll').addEventListener('click', async () => {
    const n = Object.keys(DB.state.appointments || {}).length;
    if (!n) return SK.toast('清单已经是空的');
    if (confirm(`确定清空全部 ${n} 笔预约？无法还原。`)) { await DB.clearAll(); SK.toast('已清空'); }
  });

  /* ---- Excel 汇入 ---- */
  const dz = $('#dropzone'), fileInput = $('#fileInput');
  let importRows = [], importHeaders = [];

  const ALIASES = {
    form: ['form', 'grade', 'level', '年级', '班級', '年級'],
    classNo: ['class no', 'classno', 'class no.', 'class number', 'class', '座號', '座号', '學號', '学号', '班別', '班別', '班号'],
    shouldSee: ['should see', 'shouldsee', 'teacher', 'staff', '面見', '面见', '面見老師', '导师', '教師', '面谈对象', '会见'],
    date: ['date', '日期', 'day'],
    time: ['time', '時間', '时间'],
    room: ['room', 'room no', 'location', '房間', '房间', '地點', '地点', '室'],
    remark: ['remark', 'remarks', 'note', 'notes', '備註', '备注', '說明']
  };
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '');
  function guess(header) {
    const h = norm(header);
    if (!h) return '';
    for (const [k, list] of Object.entries(ALIASES))
      if (list.some(a => norm(a) === h)) return k;
    for (const [k, list] of Object.entries(ALIASES))
      if (list.some(a => norm(a) && (h.includes(norm(a)) || norm(a).includes(h)))) return k;
    return '';
  }

  dz.addEventListener('click', () => fileInput.click());
  ['dragover', 'dragenter'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('over'); }));
  dz.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) handleFile(f); });
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); fileInput.value = ''; });

  async function handleFile(file) {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
      const hi = rows.findIndex(r => r.some(c => String(c).trim() !== ''));
      if (hi < 0) throw new Error('找不到标题行');
      importHeaders = rows[hi].map(c => String(c).trim());
      importRows = rows.slice(hi + 1);
      $('#importFile').textContent = '· ' + file.name;
      buildMapping();
      $('#importBox').hidden = false;
      $('#importBox').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) { SK.toast('无法读取文件：' + err.message); }
  }

  function buildMapping() {
    const grid = $('#mapGrid');
    grid.innerHTML = F.map(([k, label]) => {
      const selIdx = importHeaders.findIndex(h => guess(h) === k);
      const opts = ['<option value="">（忽略）</option>'].concat(
        importHeaders.map((h, ix) => `<option value="${ix}"${ix === selIdx ? ' selected' : ''}>${SK.esc(h) || '(空)'}</option>`)
      ).join('');
      return `<label>${label}<select data-key="${k}">${opts}</select></label>`;
    }).join('');
    grid.querySelectorAll('select').forEach(s => s.addEventListener('change', renderPreview));
    renderPreview();
  }

  function currentMapping() {
    const map = {};
    $('#mapGrid').querySelectorAll('select').forEach(s => { if (s.value !== '') map[s.dataset.key] = +s.value; });
    return map;
  }
  function mappedRows() {
    const map = currentMapping();
    return importRows.map(r => {
      const rec = {};
      for (const [k, ix] of Object.entries(map)) {
        let v = r[ix] ?? '';
        if (k === 'date') v = SK.normalizeDate(v);
        if (k === 'time') v = SK.normalizeTime(v);
        rec[k] = String(v).trim();
      }
      return rec;
    }).filter(r => Object.values(r).some(Boolean));
  }
  function renderPreview() {
    const rows = mappedRows();
    $('#importCount').textContent = rows.length;
    const keys = F.map(f => f[0]);
    const head = '<thead><tr>' + F.map(([, l]) => `<th>${l}</th>`).join('') + '</tr></thead>';
    const body = '<tbody>' + rows.slice(0, 5).map(r =>
      '<tr>' + keys.map(k => `<td>${SK.esc(r[k])}</td>`).join('') + '</tr>').join('') + '</tbody>';
    $('#previewTable').innerHTML = head + body;
  }

  $('#importCancel').addEventListener('click', () => $('#importBox').hidden = true);
  $('#importGo').addEventListener('click', async () => {
    const rows = mappedRows();
    if (!rows.length) return SK.toast('没有可汇入的数据');
    const n = await DB.importMany(rows);
    SK.toast(`已汇入 ${n} 笔 ✓`);
    $('#importBox').hidden = true;
  });

  /* ---- 启动 ---- */
  DB.init().then(() => DB.onChange(render));
})();
