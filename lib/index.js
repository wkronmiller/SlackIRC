import IRC from 'irc';
import winston from 'winston';
import {slackConfig, ircConfig} from './config';
import {WCWrapper,bindChannels} from './slackHelper';

winston.level = 'debug';

const slack = new WCWrapper(slackConfig.adminToken, slackConfig.botToken);

const irc = new IRC.Client(ircConfig.server, ircConfig.nick, {
    port: 6697, 
    secure: true,
    userName: 'slack-relay', 
});

// Map from slack channel ID's to channel names
var channelMap = {};
irc.addListener('pm', (from, message) => {
    slack.mkOrGetChannel(`irc-${from}`, true).then(({id, name}) => {
        return slack.joinChannel(id, name);
    })
    .catch((error) => winston.error('IRC unable to get channel', {error, from, message}))
    .then(({channelId, channelName}) => {
        channelMap[channelId] = channelName;
        return slack.sendMessage({
            channel: channelId, 
            text: message,
            username: from,
            unfurl_links: true,
        });
    })
    .catch((error) => winston.error('IRC unable to send message to slack', {error, from, message}));
});

irc.addListener('error', winston.error);

winston.info('Getting slack channels');
bindChannels(slack, 'irc')
.then((channels) => {
    channelMap = channels;
    slack.setupRTM(({channel, user, text}) => {
        const channelName = channelMap[channel];
        if(!channelName) {
            return winston.debug('Message from unrecognized channel', text);
        }
        if(!user){
            return;
        }
        const ircName = channelName.replace('irc-', '');
        irc.say(ircName, text);
    }); 
});
