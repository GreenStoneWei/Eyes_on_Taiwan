# Eyes on Taiwan  
##[Website link](https://wheatxstone.com)

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

---

## API docs

### Index API

- End Point:
    英文：`/index`
    中文：`/zh-tw/index`

- Method: `GET`

- Query Parameters

Field           |  Type     | Description
:-------------- | :-------: | :------------------------------------------
sort            | string    | sort article list by [ date | most_viewed ]
:-------------- | --------- | :------------------------------------------
tag | keyworld  | string    | filter artilce by [ tag | keyword]

- Request Example:
    `https://wheatxstone.com/?sort=most_viewed&tag=government`
    `https://wheatxstone.com/?sort=date&keyword=marriage`

- Success Response: 200

Field           |  Type     | Description
:-------------- | :-------: | :------------------------------------------
totalPage       | number    | return total pages that meet query conditions
:-------------- | --------- | :------------------------------------------
data            | Array     | Array of article object

- Success Response Example:

```
{
    totalPage: 3,
    data: [
        {
            id: 338,
            news: "The Washington Post",
            main_img: "https://www.washingtonpost.com/resizer/_J5d_jfLqpb-0oj9Dv2HcsLEzeY=/1484x0/arc-anglerfish-washpost-prod-washpost.s3.amazonaws.com/public/QLEF2LTYWEI6TJ57ZCSDXBHOGE.jpg",
            unixtime: 1558138627000,
            title: "Rainbow flags, roses and ponchos: Photos from Taiwan's same-sex marriage celebrations",
            abstract: "Advocates for LGBT rights hope Taiwan’s legalization of same-sex marriage will spark a ripple effect across Asia, where some countries are already inching toward marriage equality.",
            url: "https://www.washingtonpost.com/world/2019/05/17/rainbow-flags-roses-ponchos-photos-taiwans-same-sex-marriage-celebrations/",
            viewed_count: 205
        },
        {
            id: 339,
            news: "The Washington Post",
            main_img: "https://www.washingtonpost.com/resizer/TXJKur-cQ3m4AF9lqk_kkjfemkk=/3x2/www.washingtonpost.com/pb/resources/img/spacer.gif",
            unixtime: 1558127450000,
            title: "Taiwan becomes first in Asia to legalize same-sex marriage",
            abstract: "Taiwan’s high court ruled on May 24, 2017, that barring same-sex couples from marrying violates the Taiwanese constitution and gave the legislature two years to pass a corresponding law or see same-sex marriage become legalized automatically.",
            url: "https://www.washingtonpost.com/world/asia_pacific/taiwan-becomes-first-country-in-asia-to-legalize-same-sex-marriage/2019/05/17/d60e511e-7893-11e9-bd25-c989555e7766_story.html",
            viewed_count: 1
        },
    ...
}
```    

- Error Response: 4xx

Field           |  Type     | Description
:-------------- | :-------: | :------------------------------------------
error           | string    | Error Message

- Error Response Example

```
{
    error: "No Search Result for "notexist""
}
```

### Article API
