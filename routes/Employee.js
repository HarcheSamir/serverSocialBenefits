const express = require('express');
const router=express.Router()
const mysql = require('mysql2/promise');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const {
  ref,
  uploadBytes,
  listAll,
  deleteObject,
  getDownloadURL
} = require("firebase/storage");
const storage = require("../firebase");
const { v4: uuidv4 } = require('uuid');

const memoStorage = multer.memoryStorage();
const upload = multer({ memoStorage });
const pool = require('../db')




  //not needed , 
router.post("/upload", upload.array("pic"), async (req, res) => {

  const files = req.files;
  const downloadURLs = [];

  for (const file of files) {
    const fileName = new Date().getTime().toString() + '-' + file.originalname;
    const imageRef = ref(storage, fileName);
    const metatype = { contentType: file.mimetype, name: fileName };
    await uploadBytes(imageRef, file.buffer, metatype)
      .then(async (snapshot) => {
        const downloadURL = await getDownloadURL(imageRef);
        downloadURLs.push(downloadURL);
      })
      .catch((error) => console.log(error.message));
  }

  res.send({ message: "uploaded!", urls: downloadURLs });
});


router.post("/uploadRequest", upload.array("pic"), async (req, res) => {
  const files = req.files;
  const downloadURLs = [];
  const manager_review = 'pending'
  const accountant_review =  'pending'
  try{
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    // Upload each image to cloud storage and get its download URL
    for (const file of files) {
      const ext = file.originalname.split('.').pop();
      const fileName = `${uuidv4()}.${ext}`;
      const imageRef = ref(storage, fileName);
      const metatype = { contentType: file.mimetype, name: fileName };
      await uploadBytes(imageRef, file.buffer, metatype);
      const downloadURL = await getDownloadURL(imageRef);
      downloadURLs.push(downloadURL);
    }
// Insert a new request with the given status
const { status , requestedBy ,about ,description , service ,service_title, requested_amount } = req.body;
const createdAt = new Date();
const requestResult = await connection.query("INSERT INTO requests (status ,createdAt, requestedBy ,about ,description ,manager_review , accountant_review, service ,service_title, requested_amount) VALUES (?,NOW(),? ,? ,? ,? ,? ,? ,? ,?)", [status, requestedBy,about , description ,manager_review , accountant_review, service ,service_title, requested_amount ]);
const requestId = requestResult[0].insertId;

// Insert each proof with the newly created request ID and its corresponding image URL
for (const downloadURL of downloadURLs) {
  await connection.query("INSERT INTO proofs (request_id, image_url) VALUES (?, ?)", [requestId, downloadURL]);
}

// Commit the transaction if everything succeeded
await connection.commit();
connection.release();

// Send a response indicating success
res.status(201).json({ message: "Request created successfully" });


  }catch(error){
// Rollback the transaction and delete the uploaded images if anything failed
const connection = await pool.getConnection(); 
await connection.rollback();
for (const downloadURL of downloadURLs) {
  const imageRef = ref(storage,downloadURL);
  await deleteObject(imageRef);
}

connection.release();

// Send a response indicating failure
res.status(500).json({ message: "Failed to create request" });

  }

})



  //not needed
router.post('/sendRequests', async (req, res, next) => {
    const { proofs, status } = req.body;
  
    try {
      // Begin a database transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();
  
      // Insert a new request with the given status
      const requestResult = await connection.query('INSERT INTO requests (status) VALUES (?)', [status]);
      console.log(requestResult[0].insertId)
      const requestId=requestResult[0].insertId;
     
  
      // Insert each proof with the newly created request ID
      for (const proof of proofs) {
        await connection.query('INSERT INTO proofs (request_id, image_url) VALUES (?, ?)', [requestId, proof.image_url]);
      }
  
      // Commit the transaction if everything succeeded
      await connection.commit();
      connection.release();
  
      // Send a response indicating success
      res.status(201).json({ message: 'Request created successfully' });
    } catch (error) {
      // Rollback the transaction if anything failed
      const connection = await pool.getConnection();
      await connection.rollback();
      connection.release();
  
      // Send a response indicating failure
      res.status(500).json({ message: 'Failed to create request', error: error.message });
    }
});




//delete request
router.delete('/requests/:id', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const id = req.params.id;
    await connection.beginTransaction();

    // Retrieve image URLs with matching request ID
    const [rows] = await connection.query('SELECT image_url FROM proofs WHERE request_id = ?', [id]);
    const downloadURLs= rows.map(row => row.image_url);
    for (const downloadURL of downloadURLs) {
      const imageRef = ref(storage,downloadURL);
      await deleteObject(imageRef);
    }

    // Delete proofs with matching request ID
    await connection.query('DELETE FROM proofs WHERE request_id = ?', [id]);

    // Delete request with matching ID
    await connection.query('DELETE FROM requests WHERE id = ?', [id]);

    await connection.commit();
    connection.release();
    res.status(200).send(downloadURLs.length+" images are deleted"); // Send deleted image URLs in response
  } catch (err) {
    const connection = await pool.getConnection(); 
    await connection.rollback();
    connection.release();
    console.error(err);
    res.status(500).send('Error deleting request');
  }
});




//verify the token , to secure routes
router.post('/token', async (req, res) => {
  const {token} = req.body
  try {
    const decoded = jwt.verify(token, 'secret_key');
    res.json({ email: decoded.email });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});


//update profile picture , that's all the employee can modify 
router.post("/updateProfilePicture", upload.single("pic"), async (req, res) => {
  const file = req.file;
  const ext = file.originalname.split('.').pop();
const fileName = `${uuidv4()}.${ext}`;  const imageRef = ref(storage, fileName);
  const metatype = { contentType: file.mimetype, name: fileName };
  let downloadURL='';
  try{
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      await uploadBytes(imageRef, file.buffer, metatype) ;
      downloadURL = await getDownloadURL(imageRef);
      const {email} = req.body
      await connection.query('UPDATE accounts SET profileImageUrl = ? WHERE email = ?', [downloadURL, email])
      await connection.commit();
      connection.release();
      res.status(201).json({ message: "image changed successfully" });

  }catch(error){
      const connection = await pool.getConnection(); 
      await connection.rollback();

      const imageRef = ref(storage,downloadURL);
      await deleteObject(imageRef);
      connection.release();
      res.status(500).json({ message: "Failed to change image" });
  }
 
});


//view announcements
router.get('/announcements', async (req, res) => {
  try {
    
    let query = 'SELECT * FROM announcements ';
  
     const connection = await pool.getConnection()
    const [rows] = await connection.query(query);

    connection.release();

    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});


router.post('/updatePhone', async (req, res) => {
  const { email, phone } = req.body;

  try {
    const connection = await pool.getConnection();
    const sql = "UPDATE accounts SET phone = ? WHERE email = ?";
    const result = await connection.query(sql, [phone, email]);
    connection.release();
    res.send(`User with email ${email} updated to phone ${phone}`);
  } catch (err) {
    throw err;
  }
});









 








module.exports = router;




















































/*
router.post("/upload", upload.single("pic"), async (req, res) => {

  const file = req.file;
  
   const fileName = new Date().getTime().toString() + '-' + file.originalname;
    const imageRef = ref(storage, fileName);
  const imageRef = ref(storage, fileName);
  const metatype = { contentType: file.mimetype, name: fileName };
  await uploadBytes(imageRef, file.buffer, metatype)
    .then(async (snapshot) => {
      const downloadURL = await getDownloadURL(imageRef);
      res.send(downloadURL);
    })
    .catch((error) => console.log(error.message));
});
*/
