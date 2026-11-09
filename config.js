/* =========================================================
   APPT Configuration — modify this file when porting
   ========================================================= */
window.APPT_CONFIG = {
  /* 1) Backend connection */
  firebase: {
    apiKey: "AIzaSyDMBiSM4oGSDE3khRISIxtxDCJJTLaxm0",
    authDomain: "ktmc-queue-system.firebaseapp.com",
    databaseURL: "https://ktmc-queue-system-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ktmc-queue-system",
    storageBucket: "ktmc-queue-system.firebasestorage.app",
    messagingSenderId: "1098822703041",
    appId: "1:1098822703041:web:c010a95bf5c71c478a0140"
  },

  /* 2) Data root namespace */
  root: 'appt',

  /* 3) School identity (Slip prints English name only) */
  school: { zh: '觀塘瑪利諾書院', en: 'KWUN TONG MARYKNOLL COLLEGE' },
  logo: '../img/logo.png',

  /* 4) Print spec: width / side margin 2mm / min height 14cm */
  paper: { width: '80mm', margin: '2mm', minHeight: '140mm' },
  prefix: 'AP',

  /* 5) Slip strings (English only) */
  strings: {
    slipTitle: 'APPOINTMENT SLIP',
    fName: 'Name', fForm: 'Form', fClassNo: 'Class No.', fShouldSee: 'Should See',
    fDate: 'Date', fTime: 'Time', fPlace: 'Place', fRemark: 'Remark',
    issuedAt: 'Issuing Time',
    footerNote: 'Please arrive on time with this slip.'
  }
};
