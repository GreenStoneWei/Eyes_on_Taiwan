const container = document.querySelector('.wrap');
const pagination = document.querySelector('.pagination');

document.addEventListener('DOMContentLoaded', (event) => {
    event.preventDefault();
    let page = parseInt(getParameterByName('page'));
    if (!Number.isInteger(page)){
        page = 1;
    }
    let sort = getParameterByName('sort');
    let keyword = getParameterByName('keyword');
    let tag = getParameterByName('tag');
    let xhr = new XMLHttpRequest();
    
    if(keyword !==null){
        tag = null;
    }
    


    xhr.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        let articleList = JSON.parse(this.responseText).data;
        let totalPage = JSON.parse(this.responseText).totalPage;
        createArticleCard(articleList,container);
        createPagination(sort, page, tag, totalPage);
      }
    };
    xhr.open("GET", `/api/index?sort=${sort}&page=${page}&tag=${tag}`, true);
    xhr.send();
}) // End of document.addEventListener

function createPagination(sort, page, tag, totalPage){
    let previous = createElement('li',['page-item'],false,pagination);
    let prevLink = createElement('a',['page-link'],{href:`/?sort=${sort}&tag=${tag}&page=${page-1}`},previous);
    prevLink.innerHTML = '&laquo';

    if(totalPage<11){
        for (let i=1; i<(totalPage+1); i++){
            let pageItem = createElement('li',['page-item'],false,pagination);
            let pg = createElement('a',['page-link'],{href:`/?sort=${sort}&tag=${tag}&page=${i}`},pageItem);
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
                let pg = createElement('a',['page-link'],{href:`/?sort=${sort}&tag=${tag}&page=${i}`},pageItem);
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
                let pg = createElement('a',['page-link'],{href:`/?sort=${sort}&tag=${tag}&page=${i}`},pageItem);
                pg.innerHTML = i;
                if(i===page){
                    pageItem.classList.add('active');
                }
            }
        }
        else{
            for (let i=(totalPage-9); i<totalPage+1; i++){
                let pageItem = createElement('li',['page-item'],false,pagination);
                let pg = createElement('a',['page-link'],{href:`/?sort=${sort}&tag=${tag}&page=${i}`},pageItem);
                pg.innerHTML = i;
                if(i===page){
                    pageItem.classList.add('active');
                }
            }
        }
    }
    let next = createElement('li',['page-item'],false,pagination);
    let nextLink = createElement('a',['page-link'],{href:`/?sort=${sort}&tag=${tag}&page=${page+1}`},next);
    nextLink.innerHTML ='&raquo;';
    if(page===1){
        previous.classList.add('disabled');
    }
    if(page===totalPage){
        next.classList.add('disabled');
    }

}

/* <nav>
    <ul class="pagination">
        <li class="page-item disabled">
        <a class="page-link" href="#" aria-label="previous">&laquo;</a>
        </li>

        <li class="page-item"><a class="page-link" href="#">1</a></li>
        <li class="page-item active"><a class="page-link" href="#">2</a></li>
        <li class="page-item"><a class="page-link" href="#">3</a></li>
        
        <li class="page-item">
        <a class="page-link" href="#" aria-label="next">&raquo;</a>
        </li>
    </ul>
</nav> */



/* <div class="card card-size">
    <div class="card-header">
        <div class="row">
            <span class = "col-7">The Washington Post</span>
            <span class = "col-5 text-right">2019-04-09 12:52</span>
        </div>
    </div>
    <div class="card-body">
        <img src="https://cdn.cnn.com/cnnnext/dam/assets/190408082400-hong-kong-extradition-law-02-story-body.jpg" class= "card-img-top">
        <h4 class="card-title">title</h4>
        <p class="card-text">abstract</p>
        <a href="#" class="card-link">Read More</a>
    </div>
</div> */