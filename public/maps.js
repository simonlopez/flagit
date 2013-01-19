var map;

var LeafIcon = L.Icon.extend({
  options: {
    shadowUrl: 'img/leaf-shadow.png',
    iconSize:     [38, 95],
    shadowSize:   [50, 64],
    iconAnchor:   [22, 94],
    shadowAnchor: [4, 62],
    popupAnchor:  [-3, -76]
  }
});
var icons = {
  "restaurant": {
    "icon": new LeafIcon({iconUrl: 'img/leaf-green.png'}),
    "count": 0
  },
  "leisure-and-recreation": {
    "icon": new LeafIcon({iconUrl: 'img/leaf-red.png'}),
    "count": 0
  },
  "walks-and-visits": {
    "icon": new LeafIcon({iconUrl: 'img/leaf-orange.png'}),
    "count": 0
  }
}

var iterator = 0;
var interval = 10;

function initialize() {
  map = L.map('map').setView([46.22475,2.0517], 6);
  L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
    maxZoom: 18
  }).addTo(map);
}
function addMarker(type, options){
console.log(options);
  if(!options.type || !icons[options.type])
    return null;
  if(!options.lat || !options.lon)
    return null;
  var marker = L.marker([options.lat, options.lon],{icon: icons[options.type].icon}).addTo(map);
  if(options.text)
    marker.bindPopup(options.text, {closePopupOnClick:true});
}
window.onload = function() {
  if(!$("#map"))
    return;
  initialize();
  $.getJSON('/places', function(data) {
    $.each(data, function(name, val) {
      var options = {
        'type':val.type,
        'lat':val.lat,
        'lon':val.lon,
        'text':'<b>'+val.name+'</b>'+(val.addr?'<br/><i>'+val.addr+'</i>':'')
      };
      setTimeout(function() {
        addMarker(val.type, options);
      }, iterator * interval);
      iterator++;
    });
  });
}
