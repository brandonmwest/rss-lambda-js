# rss-lambda-js

SAM application that polls a list of RSS feeds, stores new entries, and sends a notification about each new entry to a callback URL.

Currently designed to work specifically with Stack Overflow question and user feeds.

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
