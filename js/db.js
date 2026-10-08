/* 数据同步层：Firebase Realtime Database（云端）/ localStorage（本机回退） */
(function () {
  const LS_A = 'asl_appointments', LS_S = 'asl_settings';
  const listeners = new Set();
  const state = { appointments: {}, settings: {} };
  let cloud = null;

  const uid = () => 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const emit = () => listeners.forEach(cb => { try { cb(state); } catch (e) { console.error(e); } });

  function loadLocal() {
    try { state.appointments = JSON.parse(localStorage.getItem(LS_A) || '{}'); } catch (e) { state.appointments = {}; }
    try { state.settings = JSON.parse(localStorage.getItem(LS_S) || '{}'); } catch (e) { state.settings = {}; }
  }
  const saveA = () => localStorage.setItem(LS_A, JSON.stringify(state.appointments));
  const saveS = () => localStorage.setItem(LS_S, JSON.stringify(state.settings));

  function bootLocal() {
    DB.mode = 'local';
    loadLocal(); emit();
    window.addEventListener('storage', e => {           // 同一装置跨分页同步
      if (e.key === LS_A || e.key === LS_S) { loadLocal(); emit(); }
    });
  }

  window.DB = {
    mode: 'boot',
    state,
    init() {
      const cfg = (window.APP_CONFIG && window.APP_CONFIG.firebase) || {};
      if (cfg.databaseURL) {
        DB.mode = 'connecting';
        return Promise.all([
          import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
          import('https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js')
        ]).then(([am, dm]) => {
          const app = am.initializeApp(cfg);
          const db = dm.getDatabase(app);
          cloud = { db, ref: dm.ref, set: dm.set, update: dm.update, remove: dm.remove };
          DB.mode = 'cloud';
          dm.onValue(dm.ref(db, '/'), snap => {
            const v = snap.val() || {};
            state.appointments = v.appointments || {};
            state.settings = v.settings || {};
            emit();
          }, err => console.error('RTDB', err));
        }).catch(err => {
          console.warn('Firebase 连接失败，改用本机模式', err);
          bootLocal();
        });
      }
      bootLocal();
      return Promise.resolve();
    },
    onChange(cb) { listeners.add(cb); cb(state); },

    async add(data) {
      const id = uid();
      const rec = { ...data, createdAt: Date.now() };
      if (cloud) await cloud.set(cloud.ref(cloud.db, 'appointments/' + id), rec);
      else { state.appointments[id] = rec; saveA(); emit(); }
      return id;
    },
    async importMany(rows) {
      const recs = rows.map(d => [uid(), { ...d, createdAt: Date.now() }]);
      if (cloud) {
        const multi = {};
        recs.forEach(([id, r]) => multi['appointments/' + id] = r);
        await cloud.update(cloud.ref(cloud.db, '/'), multi);
      } else { recs.forEach(([id, r]) => state.appointments[id] = r); saveA(); emit(); }
      return recs.length;
    },
    async update(id, data) {
      if (cloud) await cloud.update(cloud.ref(cloud.db, 'appointments/' + id), data);
      else { Object.assign(state.appointments[id] || {}, data); saveA(); emit(); }
    },
    async remove(id) {
      if (cloud) await cloud.remove(cloud.ref(cloud.db, 'appointments/' + id));
      else { delete state.appointments[id]; saveA(); emit(); }
    },
    async clearAll() {
      if (cloud) await cloud.set(cloud.ref(cloud.db, 'appointments'), null);
      else { state.appointments = {}; saveA(); emit(); }
    },
    async setSettings(patch) {
      if (cloud) await cloud.update(cloud.ref(cloud.db, 'settings'), patch);
      else { Object.assign(state.settings, patch); saveS(); emit(); }
    }
  };
})();
