require('dotenv').config()
const sql = require('mssql');
const fs = require('fs');
const dateFormat = require('dateformat');
const removeMd = require('remove-markdown');
const wordcount = require('wordcount');

const config = {
    server: process.env.SERVER,
    database:'DBSteem',
    user:process.env.USER,
    password:process.env.PASS,
    requestTimeout : 990000,
    stream : true
};

const now = new Date();
console.log(now);

const sqlStr = `
select top 100
votes.voter
,votes.[weight]
,comments.author
,comments.permlink
,votes.[timestamp] as vote_tstamp
,comments.pending_payout_value
,comments.total_payout_value
,comments.curator_payout_value
,(comments.pending_payout_value + comments.total_payout_value + comments.curator_payout_value) as total_payout
,comments.active_votes
,comments.active_votes as vote_count
,comments.created as created
,comments.title
,comments.body
,comments.body_language
,comments.children
,comments.json_metadata
from 
  TxVotes (NOLOCK) votes 
 inner join Comments (NOLOCK) comments
 on votes.permlink = comments.permlink
 and votes.author = comments.author
where 
comments.depth=0 
and votes.voter = 'utopian-io'
and votes.[weight] > 0
and comments.body_language IS NOT NULL
order by vote_tstamp desc
`

// connect to your database
sql.connect(config, function (err) {

  if (err) console.log(err);

  // create Request object
  var request = new sql.Request();

  // query to the database and get the records
  request.query(sqlStr, function (err, result) {

    if (err) {
      console.log(err)
      return;
    }

    console.log("post count: " + result.recordset.length);

    const bot = "utopian-io";
    const filetstamp = dateFormat(now, "UTC:yyyymmdd_HHMMss");
    const outputCsv = `analysis/${bot}_v3_${filetstamp}.csv`;
    fs.writeFileSync(outputCsv, 'Voter,Weight,% Weight,App,Category,Github Project,Author,Permlink,vote_tstamp,total_payout,pending_payout_value,curator_payout_value,total_payout_value,total_rshares,ratio,Bot Vote,Vote Count,Est. Author Rewards,Est. Curation Rewards,Est. Beneficiary Rewards,Est. Net Author Rewards,Creation Date,Vote Date,Language,Comments,Title\r\n');
    result.recordset.forEach(function(item) {

      var active_votes = JSON.parse(item.active_votes);
      const total_rshares = active_votes.reduce((a, b) => a + parseFloat(b.rshares), 0);

      var bot_vote = 0;
      for (i = 0; i <  active_votes.length; i++) {
        if (active_votes[i].voter === bot) {
          bot_vote = parseFloat(active_votes[i].rshares);
          break;
        }
      }

      const ratio = parseFloat(item.total_payout) / parseFloat(total_rshares);
      const botVoteValue = parseFloat(bot_vote * ratio);
      const weight_in_percent = parseFloat(item.weight / 100);

      const est_author_rewards = parseFloat(botVoteValue * 0.75);
      const est_curation_rewards = parseFloat(botVoteValue * 0.25);
      const est_beneficiary_rewards = parseFloat(est_author_rewards * 0.25);
      const est_net_author_rewards = parseFloat(est_author_rewards * 0.75);

      const vote_tstamp = dateFormat(item.vote_tstamp, "UTC:yyyy-mm-dd HH:MM:ss");
      const vote_date = dateFormat(item.vote_tstamp, "UTC:yyyy-mm-dd");
      const created = dateFormat(item.created, "UTC:yyyy-mm-dd HH:MM:ss");

      var body_languages = JSON.parse(item.body_language);
      var language = "";
      for (i = 0; i <  body_languages.length; i++) {
        if (body_languages[i].isReliable) {
          language = body_languages[i].language;
          break;
        }
      }

      const metadata = JSON.parse(item.json_metadata);
      const app = metadata.app;
      const post_type = metadata.type;
      var repo = metadata.repository ? metadata.repository.full_name : null;
      if (!repo && metadata.links) {
        const re = /^https?:\/\/github\.com\/[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}\/[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/;
        for (link of metadata.links) {
          if (link.match(re)) {
            repo = link;
            break;
          }
        }
      }

      var dataToWrite = `${item.voter},${item.weight},${weight_in_percent},${app},${post_type},${repo},${item.author},${item.permlink},${vote_tstamp},${item.total_payout},${item.pending_payout_value},${item.curator_payout_value},${item.total_payout_value},${total_rshares},${ratio},${botVoteValue},${active_votes.length},${est_author_rewards},${est_curation_rewards},${est_beneficiary_rewards},${est_net_author_rewards},${created},${vote_date},${language},${item.children}\r\n`
      fs.appendFileSync(outputCsv, dataToWrite);
    });

    console.log("Output done");

  });
});