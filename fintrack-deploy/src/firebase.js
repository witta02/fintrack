import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// ======================================================
// ⚙️  วางค่า Firebase Config ของคุณตรงนี้
//     ดูวิธีได้ในไฟล์ README.md
// ======================================================
const firebaseConfig = {
  apiKey: "AIzaSyB6G6iW0QAiGXD6CF4ZBeC7DT5H2ncnheU",
  authDomain: "fintrack-848d6.firebaseapp.com",
  projectId: "fintrack-848d6",
  storageBucket: "fintrack-848d6.firebasestorage.app",
  messagingSenderId: "641695501075",
  appId: "1:641695501075:web:1d9ba52952cd1bf450a8e6",
  measurementId: "G-K81DQRT38G"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
