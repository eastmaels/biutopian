const fs = require('fs');
const dateFormat = require('dateformat');
const removeMd = require('remove-markdown');
const wordcount = require('wordcount');
var request = require('request');

const now = new Date();
console.log(now);

request(
  {
//  For Review API:
//    url : 'https://api.utopian.io/api/posts/?limit=0&skip=0&section=all&sortBy=created&filterBy=review&status=any&type=all',
//  Approved API:
    url : 'https://api.utopian.io/api/posts/?limit=0&skip=0&section=all&sortBy=created&type=all',
    json : true,
    headers: {'User-Agent': 'request'},
    proxy : 'http://192.168.220.225:3128'
  }, 
  (error, response, data) => {
    if (!error && response.statusCode == 200) {

        console.log("post count: " + data.results.length);

        const now = new Date();
        const filetstamp = dateFormat(now, "UTC:yyyymmdd_HHMMss");

        const outputCsv = `analysis/predictive/${filetstamp}.csv`;
        fs.writeFileSync(outputCsv, 'Author,Permlink,App,Category,Github Project,Pending Payout,Vote Count,Word Count,Voted By Bot,Created\r\n');
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
            const repository = (json_metadata.repository ? json_metadata.repository.full_name : null);
            const created = dateFormat(item.created, "UTC:yyyy-mm-dd HH:MM:ss");

            var dataToWrite = `${item.author},${item.permlink},${json_metadata.app},${json_metadata.type},${repository},${item.pending_payout_value},${active_votes.length},${word_count},${voted},${created}\r\n`
            //var dataToWrite = `${item.author},${item.permlink}\r\n`
            fs.appendFileSync(outputCsv, dataToWrite);
        });

        console.log("Output done");

    } else {
      console.log(error);
      console.log(response);
    }
  }
);

