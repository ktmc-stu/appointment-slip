/* =========================================================
   APPT 設定檔 Configuration — 移植時主要修改此檔
   ========================================================= */
window.APPT_CONFIG = {
  /* 1) 後端連線 Backend connection */
  firebase: {
    apiKey: "AIzaSyDMBiSM4oGSDE3khRISIxtxDCJJTLaxm0",
    authDomain: "ktmc-queue-system.firebaseapp.com",
    databaseURL: "https://ktmc-queue-system-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ktmc-queue-system",
    storageBucket: "ktmc-queue-system.firebasestorage.app",
    messagingSenderId: "1098822703041",
    appId: "1:1098822703041:web:c010a95bf5c71c478a0140"
  },

  /* 2) 資料根命名空間 Data root namespace */
  root: 'appt',

  /* 3) 學校身份 School identity */
  school: { zh: '觀塘瑪利諾書院', en: 'KWUN TONG MARYKNOLL COLLEGE' },
  logo: '../img/logo.png',

  /* 4) 列印規格 Print spec（寬度／邊距／最小高度） */
  paper: { width: '80mm', margin: '4mm', minHeight: '140mm' },
  prefix: 'AP',

  /* 5) 雙語字串 Bilingual strings */
  strings: {
    slipTitle: 'Appointment Slip 預約條',
    fName: 'Name 姓名', fForm: 'Form 級別', fClassNo: 'Class No. 班號',
    fShouldSee: 'Should See 應見', fDate: 'Date 日期', fTime: 'Time 時間',
    fPlace: 'Place 地點', fRemark: 'Remark 備註',
    issuedAt: 'Issuing Time 發行時間',
    footerNote: 'Please arrive on time with this slip. 請準時攜同此條出席。',
    signLine: 'Signed by 簽收：＿＿＿＿＿＿＿'
  }
};
