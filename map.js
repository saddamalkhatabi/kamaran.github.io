

var mapTypeIds = [];
for(var type in google.maps.MapTypeId) {
    mapTypeIds.push(google.maps.MapTypeId[type]);
}

mapTypeIds.push("OSM");
mapTypeIds.push("MyGmap");
mapTypeIds.push("LocalGmap");
mapTypeIds.push("WebStorageGmap");
mapTypeIds.push("LocalMyGmap");
mapTypeIds.push("WebStorageMyGmap");
  var element = document.getElementById("map");
   var map = new google.maps.Map(element, {
    center: new google.maps.LatLng(53.902254, 27.561850),
    zoom: 3,
    mapTypeId: "MyGmap",
    mapTypeControlOptions: {
        mapTypeIds: mapTypeIds,
        style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
    }
}); 
/*  var map = new google.maps.Map(element, {
    center: new google.maps.LatLng(53.902254, 27.561850),
    zoom: 3,
    mapTypeId: "MyGmap",
    mapTypeControlOptions: {
        mapTypeIds: mapTypeIds,
        style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
    }
});  */
/*-----------------------------------------------*/
var infoWindow = new google.maps.InfoWindow();
var customIcons = {
  monumento: {
    icon: 'http://maps.google.com/mapfiles/ms/icons/blue.png'
  },
  hotel: {
    icon: 'http://maps.google.com/mapfiles/ms/icons/green.png'
  },
  restaurantes: {
    icon: 'http://maps.google.com/mapfiles/ms/icons/yellow.png'
  },
  museus: {
    icon: 'http://maps.google.com/mapfiles/ms/icons/purple.png'
  }
};

var markerGroups = {
  "museus": [],
  "monumentos": [],
  "restaurantes": [],
  "hotel": []
};

function load() {
/*   var map = new google.maps.Map(document.getElementById("map"), {
    center: new google.maps.LatLng(38.639104, -8.210413),
    zoom: 12,
        mapTypeId: "MyGmap",
    mapTypeControlOptions: {
        mapTypeIds: mapTypeIds,
        style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
    }
  }); */

  var infoWindow = new google.maps.InfoWindow();



 /*  map.set('styles', [{
    zoomControl: false
  }, {
    featureType: "road.highway",
    elementType: "geometry.fill",
    stylers: [{
      color: "#ffd986"
    }]
  }, {
    featureType: "road.arterial",
    elementType: "geometry.fill",
    stylers: [{
      color: "#9e574f"
    }]
  }, {
    featureType: "road.local",
    elementType: "geometry.fill",
    stylers: [{
        color: "#d0cbc0"
      }, {
        weight: 1.1
      }

    ]
  }, {
    featureType: 'road',
    elementType: 'labels',
    stylers: [{
      saturation: -100
    }]
  }, {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{
      hue: '#ffff00'
    }, {
      gamma: 1.4
    }, {
      saturation: 82
    }, {
      lightness: 96
    }]
  }, {
    featureType: 'poi.school',
    elementType: 'geometry',
    stylers: [{
      hue: '#fff700'
    }, {
      lightness: -15
    }, {
      saturation: 99
    }]
  }]); */

  //         downloadUrl("markers.xml", function (data) {
  var xml = xmlParse(xmlData);
  // var xml = data.responseXML;
  var markers = xml.documentElement.getElementsByTagName("marker");
  for (var i = 0; i < markers.length; i++) {
    var name = markers[i].getAttribute("name");
    var address = markers[i].getAttribute("address");
    var type = markers[i].getAttribute("type");

    var point = new google.maps.LatLng(
      parseFloat(markers[i].getAttribute("lat")),
      parseFloat(markers[i].getAttribute("lng")));
    var html = "<b>" + name + "</b> <br/>" + address;
    // var icon = customIcons[type] || {};
    var marker = createMarker(point, name, address, type, map);
    bindInfoWindow(marker, map, infoWindow, html);
	//by saddam
	
	 var element = document.getElementById('select_resultados');
	 var cy=parseFloat(markers[i].getAttribute("lat"));
	 var cx=parseFloat(markers[i].getAttribute("lng"));
	  element.innerHTML +='<option data-cy="'+cy+'" data-cx="'+cx
	  +'" >'+name+'</option>';
  }
  // });
  
  
  
  $(document).ready(function(){
	 $("#select_resultados").on("click, change", function(){
	// alert("fdfsg");
          //PEQUE?A VALIDACION     VALIDATION الصغيرة
          if($(this).children().length<1)
          {
            return false;//NO HACER NADA, AL NO TENER ITEMS   لا تفعل شيئا، ليست لديها بنود
          }
          var cy = $("#select_resultados option:selected").data("cy");
          var cx = $("#select_resultados option:selected").data("cx");
          //Crear variable coordenada     إنشاء متغير تنسيق
          var myLatLng = new google.maps.LatLng(cy, cx);
          //VARIABLE map
          map.setCenter(myLatLng);
		   map.setZoom(17);
	 	  //toscrolling
//window.parent.scroll(0,200);
  
        });
		 });
}

function createMarker(point, name, address, type, map) {
  var icon = customIcons[type] || {};
  var marker = new google.maps.Marker({
    map: map,
    position: point,
    icon: icon.icon,
    // shadow: icon.shadow,
    type: type
  });
  if (!markerGroups[type]) markerGroups[type] = [];
  markerGroups[type].push(marker);
  var html = "<b>" + name + "</b> <br/>" + address;
  bindInfoWindow(marker, map, infoWindow, html);
  return marker;
}

function toggleGroup(type) {
  for (var i = 0; i < markerGroups[type].length; i++) {
    var marker = markerGroups[type][i];
    if (!marker.getVisible()) {
      marker.setVisible(true);
    } else {
      marker.setVisible(false);
    }
  }
}

function bindInfoWindow(marker, map, infoWindow, html) {
  google.maps.event.addListener(marker, 'click', function() {
    infoWindow.setContent(html);
    infoWindow.open(map, marker);

  });
}

function downloadUrl(url, callback) {
  var request = window.ActiveXObject ? new ActiveXObject('Microsoft.XMLHTTP') : new XMLHttpRequest();

  request.onreadystatechange = function() {
    if (request.readyState == 4) {
      request.onreadystatechange = doNothing;
      callback(request, request.status);
    }
  };

  request.open('GET', url, true);
  request.send(null);
}

function doNothing() {}
google.maps.event.addDomListener(window, 'load', load);

var xmlData = '<markers><marker name="Castelo" address="Rua da Condessa de Valença" lat="38.64351973190569" lng="-8.216521812152905" type="monumento" /><marker name="Anta 1 de Tourais" address="Estrada Nacional 114" lat="38.64260059929888" lng="-8.159376865959189" type="monumento" /><marker name="Hotel da Ameira" address="Herdade da Ameira" lat="38.64109640475479" lng="-8.180432206726096" type="hotel" /><marker name="Hotel Montemor" address="Avenida Gago Coutinho 8, 7050-248 Montemor-o-Novo" lat="38.64925541964039" lng="-8.216489625644726" type="hotel" /><marker name="Restaurante Monte Alentejano" address="Av. Gago Coutinho 8" lat="38.6492329" lng="-8.216665" type="restaurantes" /><marker name="Restaurante A Ribeira" address="Rua de São Domingos" lat="38.6347498199708" lng="-8.206468892765088" type="restaurantes" /><marker name="Núcleo Museológico do Convento de S. Domingos" address="" lat="38.643139" lng="-8.212732" type="museus" /><marker name="Centro Interpretativo do Castelo de Montemor-o-Novo" address="Rua Condessa de Valença" lat="38.64258748216167" lng="-8.21467108793263" type="museus" /></markers>';

function xmlParse(str) {
  if (typeof ActiveXObject != 'undefined' && typeof GetObject != 'undefined') {
    var doc = new ActiveXObject('Microsoft.XMLDOM');
    doc.loadXML(str);
    return doc;
  }

  if (typeof DOMParser != 'undefined') {
    return (new DOMParser()).parseFromString(str, 'text/xml');
  }

  return createElement('div', null);
}

/*-----------------------------------------------*/
map.mapTypes.set("OSM", new google.maps.ImageMapType({
    getTileUrl: getOsmTileImgSrc,
    tileSize: new google.maps.Size(256, 256),
    name: "OSM",
    maxZoom: 15
}));

map.mapTypes.set("MyGmap", new google.maps.ImageMapType({
    getTileUrl: getGmapTileImgSrc,
    tileSize: new google.maps.Size(256, 256),
    name: "MyGmap",
    maxZoom: 15
}));

map.mapTypes.set("LocalGmap", new google.maps.ImageMapType({
    getTileUrl: getLocalTileImgSrc,
    tileSize: new google.maps.Size(256, 256),
    name: "LocalGmap",
    maxZoom: 15
}));

map.mapTypes.set("WebStorageGmap", new google.maps.ImageMapType({
    getTileUrl: getWebStorageTileImgSrc,
    tileSize: new google.maps.Size(256, 256),
    name: "WebStorageGmap",
    maxZoom: 15
}));

map.mapTypes.set("LocalMyGmap", new google.maps.ImageMapType({
    getTileUrl: function(coord, zoom) {
        return checkTileInSprites(coord, zoom) ?
            getLocalTileImgSrc(coord, zoom) :
            getGmapTileImgSrc(coord, zoom);
    },
    tileSize: new google.maps.Size(256, 256),
    name: "LocalMyGmap",
    maxZoom: 15
}));

map.mapTypes.set("WebStorageMyGmap", new google.maps.ImageMapType({
    getTileUrl: function(coord, zoom) {
        var image = getWebStorageTileImgSrc(coord, zoom);
        return image ? image :  getGmapTileImgSrc(coord, zoom);
    },
    tileSize: new google.maps.Size(256, 256),
    name: "WebStorageMyGmap",
    maxZoom: 15
}));

google.maps.event.addListener(map, 'click', function(point) {
    var marker = new google.maps.Marker({
        position: point.latLng,
        map: map
    });

    google.maps.event.addListener(marker, 'dblclick', function() {
        marker.setMap(null);
    });

    google.maps.event.addListener(marker, 'click', function() {
        new google.maps.InfoWindow({
            content: 'lat: ' + point.latLng.lat() + '<br>lng:' + point.latLng.lng()
        }).open(map, marker);
    });
});

function CustomControl(controlDiv, map, title, handler) {
    controlDiv.style.padding = '5px';

    var controlUI = document.createElement('DIV');
    controlUI.style.backgroundColor = 'white';
    controlUI.style.borderStyle = 'solid';
    controlUI.style.borderWidth = '2px';
    controlUI.style.cursor = 'pointer';
    controlUI.style.textAlign = 'center';
    controlUI.title = title;
    controlDiv.appendChild(controlUI);

    var controlText = document.createElement('DIV');
    controlText.style.fontFamily = 'Arial,sans-serif';
    controlText.style.fontSize = '12px';
    controlText.style.paddingLeft = '4px';
    controlText.style.paddingRight = '4px';
    controlText.innerHTML = title;
    controlUI.appendChild(controlText);

    google.maps.event.addDomListener(controlUI, 'click', handler);
}

var clearWebStorageDiv = document.createElement('DIV');
var clearWebStorageButton = new CustomControl(clearWebStorageDiv, map,
    'Clear Web Storage',  clearWebStorage);

var prepareWebStorageDiv = document.createElement('DIV');
var prepareWebStorageButton = new CustomControl(prepareWebStorageDiv, map,
    'Prepare Web Storage', prepareWebStorage);

clearWebStorageDiv.index = 1;
prepareWebStorageDiv.index = 1;
map.controls[google.maps.ControlPosition.TOP_RIGHT].push(clearWebStorageDiv);
map.controls[google.maps.ControlPosition.TOP_RIGHT].push(prepareWebStorageDiv);
