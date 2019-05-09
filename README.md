# Eyes on Taiwan

Eyes on Taiwan is a website gathering international news about Taiwan automatically. As Taiwan's medias are interfered, we all need to look at Taiwan-related events from different aspects.

---

##Features and Tech used

- Linux Crontab: to assign schedule scrape task.
- Article Recommender System: recommend similar article based on tf-idf.
- Abstract extraction model.
- Loading Speed Optimization:
    - Image compression
    - Upload images to Amazon S3
    - build Amazon Cloudfront (CDN) for image loading
- Performance Optimization:
    - Redis: article content cache and viewed count.
- Error mailer: to have the server send email to notify when the application throws errors.
- Traditional Chineses supported (translated by Google translation API).

---

###[Website link](https://wheatxstone.com)