import redis from 'redis';
import flatMap from 'flatmap';
import fastFeed from 'fast-feed';
import request from 'request';
import htmlToText from 'html-to-text';
import {redisConfig, slackConfig, rssConfig} from './config';

const REDIS_SET_NAME = `rss-posts:${slackConfig.postChannel}`;

const redisClient = redis.createClient({host: redisConfig.host});

function checkPost(post){
    return new Promise((resolve, reject) => {
        redisClient.sadd(REDIS_SET_NAME, post.id, (err, result)=>{
            if(err){
                return reject(err);
            }
            const output = {exists: result === 0, post};
            return resolve(output);
        });
    });
}

function postData(body) {
    const options = {
        url: slackConfig.hookUrl,
        method: 'POST',
        body: JSON.stringify(body),
    };
    request(options, (err, response, body) => {
        if(err || response.statusCode !== 200){
            console.error(response.statusCode);
            throw err;
        }
    });
}

function sendLink(attachment, username) {
    postData({
        attachments: [attachment],
        channel: slackConfig.postChannel,
        username
    });
}

function sendMessage(message, username) {
    postData({
        text: message,
        username,
        channel: slackConfig.postChannel,
        unfurl_links: true,
        unfurl_media: true,
    });
}

function loadPublicationFeed({name, url}) {
    return new Promise((resolve, reject) => {
        request(url, (error, response, body) => {
            if(!error && response.statusCode === 200) {
                return resolve({name, body});
            }
            return reject({error: error, response: response});
        });
    });
}

function loadPublicationFeeds(feeds) {
    return Promise.all(feeds.map(loadPublicationFeed)).then((feeds) => {
        return feeds;
    });
}

function parseFeed({name, body}) {
    return fastFeed.parse(body).items.map((item) => {
        Object.keys(item).map((key) => {
            item[key] = htmlToText.fromString(item[key]);
        });
        const {id, title, description, date, link} = item;
        // Create slack attachment
        const attachment = {
            title,
            title_link: id,
            text: `${description}\n<${link}>`,
            color: '#622569',
            footer: date,
        };
        return {name, id, body: attachment};
    });
}

const feeds = (function parseConfig(){
    const {urls, feedNames} = rssConfig; 
    const urlList = urls.split(',');
    const nameList = feedNames.split(',');
    if(urlList.length !== nameList.length) {
        throw 'Feed Name/URL Mismatch';
    }
    return nameList.map((name, index) => {
        return {name, url: urlList[index]};
    });
})();

sendMessage(`RSS Bot Configured with feeds ${feeds
    .map(({name, url}) => `${name}: ${url}`)
        .reduce((a,b) => `${a}, ${b}`)}`, 
    'RSS-Bot');

const waitPerMessageMS = 200;

(function monitorNews() {
    loadPublicationFeeds(feeds)
    .then((feeds)=> flatMap(feeds, parseFeed), console.error)
    .then((posts) => Promise.all(posts.map(checkPost)), console.error)
    .then((posts) => posts.filter((post) => post.exists === false))
    .then((posts) => posts.map((post) => post.post))
    .then((posts) => posts.map((post, index) => {
        const {name, body} = post;
        setTimeout(() => sendLink(body, name), waitPerMessageMS * index);
        return post;
    }))
    .then((posts) => {
        const timeUntilComplete = waitPerMessageMS * posts.length;
        const waitTime = parseInt(rssConfig.refreshMinutes) * 60 * 1000;
        console.log(`Loaded ${posts.length} posts ${new Date()}`);
        setTimeout(monitorNews, waitTime + timeUntilComplete);
    });
})();
