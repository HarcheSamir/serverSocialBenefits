
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const router=express.Router()
const pool = mysql.createPool(
  {host: "us-east.connect.psdb.cloud",
  user: "2y771675on82aaznbw43",
  password: "pscale_pw_1Fyqq2gc2AJ5GusU28C3VuyZoWMepfxe7n0z7n16bku",
  database: "first",
  ssl : {"rejectUnauthorized":true}});

/*
router.post('/registerEmployee' , async (req, res) => {
    
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
    console.log(updatedAccount)

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


module.exports = router;