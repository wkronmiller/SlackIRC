export const ircConfig = {
    nick: process.env.IRC_NICK,
    server: process.env.IRC_SERVER,
};

export const slackConfig = {
    botToken: process.env.SLACK_BOT_TOKEN,
    adminToken: process.env.SLACK_ADMIN_TOKEN,
};

function checkConfig(obj) {
    Object.keys(obj).forEach((key) => {
        if(!obj[key]){
            throw 'Invalid configuration';
        }
    });
}

[ircConfig, slackConfig].forEach(checkConfig);
