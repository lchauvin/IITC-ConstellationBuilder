// ==UserScript==
// @author BlancLapin
// @id starlink-builder-iitc
// @name IITC Plugin: Starlink Builder
// @category Draw
// @version 0.0.1
// @namespace https://tempuri.org/iitc/starlink-builder
// @description Easy Starlink Builder
// @include http://www.ingress.com/intel*
// @match http://www.ingress.com/intel*
// @include https://www.ingress.com/intel*
// @match https://www.ingress.com/intel*
// @grant none
// ==/UserScript==

// Wrapper function that will be stringified and injected
// into the document. Because of this, normal closure rules
// do not apply here.
function wrapper(plugin_info) {
  // Make sure that window.plugin exists. IITC defines it as a no-op function,
  // and other plugins assume the same.
  if(typeof window.plugin !== 'function') window.plugin = function() {};

  window.plugin.starlinkbuilder = function() {};

  // Name of the IITC build for first-party plugins
  plugin_info.buildName = 'starlinkbuilder';

  // Datetime-derived version of the plugin
  plugin_info.dateTimeVersion = '20221013103500';

  // ID/name of the plugin
  plugin_info.pluginId = 'starlinkbuilder';

  window.plugin.starlinkbuilder.anchorlatlng;

  window.plugin.starlinkbuilder.anchortitle = 'Undefined';

  window.plugin.starlinkbuilder.dialogData;

  window.plugin.starlinkbuilder.MAX_LINK = 250;

  window.plugin.starlinkbuilder.num_links = 10;

  window.plugin.starlinkbuilder.listValidPortals;

  window.plugin.starlinkbuilder.ignoreValue = 3;

  window.plugin.starlinkbuilder.ignoreTeamLinksFlag = 0b10;
  window.plugin.starlinkbuilder.ignoreTeamLinks = true;

  window.plugin.starlinkbuilder.ignoreEnemyLinksFlag = 0b01;
  window.plugin.starlinkbuilder.ignoreEnemyLinks = true;

  // The entry point for this plugin.
  window.plugin.starlinkbuilder.setup = function() {
    if (window.plugin.drawTools === undefined) {
      console.log("This plugin requires draw tools");
      return;
    }

    $('<a>')
    .html('Starlink Builder')
    .attr({
      id: 'starlink-builder-toolbox-link',
      title: 'Starlink Builder'
    })
    .click(window.plugin.starlinkbuilder.showDialog)
    .appendTo('#toolbox');

    window.plugin.starlinkbuilder.dialogData  = window.plugin.starlinkbuilder.generateHtmlDialog();
  }

  window.plugin.starlinkbuilder.setAnchor = function() {
    if (window.selectedPortal == null){
      alert('No portal selected.');
      return;
    }

    var p = window.portals[window.selectedPortal];
    window.plugin.starlinkbuilder.anchorlatlng = p.getLatLng();
    window.plugin.starlinkbuilder.anchortitle = p.options.data.title;

    document.getElementById('anchorName').textContent = p.options.data.title;
  }

  window.plugin.starlinkbuilder.generateHtmlDialog = function(){
    var html = `
    <i>Anchor:</i><br>
    <form name='playerlist' action='#' method='post' target='_blank'>
    <button type="submit" form="maxfield" value="Set Anchor" onclick='window.plugin.starlinkbuilder.setAnchor()'>Set Anchor</button>&nbsp;&nbsp;<a id="anchorName">${window.plugin.starlinkbuilder.anchortitle}</a><br/>
    <label for="num_links">Number of links (1-${window.plugin.starlinkbuilder.MAX_LINK}):</label>
    <input type="number" id='num_links' name="num_links" min="1" max="${window.plugin.starlinkbuilder.MAX_LINK}" value="${window.plugin.starlinkbuilder.num_links}"><br/>
    <label for="ignore-select">Ignore Links:</label>
    <select name="ignore-select" id="ignore-select" onchange='window.plugin.starlinkbuilder.updateIgnoreValues()'>
    <option value="3" selected>ALL</option>
    <option value="2">TEAM</option>
    <option value="1">ENEMY</option>
    <option value="0">NONE</option>
    </select>
    <br>
    <button type="submit" form="maxfield" value="Save" onclick='window.plugin.starlinkbuilder.saveConstellation()' style="float:right">Save</button>
    <button type="submit" form="maxfield" value="Build" onclick='window.plugin.starlinkbuilder.buildConstellation()' style="float:right">Build Starlink</button>
    </form>
    `;

    return html;
  }

  window.plugin.starlinkbuilder.saveConstellation = function() {
    window.plugin.drawTools.save();
    alert('Starlink Saved.');
  }

  window.plugin.starlinkbuilder.updateIgnoreValues = function() {
    // Get links to ignore
    window.plugin.starlinkbuilder.ignoreValue = parseInt(document.getElementById('ignore-select').value);
    window.plugin.starlinkbuilder.ignoreTeamLinks = !!(window.plugin.starlinkbuilder.ignoreValue & window.plugin.starlinkbuilder.ignoreTeamLinksFlag);
    window.plugin.starlinkbuilder.ignoreEnemyLinks = !!(window.plugin.starlinkbuilder.ignoreValue & window.plugin.starlinkbuilder.ignoreEnemyLinksFlag);
  }

  window.plugin.starlinkbuilder.buildConstellation = function() {

    window.plugin.starlinkbuilder.num_links = parseInt(document.getElementById('num_links').value);
    if (window.plugin.starlinkbuilder.num_links > window.plugin.starlinkbuilder.MAX_LINK){
      alert('Maximum number of links: ' + window.plugin.starlinkbuilder.MAX_LINK);
      return;
    }

    if (window.plugin.starlinkbuilder.anchorlatlng === undefined){
      alert('An anchor should be set first');
      return;
    }

    // Convert dictionnary to array first
    var items = Object.keys(window.portals).map(function(key) {
      return window.portals[key];
    });

    // Sort portals by distance to anchor
    var sortedPortals = items.sort(
    (p1, p2) => (window.plugin.starlinkbuilder.distanceToAnchor(p1) > window.plugin.starlinkbuilder.distanceToAnchor(p2)) ? 1 : (window.plugin.starlinkbuilder.distanceToAnchor(p1) < window.plugin.starlinkbuilder.distanceToAnchor(p2)) ? -1 : 0);

    if (sortedPortals.length < window.plugin.starlinkbuilder.num_links){
      alert('Not enough portal visible. Either reduce the number of portals to link, or zoom out.');
      return;
    }

    // Check link validity
    if (window.plugin.starlinkbuilder.ignoreTeamLinks && window.plugin.starlinkbuilder.ignoreEnemyLinks){
      var validSortedPortals = sortedPortals;
    }else{
      var validSortedPortals = sortedPortals.filter(toPortal => window.plugin.starlinkbuilder.isLinkValid(toPortal));
    }

    // Reduce set to num_links if necessary
    if (validSortedPortals.length > window.plugin.starlinkbuilder.num_links){
      validSortedPortals = validSortedPortals.slice(0,window.plugin.starlinkbuilder.num_links);
    }else{
      alert('Not enough valid portals. Either reduce the number of portals to link, or zoom out.');
      return;
    }

    // Generate all valid links
    window.plugin.starlinkbuilder.listValidPortals = [];
    $.each(validSortedPortals, function(i,p){
      var p_latlng = p.getLatLng();
      var lnk = {"type":"polyline", "latLngs":[
        {"lat":window.plugin.starlinkbuilder.anchorlatlng.lat, "lng":window.plugin.starlinkbuilder.anchorlatlng.lng},
        {"lat": p_latlng.lat, "lng": p_latlng.lng}
      ]};
      window.plugin.starlinkbuilder.listValidPortals.push(lnk);
    });
    window.plugin.drawTools.import(window.plugin.starlinkbuilder.listValidPortals);
  }

  window.plugin.starlinkbuilder.distanceToAnchor = function(p){
    return google.maps.geometry.spherical.computeDistanceBetween(window.plugin.starlinkbuilder.anchorlatlng, p.getLatLng());
  }

  window.plugin.starlinkbuilder.isLinkValid = function(p){

    var player_team = window.PLAYER.team === 'RESISTANCE' ? 'R' : 'E';
    var team_id = teamStringToId(player_team);
    var latlngs = [
      window.plugin.starlinkbuilder.anchorlatlng,
      p.getLatLng()
    ];
    var new_link = L.geodesicPolyline(latlngs, {
      color: COLORS[team_id],
      opacity: 0,
      interactive: false,

      team: team_id,
      //ent: ent,  // LEGACY - TO BE REMOVED AT SOME POINT! use .guid, .timestamp and .data instead
      //guid: ent[0],
      //timestamp: ent[1],
      //data: data
    });

    var isValid = true;
    $.each(window.links, function (guid, link) {
      // ignoreEnemyLinks == true && link is enemy. Do not check if links cross.
      if (window.plugin.starlinkbuilder.ignoreEnemyLinks && link.options.data.team !== player_team){
        return;
      }

      // ignoreTeamLinks == true && link is friendly. Do no check if links cross.
      if (window.plugin.starlinkbuilder.ignoreTeamLinks && link.options.data.team === player_team){
        return;
      }

      // Check if links are crossing
      if (plugin.crossLinks.testPolyLine(new_link, link)){
        isValid = false;
        return false; // Exit the each function
      }
    });

    return isValid;
  }

  window.plugin.starlinkbuilder.showDialog = function(){
    window.plugin.starlinkbuilder.dialogData = window.plugin.starlinkbuilder.generateHtmlDialog();
    dialog({
        title: 'Starlink Builder',
        id: 'starlink-builder-iitc',
        html: window.plugin.starlinkbuilder.dialogData,
        width: 700
    });

    $('#ignore-select option[value="' + window.plugin.starlinkbuilder.ignoreValue + '"]').prop('selected', true);
  }

  var setup = window.plugin.starlinkbuilder.setup;

  // Add an info property for IITC's plugin system
  setup.info = plugin_info;

  // Make sure window.bootPlugins exists and is an array
  if (!window.bootPlugins) window.bootPlugins = [];
  // Add our startup hook
  window.bootPlugins.push(setup);
  // If IITC has already booted, immediately run the 'setup' function
  if (window.iitcLoaded && typeof setup === 'function') setup();
}

// Create a script element to hold our content script
var script = document.createElement('script');
var info = {};

// GM_info is defined by the assorted monkey-themed browser extensions
// and holds information parsed from the script header.
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
  info.script = {
    version: GM_info.script.version,
    name: GM_info.script.name,
    description: GM_info.script.description
  };

}

// Create a text node and our IIFE inside of it
var textContent = document.createTextNode('('+ wrapper +')('+ JSON.stringify(info) +')');
// Add some content to the script element
script.appendChild(textContent);
// Finally, inject it... wherever.
(document.body || document.head || document.documentElement).appendChild(script);
