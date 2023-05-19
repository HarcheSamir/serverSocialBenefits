
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
    const amount = req.body.amount;
    const requestId = req.body.id ;

    try {
      const connection = await pool.getConnection();
      const [service] = await connection.query('select service from requests where id = ?' , [requestId])
      const [currentServiceResult] = await connection.query('SELECT amount FROM services WHERE id = ?', [service[0].service]);
      if (currentServiceResult[0].amount - amount < 0 ){      return res.status(400).json({ error: 'Insufficient budget. Please choose a lower amount.' });      }
      await connection.beginTransaction();
      await uploadBytes(imageRef, file.buffer, metatype);
      downloadURL = await getDownloadURL(imageRef);
      await connection.query('UPDATE services SET amount = ? WHERE id = ?', [(currentServiceResult[0].amount - amount), service[0].service]);
      await connection.query("INSERT INTO transactions (amount, image_url, createdAt ,requests) VALUES (?, ?, NOW(), ?)", [amount, downloadURL ,requestId]); 
      await connection.query('UPDATE requests SET accountant_review =  ? , status = ? , completedAt = NOW()  WHERE id = ?', ['approved' ,'completed' , requestId]);

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




  router.post('/addBudget', async (req, res) => {
    try {
      // Assuming the request body contains the amount to be added
      const { amount } = req.body;
      const budgetId = 1; // Assuming you want to add the amount to the row with id 1
  
      // Get a connection from the pool
      const connection = await pool.getConnection();
  
      // Start a transaction
      await connection.beginTransaction();
  
      try {
        // Retrieve the current amount from the row with id 1
        const selectQuery = 'SELECT amount FROM budget WHERE id = ? FOR UPDATE';
        const [row] = await connection.query(selectQuery, [budgetId]);
  
        // Calculate the new amount by adding the provided amount
        const currentAmount = row[0].amount;
        const newAmount = currentAmount + amount;
  
        // Update the row with the new amount
        const updateQuery = 'UPDATE budget SET amount = ? WHERE id = ?';
        await connection.query(updateQuery, [newAmount, budgetId]);
        amount!=0 && await connection.query('INSERT INTO crates_transactions (service_id, amount, transaction_date , service_title) VALUES (?, ?, NOW() ,?)', [0, amount ,'global budget']);

        // Commit the transaction
        await connection.commit();
  
        res.status(200).json({ message: 'Amount added to budget successfully' });
      } catch (error) {
        // Rollback the transaction if an error occurs
        await connection.rollback();
        throw error;
      } finally {
        // Release the connection back to the pool
        connection.release();
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Failed to add amount to budget' });
    }
  });
  

  



// Express endpoint for updating service amount and budget
// Express endpoint for updating service amount and budget
router.post('/services/:serviceId', async (req, res) => {
  const { serviceId } = req.params;
  const { amount } = req.body;

  try {
    // Validate the input amount
    if (!Number.isInteger(amount) || amount < 0) {
      return res.status(400).json({ error: 'Invalid amount. Amount must be a positive integer.' });
    }

    // Get the current service and budget amounts from the database
    const connection = await pool.getConnection();
    const [currentServiceResult] = await connection.query('SELECT amount FROM services WHERE id = ?', [serviceId]);
    const [currentBudgetResult] = await connection.query('SELECT amount FROM budget');

    const currentServiceAmount = currentServiceResult[0].amount;
    const currentBudgetAmount = currentBudgetResult[0].amount;

    // Calculate the difference between the new amount and the current amount
    const amountDifference = amount - currentServiceAmount;
    const newBudgetAmount = currentBudgetAmount - amountDifference;

    // Verify if the new amount exceeds the budget
    if (newBudgetAmount < 0) {
      return res.status(400).json({ error: 'Insufficient budget. Please choose a lower amount.' });
    }

    // Update the service amount and budget in the database
    await connection.query('UPDATE services SET amount = ? WHERE id = ?', [amount, serviceId]);
    await connection.query('UPDATE budget SET amount = ?', [newBudgetAmount]);
    const [title] = await connection.query('SELECT title FROM services WHERE id = ?', [serviceId]);
    // Insert transaction into crates_transactions table
   amountDifference!=0 && await connection.query('INSERT INTO crates_transactions (service_id, amount, transaction_date , service_title) VALUES (?, ?, NOW() ,?)', [serviceId, amountDifference ,title[0].title]);

    connection.release();

    res.sendStatus(200);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred.' });
  }
});

// ...


// ...





router.get('/cratesTransactions', async (req, res) => {
  try {
    const { id,title } = req.query;

    const connection = await pool.getConnection();

    let queryy = 'SELECT COUNT(*) as total FROM crates_transactions ';
    let query2 = 'SELECT * FROM crates_transactions';

    (id || title) && (queryy = 'SELECT COUNT(*) as total FROM crates_transactions WHERE ') && (query2 = 'SELECT * FROM crates_transactions WHERE ');

    let conditions = [];
    id && conditions.push(`id = '${id}'`);
    title && conditions.push(`title = '${title}'`);

    queryy += conditions.join(' AND ');
    query2 += conditions.join(' AND ');

    // Get total number of records
    const [result] = await connection.query(queryy);
    const totalRecords = result[0].total;

    // Calculate pagination info
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const totalPages = Math.ceil(totalRecords / limit);
    const offset = (page - 1) * limit;

    // Get records for the requested page
    const [records] = await connection.query(query2 + ' ORDER BY transaction_date DESC  LIMIT ?, ?', [offset, limit]);

    // Calculate previous and next page numbers
    let previousPage = null;
    let nextPage = null;
    if (page > 1) {
      previousPage = page - 1;
    }
    if (page < totalPages) {
      nextPage = page + 1;
    }

    const infos = {
      previous: previousPage,
      next: nextPage,
      totalPages,
      currentPage: page,
      totalRecords: totalRecords,
    };

    res.json({
      infos,
      records,
    });

    connection.release();
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});












  
module.exports = router;