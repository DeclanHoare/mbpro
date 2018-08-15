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

// Forms aren't accepted unless a CSRF token sent by ManageBac is
// included in the header.  JQuery doesn't include it with AJAX
// requests automatically, so get it manually.
var csrftoken = $("meta[name='csrf-token']").attr("content");

var baseaddr = location.protocol + "//" + location.hostname + (location.port ? ":" + location.port : "");

// This thing gets stored as JSON in a special reflection and contains
// all new persistent state
var mbpmagic = "MBPRO1SETTINGS"; // Magic string identifies settings reflection in list
var mbpsettings =
{
	hrhistory: {} // contains hour change history
};
var settingsid = null; // Portfolio ID of settings object
var chksettings = false; // Have we tried to find the portfolio entry?
function loadsettings()
{
	return $.ajax(
	{
		method: "GET",
		url: `${baseaddr}/student/portfolio`,
		async: true
	}).then(function (data)
	{
		var page = $(data);
		var reflection = page.find(`.col-sm-12:has(:contains(${mbpmagic}))`);
		if (reflection.length)
		{
			mbpsettings = a2obj(reflection.find(".description").text().substring(mbpmagic.length));
			settingsid = parseInt(reflection.find(".actions").prop("id").split("-")[2]);
		}
		chksettings = true;
	});
}
var getpromise = loadsettings(), savepromise = null; // savepromise is for first ever save

// convert object to an unintrusive string
function obj2a(obj)
{
	return escape(JSON.stringify(obj));
}

// unconvert
function a2obj(a)
{
	return JSON.parse(unescape(a));
}

function savesettings()
{
	if (!chksettings)
		return getpromise.then(savesettings);
	if (savepromise !== null)
		return savepromise.then(savesettings);
	if (settingsid === null) // No reflection exists yet
	{
		return savepromise = $.ajax(
		{
			method: "POST",
			url: `${baseaddr}/student/portfolio/resources`,
			data:
			{
				"utf8": "\u2713",
				"portfolio_resource_form[folder]": "personal",
				"portfolio_resource_form[program]": 1,
				"portfolio_resource_form[kind]": "journal",
				"portfolio_resource_form[journal_body]": mbpmagic + obj2a(mbpsettings),
				"commit": "Add to Portfolio"
			},
			headers:
			{
				"X-CSRF-TOKEN": csrftoken
			},
			async: true
		}).then(loadsettings).then(function ()
		{
			savepromise = null;
		});
	}
	else // Edit existing reflection
	{
		return $.ajax(
		{
			method: "POST",
			url: `${baseaddr}/student/portfolio/resources/${settingsid}?folder=personal`,
			data:
			{
				"utf8": "\u2713",
				"_method": "patch",
				"portfolio_resource[body]": mbpmagic + obj2a(mbpsettings),
				"commit": "Save Changes"
			},
			headers:
			{
				"X-CSRF-TOKEN": csrftoken
			},
			async: true
		});
	}
}

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
var cattotals;

// adds an element very very on top of the page
function addontop(jqelem)
{
	var maxz = 0;
	$(document.body).children().each(function ()
	{
		var z = parseInt($(this).css("z-index"));
		if (z > maxz)
			maxz = z;
	});
	jqelem.css("z-index", maxz + 1);
	$(document.body).append(jqelem);
	
}

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
	cattotals = {C: 0, A: 0, S: 0, T: 0};
	
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
    var editor = $("<div style='position: absolute; background-color: white; text-align: right; padding: 4px;' class='panel panel-default' />");
    var catthis = xprhours[xprid];
    for (var cat in catthis)
    {
		if (catthis[cat] !== null)
			editor.append(`<div class="input-group"><div class="input-group-btn"><button class="active btn cas-${catnameinternal[cat]}-type cas-btn-with-checkbox" type="button">${catnamemap[cat]}</button></div><input class="numeric float optional form-control mbp${cat}" min="0" max="1000" type="number" step="any" value="${catthis[cat]}"><span class="input-group-addon">hours</span></div>`);
	}
	editor.append("<input class='form-control string mbpmessage' type='text' placeholder='Message (optional)' style='width: calc(100% - 4px);' /><a class='btn btn-light mbpcancel' href='javascript:null(0)'>Cancel</a><a class='btn btn-light mbpsave' href='javascript:null(0)'>Save</a>");
	editor.children().css({margin: 2});
	getpromise.done(function ()
	{
		if (xprid in mbpsettings.hrhistory)
		{
			console.log(mbpsettings);
			var history = $("<div style='text-align: left; max-height: 100px; overflow-y: auto; display: block; margin: 2px;' />");
			var even = false;
			mbpsettings.hrhistory[xprid].forEach(function (entry)
			{
				console.log(entry);
				var row = $(`<div />`);
				row.css({"background-color": even ? "white" : "#EFF6FF"});
				even = !even;
				history.append(row);
				var time = $("<span />");
				row.append(time);
				time.text(new Date(entry.timestamp).toLocaleString());
				row.append($("<span> </span>")); // spacing
				for (var cat in catthis)
				{
					var colcat = $(`<span style="color: ${catcolours[cat]}" />`);
					row.append(colcat);
					if (cat in entry.changes)
					{
						var val = entry.changes[cat];
						if (val !== 0)
							colcat.text(((val > 0) ? "+" : "") + val.toString() + cat);
					}
				}
				var msgcol = $("<i style='display: block;' />");
				row.append(msgcol);
				msgcol.text(entry.message);
			});
			editor.append(history);
		}
	});
	addontop(editor);
	
	// Keep the dialog's top-right corner lined up with the bottom-right
	// corner of the link that opens it.
	function updatepos()
	{
		var bodyrect = document.body.getBoundingClientRect();
		var linkrect = event.target.getBoundingClientRect();
		editor.css({top: linkrect.bottom + window.scrollY, right: bodyrect.right - linkrect.right, width: 250});
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
	
	function ajerror()
	{
		var flasharea = $("#flash-area");
		if (!flasharea.length)
		{
			flasharea = $("<div id='flash-area' />");
			$(".content-wrapper").prepend(flasharea);
		}
		flasharea.html("<div class='flash error'>Failed to edit CAS hours.</div>");
		canclose = true;
		cancel();
	}
	
	var editdoc = $.ajax(
	{
		method: "GET",
		url: `${baseaddr}/student/ib/activity/cas/${xprid}/edit`,
		async: true
	});
	
	function submit(event)
	{
		if (!canclose)
			return;
		canclose = false;
		editor.find("input, a").attr("disabled", "disabled");
		editor.find(".mbpcancel").before($("<span>Processing... </span>"));
		var waiting = 2; // Wait for Experience + settings to save
		function unwait()
		{
			waiting--;
			if (!waiting)
			{
				canclose = true;
				cancel();
			}
		}
		
		var changes = {};
		
		for (var cat in catthis)
		{
			if (catthis[cat] === null)
				continue;
			var value = editor.find(`.mbp${cat}`).val();
			console.log(value);
			var valint = parseInt(value);
			changes[cat] = valint - catthis[cat];
			catthis[cat] = valint;
		}
		
		// Update hours history
		getpromise.then(function ()
		{
			console.log("updating hours history");
			console.log(mbpsettings);
			if (!(xprid in mbpsettings.hrhistory))
				mbpsettings.hrhistory[xprid] = [];
			mbpsettings.hrhistory[xprid].unshift( // unshift is the 10x name for prepend
			{
				timestamp: new Date().getTime(),
				changes: changes,
				message: editor.find(".mbpmessage").val()
			});
		}).then(savesettings).then(unwait);
		
		// Get the edit form HTML, fill in the form, then submit it
		// using AJAX.
		editdoc.done(function (data)
		{
			console.log(data);
			var page = $(data);
			var form = page.find("form");
			for (var cat in changes) // Copy the new values
				form.find(`#cas_activity_${catnameinternal[cat]}_hours`).val(catthis[cat]);
			
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
			}).fail(ajerror);
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



