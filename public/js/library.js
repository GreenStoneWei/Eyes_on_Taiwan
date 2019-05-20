/* exported getEndPoint setStyles setAttributes createElement getParameterByName createArticleCard dateFormat */
const language = document.getElementById('translation').dataset.language;
const myDictionary = {
	en: {
		href: '/',
		route: '/api',
		switch: '/zh_tw/',
		navDate: 'Latest',
		navViewed: 'Most Viewed',
		navTag: 'Hot Tags',
		translation: '繁體中文',
		bannerSubtitle: 'As Taiwan\'s news is being interfered, let\'s look in different aspects',
		indexErrorNote: 'Please check the spelling or the language.<br>Or click the top left icon to return home page. Thank you!',
		cardReadMore: 'Read More',
		cardViewed: ' Viewed',
		tagStarter: 'Tags: ',
		articleOrigin: 'See Origin',
		articleRecommend: 'Similar Articles Recommended',
	},
	zh_tw: {
		href: '/zh_tw/',
		route: '/api/zh-tw',
		switch: '/',
		navDate: '最新報導',
		navViewed: '最多觀看',
		navTag: '熱門標籤',
		translation: 'English',
		bannerSubtitle: '臺灣媒體被中國干涉，您需要看看國外媒體的報導內容',
		indexErrorNote: '請檢查錯字或當前閱讀的語言別，或點選左上角圖示回到首頁，謝謝。',
		cardReadMore: '詳讀全文',
		cardViewed: ' 觀看人次',
		tagStarter: '重點標籤：',
		articleOrigin: '站外原文',
		articleRecommend: '閱讀相關文章',
	},
};

/**
 * Get the endpoint of the assigned url.
 * @param {string} href complete url.
 * @return {string} the endpoint of assign href.
 */
function getEndPoint(href) {
	if (href.indexOf('?')!== -1) {
		return '?'+href.split('?')[1];
	} else {
		return '';
	}
}

/**
 * Set styles to the assigned element.
 * @param {obj} obj target element.
 * @param {obj} styles an object contains style sets.
 * @return {obj} object with style set.
 */
function setStyles(obj, styles) {
	for (const name in styles) {
		if (styles[name]) {
			obj.style[name]=styles[name];
		}
	}
	return obj;
}

/**
 * Set attributes to the assigned element.
 * @param {obj} obj target element.
 * @param {obj} attrs an object contains attributes sets.
 * @return {obj} object with attributes set.
 */
function setAttributes(obj, attrs) {
	for (const name in attrs) {
		if (attrs[name]) {
			obj[name]=attrs[name];
		}
	}
	return obj;
}

/**
 * Create an element with assign css styles, attribute and parent node.
 * @param {string} tagName type of tag. [ div || h1 || img... etc ]
 * @param {array} addClass an array contains css style name. ["cssStyle1", "cssStyle2", ...]
 * @param {obj} attrs an object contains attribute to assign.
 * @param {obj} parentElement where this element to append.
 * @return {obj} return an element with assigned styles and attributes.
 */
function createElement(tagName, addClass, attrs, parentElement) {
	const obj = document.createElement(tagName);
	if (addClass) {
		for (let i=0; i<addClass.length; i++) {
			obj.classList.add(addClass[i]);
		}
	}
	if (attrs) {
		setAttributes(obj, attrs);
	}
	if (parentElement instanceof Element) {
		parentElement.appendChild(obj);
	}
	return obj;
}

/**
 * Convert unixtime to yyyy-mm-dd hh:mm
 * @param {int} unixtime unixtime millisecond format.
 * @return {string} yyyy-mm-dd hh:mm
 */
function dateFormat(unixtime) {
	const dateString = new Date(unixtime).toString();
	const dateArray = dateString.split(' ');
	return dateArray[3]+'-'+dateArray[1]+'-'+dateArray[2]+' '+dateArray[4].slice(0, 5);
}

/**
 * Get value by its key name from query string.
 * @param {string} name target query string name.
 * @param {string} url complete url.
 * @return {string} query string value.
 */
function getParameterByName(name, url) {
	if (!url) url = window.location.href;
	name = name.replace(/[\[\]]/g, '\\$&');
	const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
	const results = regex.exec(url);
	if (!results) return null;
	if (!results[2]) return '';
	return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Get value by its key name from cookie.
 * @param {string} name target query string name.
 * @return {string} query string value.
 */
function getCookie(name) {
	const value = '; ' + document.cookie;
	const parts = value.split('; ' + name + '=');
	if (parts.length == 2) return parts.pop().split(';').shift();
}
