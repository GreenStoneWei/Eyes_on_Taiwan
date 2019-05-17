/* exported getEndPoint setStyles setAttributes createElement getParameterByName createArticleCard dateFormat */

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