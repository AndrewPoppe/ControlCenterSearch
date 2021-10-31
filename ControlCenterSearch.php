<?php

namespace YaleREDCap\ControlCenterSearch;

use ExternalModules\AbstractExternalModule;

/**
 * Main EM Class
 */
class ControlCenterSearch extends AbstractExternalModule
{


    function redcap_control_center()
    {
?>
        <script src="<?= $this->getUrl("searcher.js") ?>"></script>
        <div class="cc_menu_section" id='my_custom_cc_link'>
            <div class="cc_menu_header">Control Center Search</div>
            <div class="cc_menu_item" id="cc-search-item">
                <i class="fas fa-search" style="color:#22224c;"></i>
                <input id="searchInput" type="text" class="x-form-text x-form-field fs11" placeholder="Search Control Center"></input>
            </div>
        </div>
<?php
    }
}
