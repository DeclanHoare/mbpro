// Copyright 2018 Declan Hoare
// This file is part of MBPRO.
//
// MBPRO is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// MBPRO is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with MBPRO.  If not, see <http://www.gnu.org/licenses/>.


// mbp means ManageBac PRO (MBPRO)
// xpr means Experience
// cat means category

// This thing gets stored as JSON in a special reflection and contains
// all new persistent state (*that's the plan, not in this commit)
var mbpsettings =
{
	ident: "MBPRO 1" // format versioning and must be unique
};
var settingsid; // Portfolio ID of settings object

var baseaddr = location.protocol + "//" + location.hostname + (location.port ? ":" + location.port : "");

const catnamemap =
{
	C: "Creativity",
	A: "Activity",
	S: "Service",
	T: "Total"
};

const catcolours =
{
	C: "#E33F33", // red
	A: "#3874FE", // blue
	S: "#24C75B", // green
	T: "#000000" // black
};

const catmaxes =
{
	C: 50,
	A: 50,
	S: 50,
	T: 150
};

// CAS Main Page Stuff
function setup_cas()
{
	if (!location.href.split("#")[0].endsWith("/cas"))
		return;
	// Since we get rid of the letters on the CAS badges, better leave
	// a colour legend for convenience
	var casexptitle = $(".content-block > h3").first();
	casexptitle.append(" <small>(Legend: </small>");
	["c", "a", "s"].forEach(function (cat)
	{
		// Find the first copy of each badge icon on the page, clone it,
		// set the mouseover text to the full category name, then add
		// it to the title
		casexptitle.append($(`svg.hour-type-${cat}`).first().parent()
			.clone().attr("data-original-title",
				catnamemap[cat.toUpperCase()]));
	});
	casexptitle.append("<small>)</small>");
	
	var cattotals = {C: 0, A: 0, S: 0, T: 0};
	var xprhours = {};
	
	// An "activity tile" is the entry for an Experience.  I'm not sure
	// which name I love more.  But here's where to add things to each
	// one of those.
	$(".activity-tile").each(function ()
	{
		var catthis = {C: null, A: null, S: null};
		
		// Get the ID of this Experience
		var linksplit = $(this).find("a").attr("href").split("/");
		var xprid = linksplit[linksplit.length - 1];
		
		// Replace the C,A,S badge letters with their hour numbers
		$(this).find(".labels-and-badges > span:has(svg.cas-activity-type)").each(function ()
		{
			// Copy the data from the button to mouseover & vice-versa.
			// Teamwork
			var hours = $(this).attr("data-original-title");
			var hoursn = parseInt(hours);
			var category = $(this).find("text").text();
			$(this).attr("data-original-title", `${hours} ${catnamemap[category]}`);
			$(this).find("text").text(`${hoursn}`);
			catthis[category] = hoursn;
			cattotals[category] += hoursn;
			cattotals.T += hoursn;
		});
		
		// Store the number of hours scraped from the DOM in the dict
		// where it's easier to get at
		xprhours[xprid] = catthis;
	});
	
	// Now to mess with the tabs down the bottom.  The new tab is the
	// default and should be called "Total Progress".
	var tablist = $("[role='tablist']").first();
	var tabcontent = $(".tab-content").first();

	tablist.find("> li.active").removeClass("active");
	tabcontent.find("> .tab-pane.active").removeClass("active");
	tablist.prepend("<li class='active'><a role='tab' data-toggle='tab' href='#total-progress'>Total Progress</a></li>");
	tabcontent.prepend("<div class='tab-pane active' id='total-progress'><table style='border-collapse: separate; border-spacing: 4px;' /></div>");
	
	var totalprogress = $("#total-progress");
	var progbars = totalprogress.find("table");
	
	// Rename "Hours Progress" to "Task Hours" to avoid confusion with
	// the new tab
	$("a[href='#hours-progress'][role='tab']").text("Task Hours");
	
	for (var cat in cattotals)
	{
		var name = catnamemap[cat];
		var hours = cattotals[cat];
		var colour = catcolours[cat];
		var width = Math.min(hours / catmaxes[cat], 1) * 100;
		progbars.append(`<tr><td style="padding-right: 8px;">${name}</td><td class="progress" style="width: 100%;"><div class="progress-bar" style="width: ${width}%; background-color: ${colour};">${hours} / ${catmaxes[cat]}</div></td></tr>`);
	}
}

function setup()
{
	// Call the submodules
	setup_cas();
}

setup();
// Turbolinks 'fakes' page load so the extension doesn't re-run automatically
$(document).on("turbolinks:load", setup);



