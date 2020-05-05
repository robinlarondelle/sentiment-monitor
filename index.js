require("dotenv").config({ path: "./environment/development.env" })
const Twitter = require('twitter')
const moment = require("moment")
const { filter, zip } = require('rxjs')
const { map } = require('rxjs/operators')
const natural = require("natural")
const tokenizer = new natural.WordTokenizer()
const fs = require('fs')
natural.PorterStemmer.attach()
const Analyzer = natural.SentimentAnalyzer
const stemmer = natural.PorterStemmer
const analyzer = new Analyzer("English", stemmer, "afinn")
const twitter = new Twitter({
  consumer_key: process.env.API_KEY,
  consumer_secret: process.env.API_SECRET_KEY,
  access_token_key: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
})
const params = {
  q: 'trump',
  lang: 'en',
  include_entities: false,
  count: 100,
  until: moment().subtract(6, "days").format("yyyy-MM-DD"),
  tweet_mode: 'extended',
  result_type: 'recent'
}

fetchTweetsWhile({ tweets: [], max_id: null }, x => x.length < 100, fetchFilteredTweets, params)
  .then(tweets => polishTweets(tweets))
  .then(polishedTweets => writeFile(polishedTweets, 'filtered_tweets'))
  .then(sentimentTweets => writeFile(sentimentTweets, 'sentimentTweets'))
  .catch(err => console.log(err))

function fetchTweetsWhile(data, condition, action, params) {
  var whilst = data => {
    if (condition(data.tweets)) {
      params.max_id = data.max_id ? data.max_id : null
      return action(data.tweets, params).then(whilst)
    } else {
      return Promise.resolve(data.tweets)
    }
  }

  return whilst(data)
}

function fetchFilteredTweets(oldList, params) {
  return new Promise((resolve, reject) => {
    getTweets(params)
      .then(tweets => removeRetweets(tweets.statuses.map(t => t.full_text))
        .then(nonRetweets => removeDuplicates(oldList.concat(nonRetweets)))
        .then(uniqueTweets => {
          resolve({
            tweets: uniqueTweets,
            max_id: tweets.statuses[tweets.statuses.length - 1].id
          })
        }).catch(err => console.log(err))
      )
  })
}

function removeDuplicates(tweets) {
  return new Promise((resolve, reject) => {
    resolve(Array.from(new Set(tweets)))
  })
}

function getTweets(params) {
  return twitter.get('search/tweets', params)
}

function removeRetweets(tweets) {
  return new Promise((resolve, reject) => {
    resolve(tweets.filter(x => !(/^RT @.*/.test(x))))
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
      return [sentiment, tokenizedTweets[index].join(' ')]
    }))
  })
}

function writeFile(json, path) {
  const filename = `./file/${path}.json`

  checkForFile(filename, () => {
    fs.writeFileSync(filename, JSON.stringify(json, null, 2), 'utf-8', { flag: 'wx' }, err => {
      if (err) console.log(err)
      return
    })
  })
}

function checkForFile(filename, callback) {
  fs.exists(filename, exists => {
    if (exists) callback()
    else {
      fs.writeFile(filename, { flag: 'wx' }, function (err, data) {
        callback()
      })
    }
  })
}