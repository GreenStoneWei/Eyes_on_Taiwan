const express = require('express');
const router  = express.Router();
const myLib   = require('../util/config.js');
const mysql   = require('../util/mysql.js');

router.get('/webhook/fb/comment', (req,res) => {
    let url = req.originalUrl;
    console.log(url);
    res.send(req.query['hub.challenge']);
})

module.exports = router;