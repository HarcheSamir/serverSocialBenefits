
const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const router=express.Router()
const {
    ref,
    uploadBytes,
    listAll,
    deleteObject,
    getDownloadURL
  } = require("firebase/storage");
const pool = mysql.createPool(
  {host: "us-east.connect.psdb.cloud",
  user: "2y771675on82aaznbw43",
  password: "pscale_pw_1Fyqq2gc2AJ5GusU28C3VuyZoWMepfxe7n0z7n16bku",
  database: "first",
  ssl : {"rejectUnauthorized":true}});

const storage = require("../firebase");
const memoStorage = multer.memoryStorage();
const upload = multer({ memoStorage });



router.post("/uploadTransaction", upload.single("pic"), async (req, res) => {
    const file = req.file;
    const fileName = new Date().getTime().toString() + '-' + file.originalname;
    const imageRef = ref(storage, fileName);
    const metatype = { contentType: file.mimetype, name: fileName };
    let downloadURL='';
    try{
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        await uploadBytes(imageRef, file.buffer, metatype) ;
        downloadURL = await getDownloadURL(imageRef);
        const {amount} = req.body
        const createdAt = new Date();
        await connection.query("INSERT INTO transactions (amount, image_url ,createdAt) VALUES (?, ?, ?)", [amount, downloadURL ,createdAt])
        await connection.commit();
        connection.release();
        res.status(201).json({ message: "transaction created successfully" });

    }catch(error){
        const connection = await pool.getConnection(); 
        await connection.rollback();

        const imageRef = ref(storage,downloadURL);
        await deleteObject(imageRef);
        connection.release();
        res.status(500).json({ message: "Failed to create request" });
    }
   
  });





  
module.exports = router;