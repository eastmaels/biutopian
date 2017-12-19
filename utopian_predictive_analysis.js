const fs = require('fs');
const dateFormat = require('dateformat');
const removeMd = require('remove-markdown');
const wordcount = require('wordcount');
var request = require('request');

request(
  {
    url : 'https://api.utopian.io/api/posts/?limit=0&skip=0&section=all&sortBy=created&filterBy=review&status=any&type=all',
    json : true,
    headers: {'User-Agent': 'request'}
//    proxy : 'http://192.168.220.225:3128'
  }, 
  (error, response, data) => {
    if (!error && response.statusCode == 200) {

        const now = new Date();
        const filetstamp = dateFormat(now, "UTC:yyyymmdd_HHMMss");

        const log = `analysis/predictive/${filetstamp}.log`;
        fs.writeFileSync(log, data);

        const outputCsv = `analysis/predictive/${filetstamp}.csv`;
        fs.writeFileSync(outputCsv, 'Author,Permlink,App,Category,Github Project,Pending Payout,Vote Count,Word Count,Voted By Bot,Title\r\n');
        data.results.forEach(function(item) {
            const json_metadata = item.json_metadata;
            var active_votes = item.active_votes;
            var voted = false;
            for (i = 0; i <  active_votes.length; i++) {
              if (active_votes[i].voter === "utopian-io") {
                voted = true;
                break;
              }
            }

            const word_count = wordcount(removeMd(item.body))
            const title = item.title.replace(/,/g, '');

            const repository = (json_metadata.repository ? json_metadata.repository.full_name : null);

            var dataToWrite = `${item.author},${item.permlink},${json_metadata.app},${json_metadata.type},${repository},${item.pending_payout_value},${active_votes.length},${word_count},${voted},${title}\r\n`
            //var dataToWrite = `${item.author},${item.permlink}\r\n`
            fs.appendFileSync(outputCsv, dataToWrite);
        });
    } else {
      console.log(error);
      console.log(response);
    }
  }
);

