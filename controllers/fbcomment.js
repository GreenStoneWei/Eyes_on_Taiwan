const express = require('express');
const router  = express.Router();
const myLib   = require('../util/config.js');
const mysql   = require('../util/mysql.js');
const execFile = require('child_process').execFile;

router.post('/webhook/fb/comment', (req,res) => {
    console.log('fb comment');
    res.send('fb')
})

module.exports = router;