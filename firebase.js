const { initializeApp } = require("firebase/app");
const { getStorage } = require("firebase/storage");

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
//const firebaseConfig = ;



const firebaseApp = initializeApp({
    storageBucket:"gs://socialbenefits-7df6d.appspot.com"
   });

// Get a reference to the storage service, which is used to create references in your storage bucket
module.exports = getStorage(firebaseApp);