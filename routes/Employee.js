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

const memoStorage = multer.memoryStorage();
const upload = multer({ memoStorage });
const pool = mysql.createPool(
  {host: "us-east.connect.psdb.cloud",
  user: "2y771675on82aaznbw43",
  password: "pscale_pw_1Fyqq2gc2AJ5GusU28C3VuyZoWMepfxe7n0z7n16bku",
  database: "first",
  ssl : {"rejectUnauthorized":true}});


  //upload pics
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


router.post("/uploadAndSend", upload.array("pic"), async (req, res) => {
  const files = req.files;
  const downloadURLs = [];
  try{
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    // Upload each image to cloud storage and get its download URL
    for (const file of files) {
      const fileName = new Date().getTime().toString() + "-" + file.originalname;
      const imageRef = ref(storage, fileName);
      const metatype = { contentType: file.mimetype, name: fileName };
      await uploadBytes(imageRef, file.buffer, metatype);
      const downloadURL = await getDownloadURL(imageRef);
      downloadURLs.push(downloadURL);
    }
// Insert a new request with the given status
const { status } = req.body;
const createdAt = new Date();
const requestResult = await connection.query("INSERT INTO requests (status ,createdAt) VALUES (?,?)", [status, createdAt]);
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


  //send Requests
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





router.post('/token', async (req, res) => {
  const {token} = req.body
  try {
    const decoded = jwt.verify(token, 'secret_key');
    res.json({ email: decoded.email });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});


/*
router.post("/updateProfilePicture", upload.single("pic"), async (req, res) => {
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
      const {email} = req.body
      await connection.query('UPDATE accounts SET profile_image_url = ? WHERE email = ?', [downloadURL, email])
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

*/
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
