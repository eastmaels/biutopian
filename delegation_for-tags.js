const sql = require('mssql');
const fs = require('fs');
const dateFormat = require('dateformat');
const removeMd = require('remove-markdown');
const wordcount = require('wordcount');

const config = {
    server:'vip.steemsql.com',
    database:'DBSteem',
    user:'',
    password:'',
    requestTimeout : 240000,
    stream : true
};

const now = new Date();
console.log(now);

const delegatee = 'all'
const delegator = 'goldendawne'

const sqlStr = `
Select 
  v.voter as Delegatee, v.weight As Weight, v.author As Author, v.[timestamp] As votes_tstamp, v.permlink As votes_permlink
	,CONVERT(int,(SELECT MAX(v) FROM (VALUES(log10(ABS(CONVERT(bigint,c.author_reputation)-1)) - 9),(0)) T(v)) * SIGN(c.author_reputation) * 9 + 25) as rep
	,c.depth
  ,c.created
  ,len(c.body) as Body_Len, c.body
  ,c.json_metadata
From
  TxVotes v
  inner join Comments c
	 on c.author = v.author
	 and c.permlink = v.permlink
where
  v.voter='karenfoster'
  and v.timestamp >= '2018-01-21'

union all

Select 
  v.voter as Delegatee, v.weight As Weight, v.author As Author, v.[timestamp] As votes_tstamp, v.permlink As votes_permlink
	,CONVERT(int,(SELECT MAX(v) FROM (VALUES(log10(ABS(CONVERT(bigint,c.author_reputation)-1)) - 9),(0)) T(v)) * SIGN(c.author_reputation) * 9 + 25) as rep
	,c.depth
  ,c.created
  ,len(c.body) as Body_Len, c.body
  ,c.json_metadata
From
  TxVotes v
  inner join Comments c
	 on c.author = v.author
	 and c.permlink = v.permlink
where
  v.voter='freedompoint'
  and v.timestamp >= '2018-01-21'

union all

Select 
  v.voter as Delegatee, v.weight As Weight, v.author As Author, v.[timestamp] As votes_tstamp, v.permlink As votes_permlink
	,CONVERT(int,(SELECT MAX(v) FROM (VALUES(log10(ABS(CONVERT(bigint,c.author_reputation)-1)) - 9),(0)) T(v)) * SIGN(c.author_reputation) * 9 + 25) as rep
	,c.depth
  ,c.created
  ,len(c.body) as Body_Len, c.body
  ,c.json_metadata
From
  TxVotes v
  inner join Comments c
	 on c.author = v.author
	 and c.permlink = v.permlink
where
  v.voter='beatitudes8'
  and v.timestamp >= '2018-01-26'

union all

Select 
  v.voter as Delegatee, v.weight As Weight, v.author As Author, v.[timestamp] As votes_tstamp, v.permlink As votes_permlink
	,CONVERT(int,(SELECT MAX(v) FROM (VALUES(log10(ABS(CONVERT(bigint,c.author_reputation)-1)) - 9),(0)) T(v)) * SIGN(c.author_reputation) * 9 + 25) as rep
	,c.depth
  ,c.created
  ,len(c.body) as Body_Len, c.body
  ,c.json_metadata
From
  TxVotes v
  inner join Comments c
	 on c.author = v.author
	 and c.permlink = v.permlink
where
  v.voter='walkerland'
  and v.timestamp >= '2018-02-23'
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
    const outputCsv = `requests/delegation_check_${delegator}-to-${delegatee}_${filetstamp}.csv`;
    fs.writeFileSync(outputCsv, 'Voter||Weight||% Weight||Author||Rep||Permlink||Vote Timestamp||Vote Date||Tags||Depth||Word Count\r\n');
    result.recordset.forEach(function(item) {

      const weight_in_percent = parseFloat(item.Weight / 100);

      const vote_tstamp = dateFormat(item.votes_tstamp, "UTC:yyyy-mm-dd HH:MM:ss");
      const vote_date = dateFormat(item.votes_tstamp, "UTC:yyyy-mm-dd");

      var tags = '"{""tags"":[]}"';
      if (item.json_metadata) {
        const json_metadata = JSON.parse(item.json_metadata);
        if(typeof json_metadata.tags === 'string') {
          tags = '"{""tags"":[""' + json_metadata.tags + '""]}"';
        } else if (json_metadata.tags) {
          tags = '"{""tags"":[""' + json_metadata.tags.join('"",""') + '""]}"';
        }
      }
      const word_count = wordcount(removeMd(item.body));

      var dataToWrite = `${item.Delegatee}||${item.Weight}||${weight_in_percent}||${item.Author}||${item.rep}||${item.votes_permlink}||${vote_tstamp}||${vote_date}||${tags}||${item.depth}||${word_count}\r\n`
      fs.appendFileSync(outputCsv, dataToWrite);
    });

    console.log("Output done");

  });
});