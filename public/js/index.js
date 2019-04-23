const container = document.querySelector('.wrap');
const pagination = document.querySelector('.pagination');

document.addEventListener('DOMContentLoaded', (event) => {
    event.preventDefault();
    let page = parseInt(getParameterByName('page'));
    if (!Number.isInteger(page)){
        page = 1;
    }
    let sort = getParameterByName('sort');
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        let articleList = JSON.parse(this.responseText);
        createArticleCard(articleList,container);
        createPagination(sort,page);
      }
    };
    xhr.open("GET", `/api/migration?sort=${sort}&page=${page}`, true); // index
    xhr.send();
}) // End of document.addEventListener

function createPagination(sort,page){
    let previous = createElement('li',['page-item'],false,pagination);
    let prevLink = createElement('a',['page-link'],{href:`/?sort=${sort}&page=${page-1}`},previous);
    prevLink.innerHTML = '&laquo';
    for (let i=1; i<11 ;i++){
        let pageItem = createElement('li',['page-item'],false,pagination);
        let pg = createElement('a',['page-link'],{href:`/?sort=${sort}&page=${i}`},pageItem);
        pg.innerHTML = i;
        if(i===page){
            pageItem.classList.add('active');
            // pageItem.classList.add('disabled');
        }
    }
    let next = createElement('li',['page-item'],false,pagination);
    let nextLink = createElement('a',['page-link'],{href:`/?sort=${sort}&page=${page+1}`},next);
    nextLink.innerHTML ='&raquo;';
    if(page===1){
        previous.classList.add('disabled');
    }
    if(page===10){
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