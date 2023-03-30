
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
const pool = mysql.createPool(
  {host: "us-east.connect.psdb.cloud",
  user: "2y771675on82aaznbw43",
  password: "pscale_pw_1Fyqq2gc2AJ5GusU28C3VuyZoWMepfxe7n0z7n16bku",
  database: "first",
  ssl : {"rejectUnauthorized":true}});


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


  router.post('/addSocialBenefit', upload.none() ,async (req, res) => {
    const { title, chapter, description, coverage, needed_proofs } = req.body;
    console.log(req.body)
    try {
        const connection = await pool.getConnection();
        const query = 'INSERT INTO benefits (title, chapter, description, coverage, needed_proofs) VALUES (?, ?, ?, ?, ?)';
        const values = [title, chapter, description, coverage, needed_proofs];
        const [result] = await connection.execute(query, values);
        connection.release();
        res.status(200).send({ message: 'Row added successfully!' });
    } catch (error) {
        console.log(error);
        res.status(500).send({ error: 'An error occurred while adding a row to the benefits table.' });
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
    const { chapter  , title } = req.query;
    const connection = await pool.getConnection();

    let query = 'SELECT * FROM benefits ';
  
  (chapter || title) && (query = 'SELECT * FROM benefits where ');
  let conditions = []
  chapter && conditions.push(`chapter = '${chapter}'`)
  title && conditions.push(`title = '${title}'`)
    

    query += conditions.join(' AND ');

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
  const fileName = new Date().getTime().toString() + '-' + file.originalname;
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


module.exports = router;