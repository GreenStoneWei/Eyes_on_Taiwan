const navDate = document.getElementById('nav-date');
const navViewed = document.getElementById('nav-viewed');
const search = document.getElementById('search');
const searchSubmitBtn = document.getElementById('search-icon');

document.addEventListener('DOMContentLoaded', (event) => {
    event.preventDefault();
    let tag = getParameterByName('tag');
    let keyword = getParameterByName('keyword');
    let filter = '&tag='+tag;
    if(keyword !== null){
        filter = '&keyword='+keyword;
    }
    setAttributes(navDate,{href:`./?sort=date`+filter});
    setAttributes(navViewed,{href:`./?sort=most_viewed`+filter});
}) // End of document.addEventListener

searchSubmitBtn.addEventListener('click',(event)=>{
    event.preventDefault();
    let sort = getParameterByName('sort');
    let keyword = search.value;
    window.location.replace(`/?sort=${sort}&keyword=${keyword}`);
   
    // let xhr = new XMLHttpRequest();
    // xhr.onreadystatechange = function() {
    //   if (this.readyState == 4 && this.status == 200) {
    //     let articleList = JSON.parse(this.responseText).data;
    //     let totalPage = JSON.parse(this.responseText).totalPage;
    //     createArticleCard(articleList,container);
    //     createPagination(sort, page, tag, totalPage);
    //   }
    // };
    // xhr.open("GET", `/api/index?keyword=${keyword}`, true); // index
    // xhr.send();
})