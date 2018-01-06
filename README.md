# biutopian

Analysis of [Utopian](https://utopian.io/) contributions on the STEEM blockchain.

## Installation

```
$ git clone git@github.com:eastmaels/biutopian.git
$ cd biutopian
$ npm install
```

### 1. `utopian_io_all_time.js`

This gets all the posts from utopian voting history where the @utopian-io bot has voted for posts (*it excludes up-votes on comments and down-votes on top-level posts*)

```
$ node utopian_io_all_time.js
```

This will generate a CSV in `./analysis` folder with filename formatted to `utopian-io_yyyymmdd_HHMMss.csv`. You can create your reports from this file.

### 2. `steem_languages.js`

Extracts the number of posts in different languages by date; this is from the STEEM blockchain as a whole not just Utopian.

```
$ node steem_languages.js
```

This will generate a CSV in `./analysis` folder with filename formatted to `languages_yyyymmdd_HHMMss.csv`. You can create your reports from this file.

