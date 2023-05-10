
const express = require('express');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const router=express.Router()
const {
    ref,
    uploadBytes,
    listAll,
    deleteObject,
    getDownloadURL
  } = require("firebase/storage");
  const pool = require('../db')


const storage = require("../firebase");
const memoStorage = multer.memoryStorage();
const upload = multer({ memoStorage });



router.post("/uploadTransaction", upload.single("pic"), async (req, res) => {
    const file = req.file;
    const ext = file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${ext}`;    const imageRef = ref(storage, fileName);
    const metatype = { contentType: file.mimetype, name: fileName };
    let downloadURL='';
    try{
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        await uploadBytes(imageRef, file.buffer, metatype) ;
        downloadURL = await getDownloadURL(imageRef);
        const amount = req.body.amount; 
        const about = req.body.about
        const createdAt = new Date();
        await connection.query("INSERT INTO transactions (amount, image_url ,about ,createdAt) VALUES (?, ?,?, NOW())", [amount, downloadURL, about ])
        await connection.commit();
        connection.release();
        res.status(201).json({ message: "transaction created successfully" });

    }catch(error){
        const connection = await pool.getConnection(); 
        await connection.rollback();

        const imageRef = ref(storage,downloadURL);
        await deleteObject(imageRef);
        connection.release();
        res.status(500).json({ message: "Failed to create transaction" });
    }
   
  });





  
module.exports = router;