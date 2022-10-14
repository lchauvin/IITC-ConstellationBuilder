// ==UserScript==
// @author BlancLapin
// @id constellation-builder-iitc
// @name IITC Plugin: Constellation Builder
// @category Draw
// @version 0.0.1
// @namespace https://tempuri.org/iitc/constellation-builder
// @description Easy Constellation Builder
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

  window.plugin.constellationBuilder = function() {};

  // Name of the IITC build for first-party plugins
  plugin_info.buildName = 'constellationBuilder';

  // Datetime-derived version of the plugin
  plugin_info.dateTimeVersion = '20221013103500';

  // ID/name of the plugin
  plugin_info.pluginId = 'constellationBuilder';

  window.plugin.constellationBuilder.anchorlatlng;

  window.plugin.constellationBuilder.anchortitle = 'Undefined';

  window.plugin.constellationBuilder.dialogData;

  window.plugin.constellationBuilder.MAX_LINK = 250;

  window.plugin.constellationBuilder.num_links = 10;

  window.plugin.constellationBuilder.listValidPortals;

  window.plugin.constellationBuilder.ignoreExistingLinks = false;

  // The entry point for this plugin.
  window.plugin.constellationBuilder.setup = function() {
    if (window.plugin.drawTools === undefined) {
      console.log("This plugin requires draw tools");
      return;
    }

    $('<a>')
    .html('Constellation Builder')
    .attr({
      id: 'constellation-builder-toolbox-link',
      title: 'Constellation Builder'
    })
    .click(window.plugin.constellationBuilder.showDialog)
    .appendTo('#toolbox');

    window.plugin.constellationBuilder.dialogData  = window.plugin.constellationBuilder.generateHtmlDialog();
  }

  window.plugin.constellationBuilder.setAnchor = function() {
    if (window.selectedPortal == null){ return; }

    var p = window.portals[window.selectedPortal];
    window.plugin.constellationBuilder.anchorlatlng = p.getLatLng();
    window.plugin.constellationBuilder.anchortitle = p.options.data.title;

    document.getElementById('anchorName').textContent = p.options.data.title;
  }

  window.plugin.constellationBuilder.generateHtmlDialog = function(){
    var html = `
    <i>Anchor:</i><br>
    <form name='playerlist' action='#' method='post' target='_blank'>
    <button type="submit" form="maxfield" value="Set Anchor" onclick='window.plugin.constellationBuilder.setAnchor()'>Set Anchor</button>&nbsp;&nbsp;<a id="anchorName">${window.plugin.constellationBuilder.anchortitle}</a><br/>
    <a>Number of links (1-${window.plugin.constellationBuilder.MAX_LINK}):</a><input type="number" id='num_links' name="num_links" min="1" max="${window.plugin.constellationBuilder.MAX_LINK}" value="${window.plugin.constellationBuilder.num_links}"><br/>
    <input type="checkbox" id="ignore-existing-links" name="ignore-existing-links" onclick='window.plugin.constellationBuilder.updateIgnoreExistingLinks()'>
    <label for="ignore-existing-links">Ignore existing links</label><br>
    <button type="submit" form="maxfield" value="Save" onclick='window.plugin.constellationBuilder.saveConstellation()' style="float:right">Save</button>
    <button type="submit" form="maxfield" value="Build" onclick='window.plugin.constellationBuilder.buildConstellation()' style="float:right">Build Constellation</button>
    </form>
    `;

    return html;
  }

  window.plugin.constellationBuilder.saveConstellation = function() {
    window.plugin.drawTools.save();
    alert('Constellation Saved.');
  }

  window.plugin.constellationBuilder.updateIgnoreExistingLinks = function() {
    window.plugin.constellationBuilder.ignoreExistingLinks = document.getElementById('ignore-existing-links').checked;
  }

  window.plugin.constellationBuilder.buildConstellation = function() {

    window.plugin.constellationBuilder.num_links = parseInt(document.getElementById('num_links').value);
    if (window.plugin.constellationBuilder.num_links > window.plugin.constellationBuilder.MAX_LINK){
      alert('Maximum number of links: ' + window.plugin.constellationBuilder.MAX_LINK);
      return;
    }

    if (window.plugin.constellationBuilder.anchorlatlng === undefined){
      alert('An anchor should be set first');
      return;
    }

    // Convert dictionnary to array first
    var items = Object.keys(window.portals).map(function(key) {
      return window.portals[key];
    });

    // Sort portals by distance to anchor
    var sortedPortals = items.sort(
    (p1, p2) => (window.plugin.constellationBuilder.distanceToAnchor(p1) > window.plugin.constellationBuilder.distanceToAnchor(p2)) ? 1 : (window.plugin.constellationBuilder.distanceToAnchor(p1) < window.plugin.constellationBuilder.distanceToAnchor(p2)) ? -1 : 0);

    if (sortedPortals.length < window.plugin.constellationBuilder.num_links){
      alert('Not enough portal visible. Either reduce the number of portals to link, or zoom out.');
      return;
    }

    // Check link validity
    if (!window.plugin.constellationBuilder.ignoreExistingLinks){
      var validSortedPortals = sortedPortals.filter(window.plugin.constellationBuilder.isLinkValid);
    }else{
      var validSortedPortals = sortedPortals;
    }
    //console.log(sortedPortals.length);
    //console.log(validSortedPortals.length);

    // Reduce set to num_links if necessary
    if (validSortedPortals.length > window.plugin.constellationBuilder.num_links){
      validSortedPortals = validSortedPortals.slice(0,window.plugin.constellationBuilder.num_links);
    }else{
      alert('Not enough valid portals. Either reduce the number of portals to link, or zoom out.');
      return;
    }

    // Generate all valid links
    window.plugin.constellationBuilder.listValidPortals = [];
    $.each(validSortedPortals, function(i,p){
      var p_latlng = p.getLatLng();
      var lnk = {"type":"polyline", "latLngs":[
        {"lat":window.plugin.constellationBuilder.anchorlatlng.lat, "lng":window.plugin.constellationBuilder.anchorlatlng.lng},
        {"lat": p_latlng.lat, "lng": p_latlng.lng}
      ]};
      window.plugin.constellationBuilder.listValidPortals.push(lnk);
    });
    window.plugin.drawTools.import(window.plugin.constellationBuilder.listValidPortals);

    // $('#portalListSelect option').each(function(){
    //   var pol = {"type":"polygon", "latLngs":[
    //     {"lat":window.plugin.constellationBuilder.anchor1latlng.lat, "lng":window.plugin.constellationBuilder.anchor1latlng.lng},
    //     {"lat":window.plugin.constellationBuilder.anchor2latlng.lat, "lng":window.plugin.constellationBuilder.anchor2latlng.lng},
    //     {"lat":$(this).val().split(',')[0], "lng":$(this).val().split(',')[1]},]};
    //     window.plugin.constellationBuilder.portalslatlng.push(pol);
    //   });
    //   window.plugin.drawTools.import(window.plugin.constellationBuilder.portalslatlng);
  }

  window.plugin.constellationBuilder.distanceToAnchor = function(p){
    return google.maps.geometry.spherical.computeDistanceBetween(window.plugin.constellationBuilder.anchorlatlng, p.getLatLng());
  }

  window.plugin.constellationBuilder.isLinkValid = function(p){


    var team = teamStringToId("R"); // team doesn't matter as links can't cross no matter which team their are from
    var latlngs = [
      window.plugin.constellationBuilder.anchorlatlng,
      p.getLatLng()
    ];
    var new_link = L.geodesicPolyline(latlngs, {
      color: COLORS[team],
      opacity: 0,
      interactive: false,

      team: team,
      //ent: ent,  // LEGACY - TO BE REMOVED AT SOME POINT! use .guid, .timestamp and .data instead
      //guid: ent[0],
      //timestamp: ent[1],
      //data: data
    });

    var isValid = true;
    $.each(window.links, function (guid, link) {
      if (plugin.crossLinks.testPolyLine(new_link, link)){
        //console.log("Invalid: " + p.options.data.title);
        isValid = false;
        return false; // Exit the each function
      }
    });

    //console.log("Valid: " + p.options.data.title);
    return isValid;
  }

  window.plugin.constellationBuilder.showDialog = function(){
    window.plugin.constellationBuilder.dialogData = window.plugin.constellationBuilder.generateHtmlDialog();
    dialog({
        title: 'Constellation Builder',
        id: 'constellation-builder-iitc',
        html: window.plugin.constellationBuilder.dialogData,
        width: 700
    });

    document.getElementById('ignore-existing-links').checked = window.plugin.constellationBuilder.ignoreExistingLinks;
  }

  var setup = window.plugin.constellationBuilder.setup;

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
