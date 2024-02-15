this.addEventListener ('activate', function (event) {
    console.log ('service worker activated');
  });


  self.addEventListener('push', function(e) {
    const data = e.data.json();
    self.registration.showNotification(
        data.title,
        {
            body: data.body,
        }
    );
})