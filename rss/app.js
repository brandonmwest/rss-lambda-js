const axios         = require('axios');     // http request library
const util          = require('util');
const xml2js        = require('xml2js');    // for turning RSS feeds into JS objects
const parseString   = util.promisify(xml2js.parseString);
const moment        = require('moment');    // help for managing datetimes
const Knex          = require('knex');      // SQL query builder
const { Model }     = require('objection'); // ORM built on Knex
const Item          = require('./models/item');
const Subscription  = require('./models/subscription');
const Tag           = require('./models/tag');

exports.lambdaHandler = async (event, context) => {
    // dbconfig exports an immediate async function
    const dbconfig = await require('./dbconfig'); 
    const knex = Knex(dbconfig.production);

    Model.knex(knex); // attach objection to knex

    try {
        let feedTotals = await checkSubscriptions();
        knex.destroy();
        console.log(feedTotals);
        context.succeed(feedTotals);
    } catch (err) {
        knex.destroy();
        context.fail(err);
    }
};

const checkSubscriptions = async () => {
    let feedCount, itemCount, newItemCount = 0;

    // get all active subscriptions
    let subscriptions = await Subscription.query()
        .where('isActive', 1);

    for (const sub of subscriptions) {
        let feed = await parseFeed(sub);
        feedCount++;

        let items = feed.items;
        itemCount += items.length;

        let newItems = await filterItems(sub, items);
        newItemCount += newItems.length;

        await Subscription.query()
            .patch({
                feedUpdatedAt: feed.feedUpdatedAt
            })
            .where('id', sub.id)

        await saveItems(sub, newItems);
        await sendCallbacks(sub, newItems);
    };

    message = feedCount + " feeds, " + itemCount + " items, " + newItemCount + " new.";
    return message;
}

const parseFeed = async (subscription) => {
    // get the RSS feed's XML  
    let xml = await getXml(subscription.url);

    // turn the XML into an object
    let xmlObj = await parseXml(xml);

    // restructure the data so it's easier to use
    let feed = await buildFeed(xmlObj);

    return feed;
}

const getXml = async (url) => {
    let response;
    try {
        response = await axios.get(url);
        return response.data;
    } catch (err) {
        console.log(err);
    }
}

const parseXml = async (xml) => {
    let json;

    try {
        json = await parseString(xml);
    } catch (err) {
        console.log(err);
    }

    return json;
}

const buildFeed = async function (xmlObj) {
    let feed = {
        items: []
    };
    if (xmlObj.feed.link) {
        feed.link = getLink(xmlObj.feed.link, 'alternate', 0);
        feed.feedUrl = getLink(xmlObj.feed.link, 'self', 1);
    }

    if (xmlObj.feed.title) {
        let title = xmlObj.feed.title[0] || '';
        if (title._) title = title._
        if (title) feed.title = title;
    }
    if (xmlObj.feed.updated) {
        feed.feedUpdatedAt = xmlObj.feed.updated[0];
    }

    (xmlObj.feed.entry || []).forEach(entry => {
        let item = {};
        if (entry.title) {
            let title = entry.title[0] || '';
            if (title._) title = title._;
            if (title) item.title = title;
        }
        if (entry.link && entry.link.length) {
            item.link = getLink(entry.link, 'alternate', 0);
        }
        if (entry.published && entry.published.length && entry.published[0].length) item.pubDate = new Date(entry.published[0]).toISOString();
        if (entry.author && entry.author.length) {
            item.author = {};
            item.author.name = entry.author[0].name[0];

            if (entry.author && entry.author.length)
                item.author.link = entry.author[0].uri[0];
        }

        item.tags = [];
        if (entry.category && entry.category.length) {
            entry.category.forEach(category => {
                item.tags.push(category.$.term);
            });
        }

        if (entry.summary && entry.summary.length) {
            item.summary = entry.summary[0]._;
        }

        if (entry.id) {
            item.id = entry.id[0];
        }

        feed.items.push(item);
    });
    return feed;
}

const filterItems = async (subscription, items) => {
    let cutoffTime = moment(subscription.feedUpdatedAt);

    // if the feed hasn't been updated before, set the threshold for new items
    if (!cutoffTime.isValid()) {
        cutoffTime = moment();
    }

    // filter out any items older than the last update timestamp
    let newItems = items.filter((item) => moment(item.pubDate).isAfter(cutoffTime))
    return newItems;
}

const saveItems = async (subscription, items) => {
    // add all the new items to the database
    for (const item of items) {
        createdItem = await Item.query()
            .insert({
                subscriptionId: subscription.id,
                title: item.title,
                url: item.link,
                published: item.pubDate,
                content: item.summary
            });

        // add any tags we haven't seen before
        await saveTags(item.tags, createdItem);
    }
}

const saveTags = async (tags, item) => {
    for(const tagName of tags){
        let tag = await Tag.query()
            .where({
                name: tagName
            });
        
        if(!tag.length)
            tag = await Tag.query()
            .insert({
                name: tagName
            });

        const itemTag = await item
            .$relatedQuery('tags')
            .relate(tag);
    }
}

const sendCallbacks = async (subscription, items) => {
    let callbackUrl = subscription.callbackUrl;

    const promises = items.map(async (item) => {
        let message = buildChatMessage(item);

        try {
            let ret = await axios({
                method: 'post',
                url: callbackUrl,
                data: {
                    "Content": message
                }
            });
        } catch (err) {
            console.log(err);
            return err;
        }
    })

    await Promise.all(promises);
}

const getLink = function (links, rel, fallbackIdx) {
    if (!links) return;
    for (let i = 0; i < links.length; ++i) {
        if (links[i].$.rel === rel) return links[i].$.href;
    }
    if (links[fallbackIdx]) return links[fallbackIdx].$.href;
}

const buildChatMessage = (item) => {
    let payload = "";
    let link = "[" + item.title + "](" + item.link + ")";

    if (item.title.startsWith("Comment by")) {
        payload = "💬 " + link;
    } else if (item.title.startsWith("Answer by")) {
        payload = "🏆 " + link;
    } else {
        payload = link + "\r\n";

        let tags = '';
        item.tags.forEach(x =>
            tags += '[' + x + '] '
        );

        payload += '`' + tags + '`';
    }
    return "/md " + payload;
}