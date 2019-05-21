# Eyes on Taiwan 
## [Website link](https://wheatxstone.com)

Eyes on Taiwan is a website gathering international news about Taiwan automatically. As Taiwan's medias are interfered, we all need to look at Taiwan-related events from different aspects.

**News Source:**

- Aljazeera
- The BBC
- The CNN
- The Economist
- Guardian
- Independent
- New York Times
- QUARTZ
- Washington Post

---

## Features and Tech used

- Linux Crontab: to assign scheduled scraping and computational tasks.
    1. Crawl 9 source news.
    2. Fix images that didn't scrape - call Google Image Search API under specific news domain.
    3. Calculate and generate tags, abstracts and similar article
    4. Call Google Cloud API to translate article content. 
- Article **Recommender System** - find similar articles based on [tf-idf](https://zh.wikipedia.org/wiki/Tf-idf) analysis method:
    1. Set up stemmers and stop words then slice each valid word.
    2. Calculate the term frequency of each article and all article corpus.
    3. Convert term frequency into a vector and map it on a 50 dimension vector space model.
    4. Find similar articles by calculating cosine theta of two article. The result closer to 1 stands for higher similarity. 
- Text Mining - Abstract and Tag extraction model:
    1. Slice each sentence.
    2. Calculate the term frequency of the article. A word with higher frequency means that its more important to the article.
    3. Find out which sentence contains the most important word. That sentence is supposed to be close to the article content.
- Loading Speed Optimization:
    - Image compression
    - Upload images to Amazon **S3**
    - Implement Amazon **CloudFront** (CDN) for image loading
- Performance Optimization:
    - **Redis**: cache for article content and view counts.
        - The reason to cache view counts is to reduce MySQL queries. If the application queries DB each time when a user reads one article, the server may become slow when traffic goes high. Therefore, this website is designed to cache all the view count in memory and regularly update to DB to reduce DB queries. 
    - MySQL: connection pool
- Implement Data Access Object (DAO)
- Error mailer: send notifications by email when the application throws errors.
- Google translation API to support Traditional Chinese.
- Social Media Sharing: Facebook share, Facebook comment, LINE share
- ESLint - follow Google Coding Style

---

## Backend Architecture

![Imgur](https://i.imgur.com/DnWYacF.png)

1. The images are uploaded to AWS S3, and CloudFront is used to establish CDN and reduce loading latency.
2. When browser sends requests on 443 port to the server, first connect to reverse proxy server (by NGINX). Then NGINX redirect request to the port where the application runs.
3. When browser requests the article content, the application first check if the content has been cached. If yes, response with cache.
4. If the content hasn't been cached or cached content was expired, query database.

---

## Database Schema

![Imgur](https://i.imgur.com/fZ6oFJg.png)

- Set primary key, foreign keys
- Index improves query performance (use `EXPLAIN`)

---

## API docs

### Index API

- End Point:

    English：`/api/index`

    繁體中文：`/api/zh-tw/index`

- Method: `GET`

- Query Parameters

Field           |  Type     | Description
:-------------- | :-------: | :------------------------------------------
sort            | string    | sort article list by [ date | most_viewed ]
tag | keyworld  | string    | filter artilce by [ tag | keyword]

- Request Example:

    `https://wheatxstone.com/?sort=most_viewed&tag=government`

    `https://wheatxstone.com/?sort=date&keyword=marriage`

- Success Response: 200

Field           |  Type     | Description
:-------------- | :-------: | :------------------------------------------
totalPage       | number    | return total pages that meet query conditions
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
    error: "Invalid Article ID"
}
```

```
{
    error: "No Search Result for "notexist""
}
```

### Word Cloud API

- End Point:

    English：`/api/word/cloud`

    繁體中文：`/api/zh-tw/word/cloud`

- Method: `GET`

- Request Example:

    `https://wheatxstone.com/api/word/cloud`

- Success Response: 200

Field           |  Type     | Description
:-------------- | :-------: | :------------------------------------------------
data            | Array     | contains arrays of each term and term frequency (order by freq weight)

- Success Response Example:

```
[
    [
        "china",
        12.205143652109287
    ],
    [
        "chinese",
        10.257067748108728
    ],
    [
        "beijing",
        9.547556456757274
    ],
    ...
]
```


### Tags API

- End Point:

    English：`/api/card/tags`

    繁體中文：`/api/zh-tw/card/tags`

- Method: `GET`

- Query Parameters

Field           |  Type     | Description
:-------------- | :-------: | :------------------------------------------
id              | number    | article ID

- Request Example:

    `https://wheatxstone.com/api/card/tags?id=339`

- Success Response: 200

Field           |  Type     | Description
:-------------- | :-------: | :------------------------------------------
data            | Array     | Array of strings, each string is a tag for the article

- Success Response Example:

```
[
    "sex",
    "marriage",
    "couples",
    "law",
    "rights"
]
```    

### Article API

- End Point:

    English：`/api/article`

    繁體中文：`/api/zh-tw/article`

- Method: `GET`

- Query Parameters

Field           |  Type     | Description
:-------------- | :-------: | :------------------------------------------
id              | number    | article ID

- Request Example:

    `https://wheatxstone.com/api/article?id=339`

- Success Response: 200

Field           |  Type     | Description
:-------------- | :-------: | :------------------------------------------
data            | Array     | contains an article object


Object Properties |  Type     | Description
:---------------- | :-------: | :------------------------------------------
id                | number    | article ID
new_id            | number    | news ID (foreign key to news table)
url               | string    | url of the article
title             | string    | article title
subtitle          | string    | article subtitle (optional)
abstract          | string    | article abstract
author            | string    | article author
unixtime          | number    | unixtime of published time
context           | string    | article content


- Success Response Example:

```
[
    {
        "id":9,
        "news_id":9,
        "url":"https://www.washingtonpost.com/world/asia_pacific/taiwan-becomes-first-country-in-asia-to-legalize-same-sex-marriage/2019/05/17/d60e511e-7893-11e9-bd25-c989555e7766_story.html",
        "title":"Taiwan becomes first in Asia to legalize same-sex marriage",
        "subtitle":"Taiwan's legislature voted decisively to legalize \"exclusive permanent unions\" in a victory for the island's LGBT community.",
        "abstract":"Taiwan’s high court ruled on May 24, 2017, that barring same-sex couples from marrying violates the Taiwanese constitution and gave the legislature two years to pass a corresponding law or see same-sex marriage become legalized automatically.",
        "author":"Nick Aspinwall",
        "unixtime":1558127450000,
        "context":"TAIPEI, Taiwan — Thousands of marriage-equality advocates celebrated Friday in the pouring rain outside Taiwan’s legislature as it voted to become the first in Asia to fully legalize same-sex unions...
    }
    ...
]    
```    

`Note: Response may return from cache.`


- Error Response: 4xx

Field           |  Type     | Description
:-------------- | :-------: | :------------------------------------------
error           | string    | Error Message

- Error Response Example

```
{
    error: "Invalid Article ID"
}
```

```
{
    error: "Article ID 1099 Does Not Exist."
}
```