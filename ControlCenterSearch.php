<?php

namespace YaleREDCap\ControlCenterSearch;

use ExternalModules\AbstractExternalModule;

/**
 * Main EM Class
 */
class ControlCenterSearch extends AbstractExternalModule
{
    public function redcap_control_center()
    {
        $this->initializeJavascriptModuleObject();
        ?>
        <div class="cc_menu_section" id='cc-search-container'>
            <div class="cc_menu_header">Control Center Search</div>
            <div class="cc_menu_item" id="cc-search-item">
                <i class="fas fa-search" style="color:#22224c;"></i>
                <input id="cc-search-searchInput" type="text" class="x-form-text x-form-field fs11"
                    placeholder="Search Control Center"></input>
            </div>
        </div>
        <script type="text/javascript">
            window.controlCenterSearchModule = <?= $this->getJavascriptModuleObjectName() ?>;
        </script>
        <script src="<?= $this->getUrl("searcher.js") ?>"></script>
        <link rel="stylesheet" href="<?= $this->getUrl("searcher.css") ?>">
        <?php
    }
}