require("dotenv").config({ path: "./environment/development.env" })
const twitter = require('twitter')
const moment = require("moment")
const { filter, zip } = require('rxjs')
const { map } = require('rxjs/operators')
const natural = require("natural")
const util = require('util')
const tokenizer = new natural.WordTokenizer();
const fs = require('fs')
natural.PorterStemmer.attach();
const Analyzer = natural.SentimentAnalyzer;
const stemmer = natural.PorterStemmer;
const analyzer = new Analyzer("English", stemmer, "afinn");
const client = new twitter({
  consumer_key: process.env.API_KEY,
  consumer_secret: process.env.API_SECRET_KEY,
  access_token_key: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
})
const until = moment().subtract(6, "days").format("yyyy-MM-DD")
const params = {
  q: 'trump',
  lang: 'en',
  include_entities: false,
  count: 100,
  until,
  tweet_mode: 'extended',
  result_type: 'recent'
}

tweets.then(tweets => polishTweets(tweets))
  .then(polishedTweets => getTweetSentiment(polishedTweets))
  .then(sentimentTweets => writeFile(sentimentTweets, 'sentimentTweets'))
  .catch(err => console.log(err))

getTweets.then(tweets => {
  const min_id = tweets.statuses[0].id
  const max_id = tweets.statuses[tweets.statuses.length-1].id
  const tweets = tweets.statuses.tweets.statusesmap(x => x.text)

  removeRetweets(tweets).then(removedRetweets => {
    if (removedRetweets.length >= 100) {
      //continute
    } else {
      // get more tweets
    }
  })
})

function getTweets(params) {
  return new Promise((resolve, reject) => {
    client.get('search/tweets', params).then(tweets => {
      // params.max_id = tweets.statuses[tweets.statuses.length-1].id
      resolve(tweets)
    }).catch(err => console.log(err))
  })
}

function polishTweets(tweetsList) {
  return new Promise((resolve, reject) => {
    removeURLs(tweetsList)
      .then(filteredURLs => removeMentions(filteredURLs))
      .then(filteredMentions => removeEmojis(filteredMentions))
      .then(filteredEmojis => resolve(filteredEmojis))
      .catch(err => console.log(err))
  })
}

//tokenize 
//get sentiment

function removeRetweets(tweetsList) {
  return new Promise((resolve, reject) => {
    resolve(tweetsList.filter(x => !(/^RT @.*/.test(x))))
  })
}

function removeURLs(tweets) {
  return new Promise((resolve, reject) => {
    resolve(tweets.map(x => x.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '').trim()))
  })
}

function removeMentions(tweets) {
  return new Promise((resolve, reject) => {
    resolve(tweets.map(x => x.replace(/\B([@][\w_-]+)/g, '').trim()))
  })
}

function removeEmojis(tweets) {
  return new Promise((resolve, reject) => {
    resolve(tweets.map(x => x.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim()))
  })
}

function tokenizeTweets(tweets) {
  return new Promise((resolve, reject) => {
    resolve(tweets.map(x => tokenizer.tokenize(x)))
  })
}

function getTweetSentiment(tokenizedTweets) {
  return new Promise((resolve, reject) => {
    const sentiments = tokenizedTweets.map(x => analyzer.getSentiment(x))
    resolve(sentiments.map((sentiment, index) => {
      return [sentiment, tokenizedTweets[index].join(' ')];
    }))
  })
}

function writeFile(json, path) {
  const filename = `./file/${path}.json`

  checkForFile(filename, () => {
    fs.writeFileSync(filename, JSON.stringify(json, null, 2), 'utf-8', { flag: 'wx' }, err => {
      if (err) console.log(err); return;
    })
  })
}

function checkForFile(filename, callback) {
  fs.exists(filename, exists => {
    if (exists) callback()
    else {
      fs.writeFile(filename, { flag: 'wx' }, function (err, data) {
        callback();
      })
    }
  })
}