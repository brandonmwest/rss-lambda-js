const axios = require('axios');
const util = require('util');
const xml2js = require('xml2js');
const parseString = util.promisify(xml2js.parseString);
const moment = require('moment');
const Knex = require('knex');
const { Model } = require('objection');
const Item = require('./models/item');
const Subscription = require('./models/subscription');

exports.lambdaHandler = async (event, context) => {
    const dbconfig = await require('./dbconfig'); //dbconfig exports an immediate async function
    const knex = Knex(dbconfig.production);

    Model.knex(knex); // attach objection to knex

    try {
        let feedTotals = await checkSubs();
        knex.destroy();
        console.log(feedTotals);
        context.succeed(feedTotals);
    } catch (err) {
        knex.destroy();
        console.err(err);
        context.fail(err);
    }
};

const checkSubs = async () => {
    let feedCount = 0;
    let itemCount = 0;
    let newItemCount = 0;

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
                feedUpdatedAt: feed.lastBuildDate
            })
            .where('id', sub.id)

        await saveItems(sub, newItems);
        await sendCallbacks(sub, newItems);
    };

    message = feedCount + " feeds, " + itemCount + " items, " + newItemCount + " new.";
    return message;
}

const parseFeed = async (subscription) => {
    let xml = await getXml(subscription.url);
    let xmlObj = await parseXml(xml);
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
        feed.lastBuildDate = xmlObj.feed.updated[0];
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
        created = await Item.query()
        .insert({
            subscriptionId: subscription.id,
            title: item.title,
            url: item.link,
            published: item.pubDate,
            content: item.summary
        });
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