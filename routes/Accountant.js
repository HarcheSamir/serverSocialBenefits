
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
    {host: "aws.connect.psdb.cloud",
    user: "zjcku82bip5awv4yqevg",
    password: "pscale_pw_vZTgEBYMUsmIXIjsh9jrlBNEzn0YuosK0E6u1UpJRcx",
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
        res.status(500).json({ message: "Failed to create transaction" });
    }
   
  });





  
module.exports = router;