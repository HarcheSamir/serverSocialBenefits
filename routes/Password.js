
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const nodemailer = require('nodemailer');
const router=express.Router()
const pool = require('../db')




  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "esi4benefits@gmail.com",
      pass: "awplybxdgiwpnxik",
    },
  });
  
  async function generateResetToken(email) {
    const token = Math.random().toString(36).slice(2);
    const expires = new Date(Date.now() + 3600000).toISOString().slice(0, 19).replace("T", " ");
  
    const [result, fields] = await pool.execute(
      "INSERT INTO reset_tokens (email, token, expires) VALUES (?, ?, ?)",
      [email, token, expires]
    );
  
    if (result.affectedRows === 1) {
      return token;
    } else {
      throw new Error("Failed to generate reset token");
    }
  }
  
  router.post('/forgotPassword', async (req, res) => {
    try {
      const { email } = req.body;
  
      const connection = await pool.getConnection();
      const [rows] = await connection.execute('SELECT email FROM accounts WHERE email = ?', [email]);
      connection.release();
  
      if (rows.length === 0) {
        // Email does not exist in the accounts table
        return res.status(400).json({ error: 'Email address not found. Please check the entered email and try again.' });
      }
  
      const token = await generateResetToken(email);
  
      const mailOptions = {
        from: 'esi4benefits@gmail.com',
        to: email,
        subject: 'Reset Your Password',
        text: `Click this link to reset your password: http://localhost:3000/ResetPassword?token=${token}&email=${email}`,
      };
  
      await transporter.sendMail(mailOptions);
  
      res.status(200).json({ message: 'Password reset email sent.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });
  

  
  router.post("/updatePassword", async (req, res) => {
    try {
      const { email, token, password } = req.body;
      const connection = await pool.getConnection();
  
      const [result, fields] = await connection.execute(
        "SELECT * FROM reset_tokens WHERE email = ? AND token = ? AND expires > NOW()",
        [email, token]
      );
  
      if (result.length !== 1) {
        throw new Error("Invalid or expired token");
      }
  
      const hashedPassword = await bcrypt.hash(password, saltRounds);
  
      const [updateResult, updateFields] = await connection.execute(
        "UPDATE accounts SET password = ? WHERE email = ?",
        [hashedPassword, email]
      );
  
      if (updateResult.affectedRows !== 1) {
        throw new Error("Failed to update password");
      }
  
      const [deleteResult, deleteFields] = await connection.execute(
        "DELETE FROM reset_tokens WHERE email = ? AND token = ?",
        [email, token]
      );
  
      if (deleteResult.affectedRows !== 1) {
        console.warn("Failed to delete reset token");
      }
  
      connection.release();
  
      res.status(200).json({ message: "Password updated successfully." });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: err.message });
    }
  });
  

  module.exports = router;

  