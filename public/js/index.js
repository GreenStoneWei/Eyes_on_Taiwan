const errorBlock = document.querySelector('.error-msg');
const container = document.querySelector('.wrap');
const pagination = document.querySelector('.pagination');
const mobilePagination = document.querySelector('.m-pagination');

document.addEventListener('DOMContentLoaded', (event) => {
	event.preventDefault();
	let page = parseInt(getParameterByName('page'));
	const sort = getParameterByName('sort');
	const keyword = getParameterByName('keyword');
	let tag = getParameterByName('tag');
	let filter = '&tag='+tag;
	if (!Number.isInteger(page)) {
		page = 1;
	}
	if (keyword !== null) {
		tag = null;
		filter = '&keyword='+keyword;
	}
	const xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			if (JSON.parse(this.responseText).error) {
				const error = JSON.parse(this.responseText).error;
				const errorMsg = createElement('h3', ['search-not-found'], false, errorBlock);
				errorMsg.innerHTML = error;
				const errorNote = createElement('h5', [], false, errorBlock);
				errorNote.innerHTML = 'Please check the spelling or the language.';
				const errorNote2 = createElement('h5', [], false, errorBlock);
				errorNote2.innerHTML = 'Or click the top left icon to return home page. Thank you!';
			}
			const articleList = JSON.parse(this.responseText).data;
			const totalPage = JSON.parse(this.responseText).totalPage;
			createArticleCard(articleList, container);
			createPagination(sort, page, filter, totalPage);
			createMobilePagination(sort, page, filter, totalPage);
		}
	};
	xhr.open('GET', `/api/index?sort=${sort}`+filter+`&page=${page}`, true);
	xhr.send();
}); // End of document.addEventListener

/**
 * Create pagination bar
 * @param {string} sort sorting method [ date || viewed ]
 * @param {int} page current page
 * @param {string} filter how to filter the searching result [ by tag || by title keywords ]
 * @param {obj} totalPage assign how many pages in total
 * @return {undefined}
 */
function createPagination(sort, page, filter, totalPage) {
	const previous = createElement('li', ['page-item'], false, pagination);
	const prevLink = createElement('a', ['page-link'], {href: `/?sort=${sort}`+filter+`&page=${page-1}`}, previous);
	prevLink.innerHTML = '&laquo';

	if (totalPage<11) {
		for (let i=1; i<(totalPage+1); i++) {
			const pageItem = createElement('li', ['page-item'], false, pagination);
			const pg = createElement('a', ['page-link'], {href: `/?sort=${sort}`+filter+`&page=${i}`}, pageItem);
			pg.innerHTML = i;
			if (i===page) {
				pageItem.classList.add('active');
			}
		}
	} else {
		if (page<7) {
			for (let i=1; i<11; i++) {
				const pageItem = createElement('li', ['page-item'], false, pagination);
				const pg = createElement('a', ['page-link'], {href: `/?sort=${sort}`+filter+`&page=${i}`}, pageItem);
				pg.innerHTML = i;
				if (i===page) {
					pageItem.classList.add('active');
				}
			}
		} else if ((page+4)<totalPage) {
			const startPage = page-5;
			for (let i=startPage; i<startPage+10; i++) {
				const pageItem = createElement('li', ['page-item'], false, pagination);
				const pg = createElement('a', ['page-link'], {href: `/?sort=${sort}`+filter+`&page=${i}`}, pageItem);
				pg.innerHTML = i;
				if (i===page) {
					pageItem.classList.add('active');
				}
			}
		} else {
			for (let i=(totalPage-9); i<totalPage+1; i++) {
				const pageItem = createElement('li', ['page-item'], false, pagination);
				const pg = createElement('a', ['page-link'], {href: `/?sort=${sort}`+filter+`&page=${i}`}, pageItem);
				pg.innerHTML = i;
				if (i===page) {
					pageItem.classList.add('active');
				}
			}
		}
	}
	const next = createElement('li', ['page-item'], false, pagination);
	const nextLink = createElement('a', ['page-link'], {href: `/?sort=${sort}`+filter+`&page=${page+1}`}, next);
	nextLink.innerHTML ='&raquo;';
	if (page===1) {
		previous.classList.add('disabled');
	}
	if (page===totalPage) {
		next.classList.add('disabled');
	}
}

/**
 * Create mobile pagination bar
 * @param {string} sort sorting method [ date || viewed ]
 * @param {int} page current page
 * @param {string} filter how to filter the searching result [ by tag || by title keywords ]
 * @param {obj} totalPage assign how many pages in total
 * @return {undefined}
 */
function createMobilePagination(sort, page, filter, totalPage) {
	const previous = createElement('li', ['page-item'], false, mobilePagination);
	const prevLink = createElement('a', ['page-link'], {href: `/?sort=${sort}`+filter+`&page=${page-1}`}, previous);
	prevLink.innerHTML = '&laquo';

	const pageItem = createElement('li', ['page-item'], false, mobilePagination);
	const pg = createElement('a', ['page-link'], {href: `/?sort=${sort}`+filter+`&page=${page}`}, pageItem);
	pg.innerHTML = page;
	pageItem.classList.add('active');

	const next = createElement('li', ['page-item'], false, mobilePagination);
	const nextLink = createElement('a', ['page-link'], {href: `/?sort=${sort}`+filter+`&page=${page+1}`}, next);
	nextLink.innerHTML ='&raquo;';
	if (page===1) {
		previous.classList.add('disabled');
	}
	if (page===totalPage) {
		next.classList.add('disabled');
	}
}

