const firebaseConfig = {
  apiKey: "AIzaSyB3Qhw05GiDctKcPrnqdsHbjjjmCz8Gg7c",
  authDomain: "realm-of-idle-wardens.firebaseapp.com",
  databaseURL: "https://realm-of-idle-wardens-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "realm-of-idle-wardens",
  storageBucket: "realm-of-idle-wardens.appspot.com",
  messagingSenderId: "162860744324",
  appId: "1:162860744324:web:c41ab46632d1d9c44a8cd1"
};

firebase.initializeApp(firebaseConfig);

export const auth = firebase.auth();
export const db = firebase.database();