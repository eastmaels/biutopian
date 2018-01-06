const sql = require('mssql');
const fs = require('fs');
const dateFormat = require('dateformat');

const config = {
    server:'sql.steemsql.com',
    database:'DBSteem',
    user:'steemit',
    password:'steemit',
    requestTimeout : 1000000,
    stream : true
};

const now = new Date();
console.log(now);

const sqlStr = `
select sub.created, sub.lang, count(*) as lang_count from 
(
	select 
	ID,
	convert(date, created) as created,
	json_value(body_language, '$[0].language') as lang
	 from Comments (NOLOCK)
		where 
		depth = 0
		and ISJSON(body_language) > 0
		and json_value(body_language, '$[0].isReliable') = 'true'
	union
	select 
	ID,
	convert(date, created) as created,
	json_value(body_language, '$[1].language') as lang
	 from Comments (NOLOCK)
		where 
		depth = 0
		and ISJSON(body_language) > 0
		and json_value(body_language, '$[1].isReliable') = 'true'
	union
	select 
	ID,
	convert(date, created) as created,
	json_value(body_language, '$[2].language') as lang
	 from Comments (NOLOCK)
		where 
		depth = 0
		and ISJSON(body_language) > 0
		and json_value(body_language, '$[2].isReliable') = 'true'
) sub
group by 
 	sub.created, sub.lang
order by 
  sub.created, sub.lang desc
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
    const outputCsv = `analysis/languages_${filetstamp}.csv`;
    fs.writeFileSync(outputCsv, 'Date,Lang Code,Count\r\n');
    result.recordset.forEach(function(item) {
      const created = dateFormat(item.created, "UTC:yyyy-mm-dd");
      var dataToWrite = `${created},${item.lang},${item.lang_count}\r\n`
      fs.appendFileSync(outputCsv, dataToWrite);
    });

    console.log("Output done");

  });
});