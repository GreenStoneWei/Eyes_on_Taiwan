const container = document.querySelector('.wrap');
const pagination = document.querySelector('.pagination');

document.addEventListener('DOMContentLoaded', (event) => {
    event.preventDefault();
    let page = parseInt(getParameterByName('page'));
    let sort = getParameterByName('sort');
    let keyword = getParameterByName('keyword');
    let tag = getParameterByName('tag');
    let filter = '&tag='+tag;
    if (!Number.isInteger(page)){
        page = 1;
    }
    if(keyword !== null){
        tag = null;
        filter = '&keyword='+keyword;
    }
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        let articleList = JSON.parse(this.responseText).data;
        let totalPage = JSON.parse(this.responseText).totalPage;
        createArticleCard(articleList,container);
        createPagination(sort, page, filter, totalPage);
      }
    };
    xhr.open("GET", `/api/zh-tw/index?sort=${sort}`+filter+`&page=${page}`, true);
    xhr.send();
}) // End of document.addEventListener

function createPagination(sort, page, filter, totalPage){
    let previous = createElement('li',['page-item'],false,pagination);
    let prevLink = createElement('a',['page-link'],{href:`/zh-tw/?sort=${sort}`+filter+`&page=${page-1}`},previous);
    prevLink.innerHTML = '&laquo';

    if(totalPage<11){
        for (let i=1; i<(totalPage+1); i++){
            let pageItem = createElement('li',['page-item'],false,pagination);
            let pg = createElement('a',['page-link'],{href:`/zh-tw/?sort=${sort}`+filter+`&page=${i}`},pageItem);
            pg.innerHTML = i;
            if(i===page){
                pageItem.classList.add('active');
            }
        }
    }
    else{
        if(page<7){
            for (let i=1; i<11; i++){
                let pageItem = createElement('li',['page-item'],false,pagination);
                let pg = createElement('a',['page-link'],{href:`/zh-tw/?sort=${sort}`+filter+`&page=${i}`},pageItem);
                pg.innerHTML = i;
                if(i===page){
                    pageItem.classList.add('active');
                }
            }
        }
        else if ((page+4)<totalPage){
            let startPage = page-5;
            for (let i=startPage; i<startPage+10; i++){
                let pageItem = createElement('li',['page-item'],false,pagination);
                let pg = createElement('a',['page-link'],{href:`/zh-tw/?sort=${sort}`+filter+`&page=${i}`},pageItem);
                pg.innerHTML = i;
                if(i===page){
                    pageItem.classList.add('active');
                }
            }
        }
        else{
            for (let i=(totalPage-9); i<totalPage+1; i++){
                let pageItem = createElement('li',['page-item'],false,pagination);
                let pg = createElement('a',['page-link'],{href:`/zh-tw/?sort=${sort}`+filter+`&page=${i}`},pageItem);
                pg.innerHTML = i;
                if(i===page){
                    pageItem.classList.add('active');
                }
            }
        }
    }
    let next = createElement('li',['page-item'],false,pagination);
    let nextLink = createElement('a',['page-link'],{href:`/zh-tw/?sort=${sort}`+filter+`&page=${page+1}`},next);
    nextLink.innerHTML ='&raquo;';
    if(page===1){
        previous.classList.add('disabled');
    }
    if(page===totalPage){
        next.classList.add('disabled');
    }

}