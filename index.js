require("dotenv").config({ path: "./environment/development.env" })
const twitter = require('twitter')
const { filter } = require('rxjs')
const fs  = require('fs')


const client = new twitter({
  consumer_key: process.env.API_KEY,
  consumer_secret: process.env.API_SECRET_KEY,
  access_token_key: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
})

const params ={
  q: 'coca cola', 
  lang: 'en', 
  result_type: 'recent', 
  include_entities: false,
  count: 100,
  until: '2020-04-18'}

client.get('search/tweets', params)
  .then(tweets => {
    
    console.dir(tweets.statuses, {depth: null});
    writeFile(tweets.statuses.map(x => getTweetText(x)), 'normal_tweets')

    const filteredTweets = filterTweets(tweets.statuses)
    const filteredTweetsText = filterTweets.map(x => getTweetText(x))
    writeFile(filteredTweetsText, 'filtered_tweets')
    
  })
  .catch(error => {
    console.log(error);      
    
  })

function filterTweets(tweetsList) {
  return tweetsList.filter(x => !(/^RT @.*/.test(x.text)))
}

function checkForFile(filename, callback) {
  fs.exists(filename, exists => {
    if (exists) callback()
    else {
      fs.writeFile(filename, {flag: 'wx'}, function (err, data) 
      { 
          callback();
      })
    }
  })
}

function writeFile(json, path) {
  const filename = `./file/${path}.json`

  checkForFile(filename, () => {
    fs.writeFileSync(filename, JSON.stringify(json, null, 2),'utf-8', { flag: 'wx' }, err => {
      if (err) console.log(err); return;
    })
  })
}

function getTweetText(tweet) {
  return tweet.text
}
