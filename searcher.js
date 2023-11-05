
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
window.controlCenterSearchModule.getNodesThatContain = function (searchText, domNode) {
    let searchString = searchText.replaceAll(" ", ".+?");
    let searchRE = new RegExp(searchString, 'gi');

    return $(domNode).find('#control_center_window').find(":not(iframe, script, style, option)")
        .contents()
        .map(function () {
            let text = this.textContent;
            this.markedText = text.replace(searchRE, (match) => `<span class="marked ccsearch">${match}</span>`);
            this.matched = text !== this.markedText;
            this.hash = this.matched ? window.controlCenterSearchModule.hash(text) : -1;
            return this;
        })
        .filter(function () {
            return this.nodeType == 3 && this.matched;
        })
        .toArray();
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
window.controlCenterSearchModule.getText = function (domNode = null) {
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

/**
 * Text needs to be gotten.
 * 
 * Prevents using the search box until then. 
 * 
 * @return void
 */
window.controlCenterSearchModule.initText = async function (domNode = null) {
    $('#cc-search-searchInput').val('Please Wait...');
    $('#cc-search-searchInput').attr('readonly', true);
    this.getText(domNode)
        .then(results => {
            this.link_data = results;
            $('#cc-search-searchInput').val('');
            $('#cc-search-searchInput').attr('readonly', false);
            this.initialized = true;
            this.ajax('storeLinkData', { linkData: JSON.stringify(this.link_data) })
                .then(result => {
                    console.log("Control Center Search: Stored link data.");
                })
                .catch(error => console.error(error));
            console.log("Control Center Search: Initialized text.");
        });
}


window.controlCenterSearchModule.search = function (searchTerm) {
    return this.link_data.map(ld => {
        let ld2 = ld;
        ld2.searchResults = this.searchLinkText(ld2.text, searchTerm);
        ld2.searchTerm = searchTerm;
        return ld2;
    }).filter(ld2 => ld2.searchResults.length > 0);
}


window.controlCenterSearchModule.searchLinkText = function (linkText, searchTerm) {
    let dom = $('<html>')[0];
    $(dom).html(linkText);
    return this.getNodesThatContain(searchTerm, dom);
}

window.controlCenterSearchModule.hideModules = function () {
    const el = $('.cc_menu_header:contains("External Modules")');
    el.nextAll().hide();
    el.hide();
}

window.controlCenterSearchModule.showModules = function () {
    const el = $('.cc_menu_header:contains("External Modules")');
    el.nextAll().show();
    el.show();
}

window.controlCenterSearchModule.showDividers = function () {
    $('#control_center_menu div.cc_menu_divider').show();
}

window.controlCenterSearchModule.debounce = function (cb, interval, immediate) {
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

window.controlCenterSearchModule.hash = async function (str) {
    if (crypto?.subtle?.digest === undefined) {
        return -1;
    }
    const strUint8 = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', strUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); 
}

window.controlCenterSearchModule.display = function (searchResults) {

    // Reset panel to original status
    $('div.cc_menu_item').show();
    $('div.cc_menu_section').show();
    this.showModules();
    this.showDividers();

    // Do nothing if search is null
    if (searchResults === null) return;

    let linksToShow = searchResults.map(el => el.name);

    this.hideModules();
    if (typeof(bootstrap) !== 'undefined') {
        bootstrap.Tooltip.Default.allowList.div.push('onclick');
    } else {
        $.fn.popover.Constructor.Default.whiteList.div.push('onclick');
    }

    const popoverDelayMs = 200;
    $('div.cc_menu_item').each((i, el) => {
        const isSearchItem = el.id === "cc-search-item";
        if (!isSearchItem && !linksToShow.includes(el.textContent.trim())) {
            $(el).hide();
        } else if (!isSearchItem) {
            const thisResult = searchResults.filter(result => result.name === el.textContent.trim())[0];
            const popoverContainer = $('<div class="col">');
            const popoverTitleIcon = $(el).find('i').get(0).outerHTML;
            const popoverTitle = popoverTitleIcon+$(el).text();

            Promise.all(thisResult.searchResults.map(async (res, j) => {
                const hash = await res.hash;
                const url = new URL(thisResult.link);
                const newContainer = $(`<div class="card ccs-card bg-light mb-1" onclick="sessionStorage.setItem('ccsh', '${hash}');document.location.href='${url.href}'">`);
                const p = $(`<p>`).html(res.markedText.trim());

                newContainer.append(p);
                popoverContainer.append(newContainer);
            })).then(() => {
                $(el).unbind('mouseenter mouseleave');
                $(el).attr('data-bs-placement','right');
                $(el).popover({
                    title: popoverTitle,
                    trigger: "manual",
                    placement: "right",
                    html: true,
                    content: popoverContainer.html(),
                    animation: false,
                    fallbackPlacements: ['right'],
                    container: 'body',
                    template: '<div class="popover ccs-popover" role="tooltip"><h3 class="popover-header"></h3><div class="popover-arrow"></div><div class="popover-body row row-cols-1 highlight m-1"></div></div>',
                })
                .on("mouseenter", function() {
                    var _this = this;
                    setTimeout(function() {
                        if ($(_this).is(":hover")) {
                            $(_this).popover("show");
                            var popoverId = $(_this).attr('aria-describedby');
                            $('#'+popoverId).on("mouseleave", function() {
                                $(_this).popover('hide');
                            });
                        }
                    }, popoverDelayMs);
                })
                .on("mouseleave", function() {
                    var _this = this;
                    var popoverId = $(_this).attr('aria-describedby');
                    setTimeout(function() {
                        if (!$("#"+popoverId+":hover").length) {
                            $(_this).popover("hide");
                        }
                    }, popoverDelayMs);
                });
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

window.controlCenterSearchModule.findMatchInCurrentPage = async function (searchTerm, matchHash) {
    const searchString = searchTerm.replaceAll(" ", ".+?");
    const searchRE = new RegExp(searchString, 'gi');


    const nodes = await Promise.all($(document.getElementById('control_center_window')).find(":not(iframe, script, style, option)")
        .contents()
        .toArray()
        .map(async function (el) {
            if (el.nodeType !== 3) return el;
            let text = el.textContent;
            el.markedText = text.replace(searchRE, (match) => `<span class="marked ccsearch">${match}</span>`);
            el.matched = text !== el.markedText;
            el.hash = el.matched ? (await window.controlCenterSearchModule.hash(text)) : -1;
            el.hashMatched = await matchHash === el.hash;
            return el;
        }));
    

    for (let node of nodes) {
        if (node.hashMatched) {
            setTimeout(() => {
                const element = node.parentElement;
                $(element).html($(element).html().replace(searchRE, (match) => `<span class="marked ccsearch">${match}</span>`));
                const elY = element.getBoundingClientRect().y;
                const scrollHeight = document.querySelector('body').scrollHeight;
                const clientHeight = document.documentElement.clientHeight/2;
                const scrollY = elY - min(clientHeight, scrollHeight, elY);
                window.scrollTo({top:scrollY, behavior: 'smooth'});
            }, 0);
            return true;
        }
    }
    return false;
}

window.controlCenterSearchModule.keyupHandler = function () {
    // remove popovers
    $('div.cc_menu_item').popover('dispose')

    const module = window.controlCenterSearchModule;
    const searchTerm = document.querySelector("#cc-search-searchInput").value.trim();
    sessionStorage.setItem('ccss', searchTerm);
    if (searchTerm === "" || !module.initialized) return module.display(null);

    module.display(module.search(searchTerm));
}

window.controlCenterSearchModule.runControlCenter = function () {

    // Scroll to selected element if applicable
    const params = new URLSearchParams(window.location.search);
    const matchHash = sessionStorage.getItem('ccsh');
    const searchTerm = sessionStorage.getItem('ccss');
    if (matchHash !== null && searchTerm !== null) {
        window.controlCenterSearchModule.findMatchInCurrentPage(searchTerm, matchHash);
    }

    const searchInput = document.querySelector('#cc-search-searchInput');
    searchInput.onkeyup = this.debounce(this.keyupHandler, 250);
    searchInput.onsearch = this.keyupHandler;
    
    window.controlCenterSearchModule.ajax('getLinkData', {})
        .then(result => {
            if (result == '') {
                console.log("Control Center Search: Initializing text...");
                this.initText();
            } else {
                this.link_data = JSON.parse(result);
                this.initialized = true;
                searchInput.value = searchTerm;
                controlCenterSearchModule.keyupHandler();
            }
        })
        .catch(error => console.error(error));

    // Append link to top of menu
    document.querySelector('#control_center_menu').prepend(document.querySelector('#cc-search-container'));
    $('#cc-search-searchInput').width($("#pid-go-project").width());

    // Add a section divider before the Control Center Home section
    $('div.cc_menu_header:contains("Control Center Home")').parent().prepend('<div class="cc_menu_divider"></div>');
}

$(document).ready(function () {
    window.controlCenterSearchModule.runControlCenter();
});