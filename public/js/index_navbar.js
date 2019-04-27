const navDate = document.getElementById('nav-date');
const navViewed = document.getElementById('nav-viewed');

document.addEventListener('DOMContentLoaded', (event) => {
    event.preventDefault();
    let tag = getParameterByName('tag');
    setAttributes(navDate,{href:`./?sort=date&tag=${tag}`});
    setAttributes(navViewed,{href:`./?sort=most_viewed&tag=${tag}`});
}) // End of document.addEventListener