/*const express = require('express');..........................................................................................

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const router=express.Router()
const saltRounds = 10;
const jwt = require('jsonwebtoken');

const pool = mysql.createPool({
  host: "us-east.connect.psdb.cloud",
  user: "dteioqevk8nnkwtmj715",
  password: "pscale_pw_HC7Q5FFvZpH6iAImMDj5C6RbYUqkyfqT8i0aiDsimaX",
  database: "first",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

(async () => {
    
  try {
    
    require('dotenv').config()
    const connection = await mysql.createConnection(process.env.host);
    console.log('Connected to MySQL database.');




    // sign-up endpoint
    router.post('/signup', async (req, res) => {
    
      const { username, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      try {

        await connection.execute('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        const token = jwt.sign({ username }, 'secret_key', { expiresIn: '1h' });
        res.json({ token });
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage.includes('username')) {
            res.status(400).json({ error: 'Username already taken' });
          } else {
            console.error('Error executing MySQL query:', error);
            res.status(500).json({ error: 'Internal server error' });
          }
      }
    });



    // login endpoint
    router.post('/login', async (req, res) => {
      const { username, password } = req.body;

      try {
       

        const [rows, fields] = await connection.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
          res.status(401).json({ error: 'Incorrect username or password' });
          return;
        }

        const hashedPassword = rows[0].password;
        const match = await bcrypt.compare(password, hashedPassword);
        if (!match) {
          res.status(401).json({ error: 'Incorrect username or password' });
          return;
        }
        const token = jwt.sign({ username }, 'secret_key', { expiresIn: '1h' });

        res.json({ token });
  
      } catch (error) {
        console.error('Error executing MySQL query:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });


    router.get('/verify', async (req, res) => {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, 'secret_key');
        res.json({ username: decoded.username });
      } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
      }
    });
   
  } catch (error) {
    console.error('Error connecting to MySQL database:', error);
  }


})();
module.exports = router;*/


const express = require('express');
const bcrypt = require('bcrypt');
const router=express.Router()
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const pool = require('../db')





    // sign-up endpoint
    router.post('/signup', async (req, res) => {
    
      const { email, password , role ,job , phone ,maritalStatus ,name ,profileImageUrl} = req.body;
      
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      try {
        const connection = await pool.getConnection();
        await connection.execute('INSERT INTO accounts (email, password ,role ,job ,phone,maritalStatus,name, profileImageUrl) VALUES (?, ? , ?  ,? ,? ,? ,? ,?)', [email, hashedPassword , role, job ,phone, maritalStatus,name,profileImageUrl]);
        const token = jwt.sign({ email }, 'secret_key', { expiresIn: '1h' });
        res.json("accountRegistred");
        connection.release();
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage.includes('email')) {
            res.status(400).json({ error: 'Email is already taken' });
          } else {
            console.error('Error executing MySQL query:', error);
            res.status(500).json({ error: 'Internal server error' });
          }
      }
    });
    


    // login endpoint
    router.post('/login', async (req, res) => {
      const { email, password } = req.body;

      try {
        const connection = await pool.getConnection();

        const [rows, fields] = await connection.execute('SELECT * FROM accounts WHERE email = ?', [email]);
        if (rows.length === 0) {
          res.status(401).json({ error: 'Incorrect email or password' });
          connection.release();

          return;
        }

        const hashedPassword = rows[0].password;
        const match = await bcrypt.compare(password, hashedPassword);
        if (!match) {
          res.status(401).json({ error: 'Incorrect email or password' });
          connection.release();
          return;
        }
        const token = jwt.sign({ email }, 'secret_key', { expiresIn: '1h' });

        res.json({ token : token , id : email });
         connection.release();
  
      } catch (error) {
        console.error('Error executing MySQL query:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

   //verify token endpoint
   router.get('/verify', async (req, res) => {
    try {
      const connection = await pool.getConnection();
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, 'secret_key');
      const email = decoded.email;
  
      const query = 'SELECT * FROM accounts WHERE email = ?';
      const [rows] = await connection.query(query, [email]);
  
      if (rows.length > 0) {
        const account = rows[0];
        res.json({ email: decoded.email , account : account});
      } else {
        res.status(404).json({ error: 'Account not found' });
      }
  
      connection.release();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });
  
   


    router.post('/changePassword', async (req, res) => {
      const { email, old_password, new_password } = req.body;
    
      try {
        const connection = await pool.getConnection();
    
        const [rows] = await connection.query('SELECT password FROM accounts WHERE email = ?', [email]);
    
        if (await bcrypt.compare(old_password, rows[0].password)) {
          const password = await bcrypt.hash(new_password, saltRounds);
    
          await connection.query('UPDATE accounts SET password = ? WHERE email = ?', [password, email]);
    
          res.send('password changed');
        } else {
          res.send('the old password is incorrect');
        }
    
        connection.release();
      } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
      }
    });
    
    









module.exports = router;