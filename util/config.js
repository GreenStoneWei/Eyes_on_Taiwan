const fs = require('fs');
const util = require('util');
const logFile = fs.createWriteStream( __dirname + '/../errorlog/error.log', {flags: 'a'});
const logStdOut = process.stdout; // log to console as normal.
const now = new Date().toLocaleString('en-US', {timeZone: 'Asia/Taipei'});
const nodemailer = require('nodemailer');
const credential = require('./credentials.js');
const hostName = 'https://wheatxstone.com';

const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: credential.gmail.user,
		pass: credential.gmail.pass,
	},
});

const emailLog = function(d) {
	logFile.write('---start---'+'\n'+now + '\n' + util.format(d) + '\n' + '----end----'+'\n');
	logStdOut.write('---start---'+'\n'+now + '\n' + util.format(d) + '\n' + '----end----'+'\n'); // log to console as normal.
	const mailOptions = {
		from: credential.gmail.user,
		to: credential.gmail.user,
		subject: 'Eyes on Taiwan: '+`${d}`,
		text: util.format(d),
	};
	transporter.sendMail(mailOptions, function(error, info) {
		if (error) {
			console.log(error);
		} else {
			console.log('Email sent: ', info.response);
		}
	});
};

if (!Date.now) {
	Date.now = function now() {
		return new Date().getTime();
	};
}

Date.prototype.yyyymmdd = function() {
	const mm = this.getMonth() + 1; // getMonth() is zero-based
	const dd = this.getDate();

	return [this.getFullYear(),
		(mm>9 ? '' : '0') + mm,
		(dd>9 ? '' : '0') + dd,
	].join('');
};

module.exports = {
	log: emailLog,
	hostName: hostName,
};
