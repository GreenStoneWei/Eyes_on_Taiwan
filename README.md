# Eyes on Taiwan  ##[link](https://wheatxstone.com)

Eyes on Taiwan is a website gathering international news about Taiwan automatically. As Taiwan's medias are interfered, we all need to look at Taiwan-related events from different aspects.

---

## Features and Tech used

- Linux Crontab: to assign scheduled scraping tasks.
- Article **Recommender System**: recommend similar article based on tf-idf analysis method.
- Text Mining: Abstract extraction model.
- Loading Speed Optimization:
    - Image compression
    - Upload images to Amazon **S3**
    - Implement Amazon **Cloudfront** (CDN) for image loading
- Performance Optimization:
    - **Redis**: cache for article content and view counts.
    - MySQL: connection pool
- Implement Data Access Object (DAO)
- Error mailer: send notifications by email when the application throws errors.
- Google translation API to support Traditional Chinese.
- Social Media Sharing: Facebook share, Facebook comment, LINE share

---

## Backend Architecture

![Imgur](https://i.imgur.com/DnWYacF.png)

---

## Database Schema

![Imgur](https://i.imgur.com/fZ6oFJg.png)
