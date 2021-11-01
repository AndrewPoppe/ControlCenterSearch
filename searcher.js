
const cookie_name = "CC_Search_Cookie";
let link_data = JSON.parse(sessionStorage.getItem(cookie_name));
let initialized = link_data !== null;
let keypressed = false;


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
function getNodesThatContain(searchText, domNode) {

    let searchString = searchText.toLowerCase().replaceAll(" ", ".*");

    return $(domNode).find('#control_center_window').find(":not(iframe, script)")
    .contents()
    .filter(function() {
        return this.nodeType == 3 
            && this.textContent.toLowerCase().match(searchString) !== null;
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
function getText(domNode = null) {
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
  * If this is a new session, then text needs to be gotten.
  * 
  * Prevents using the search box until then. 
  * 
  * @return void
  */
async function initText(domNode = null) {
    $('#cc-search-searchInput').val('Please Wait...');
    $('#cc-search-searchInput').attr('readonly', true);
    getText(domNode)
    .then(results => {
        sessionStorage.setItem(cookie_name, JSON.stringify(results));
        link_data = results;
        $('#cc-search-searchInput').val('');
        $('#cc-search-searchInput').attr('readonly', false);
        initialized = true;
        console.log("Initialized text.");
    });
}


function search(searchTerm) {
    
    return link_data.map(ld => {
        let ld2 = ld;
        ld2.searchResults = searchLinkText(ld2.text, searchTerm);
        return ld2;
    }).filter(ld2 => ld2.searchResults > 0);

}


function searchLinkText(linkText, searchTerm) {
    let dom = $('<html>')[0];
    $(dom).html(linkText);
    let results = getNodesThatContain(searchTerm, dom);
    return results.length;
}

function hideModules() {
    const el = $('.cc_menu_header:contains("External Modules")');
    el.nextAll().hide();
    el.hide();
}

function showModules() {
    const el = $('.cc_menu_header:contains("External Modules")');
    el.nextAll().show();
    el.show();
}

function showDividers() {
    $('#control_center_menu div.cc_menu_divider').show();
}

function debounce(cb, interval, immediate) {
    var timeout;
  
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) cb.apply(context, args);
      };          
  
      var callNow = immediate && !timeout;
  
      clearTimeout(timeout);
      timeout = setTimeout(later, interval);
  
      if (callNow) cb.apply(context, args);
    };
  }
  

function display(searchResults) {
    
    // Reset panel to original status
    $('div.cc_menu_item').show();
    $('div.cc_menu_section').show();
    showModules();
    showDividers();
    
    // Do nothing if search is null
    if (searchResults === null) return;

    let linksToShow = searchResults.map(el => el.name);

    hideModules();

    $('div.cc_menu_item').each((i,el) => {
        let isSearchItem = el.id === "cc-search-item";
        if (!isSearchItem && !linksToShow.includes(trim(el.textContent))) {
            $(el).hide();
        } 
    })

    $('div.cc_menu_section').each((i,el) => {
        if (Array.from($(el).children('div.cc_menu_item')).every(el2 => $(el2).is(":hidden"))) {
            $(el).hide();
            $(el).prev('div.cc_menu_divider').hide();
        } 
    });
}

function keyupHandler() {
    const searchTerm = document.querySelector("#cc-search-searchInput").value;
    if (searchTerm === "" || !initialized) return display(null);

    display(search(searchTerm));
}

function runControlCenter() {

    if (!initialized) {
        console.log("Initializing text...");
        initText();
    }
    
    document.querySelector('#cc-search-searchInput').onkeyup = debounce(keyupHandler, 250);

    // Append link to top of menu
    document.querySelector('#control_center_menu').prepend(document.querySelector('#cc-search-container'));
    $('#cc-search-searchInput').width($("#pid-go-project").width());

    // Add a section divider before the Control Center Home section
    $('div.cc_menu_header:contains("Control Center Home")').parent().prepend('<div class="cc_menu_divider"></div>')

}

function runEveryPage() {

    const cc_nav_link = $('a.nav-link:contains("Control Center")');
    if (cc_nav_link.length === 0) {
        return;
    }

    if (!initialized) {
        console.log("Initializing text...");
        const cc_href = cc_nav_link[0].href;
        fetch(cc_href)
            .then(result => result.text())
            .then(htmlString => {
                let dom = $('<html>')[0];
                $(dom).html(htmlString);
                initText(dom);
            })       
    }
}

$(document).ready(function() {
    if ($('#cc-search-searchInput').length > 0) {
        runControlCenter();
    } else {
        runEveryPage();
    }
});