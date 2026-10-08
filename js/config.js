/* ==========================================================
   Appointment Slip · 设定档
   1. 改学校名称（印在小票顶部；云端同步后以云端设定为准）
   2. 要「跨装置同步」请把 Firebase 配置贴进下面（见 README）
      留空 = 本机模式（只存在这个浏览器）
   ========================================================== */
window.APP_CONFIG = {
  DEFAULT_SCHOOL_NAME: "SCHOOL NAME",

  firebase: {
    apiKey:            "",
    authDomain:        "",
    databaseURL:       "",   // ← 跨装置同步必填这一项
    projectId:         "",
    storageBucket:     "",
    messagingSenderId: "",
    appId:             ""
  }
};
