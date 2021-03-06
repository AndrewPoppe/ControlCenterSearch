
/**
 * Finds nodes within the domNode that match the supplied search text
 * 
 * Spaces are replaced by wildcards
 * 
 * @param mixed searchText
 * @param mixed domNode
 * 
 * @return array of matching nodes
 */
controlCenterSearchModule.getNodesThatContain = function (searchText, domNode) {
    let searchString = searchText.replaceAll(" ", ".+?");
    let searchRE = new RegExp(searchString, 'gi');

    return $(domNode).find('#control_center_window').find(":not(iframe, script)")
        .contents()
        .map(function () {
            let text = this.textContent;
            this.markedText = text.replace(searchRE, (match) => `<span class="marked ccsearch">${match}</span>`);
            this.matched = text !== this.markedText;
            return this;
        })
        .filter(function () {
            return this.nodeType == 3 && this.matched;
        });
}

/**
 * Scrapes control center page for links and grabs the associated html
 * 
 * @return promise resolving to array of objects like:
 *      {
 *          link: href of the link,
 *          name: text content of the link,
 *          text: the html as a string
 *      }
 */
controlCenterSearchModule.getText = function (domNode = null) {
    const origin = new URL(window.location).origin;
    let aArr;
    if (domNode) {
        aArr = Array.from($(domNode).find('div.cc_menu_item a'));
    } else {
        aArr = Array.from($('div.cc_menu_item a'))
    }
    const links = aArr.filter(a => {
        return a.href.startsWith(origin) &&
            a.textContent !== "REDCap Home Page" &&
            a.textContent !== "My Projects" &&
            a.textContent !== "API Documentation" &&
            a.textContent !== "Configuration Check"
    });
    const results = links.map(async (a) => {
        let text = await fetch(a.href).then(result => result.text());
        return {
            link: a.href,
            name: a.textContent,
            text: text
        };
    });
    return Promise.all(results);
}

controlCenterSearchModule.urldecode = function (str) {
    return decodeURIComponent((str + '').replace(/\+/g, '%20'));
}

controlCenterSearchModule.urlencode = function (str) {
    return encodeURIComponent(str)
}


controlCenterSearchModule.storeResults = function (results) {
    const resultsString = JSON.stringify(results);
    const encodedData = this.urlencode(resultsString);
    const payload = `${this.cookie_name}=${encodedData}`;
    const xhr = new XMLHttpRequest();
    xhr.open('POST', this.storeTextUrl, true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.send(payload);
}

/**
 * If this is a new session, then text needs to be gotten.
 * 
 * Prevents using the search box until then. 
 * 
 * @return void
 */
controlCenterSearchModule.initText = async function (domNode = null) {
    $('#cc-search-searchInput').val('Please Wait...');
    $('#cc-search-searchInput').attr('readonly', true);
    this.getText(domNode)
        .then(results => {
            this.storeResults(results);
            this.link_data = results;
            $('#cc-search-searchInput').val('');
            $('#cc-search-searchInput').attr('readonly', false);
            this.initialized = true;
            console.log("Initialized text.");
        });
}


controlCenterSearchModule.search = function (searchTerm) {
    return this.link_data.map(ld => {
        let ld2 = ld;
        ld2.searchResults = this.searchLinkText(ld2.text, searchTerm);
        ld2.searchTerm = searchTerm;
        return ld2;
    }).filter(ld2 => ld2.searchResults.length > 0);
}


controlCenterSearchModule.searchLinkText = function (linkText, searchTerm) {
    let dom = $('<html>')[0];
    $(dom).html(linkText);
    return this.getNodesThatContain(searchTerm, dom);
}

controlCenterSearchModule.hideModules = function () {
    const el = $('.cc_menu_header:contains("External Modules")');
    el.nextAll().hide();
    el.hide();
}

controlCenterSearchModule.showModules = function () {
    const el = $('.cc_menu_header:contains("External Modules")');
    el.nextAll().show();
    el.show();
}

controlCenterSearchModule.showDividers = function () {
    $('#control_center_menu div.cc_menu_divider').show();
}

controlCenterSearchModule.debounce = function (cb, interval, immediate) {
    var timeout;
    return function () {
        var context = this, args = arguments;
        var later = function () {
            timeout = null;
            if (!immediate) cb.apply(context, args);
        };
        var callNow = immediate && !timeout;

        clearTimeout(timeout);
        timeout = setTimeout(later, interval);

        if (callNow) cb.apply(context, args);
    };
}

controlCenterSearchModule.display = function (searchResults) {

    // Reset panel to original status
    $('div.cc_menu_item').show();
    $('div.cc_menu_section').show();
    this.showModules();
    this.showDividers();

    // Do nothing if search is null
    if (searchResults === null) return;

    let linksToShow = searchResults.map(el => el.name);

    this.hideModules();

    $('div.cc_menu_item').each((i, el) => {
        let isSearchItem = el.id === "cc-search-item";
        if (!isSearchItem && !linksToShow.includes(trim(el.textContent))) {
            $(el).hide();
        } else if (!isSearchItem) {
            let thisResult = searchResults.filter(result => result.name === trim(el.textContent))[0];

            let popoverContainer = $('<div class="highlight">');
            let nResults = thisResult.searchResults.length;
            thisResult.searchResults.each((j, res) => {
                let newContainer = $('<div>');
                let p = $('<p>').html(res.markedText);
                newContainer.append(p);
                if (j < (nResults - 1)) {
                    newContainer.append($('<hr>'));
                }
                popoverContainer.append(newContainer);
            });

            $(el).popover({
                trigger: "hover",
                html: true,
                content: popoverContainer.html()
            });
        }
    })

    $('div.cc_menu_section').each((i, el) => {
        if (Array.from($(el).children('div.cc_menu_item')).every(el2 => $(el2).is(":hidden"))) {
            $(el).hide();
            $(el).prev('div.cc_menu_divider').hide();
        }
    });
}

controlCenterSearchModule.keyupHandler = function () {
    // remove popovers
    $('div.cc_menu_item').popover('dispose')

    const module = controlCenterSearchModule;
    const searchTerm = document.querySelector("#cc-search-searchInput").value;
    if (searchTerm === "" || !module.initialized) return module.display(null);

    module.display(module.search(searchTerm));
}

controlCenterSearchModule.runControlCenter = function () {

    if (!this.initialized) {
        console.log("Initializing text...");
        this.initText();
    } else {
        this.link_data = JSON.parse(this.urldecode(this.link_text));
    }

    document.querySelector('#cc-search-searchInput').onkeyup = this.debounce(this.keyupHandler, 250);

    // Append link to top of menu
    document.querySelector('#control_center_menu').prepend(document.querySelector('#cc-search-container'));
    $('#cc-search-searchInput').width($("#pid-go-project").width());

    // Add a section divider before the Control Center Home section
    $('div.cc_menu_header:contains("Control Center Home")').parent().prepend('<div class="cc_menu_divider"></div>')

}

$(document).ready(function () {
    controlCenterSearchModule.runControlCenter();
});