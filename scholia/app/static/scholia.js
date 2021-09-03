// https://stackoverflow.com/questions/6020714
function escapeHTML(html) {
    if (typeof html !== "undefined") {
	return html
	    .replace(/&/g,'&amp;')
	    .replace(/</g,'&lt;')
	    .replace(/>/g,'&gt;');
    }
    else {
	return "";
    }
}

// http://stackoverflow.com/questions/1026069/
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}


function convertDataTableData(data, columns, linkPrefixes={}, linkSuffixes={}) {
    // Handle 'Label' columns.

    // var linkPrefixes = (options && options.linkPrefixes) || {};
    
    var convertedData = [];
    var convertedColumns = [];
    for (var i = 0 ; i < columns.length ; i++) {
	column = columns[i];
	if (column.substr(-11) == 'Description') {
	    convertedColumns.push(column.substr(0, column.length - 11) + ' description');
	} else if (column.substr(-5) == 'Label') {
	    // pass
	} else if (column.substr(-3) == 'Url') {
	    // pass
	} else {
	    convertedColumns.push(column);
	}
    }
    for (var i = 0 ; i < data.length ; i++) {
	var convertedRow = {};
	for (var key in data[i]) {
	    if (key.substr(-11) == 'Description') {
		convertedRow[key.substr(0, key.length - 11) + ' description'] = data[i][key];

	    } else if (key + 'Label' in data[i]) {
		convertedRow[key] = '<a href="' +
		    (linkPrefixes[key] || "../") + 
		    data[i][key].substr(31) +
            (linkSuffixes[key] || "") +
		    '">' + data[i][key + 'Label'] + '</a>';
	    } else if (key.substr(-5) == 'Label') {
		// pass
		
	    } else if (key + 'Url' in data[i]) {
		convertedRow[key] = '<a href="' +
		    data[i][key + 'Url'] +
		    '">' + data[i][key] + '</a>';
	    } else if (key.substr(-3) == 'Url') {
		// pass

	    } else if (key.substr(-3) == 'url') {
		// Convert URL to a link
		convertedRow[key] = "<a href='" +
		    data[i][key] + "'>" + 
		    $("<div>").text(data[i][key]).html() + '</a>';

	    } else if (key == 'orcid') {
		// Add link to ORCID website
		convertedRow[key] = '<a href="https://orcid.org/' +
		    data[i][key] + '">' + 
		    data[i][key] + '</a>';

	    } else if (key == 'doi') {
		// Add link to Crossref
		convertedRow[key] = '<a href="https://doi.org/' +
		    encodeURIComponent(data[i][key]) + '">' +
		    $("<div>").text(data[i][key]).html() + '</a>';
	    } else {
		convertedRow[key] = data[i][key];
	    }
	}
	convertedData.push(convertedRow);
    }
    return {data: convertedData, columns: convertedColumns}
}


function entityToLabel(entity, language='en') {
    if (language in entity['labels']) {
        return entity['labels'][language].value;
    }

    // Fallback
    languages = ['en', 'da', 'de', 'es', 'fr', 'jp',
                 'nl', 'no', 'ru', 'sv', 'zh'];
    for (lang in languages) {
        if (lang in entity['labels']) {
            return entity['labels'][lang].value;
        }
    }

    // Last resort
    return entity['id']
}


function sparqlDataToSimpleData(response) {
    // Convert long JSON data from from SPARQL endpoint to short form
    let data = response.results.bindings;
    let columns = response.head.vars
    if(columns[3]=='hiddenId'){
	columns.splice(3,1);
    }
    var convertedData = [];
    for (var i = 0 ; i < data.length ; i++) {
	var convertedRow = {};
	for (var key in data[i]) {
	    if(key!='hiddenId'){
	    	convertedRow[key] = data[i][key]['value'];
	    }
	}
	convertedData.push(convertedRow);
    }
    return {data: convertedData, columns: columns};
}	


function sparqlToDataTable2(sparql, element, options={}) {
    // Options: linkPrefixes={}, linkSuffixes={}, paging=true
    var linkPrefixes = (typeof options.linkPrefixes === 'undefined') ? {} : options.linkPrefixes;
    var linkSuffixes = (typeof options.linkSuffixes === 'undefined') ? {} : options.linkSuffixes;
    var paging = (typeof options.paging === 'undefined') ? true : options.paging;
    var sDom = (typeof options.sDom === 'undefined') ? 'lfrtip' : options.sDom;
    var url = "https://query.wikidata.org/bigdata/namespace/wdq/sparql?query=" + 
	encodeURIComponent(sparql) + '&format=json';

    $.getJSON(url, function(response) {
	var simpleData = sparqlDataToSimpleData(response);

	convertedData = convertDataTableData(simpleData.data, simpleData.columns, linkPrefixes=linkPrefixes, linkSuffixes=linkSuffixes);
	columns = [];
	for ( i = 0 ; i < convertedData.columns.length ; i++ ) {
	    var column = {
		data: convertedData.columns[i],
		title: capitalizeFirstLetter(convertedData.columns[i]).replace(/_/g, "&nbsp;"),
		defaultContent: "",
	    }
	    columns.push(column)
	}

	table = $(element).DataTable({ 
	    data: convertedData.data,
	    columns: columns,
	    lengthMenu: [[10, 25, 100, -1], [10, 25, 100, "All"]],
	    ordering: true,
	    order: [], 
	    paging: paging,
	    sDom: sDom,
	});

	$(element).append(
	    '<caption><a href="https://query.wikidata.org/#' + 
		encodeURIComponent(sparql) +	
		'">Edit on query.Wikidata.org</a></caption>');
    });
}


function sparqlToDataTable(sparql,element, filename, options={}) {
  
    console.log(options.section)
	var wikidataUrl = "https://query.wikidata.org/sparql?query=" + encodeURIComponent(sparql) + '&format=json';
    var cacheUrl="http://156.35.94.157:3000/scholia/country_"+options.section+"/"+options.wikidataId
	
    $.getJSON(cacheUrl, function(response) {
		console.log(response)
        fillTableFromResponse(response.data,sparql,element,filename,options);
    }).fail(function() {
		console.log( "non cached element" );  
		$.getJSON(wikidataUrl, function(response) {
			fillTableFromResponse(response,sparql,element,filename,options);
		})
	});
    return;
};


function fillTableFromResponse(response,sparql,element, filename,options){

    // Options: linkPrefixes={}, paging=true
    var linkPrefixes = (typeof options.linkPrefixes === 'undefined') ? {} : options.linkPrefixes;
    var linkSuffixes = (typeof options.linkSuffixes === 'undefined') ? {} : options.linkSuffixes;
    var paging = (typeof options.paging === 'undefined') ? true : options.paging;
    var sDom = (typeof options.sDom === 'undefined') ? 'lfrtip' : options.sDom;


    var simpleData = sparqlDataToSimpleData(response);
        
    convertedData = convertDataTableData(simpleData.data, simpleData.columns, linkPrefixes=linkPrefixes, linkSuffixes=linkSuffixes);
    console.log(convertedData)    
    columns = [];
    for ( i = 0 ; i < convertedData.columns.length ; i++ ) {
        var column = {
            data: convertedData.columns[i],
            title: capitalizeFirstLetter(convertedData.columns[i]).replace(/_/g, "&nbsp;"),
            defaultContent: "",
        }
        columns.push(column)
    }

    var table = $(element).DataTable({ 
        data: convertedData.data,
        columns: columns,
        lengthMenu: [[10, 25, 100, -1], [10, 25, 100, "All"]],
        ordering: true,
        order: [[ 0, "desc" ]], 
        paging: paging,
        sDom: sDom,
    });

    $(element).append(
        '<caption><span style="float:left; font-size:smaller;"><a href="https://query.wikidata.org/#' + 
            encodeURIComponent(sparql) +    
            '">Wikidata Query Service</a></span>' +
            '<span style="float:right; font-size:smaller;"><a href="https://github.com/fnielsen/scholia/blob/master/scholia/app/templates/' +
            filename + '">' +
            filename.replace("_", ": ") +
            '</a></span></caption>'
    );

    disposeLoadingAnimation(options);
    return table
}



function sparqlToIframe(sparql, element, filename,options) {
    var result = new wikibase.queryService.ui.resultBrowser.CoordinateResultBrowser();	
    var cacheUrl="http://156.35.94.157:3000/scholia/country_"+options.section+"/"+options.wikidataId;
    $.getJSON(cacheUrl, function(response) {
		console.log(response.data.length);
		if(response?.data?.length <=0){
			console.log("non cached element");
			sparqlToIframeWikidata(sparql, element, filename,options);
			return;
		}
		result.setResult(response.data)
		cacheUrl = "https://query.wikidata.org/embed.html#" + encodeURIComponent(sparql);
		$(element).attr('src', cacheUrl);
		$('#'+options.section+'-header').next().empty();
		result.draw($('#'+options.section+'-header').next());
		document.getElementById('map').id = 'map-'+options.section;
   }).fail(function() {
		sparqlToIframeWikidata(sparql, element, filename,options);
   });
};

function sparqlToIframeWikidata(sparql, element, filename,options){
	var wikidataUrl = "https://query.wikidata.org/embed.html#" + encodeURIComponent(sparql);
	$(element).attr('src', wikidataUrl);
		$(element).parent().after(
			'<span style="float:right; font-size:smaller"><a href="https://github.com/fnielsen/scholia/blob/master/scholia/app/templates/' + filename + '">' +
				filename.replace("_", ": ") +
				'</a></span>');
	disposeLoadingAnimation(options);
}


function disposeLoadingAnimation(options){
	$('#'+options.section+'-progress').css('display','none');
}

//CONTINENT TEST

async function continentToDataTable(sparql, element, filename, options = {}) {

    var url = "https://query.wikidata.org/sparql?query=" +
        encodeURIComponent(sparql) + '&format=json';

    console.log(options.section)
    let countries = getCountriesByContinent(options.wikidataId);
    
    url = "http://156.35.94.157:3000/scholia/country_" + options.section + "/" + countries[0]
    let table;

    if(countries.length === 0) {
	$(element).text("No data available");
	$('#'+options.section+'-progress').css('display','none');
    }
    else {

    	await $.getJSON(url, function(response) {
        	table = fillTableFromResponse(response.data, sparql, element, filename, options);
    	});

    	for (let c = 1; c < countries.length; c++) {
        	url = "http://156.35.94.157:3000/scholia/country_" + options.section + "/" + countries[c]
        	$.getJSON(url, function(response) {
            	var simpleData = sparqlDataToSimpleData(response.data);
        
            	convertedData = convertDataTableData(simpleData.data, simpleData.columns, 
                	linkPrefixes=options.linkPrefixes, linkSuffixes=options.linkSuffixes);

            	table.rows.add(convertedData.data).order([0, 'desc']).draw();

            	simpleData = null;
            	convertedData = null;
        });
    	}
    }

    return;
};

async function sequentialCTIF(panels,options) {
    for(let i = 0; i < panels.length; i++) {
        let panel = panels[i];
        let ops = options;
        ops.section = panel;
        await continentToIframe('country_' + panel + '.sparql',
            panel + "-iframe", "country_" + panel + ".sparql", ops)
    }
}

async function continentToIframe(sparql, element, filename,options) {
    var result = new wikibase.queryService.ui.resultBrowser.CoordinateResultBrowser();
    let countries = getCountriesByContinent(options.wikidataId);
    let cachedData;
    url = "http://156.35.94.157:3000/scholia/country_" + options.section + "/" + countries[0]  

    if(countries.length === 0) {
	$("#" + element.replace("iframe", "warn")).text("No data available");
	$('#'+options.section+'-progress').css('display','none');
    }  
    else {
    	await $.getJSON(url, function(response) {
        cachedData = response.data;
    	});

    	for (let c = 1; c < countries.length; c++) {
        	url = "http://156.35.94.157:3000/scholia/country_" + options.section + "/" + countries[c]
        	await $.getJSON(url, function(response) {
            	console.log(countries[c])
            	for(r in response.data.results.bindings) {
                	cachedData.results.bindings.push(response.data.results.bindings[r])
            	}
            	console.log(cachedData.results.bindings.length)
            	result.setResult(cachedData)
            	url = "https://query.wikidata.org/embed.html#" + encodeURIComponent(sparql);
            	$(element).attr('src', url);
            	console.log(options)
            	$('#'+options.section+'-header').next().empty();
       	    	result.draw($('#'+options.section+'-header').next());
      	    	document.getElementById('map').id = 'map-'+options.section;
    	    });
    	}
    	cachedData = null;
    	result.setResult(null);
    	result = null;
    }
};

function getCountriesByContinent(con) {
    let countries = [];
    if(con === "Q46") {
        countries = ["Q29", "Q183", "Q31", "Q142", "Q38", "Q32", "Q55", "Q35", "Q27", "Q41", "Q45", "Q33", "Q40", "Q34", "Q191", "Q211",
        "Q37", "Q233", "Q36", "Q214", "Q215", "Q213", "Q28", "Q229", "Q219", "Q218", "Q224", "Q222", "Q228", "Q399", "Q184", "Q225", "Q230",
        "Q189", "Q347", "Q221", "Q217", "Q235", "Q236", "Q20", "Q145", "Q159", "Q238", "Q403", "Q39", "Q212", "Q237"
        ];       
    }
    else if(con === "Q49") {
        countries = ["Q16","Q241","Q244","Q30","Q96","Q754","Q757","Q760","Q763","Q766",
        "Q769","Q774","Q778","Q781","Q783","Q784","Q786","Q790","Q792","Q800"];       
    }
    else if(con === "Q18") {
        countries = ["Q155","Q77","Q298","Q414","Q419","Q717","Q733","Q734","Q736","Q739","Q750"];       
    }
    else if(con === "Q48") {
        countries = ["Q148","Q17","Q229","Q232","Q252","Q43","Q79","Q265","Q334","Q398","Q423","Q424","Q574",
        "Q668","Q711","Q794","Q796","Q801","Q805","Q810","Q813","Q819","Q822","Q826","Q833","Q836",
        "Q837","Q842","Q843","Q846","Q851","Q854","Q858","Q863","Q865","Q869","Q874","Q878","Q881",
        "Q884","Q889","Q902","Q917","Q921","Q928"];       
    }
    else if(con === "Q55643") {
        countries = ["Q252","Q408","Q664","Q672","Q683","Q685","Q686","Q691","Q695","Q697",
        "Q702","Q709","Q710","Q712"];       
    }
    else if(con === "Q15") {
        countries = ["Q114","Q115","Q117","Q79","Q1005","Q1006","Q1007","Q1008","Q1009","Q1011",
        "Q1013","Q1014","Q1016","Q1019","Q1020","Q1025","Q1027","Q1028","Q1029","Q1030","Q1032","Q1033",
        "Q1036","Q1037","Q1039","Q1041","Q1042","Q1044","Q1045","Q1049","Q1050","Q258","Q262",
        "Q657","Q912","Q916","Q924","Q929","Q945","Q948","Q953","Q954","Q958","Q962","Q963","Q965",
        "Q967","Q970","Q971","Q974","Q977","Q986"];       
    }
    return countries;
}
 
