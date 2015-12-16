var kartenspielApp = angular.module('kartenspielApp', 
	[
		'ngMaterial',
		'ngRoute',
		'leaflet-directive',
		'kartenspielControllers'
	]);
 
var kartenspielControllers = angular.module('kartenspielControllers', []);

kartenspielControllers.controller('BaseCtrl', function($scope) {
	$scope.state = {};
	$scope.state.view = 'game';
	
	$scope.layers = {
		cities: $.getJSON('layers/cities.geojson'),
		borders: $.getJSON('layers/borders.geojson'),
		map: $.getJSON('layers/map.geojson'),
	}
	
	$scope.teams = [[{name: 'Alex'}],[{name: 'Jan'}]];
	$scope.teams[0].name = 'Team 1';
	$scope.teams[0].player = 0;
	$scope.teams[0].points = 0;
	$scope.teams[1].name = 'Team 2';
	$scope.teams[1].player = 0;
	$scope.teams[1].points = 0;
});

kartenspielControllers.controller('TeamSetupCtrl', function($scope) {
	
	$scope.submitTeams = function submitTeams() {
		$scope.state.view = 'game';
	}
	
	$scope.onPlayerAdd = function onPlayerAdd(team) {
		team.push({
			name: team.add
		});
		team.add = '';
	}
});

kartenspielControllers.controller('GameCtrl', function($scope, leafletData) {
	
	
	$scope.center = {
		lat: 0,
		lng: 0,
		zoom: 1
	}
	
	$scope.cities = [];
	$scope.round = 0;
	var map = null;
	var clickMarkers = [];
	var layerMap = null;
	var layerCities = null;
	var cities = [];
	
	function prepareRound() {
		//reset prev 
		
		clickMarkers.forEach(function(marker) {
			map.removeLayer(marker);
		});
		
		clickMarkers = [];
		
		cities.forEach(function(city) {
			city.marker.setStyle({
				fillOpacity: 0
			});
		});
		
		cities = [];
		
		var city = $scope.cities[Math.floor(Math.random()*$scope.cities.length)];
		$scope.cities.splice($scope.cities.indexOf(city), 1);
		$scope.city = city;
		$scope.team = $scope.teams[$scope.round % 2];
		$scope.player = $scope.team[$scope.team.player];
		$scope.team.player = ($scope.team.player + 1) % $scope.team.length;
		$scope.round++;
		
		
		var bounds = [[$scope.city.latlng.lat, $scope.city.latlng.lng],[$scope.city.latlng.lat, $scope.city.latlng.lng]];
		for(var i = 0; i < 6; i++) {
			var city = $scope.city.distances[i][0];
			bounds = [
				[
					Math.max(bounds[0][0], city.latlng.lat),
					Math.max(bounds[0][1], city.latlng.lng)
				],
				[
					Math.min(bounds[1][0], city.latlng.lat),
					Math.min(bounds[1][1], city.latlng.lng)
				]
			]
			
			city.marker.setStyle({
				fillColor: '#00ff00',
				fillOpacity: '.8'
			});
		}
		
		map.fitBounds(bounds, {padding: [50, 50]});
		
		$scope.city.marker.once('click', function() {
			$scope.team.points++;
			prepareRound();
		});
		
		$scope.city.marker.setStyle({
			fillColor: '#ff0000',
			fillOpacity: 1,
		});
		
		cities.push($scope.city);
	}
	
	function prepareGame() {
		
		layerMap.on('click', function onMissed(e){
			var clickMarker = new L.Marker(e.latlng)
			clickMarker.addTo(layerCities);
			clickMarkers.push(clickMarker);
			
			if(clickMarkers.length == 3) {
				$scope.city.marker.setStyle({
					fillOpacity: 1,
				});
		
				prepareRound();
			}
		});
		
		var todo = $scope.cities.slice();
		while(todo.length) {
			var city = todo.shift();
			city.distances = [];
			
			for(var i = 0; i < $scope.cities.length; i++) {
				var c = $scope.cities[i];
				
				if(c == city)
					continue;
				
				var distance = city.latlng.distanceTo(c.latlng);
				city.distances.push([c, distance]);
				if(!c.distances)
					c.distances = [];
				
				c.distances.push([city, distance]);
			}
			
			city.distances.sort(function(a, b) {
				return a[1] - b[1];
			});
		}
		
		prepareRound();
	}
	
	leafletData.getMap().then(function(_map) {
		map = _map;
		map.dragging.disable();
		map.touchZoom.disable();
		map.doubleClickZoom.disable();
		map.scrollWheelZoom.disable();
		map.keyboard.disable();
		
		if (map.tap) map.tap.disable();

		map.eachLayer(function (layer) {
			map.removeLayer(layer);
		});

		var numberOfCities = -1;
		layerCities = L.geoJson(null, {
			pointToLayer: function(feature, latlng) {
				var marker = L.circleMarker(latlng, {
					radius: 15,
					opacity: 0,
					fillOpacity: 0.8,
				});
				
				$scope.cities.push({
					name: feature.properties.NAME,
					latlng: latlng,
					marker: marker
				});
				
				if($scope.cities.length == numberOfCities)
					window.setTimeout(prepareGame, 0);
				
				return marker;
			}
		}).addTo(map);
		
		$scope.layers.cities.then(function(data) {
			numberOfCities = data.features.length;
			layerCities.addData(data);
		});

		layerMap = L.geoJson().addTo(map);
		$scope.layers.map.then(function(data) {
			layerMap.addData(data);
			layerCities.bringToFront();
		});
		
		var layerBorders = L.geoJson().addTo(map);
		$scope.layers.borders.then(function(data) {
			layerBorders.addData(data);
			layerCities.bringToFront();
		});
	})
});