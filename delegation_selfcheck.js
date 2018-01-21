const sql = require('mssql');
const fs = require('fs');
const dateFormat = require('dateformat');
const removeMd = require('remove-markdown');
const wordcount = require('wordcount');
const spell = require('spell-checker-js')
spell.load('en')
spell.load('./steemit_dic.txt')

const writeGood = require('write-good');


const config = {
    server:'sql.steemsql.com',
    database:'DBSteem',
    user:'steemit',
    password:'steemit',
    requestTimeout : 240000,
    stream : true
};

const now = new Date();
console.log(now);

const delegatee = 'eastmael'
const delegator = 'paulag'

const sqlStr = `
select
	votes.voter as votes_voter
	,votes.weight as votes_weight
	,votes.author as votes_author
	,votes.permlink as votes_permlink
	,votes.[timestamp] as votes_tstamp
	,(comments.pending_payout_value + comments.total_payout_value + comments.curator_payout_value) as total_payout
	,comments.json_metadata
	,comments.* 
	,CONVERT(int,(SELECT MAX(v) FROM (VALUES(log10(ABS(CONVERT(bigint,comments.author_reputation)-1)) - 9),(0)) T(v)) * SIGN(comments.author_reputation) * 9 + 25) as rep
from
   txvotes (NOLOCK) votes
    inner join Comments (NOLOCK) comments
	 on votes.permlink = comments.permlink
	 and votes.author = comments.author
where
   voter = '${delegatee}' 
   and votes.[timestamp] >= 
   (
      select
         [timestamp] 
      from
         TxDelegateVestingShares 
      where
         delegator = '${delegator}' 
         and delegatee = '${delegatee}' 
   )
order by
   votes.[timestamp] desc
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

    const filetstamp = dateFormat(now, "UTC:yyyymmdd_HHMMss");
    const outputCsv = `analysis/delegation_self-check_${delegatee}_${filetstamp}.csv`;
    fs.writeFileSync(outputCsv, 'Voter||Weight||% Weight||Author||Rep||Permlink||vote_tstamp||Total Payout||Pending Payout||Curator Payout||Total Payout Value||Total Reward Shares||Ratio||Delegatee Vote Value||Vote Count||Created||Vote Date||Comments||json_metadata\r\n');
    result.recordset.forEach(function(item) {

      var active_votes = JSON.parse(item.active_votes);
      const total_rshares = active_votes.reduce((a, b) => a + parseFloat(b.rshares), 0);

      var delegatee_vote = 0;
      for (i = 0; i <  active_votes.length; i++) {
        if (active_votes[i].voter === delegatee) {
          delegatee_vote = parseFloat(active_votes[i].rshares);
          break;
        }
      }

      const ratio = parseFloat(item.total_payout) / parseFloat(total_rshares);
      const delegateeVoteValue = parseFloat(delegatee_vote * ratio);
      const weight_in_percent = parseFloat(item.votes_weight / 100);

      const vote_tstamp = dateFormat(item.votes_tstamp, "UTC:yyyy-mm-dd HH:MM:ss");
      const vote_date = dateFormat(item.votes_tstamp, "UTC:yyyy-mm-dd");
      const created = dateFormat(item.created, "UTC:yyyy-mm-dd HH:MM:ss");

      var dataToWrite = `${item.votes_voter}||${item.votes_weight}||${weight_in_percent}||${item.votes_author}||${item.rep}||${item.votes_permlink}||${vote_tstamp}||${item.total_payout}||${item.pending_payout_value}||${item.curator_payout_value}||${item.total_payout_value}||${total_rshares}||${ratio}||${delegateeVoteValue}||${active_votes.length}||${created}||${vote_date}||${item.children}||${item.json_metadata}\r\n`
      fs.appendFileSync(outputCsv, dataToWrite);
    });

    console.log("Output done");

  });
});