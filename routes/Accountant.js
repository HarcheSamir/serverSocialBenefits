
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
    const fileName = `${uuidv4()}.${ext}`;
    const imageRef = ref(storage, fileName);
    const metatype = { contentType: file.mimetype, name: fileName };
    let downloadURL = '';
    try {
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      await uploadBytes(imageRef, file.buffer, metatype);
      downloadURL = await getDownloadURL(imageRef);
      const amount = req.body.amount;
      const transactionResult =  await connection.query("INSERT INTO transactions (amount, image_url, createdAt) VALUES (?, ?, NOW())", [amount, downloadURL]);
      const transactionId = transactionResult[0].insertId;
  

      const requestIds = Array.from(req.body.id); // Retrieve all the IDs under the key "id" from the form data

              for (const requestId of requestIds) {
        await connection.query("INSERT INTO transaction_request (id, transaction_id) VALUES (?, ?)", [requestId, transactionId]); // Insert the transaction ID into transaction_request table for each request ID
        await connection.query("UPDATE requests SET status = 'archive' WHERE id = ?", [requestId]);

      }
  
      await connection.commit();
      connection.release();
      res.status(201).json({ message: "transaction created successfully" });
    } catch (error) {
      const connection = await pool.getConnection();
      await connection.rollback();
      const imageRef = ref(storage, downloadURL);
      await deleteObject(imageRef);
      connection.release();
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });
  
  





  router.post('/validateRequest', async (req, res) => {
    const requestId = req.body.id;
    const managerReview = req.body.review;
    const managerEmail = req.body.email; // Assuming the manager's email is provided in the request body
  
    try {
      // Acquire a connection from the pool
      const connection = await pool.getConnection();
  
      if (managerReview === 'approved') {
        const reply = req.body.reply
        const managerMotif = req.body.motif || ''; // Assuming the motif for approval is provided in the request body
        // Update the manager_review column to "approved", set the amount, update the reviewedBy and reviewedByManagerAt columns, and set the manager_motif
        const sql = `UPDATE requests
                     SET accountant_review = 'approved',reply = '${reply}'  , status = 'completed', reviewedByAccountantAt = NOW(), accountant_motif = '${managerMotif}'
                     WHERE id = ${requestId}`;
  
        await connection.query(sql);
      } else if (managerReview === 'rejected') {
        const managerMotif = req.body.motif || ''; // Assuming the motif for rejection is provided in the request body
        // Update the manager_review column to "rejected", set the status to "rejected", update the reviewedBy, reviewedByManagerAt, and completedAt columns, and set the manager_motif
        const sql = `UPDATE requests
                     SET accountant_review = 'rejected', status = 'rejected', reviewedByAccountantAt = NOW(), completedAt = NOW(), accountant_motif = '${managerMotif}'
                     WHERE id = ${requestId}`;
  
        await connection.query(sql);
      }
  
      connection.release(); // Release the connection back to the pool
  
      res.status(200).json({ message: 'Request status updated successfully' });
    } catch (error) {
      console.error('Error updating request status:', error);
      res.status(500).json({ error: 'Failed to update request status' });
    }
  });









  
module.exports = router;