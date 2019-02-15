# rss-lambda-js

TL:DR; new rss entry -> database -> webhook POST

This is an [AWS SAM](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html) application that polls a list of RSS feeds, stores new entries, and sends a notification about each new entry to a callback URL.

It is currently designed to work specifically with [Stack Overflow question feeds](https://stackoverflow.com/feeds/tag?tagnames=node.js&sort=newest) and [user feeds](https://stackoverflow.com/feeds/user/401096).

```
.
├── README.md
├── rss                         <-- Lambda function source code
│   ├── models                  <-- ORM model definitions (objection.js)
│   │   └── item.js             <-- Feed entries that belong to a subscription
│   │   └── subscription.js     <-- RSS feed URL, callback URL, etc
│   │   └── tag.js              <-- Item tags
│   ├── app.js                  <-- Lambda event handler definition
│   ├── dbconfig.js             <-- Database connection info
│   ├── package.json            <-- NodeJS dependencies
│   └── tests                   <-- Unit tests (...eventually)
└── template.yaml               <-- SAM template
```
