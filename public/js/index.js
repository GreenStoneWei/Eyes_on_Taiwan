const container = document.querySelector('.wrap');

function createArticleCard(array,parentElement){
    for (let i=0 ; i<array.length ; i++){
        let card       = createElement("div",["card","card-size"],false,parentElement);
        let cardHeader = createElement("div",["card-header"],false,card);
        let headerRow  = createElement("div",["row"],false,cardHeader);
        let source     = createElement("span",["col-7"],false,headerRow);
        let time       = createElement("span",["col-5","text-right"],false,headerRow);
        let cardBody   = createElement("div",["card-body"],false,card);
        if (array[i].main_img === null || array[i].main_img=== "undefined"){
            let defaultImg;
            switch (array[i].source){
                case 'Aljazeera':
                    defaultImg = 'https://s3.amazonaws.com/wheatxstone/news/aljazeera_default.png';
                    break;
                case 'BBC':
                    defaultImg = 'https://s3.amazonaws.com/wheatxstone/news/bbc_default.png';
                    break;
                case 'CNN':
                    defaultImg = 'https://s3.amazonaws.com/wheatxstone/news/cnn_default.jpg';
                    break;
                case 'The Economist':
                    defaultImg = 'https://s3.amazonaws.com/wheatxstone/news/economist_default.png';
                    break;
                case 'The Guardian':
                    defaultImg = 'https://s3.amazonaws.com/wheatxstone/news/guardain_default.jpg';
                    break;
                case 'INDEPEDENT':
                    defaultImg = 'https://s3.amazonaws.com/wheatxstone/news/independent_default.png';
                    break;
                case 'NY Times':
                    defaultImg = 'https://s3.amazonaws.com/wheatxstone/news/nytimes_default.jpg';
                    break;
                case 'QUARTZ':
                    defaultImg = 'https://s3.amazonaws.com/wheatxstone/news/quartz_default.jpg';
                    break;
                case 'The Washington Post':
                    defaultImg = 'https://s3.amazonaws.com/wheatxstone/news/wpost_default.jpg';
                    break;
            }
            let mainImg = createElement("img",["card-img-top","main-img"],{src:defaultImg},cardBody);
        }
        else{
            let mainImg = createElement("img",["card-img-top","main-img"],{src:array[i].main_img},cardBody);
        }
        let title      = createElement("h4",["card-title"],false,cardBody);
        let abstract   = createElement("p",["card-text"],false,cardBody);
        let readMore   = createElement("a",["card-link"],{href:`/article.html?source=${array[i].source}&id=${array[i].id}`},cardBody); // # to be replaced
        source.innerHTML   = array[i].source;
        time.innerHTML     = dateFormat(array[i].unixtime);
        title.innerHTML    = array[i].title;
        abstract.innerHTML = array[i].abstract;
        readMore.innerHTML = "閱讀更多";
    }
}

document.addEventListener('DOMContentLoaded', (event) => {
    event.preventDefault();
    let page =parseInt(getParameterByName('page'));
    if (!Number.isInteger(page)){
        page = 1;
    }
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        let articleList = JSON.parse(this.responseText);
        createArticleCard(articleList,container);
        createPagination(page);
      }
    };
    xhr.open("GET", `/api/showindex?page=${page}`, true);
    xhr.send();
}) // End of document.addEventListener

const pagination = document.querySelector('.pagination');


function createPagination(page){
    let previous = createElement('li',['page-item'],false,pagination);
    let prevLink = createElement('a',['page-link'],{href:`/?page=${page-1}`},previous);
    prevLink.innerHTML = '&laquo';
    for (let i=1; i<11 ;i++){
        let pageItem = createElement('li',['page-item'],false,pagination);
        let pg = createElement('a',['page-link'],{href:`/?page=${i}`},pageItem);
        pg.innerHTML = i;
        if(i===page){
            pageItem.classList.add('active');
            // pageItem.classList.add('disabled');
        }
    }
    let next = createElement('li',['page-item'],false,pagination);
    let nextLink = createElement('a',['page-link'],{href:`/?page=${page+1}`},next);
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