
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
controlCenterSearchModule.getNodesThatContain = function(searchText, domNode) {
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
controlCenterSearchModule.getText = function(domNode = null) {
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
controlCenterSearchModule.initText = async function (domNode = null) {
    $('#cc-search-searchInput').val('Please Wait...');
    $('#cc-search-searchInput').attr('readonly', true);
    this.getText(domNode)
    .then(results => {
        sessionStorage.setItem(this.cookie_name, JSON.stringify(results));
        this.link_data = results;
        $('#cc-search-searchInput').val('');
        $('#cc-search-searchInput').attr('readonly', false);
        this.initialized = true;
        console.log("Initialized text.");
    });
}


controlCenterSearchModule.search = function(searchTerm) {
    return this.link_data.map(ld => {
        let ld2 = ld;
        ld2.searchResults = this.searchLinkText(ld2.text, searchTerm);
        return ld2;
    }).filter(ld2 => ld2.searchResults > 0);
}


controlCenterSearchModule.searchLinkText = function(linkText, searchTerm) {
    let dom = $('<html>')[0];
    $(dom).html(linkText);
    let results = this.getNodesThatContain(searchTerm, dom);
    return results.length;
}

controlCenterSearchModule.hideModules = function() {
    const el = $('.cc_menu_header:contains("External Modules")');
    el.nextAll().hide();
    el.hide();
}

controlCenterSearchModule.showModules = function() {
    const el = $('.cc_menu_header:contains("External Modules")');
    el.nextAll().show();
    el.show();
}

controlCenterSearchModule.showDividers = function() {
    $('#control_center_menu div.cc_menu_divider').show();
}

controlCenterSearchModule.debounce = function(cb, interval, immediate) {
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
  

  controlCenterSearchModule.display = function(searchResults) {
    
    // Reset panel to original status
    $('div.cc_menu_item').show();
    $('div.cc_menu_section').show();
    this.showModules();
    this.showDividers();
    
    // Do nothing if search is null
    if (searchResults === null) return;

    let linksToShow = searchResults.map(el => el.name);

    this.hideModules();

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

controlCenterSearchModule.keyupHandler = function() {
    let module = controlCenterSearchModule;
    const searchTerm = document.querySelector("#cc-search-searchInput").value;
    if (searchTerm === "" || !module.initialized) return module.display(null);

    module.display(module.search(searchTerm));
}

controlCenterSearchModule.runControlCenter = function() {

    if (!this.initialized) {
        console.log("Initializing text...");
        this.initText();
    }
    
    document.querySelector('#cc-search-searchInput').onkeyup = this.debounce(this.keyupHandler, 250);

    // Append link to top of menu
    document.querySelector('#control_center_menu').prepend(document.querySelector('#cc-search-container'));
    $('#cc-search-searchInput').width($("#pid-go-project").width());

    // Add a section divider before the Control Center Home section
    $('div.cc_menu_header:contains("Control Center Home")').parent().prepend('<div class="cc_menu_divider"></div>')

}

controlCenterSearchModule.runEveryPage = function() {

    const cc_nav_link = $('a.nav-link:contains("Control Center")');
    if (cc_nav_link.length === 0) {
        return;
    }

    if (!this.initialized) {
        console.log("Initializing text...");
        const cc_href = cc_nav_link[0].href;
        fetch(cc_href)
            .then(result => result.text())
            .then(htmlString => {
                let dom = $('<html>')[0];
                $(dom).html(htmlString);
                this.initText(dom);
            })       
    }
}

$(document).ready(function() {
    controlCenterSearchModule.cookie_name = "CC_Search_Cookie";
    controlCenterSearchModule.link_data = JSON.parse(sessionStorage.getItem(controlCenterSearchModule.cookie_name));
    controlCenterSearchModule.initialized = controlCenterSearchModule.link_data !== null;

    if ($('#cc-search-searchInput').length > 0) {
        controlCenterSearchModule.runControlCenter();
    } else {
        controlCenterSearchModule.runEveryPage();
    }
});