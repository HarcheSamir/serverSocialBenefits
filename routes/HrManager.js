
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const router=express.Router()
const pool = require('../db')


//get requests , paginated
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
  
 


//search among accounts
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

//view and filter accounts
  router.get('/accounts', async (req, res) => {
    try {
      const { job, role, grade, marital_status , email } = req.query;
      const connection = await pool.getConnection();
  
      let query = 'SELECT * FROM accounts ';
    
    (job||role||grade||marital_status||email) && (query = 'SELECT * FROM accounts where ');
    let conditions = []
    email && conditions.push(`email = '${email}'`)
    job && conditions.push(`job = '${job}'`)
    role && conditions.push(` role = ${role}`)
    grade && conditions.push(`grade = '${grade}'`)
    marital_status && conditions.push(`marital_status = '${marital_status}'`)
      
  
      query += conditions.join(' AND ');
  
      const [rows] = await connection.query(query);
  
      connection.release();
  
      res.status(200).json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal server error');
    }
  });







//get/filter requests , paginated 
  router.get('/requests', async (req, res) => {
    try {
      const { id, requestedBy, reviewedBy, about, status } = req.query;

      const connection = await pool.getConnection();



      let queryy = 'SELECT COUNT(*) as total FROM requests ';
      let query2 = 'SELECT * FROM requests ' ;
    
      (id || requestedBy || reviewedBy || about || status) && (queryy = 'SELECT COUNT(*) as total FROM requests where ') && (query2 = 'SELECT * FROM requests where ');
      let conditions = []
      id && conditions.push(`id = '${id}'`)
      requestedBy && conditions.push(`requestedBy = '${requestedBy}'`)
      reviewedBy && conditions.push(` reviewedBy = ${reviewedBy}`)
      about && conditions.push(`about = '${about}'`)
      status && conditions.push(`status = '${status}'`)
        
    
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
      const [records] = await connection.query( query2 + ' ORDER BY createdAt LIMIT ?, ?', [offset, limit]);
  
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
        totalRecords : totalRecords
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



 router.get('/searchRequests', async (req, res) => {
    try {
      const query = req.query.for;
      const connection = await pool.getConnection();
      const sqlQuery = `
      SELECT COUNT(*) as total FROM requests
        WHERE description LIKE '%${query}%'
        OR requestedBy LIKE '%${query}%'
      `;
      //const result = await connection.query(sqlQuery);
      //res.json(result[0]);

      const [result] = await connection.query(sqlQuery);
     
      const totalRecords = result[0].total;
    
  
      // Calculate pagination info
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const totalPages = Math.ceil(totalRecords / limit);
      const offset = (page - 1) * limit;
      const [records] = await connection.query(`SELECT * FROM requests WHERE description LIKE '%${query}%' OR requestedBy LIKE '%${query}%' ORDER BY createdAt LIMIT ?, ?`, [offset, limit]);
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
        totalRecords : totalRecords
      };
      res.send({infos, records})
      connection.release();



      
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal server error');
    }
  });

  



module.exports = router;