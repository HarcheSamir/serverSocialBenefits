
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


  router.get('/getRequests', async (req, res) => {
    try {
      const connection = await pool.getConnection();
  
      // Get total number of records
      const [result] = await connection.query('SELECT COUNT(*) as total FROM requests');
     
      const totalRecords = result[0].total;
  
      // Calculate pagination info
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const totalPages = Math.ceil(totalRecords / limit);
      const offset = (page - 1) * limit;
  
      // Get records for the requested page
      const [records] = await connection.query('SELECT * FROM requests ORDER BY createdAt LIMIT ?, ?', [offset, limit]);
  
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
  
  router.get('/search', async (req, res) => {
    try {
      const query = req.query.for;
      const connection = await pool.getConnection();
      const sqlQuery = `
        SELECT * FROM proofs
        WHERE image_url LIKE '%${query}%'
        OR request_id LIKE '%${query}%'
      `;
      const result = await connection.query(sqlQuery);
      res.json(result[0]);
      connection.release();
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal server error');
    }
  });

  router.get('/searchAccounts', async (req, res) => {
    try {
      const query = req.query.for;
      const connection = await pool.getConnection();
      const sqlQuery = `
        SELECT * FROM accounts
        WHERE email LIKE '%${query}%'
        OR name LIKE '%${query}%'
      `;
      const result = await connection.query(sqlQuery);
      res.json(result[0]);
      connection.release();
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal server error');
    }
  });


  router.get('/accounts', async (req, res) => {
    try {
      const { job, role, grade, marital_status } = req.query;
      const connection = await pool.getConnection();
  
      let query = 'SELECT * FROM accounts WHERE ';
      let conditions = [];
  
      if (job) {
        conditions.push(`job = '${job}'`);
      }
  
      if (role) {
        conditions.push(`(role & ${role}) = ${role}`);
      }
  
      if (grade) {
        conditions.push(`grade = '${grade}'`);
      }
  
      if (marital_status) {
        conditions.push(`marital_status = '${marital_status}'`);
      }
  
      query += conditions.join(' AND ');
  
      const [rows] = await connection.query(query);
  
      connection.release();
  
      res.status(200).json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal server error');
    }
  });

module.exports = router;