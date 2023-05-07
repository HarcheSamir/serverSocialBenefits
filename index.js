const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const Auth = require('./routes/Auth')
const Employee= require('./routes/Employee')
const Admin = require('./routes/Admin')
const Accountant = require('./routes/Accountant')
const HrManager = require('./routes/HrManager')
const Password = require('./routes/Password')
let cors = require("cors");
app.use(cors({credentials: true,origin: '*',}));
app.listen(3006, () => console.log('Server listening on port 3006.'));



app.use('/' ,Auth)
app.use('/', Employee)
app.use('/' , Admin)
app.use('/', Accountant)
app.use('/', HrManager)
app.use('/',Password)




    
