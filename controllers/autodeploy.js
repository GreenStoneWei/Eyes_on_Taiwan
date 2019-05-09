const express = require('express');
const router  = express.Router();
const myLib   = require('../util/config.js');
const execFile = require('child_process').execFile;

router.post('/news/auto/payload', (req,res) => {
    execFile('/home/ec2-user/cicdbash/newscraping.sh', (error) => {
        if (error){
            myLib.log(error);
            res.end();
            throw error;
        }
        res.end();
    })
})

module.exports = router;