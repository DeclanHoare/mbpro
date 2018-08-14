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

// The category names used in form attributes
const catnameinternal =
{
	C: "creativity",
	A: "action", // NOT activity
	S: "service"
};

var xprhours;
var cattotals = {C: 0, A: 0, S: 0, T: 0};

// CAS Main Page Stuff
function setup_cas()
{
	if (!location.href.split("#")[0].endsWith("/student/ib/activity/cas"))
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
	
	xprhours = {};
	
	// An "activity tile" is the entry for an Experience.  I'm not sure
	// which name I love more.  But here's where to add things to each
	// one of those.
	$(".activity-tile").each(function ()
	{
		var catthis = {C: null, A: null, S: null};
		
		// Get the ID of this Experience
		var linksplit = $(this).find("a").attr("href").split("/");
		var xprid = linksplit[linksplit.length - 1];
		// and associate it back so it's easier to find
		$(this).addClass(`tile${xprid}`);
		
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
		
		// Show reflections counter as "No" if there are none (rather
		// than hiding counter).  This provides something to attach the
		// add button to later but it's added here so it shows up on
		// completed Experiences for consistency.
		var reflections = $(this).find(".reflections-count");
		if (!reflections.length)
		{
			reflections = $("<div class='reflections-count'>No reflections</div>");
			$(this).find(".labels-and-badges").append(reflections);
		}
		
		// Can't edit completed Experiences so don't add the new edit features
		if (!($(this).find("h4.title img").attr("src").includes("cas_completed")))
		{
			// Turn the hours total into the quick edit link
			var totalhrs = $(this).find(".hours");
			totalhrs.html(`<a href="javascript:null(0)" id="editlink${xprid}" data-xprid="${xprid}">${totalhrs.text()}</a>`);
			$(`#editlink${xprid}`).click(xpr_edit);
			
			// Add the quick reflection add link
			reflections.append($(`<span> <a href="${baseaddr}/student/ib/activity/cas/${xprid}/reflections/new">[+]</a></span>`));
		}
	});
	
	// Now to mess with the tabs down the bottom.  The new tab is the
	// default and should be called "Total Progress".
	var tablist = $("[role='tablist']").first();
	var tabcontent = $(".tab-content").first();

	tablist.find("> li.active").removeClass("active");
	tabcontent.find("> .tab-pane.active").removeClass("active");
	tablist.prepend("<li class='active'><a role='tab' data-toggle='tab' href='#total-progress'>Total Progress</a></li>");
	tabcontent.prepend("<div class='tab-pane active' id='total-progress'><table style='border-collapse: separate; border-spacing: 4px;' /></div>");
	
	// Rename "Hours Progress" to "Task Hours" to avoid confusion with
	// the new tab
	$("a[href='#hours-progress'][role='tab']").text("Task Hours");
	
	create_progress();
}

// Set up the Total Progress section.
// This happens on page load and when the quick hours editor is saved.
function create_progress()
{
	var progbars = $("#total-progress table");
	progbars.empty();
	for (var cat in cattotals)
	{
		var name = catnamemap[cat];
		var hours = cattotals[cat];
		var colour = catcolours[cat];
		var width = Math.min(hours / catmaxes[cat], 1) * 100;
		progbars.append(`<tr><td style="padding-right: 8px;">${name}</td><td class="progress mbp" style="width: 100%;"><div class="progress-bar" style="width: ${width}%; background-color: ${colour};">${hours} / ${catmaxes[cat]}</div></td></tr>`);
	}
}

var canclose = true;

// Opens up the lightweight inline editor dialog allowing you to edit
// hours without waiting for two entire pages to load
function xpr_edit(event)
{
	// If another dialog is processing, don't open this one.
	if (!canclose)
		return;
	
	// Construct the editor with the number and categories of hours
	// found from the Experience being edited.
	var xprid = event.target.dataset.xprid;
    var editor = $("<div style='position: absolute; background-color: white; text-align: right;' class='panel panel-default' />");
    var catthis = xprhours[xprid];
    for (var cat in catthis)
    {
		if (catthis[cat] !== null)
			editor.append(`<div class="input-group"><div class="input-group-btn"><button class="active btn cas-${catnameinternal[cat]}-type cas-btn-with-checkbox" type="button">${catnamemap[cat]}</button></div><input class="numeric float optional form-control mbp${cat}" min="0" max="1000" type="number" step="any" value="${catthis[cat]}"><span class="input-group-addon">hours</span></div>`);
	}
	editor.append("<a class='btn btn-light mbpcancel' href='javascript:null(0)'>Cancel</a><a class='btn btn-light mbpsave' href='javascript:null(0)'>Save</a>");
	editor.children().css({margin: 2});
	$(document.body).append(editor);
	
	// Keep the dialog's top-right corner lined up with the bottom-right
	// corner of the link that opens it.
	function updatepos()
	{
		var bodyrect = document.body.getBoundingClientRect();
		var linkrect = event.target.getBoundingClientRect();
		editor.css({top: linkrect.bottom, right: bodyrect.right - linkrect.right, width: 250});
	}
	updatepos();
	$(window).resize(updatepos);
	
	// These messy events make sure the dialog closes when you click
	// out of it, unless the user clicked save and we're contacting the
	// server, in which case the click is deflected (modal).
	var justopened = true;
	function clickout(event)
	{
		if (justopened)
			justopened = false;
		else
			cancel(event);
	}
	function blockvisit(event)
	{
		if (!canclose)
			event.preventDefault();
	}
	function cancel(event)
	{
		if (canclose)
		{
			editor.remove();
			$(document.body).off("click", clickout);
			$(document).off("turbolinks:before-visit", blockvisit);
		}
		else
		{
			event.stopPropagation();
			event.preventDefault();
		}
	}
	
	function submit(event)
	{
		if (!canclose)
			return;
		canclose = false;
		editor.find("input, a").attr("disabled", "disabled");
		editor.find(".mbpcancel").before($("<span>Processing... </span>"));
		var waiting = 1; // Add another one for updating settings
		function unwait()
		{
			waiting--;
			if (!waiting)
			{
				canclose = true;
				cancel();
			}
		}
		// Get the edit form HTML, fill in the form, then submit it
		// using AJAX.
		$.ajax(
		{
			method: "GET",
			url: `${baseaddr}/student/ib/activity/cas/${xprid}/edit`,
			async: true
		}).done(function (data)
		{
			console.log(data);
			var page = $(data);
			var form = page.find("form");
			var changes = {};
			for (var cat in catthis) // Copy the new values
			{
				if (catthis[cat] === null)
					continue;
				var value = editor.find(`.mbp${cat}`).val();
				console.log(value);
				form.find(`#cas_activity_${catnameinternal[cat]}_hours`).val(value);
				var valint = parseInt(value);
				changes[cat] = valint - catthis[cat];
				catthis[cat] = valint; // update structure while we're here
			}
			
			// JQuery just will not find this tag for some reason,
			// so I use normal DOM
			var csrftoken;
			var pagedom = document.createElement("html");
			pagedom.innerHTML = data;
			for (const meta of pagedom.getElementsByTagName("meta"))
			{
				if (meta.getAttribute("name") === "csrf-token")
				{
					csrftoken = meta.getAttribute("content");
					break;
				}
			}
			
			console.log(csrftoken);
			$.ajax(
			{
				method: "POST",
				url: `${baseaddr}/student/ib/activity/cas/${xprid}`,
				data: form.serialize(),
				headers:
				{
					"X-CSRF-TOKEN": csrftoken
				},
				async: true
			}).done(function ()
			{
				// Get the tile so we can edit the displayed info
				var tile = $(`.tile${xprid}`);
				var total = 0;
				for (var cat in catthis)
				{
					if (catthis[cat] !== null)
					{
						// Set category hours for this Experience.
						// It would be nicer to abstract this out into
						// a function that's shared with the page load
						// version but that behaves slightly differently.
						var circle = tile.find(`.hour-type-hint-${cat.toLowerCase()}`);
						circle.find("text").text(catthis[cat]);
						circle.attr("data-original-title", `${catthis[cat]} hours ${catnamemap[cat]}`);
						
						// Update global subtotals and grand total
						cattotals[cat] += changes[cat];
						cattotals.T += changes[cat];
						
						// Update Experience total
						total += catthis[cat];
					}
				}
				
				// Show updated Experience total
				// Note that we don't need to worry about there not
				// being a link in the hours section because the editor
				// can't ever open if there isn't one
				tile.find(".hours a").text(`${total} hours`); 
				
				// Update Total Progress tab
				create_progress();
				
				// Allow the form to close
				unwait();
			});
		});
	}
	editor.click(function (event) { event.stopPropagation(); });
	$(document.body).click(clickout);
	$(document).on("turbolinks:before-visit", blockvisit);
	editor.find(".mbpcancel").click(cancel);
	editor.find(".mbpsave").click(submit);
}

function setup()
{
	// reset XPR edit state
	canclose = true;
	// Call the submodules
	setup_cas();
}

setup();
// Turbolinks 'fakes' page load so the extension doesn't re-run automatically
$(document).on("turbolinks:load", setup);



