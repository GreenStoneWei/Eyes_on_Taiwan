const express = require('express');
const router  = express.Router();
const myLib   = require('../util/config.js');
const mysql   = require('../util/mysql.js');
const execFile = require('child_process').execFile;

router.get('/webhook/fb/comment', (req,res) => {
    console.log('fb comment');
    res.send('521709635');
})

module.exports = router;