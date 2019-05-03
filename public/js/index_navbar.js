const navDate = document.getElementById('nav-date');
const navViewed = document.getElementById('nav-viewed');
const search = document.getElementById('search');
const searchSubmitBtn = document.getElementById('search-icon');
const languageSwitchBtn = document.getElementById('translation');

document.addEventListener('DOMContentLoaded', (event) => {
    event.preventDefault();
    let tag = getParameterByName('tag');
    let keyword = getParameterByName('keyword');
    let filter = '&tag='+tag;
    if(keyword !== null){
        filter = '&keyword='+keyword;
    }
    let endPoint = './zh-tw/'+ getEndPoint(window.location.href);
    setAttributes(navDate,{href:`./?sort=date`+filter});
    setAttributes(navViewed,{href:`./?sort=most_viewed`+filter});
    setAttributes(languageSwitchBtn,{href:endPoint});
}) // End of document.addEventListener

searchSubmitBtn.addEventListener('click',(event)=>{
    event.preventDefault();
    let sort = getParameterByName('sort');
    let keyword = search.value;
    window.location.replace(`/?sort=${sort}&keyword=${keyword}`);
})

