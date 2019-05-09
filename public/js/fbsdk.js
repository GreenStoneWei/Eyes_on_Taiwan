window.fbAsyncInit = function() {
	FB.init({
		appId: '2530555113837912',
		cookie: true,
		xfbml: true,
		version: 'v3.2',
	});
	FB.AppEvents.logPageView();
};

(function(d, s, id) {
	let js;
	let fjs = d.getElementsByTagName(s)[0];
	if (d.getElementById(id)) return;
	js = d.createElement(s);
	js.id = id;
	js.src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v3.0';
	fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

