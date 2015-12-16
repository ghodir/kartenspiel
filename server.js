var express = require('express');
var compress = require('compression');
var fs = require('fs');

var map = fs.readFileSync('layers/map.geojson');

var app = express();
app.use(compress());
app.get('layers/map.geojson', function(req, res) {
	res.end(map);
});
app.use(express.static(__dirname));

app.listen(80);