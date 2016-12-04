export const redisConfig = {
    host: process.env.REDIS_HOST || 'redis'
};

export const rssConfig = {
    urls: process.env.RSS_URLS,
    feedNames: process.env.RSS_FEED_NAMES,
    refreshMinutes: process.env.RSS_CHECK_MINUTES || '5',
};

console.log('RSS Config', rssConfig);

export const slackConfig = {
    hookUrl: process.env.SLACK_URL,
    postChannel: process.env.SLACK_CHANNEL,
};

function checkConfig(obj) {
    Object.keys(obj).forEach((key) => {
        if(!obj[key]){
            throw 'Invalid configuration';
        }
    });
}

[redisConfig, rssConfig, slackConfig].forEach(checkConfig);
