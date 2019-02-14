# rss-lambda-js

A Lambda SAM application that polls a list of RSS feeds, stores new entries, and sends a notification about each new entry to a callback URL.

Currently designed to work specifically with Stack Overflow question and user feeds.

```bash
.
├── README.md
├── rss                         <-- Lambda function source code
│   ├── models                  <-- ORM model definitions
│   │   └── item.js             <-- Feed entries that belong to a subscription
│   │   └── subscription.js     <-- RSS feed URL, callback URL, etc
│   │   └── tag.js              <-- RSS tags
│   ├── app.js                  <-- Lambda function code
│   ├── dbconfig.js             <-- Database connection info
│   ├── package.json            <-- NodeJS dependencies
│   └── tests                   <-- Unit tests (...eventually)
└── template.yaml               <-- SAM template
```

## Requirements

* AWS CLI already configured with Administrator permission
* [NodeJS 8.10+ installed](https://nodejs.org/en/download/)
* [Docker installed](https://www.docker.com/community-edition)
