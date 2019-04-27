const express = require('express');
const router  = express.Router();
const myLib   = require('../util/config.js');
const mysql   = require('../util/mysql.js');
const execFile = require('child_process').execFile;

router.get('/webhook/fb/comment', (req,res) => {
    console.log(req);
    
    res.send(req.query['hub.challenge']);
})

module.exports = router;