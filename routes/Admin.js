const { v4: uuidv4 } = require('uuid');

const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const multer = require('multer');
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
const router=express.Router()
const pool = require('../db')



/*router.post('/registerEmployee' , async (req, res) => {
    
    const { email, password , role} = req.body;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    try {
      const connection = await pool.getConnection();
      await connection.execute('INSERT INTO accounts (email, password ,role) VALUES (?, ? , ?)', [email, hashedPassword , role]);
      connection.release();
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage.includes('email')) {
          res.status(400).json({ error: 'Email is already taken' });
        } else {
          console.error('Error executing MySQL query:', error);
          res.status(500).json({ error: 'Internal server error' });
        }
    }
  })
*/

  router.post('/updateRole', async (req, res) => {
    const { email, role } = req.body;
  
    try {
      const connection = await pool.getConnection();
      const sql = "UPDATE accounts SET role = ? WHERE email = ?";
      const result = await connection.query(sql, [role, email]);
      connection.release();
      res.send(`User with email ${email} updated to role ${role}`);
    } catch (err) {
      throw err;
    }
  });
  
  router.post('/accounts/:email', async(req, res) => {
    const email = req.params.email;
    const updatedAccount = req.body;

  try{
    const connection = await pool.getConnection()
    await  connection.query(
      'UPDATE accounts SET ? WHERE email = ?',
      [updatedAccount, email])
      res.send(`Account with email ${email} updated successfully!`)
  }
  catch(error){
    throw error 
  }
    
  });















  router.post('/addSocialBenefit', upload.single("pic"),async (req, res) => {
    const { title,  description, coverage, needed_proofs , service } = req.body;
    console.log(req.body)
    const file = req.file;
    const ext = file.originalname.split('.').pop();
  const fileName = `${uuidv4()}.${ext}`;
    const imageRef = ref(storage, fileName);
    const metatype = { contentType: file.mimetype, name: fileName };
    let downloadURL='';
    try {
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      await uploadBytes(imageRef, file.buffer, metatype) ;
      downloadURL = await getDownloadURL(imageRef);
         const query = 'INSERT INTO benefits (benefit_title,  description, coverage, needed_proofs ,service ,imageUrl) VALUES (?, ?, ?, ? ,? ,?)';
        const values = [title, description, coverage, needed_proofs ,service , downloadURL];
        const [result] = await connection.execute(query, values);
        await connection.commit();
        connection.release();
        res.status(201).json({ message:"program created successfully" });
    } catch (error) {
      const connection = await pool.getConnection(); 
      await connection.rollback();

    
      const imageRef = ref(storage,downloadURL);
      await deleteObject(imageRef);
      connection.release();
      res.status(500).json({ message: "Failed to create announcement" });
     }
});


router.post('/socialBenefits/:title',upload.none() , async(req, res) => {
  const title = req.params.title;
  const updatedAccount = req.body;

try{
  const connection = await pool.getConnection()
  await  connection.query(
    'UPDATE benefits SET ? WHERE title = ?',
    [updatedAccount, title])
    res.send(`the social benefit '${title}' updated successfully!`)
}
catch(error){
  throw error 
}
  
});



router.get('/socialBenefits', async (req, res) => {
  try {
    const {  title ,benefit_id } = req.query;
    const connection = await pool.getConnection();

    let query = 'SELECT b.*, s.* FROM benefits AS b LEFT JOIN services AS s ON b.service = s.id';

    let conditions = [];
    if (benefit_id) conditions.push(`benefit_id = '${benefit_id}'`);
    if (title) conditions.push(`title = '${title}'`);

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const [rows] = await connection.query(query);

    connection.release();

    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});



router.get('/socialBenefits2', async (req, res) => {
  try {
    const {  title ,benefit_id } = req.query;
    const connection = await pool.getConnection();

    let query = 'SELECT b.*, s.* FROM benefits AS b LEFT JOIN services AS s ON b.service = s.id WHERE b.expired = "no"';

    let conditions = [];
    if (benefit_id) conditions.push(`benefit_id = '${benefit_id}'`);
    if (title) conditions.push(`title = '${title}'`);

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const [rows] = await connection.query(query);

    connection.release();

    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});



router.post("/uploadAnnouncement", upload.single("pic"), async (req, res) => {
  const file = req.file;
  const ext = file.originalname.split('.').pop();
const fileName = `${uuidv4()}.${ext}`;
  const imageRef = ref(storage, fileName);
  const metatype = { contentType: file.mimetype, name: fileName };
  let downloadURL='';
  try{
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      await uploadBytes(imageRef, file.buffer, metatype) ;
      downloadURL = await getDownloadURL(imageRef);
      const {title, description} = req.body
      await connection.query("INSERT INTO announcements (title, cover_url ,description) VALUES (?, ?, ?)", [title, downloadURL ,description])
      await connection.commit();
      connection.release();
      res.status(201).json({ message:"announcement created successfully" });

  }catch(error){
      const connection = await pool.getConnection(); 
      await connection.rollback();

      const imageRef = ref(storage,downloadURL);
      await deleteObject(imageRef);
      connection.release();
      res.status(500).json({ message: "Failed to create announcement" });
  }
 
});


router.get('/getBudget', async (req, res) => {
  try {
    // Acquire a connection from the connection pool
    const connection = await pool.getConnection();

    // Execute the query to calculate the sum of all amounts
    const queryResult = await connection.query('SELECT SUM(amount) AS totalBudget FROM transactions');

    // Release the connection back to the pool
    connection.release();

    // Extract the total budget from the query result
    const budget = queryResult[0][0].totalBudget;
     console.log(budget)
    if (budget === null) {
      throw new Error('Failed to retrieve total budget');
    }

    // Send the total budget as the response
    res.json({ budget });
  } catch (error) {
    // Handle any errors that occur during the process
    console.error('Error retrieving budget:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});





router.post('/setExpired/:benefitId', async (req, res) => {
  const { benefitId } = req.params;
  const { expired } = req.body;

  try {
    const connection = await pool.getConnection();
    const updateQuery = 'UPDATE benefits SET expired = ? WHERE benefit_id = ?';
    await connection.query(updateQuery, [expired, benefitId]);
    connection.release();

    res.status(200).json({ message: 'Expiration status updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update expiration status' });
  }
});





module.exports = router;